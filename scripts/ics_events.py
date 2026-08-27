#!/usr/bin/env python3
"""Parse CivicEngage / Tribe / HOA-sites / Trumba / RFC 5545 VEVENT blocks."""
from __future__ import annotations

import html as htmlmod
import re
from datetime import date, datetime
from urllib.parse import urlparse

try:
    from event_dates import extract_address, parse_time_label
except ImportError:
    import sys
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from event_dates import extract_address, parse_time_label

EID_RE = re.compile(r"https?://\S+calendar\.aspx\?EID=\d+", re.I)
EID_ID_RE = re.compile(r"calendar\.aspx\?EID=(\d+)", re.I)
VEVENT_RE = re.compile(r"BEGIN:VEVENT\s*(.*?)\s*END:VEVENT", re.I | re.S)
PROP_RE = re.compile(r"^([A-Z0-9-]+)(;[^:]*)?:(.*)$", re.I | re.M)
TRUMBA_NAME_RE = re.compile(r'NAME="([^"]+)"', re.I)
SKIP_TITLE_RE = re.compile(
    r"offices?\s+closed|city\s+hall\s+closed|"
    r"submittal deadline|"
    r"bulky\s+(item|pick)|brush collection|bulk\s*&\s*brush|"
    r"\bmunicipal court\b|"
    r"^arc meeting\s*$|"
    r"mosquito fogging|"
    r"^cancelled\b|\bcancelled\s*-|"
    r"\brenovations?\b|"
    r"library closed|"
    r"no school|"
    r"student holiday|"
    r"staff(?:\s|&| and)+\s*student holiday|"
    r"staff holiday|"
    r"teacher (?:work|prep|planning) day|"
    r"staff development|"
    r"progress reports|"
    r"report cards|"
    r"last day of school|"
    r"first day of (?:school|classes)|"
    r"district holiday|"
    r"instructional calendar",
    re.I,
)
CLOSURE_TYPE_RE = re.compile(r"\bclosure\b", re.I)
STREET_NUM_RE = re.compile(r"\b\d{1,6}\s+[A-Za-z]")


def unfold_ics(text: str) -> str:
    text = (text or "").replace("\r\n", "\n").replace("\r", "\n")
    return re.sub(r"\n[ \t]", "", text)


def _unescape(val: str) -> str:
    val = (val or "").replace("\\n", " ").replace("\\,", ",").replace("\\;", ";").replace("\\\\", "\\")
    val = htmlmod.unescape(val)
    val = re.sub(r"(?is)<[^>]+>", " ", val)
    return re.sub(r"\s+", " ", val).strip()


def _props(block: str) -> tuple[dict[str, str], dict[str, str]]:
    out: dict[str, str] = {}
    custom: dict[str, str] = {}
    for m in PROP_RE.finditer(block):
        name = m.group(1).upper()
        params = m.group(2) or ""
        val = m.group(3).strip()
        if name == "X-TRUMBA-CUSTOMFIELD":
            nm = TRUMBA_NAME_RE.search(params)
            if nm and nm.group(1).lower() not in custom:
                custom[nm.group(1).lower()] = val
            continue
        if name not in out:
            out[name] = val
            out[f"_{name}_PARAMS"] = params
    return out, custom


def _parse_ics_dt(raw: str) -> tuple[str, str]:
    if not raw:
        return "", ""
    token = raw.split(":")[-1].strip().replace("Z", "")
    if "T" in token:
        try:
            dt = datetime.strptime(token[:15], "%Y%m%dT%H%M%S")
        except ValueError:
            try:
                dt = datetime.strptime(token[:13], "%Y%m%dT%H%M")
            except ValueError:
                return "", ""
        hour = dt.hour % 12 or 12
        ampm = "AM" if dt.hour < 12 else "PM"
        return dt.date().isoformat(), f"{hour}:{dt.minute:02d} {ampm}"
    if re.fullmatch(r"\d{8}", token):
        try:
            return datetime.strptime(token, "%Y%m%d").date().isoformat(), ""
        except ValueError:
            return "", ""
    return "", ""


def ics_address(location: str) -> str:
    loc = _unescape(location)
    if not loc:
        return ""
    extracted = extract_address(loc)
    if extracted:
        return extracted
    if " - " in loc:
        tail = loc.rsplit(" - ", 1)[-1].strip(" ,")
        extracted = extract_address(tail)
        if extracted:
            return extracted
        if STREET_NUM_RE.search(tail):
            return tail
    if STREET_NUM_RE.search(loc):
        return loc
    return ""


def _host(source_url: str) -> str:
    try:
        return urlparse(source_url).netloc
    except Exception:
        return ""


def event_detail_url(props: dict[str, str], source_url: str) -> str:
    link = _unescape(props.get("X-TRUMBA-LINK") or "")
    if link.startswith("http"):
        if "mysapl.org" in link.lower():
            link = re.sub(r"^http://(?:www\.)?mysapl\.org", "https://www.mysapl.org", link, flags=re.I)
            link = link.replace("/EventsNews/EventsCalendar.aspx", "/Events-News/Events-Calendar")
        elif link.startswith("http://"):
            link = "https://" + link[len("http://"):]
        return link
    blob = " ".join(props.get(k, "") for k in ("DESCRIPTION", "URL", "UID"))
    m = EID_RE.search(blob)
    if m:
        return m.group(0).rstrip(".),'")
    eid = EID_ID_RE.search(blob)
    host = _host(source_url)
    if eid and host:
        return f"https://{host}/Calendar.aspx?EID={eid.group(1)}"
    url_field = _unescape(props.get("URL") or "")
    if url_field.startswith("http") and "icalendar" not in url_field.lower() and "generate_ical" not in url_field.lower():
        return url_field
    if url_field.startswith("/") and host:
        return f"https://{host}{url_field}"
    uid = (props.get("UID") or "").strip()
    if re.fullmatch(r"\d+", uid) and host:
        return f"https://{host}/Calendar.aspx?EID={uid}"
    desc = _unescape(props.get("DESCRIPTION") or "")
    http = re.search(r"https?://\S+", desc)
    if http:
        found = http.group(0).rstrip(".),'")
        if "icalendar" not in found.lower() and "generate_ical" not in found.lower():
            return found
    if uid and host and "trumba.com" not in uid:
        return f"https://{host}/calendar/?uid={uid}"
    return source_url


def expand_ics_urls(url: str, months: int = 3) -> list[str]:
    if not url:
        return []
    if "ical.php" in url.lower() and "month=" not in url.lower():
        today = date.today()
        out = []
        for i in range(max(1, months)):
            m = today.month + i
            y = today.year + (m - 1) // 12
            m = ((m - 1) % 12) + 1
            sep = "&" if "?" in url else "?"
            out.append(f"{url}{sep}month={m}&year={y}")
        return out
    return [url]


def parse_vevents(ics_text: str, source_url: str = "") -> list[dict]:
    unfolded = unfold_ics(ics_text)
    events: list[dict] = []
    seen = set()
    for m in VEVENT_RE.finditer(unfolded):
        p, custom = _props(m.group(1))
        title = _unescape(p.get("SUMMARY") or "")
        if len(title) < 6 or SKIP_TITLE_RE.search(title):
            continue
        event_type = _unescape(custom.get("event type") or custom.get("event type(s)") or "")
        if CLOSURE_TYPE_RE.search(event_type):
            continue
        start, start_time = _parse_ics_dt(p.get("DTSTART") or "")
        end, end_time = _parse_ics_dt(p.get("DTEND") or "")
        if start_time and end_time and start_time != end_time:
            time = f"{start_time}-{end_time}"
        else:
            time = start_time or parse_time_label(_unescape(p.get("DESCRIPTION") or ""))
        desc = p.get("DESCRIPTION") or ""
        address = (
            ics_address(custom.get("address") or "")
            or ics_address(p.get("LOCATION") or "")
            or ics_address(desc)
        )
        rec = {
            "title": title,
            "date": start,
            "endDate": end if end and end != start else "",
            "time": time,
            "address": address,
            "url": event_detail_url(p, source_url),
        }
        key = (title.lower()[:60], rec["date"], rec["url"])
        if key in seen:
            continue
        seen.add(key)
        events.append(rec)
    return events
