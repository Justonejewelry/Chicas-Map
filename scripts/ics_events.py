#!/usr/bin/env python3
"""Parse CivicEngage / RFC 5545 VEVENT blocks without extra packages."""

from __future__ import annotations

import html as htmlmod
import re
from datetime import datetime

try:
    from event_dates import extract_address, parse_time_label
except ImportError:
    import sys
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from event_dates import extract_address, parse_time_label

EID_RE = re.compile(r"calendar\.aspx\?EID=(\d+)", re.I)
VEVENT_RE = re.compile(r"BEGIN:VEVENT\s*(.*?)\s*END:VEVENT", re.I | re.S)
PROP_RE = re.compile(r"^([A-Z0-9-]+)(;[^:]*)?:(.*)$", re.I | re.M)


def unfold_ics(text: str) -> str:
    text = (text or "").replace("\r\n", "\n").replace("\r", "\n")
    return re.sub(r"\n[ \t]", "", text)


def _unescape(val: str) -> str:
    val = (val or "").replace("\\n", " ").replace("\\,", ",").replace("\\;", ";").replace("\\\\", "\\")
    val = htmlmod.unescape(val)
    val = re.sub(r"(?is)<[^>]+>", " ", val)
    return re.sub(r"\s+", " ", val).strip()


def _props(block: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for m in PROP_RE.finditer(block):
        name = m.group(1).upper()
        params = (m.group(2) or "").upper()
        val = m.group(3).strip()
        if name not in out:
            out[name] = val
            out[f"_{name}_PARAMS"] = params
    return out


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
    if " - " in loc:
        tail = loc.rsplit(" - ", 1)[-1].strip(" ,")
        if re.search(r"\d{2,5}", tail):
            return tail
    extracted = extract_address(loc)
    if extracted:
        return extracted
    if re.search(r"\d{2,5}", loc):
        return loc
    return ""


def event_detail_url(props: dict[str, str], source_url: str) -> str:
    blob = " ".join(props.get(k, "") for k in ("DESCRIPTION", "URL", "UID"))
    m = EID_RE.search(blob)
    if m:
        return f"https://www.bexar.org/Calendar.aspx?EID={m.group(1)}"
    uid = (props.get("UID") or "").strip()
    if re.fullmatch(r"\d+", uid):
        return f"https://www.bexar.org/Calendar.aspx?EID={uid}"
    desc = _unescape(props.get("DESCRIPTION") or "")
    http = re.search(r"https?://[^\s<>]+", desc)
    if http:
        return http.group(0).rstrip(".),")
    return source_url


def parse_vevents(ics_text: str, source_url: str = "") -> list[dict]:
    unfolded = unfold_ics(ics_text)
    events: list[dict] = []
    for m in VEVENT_RE.finditer(unfolded):
        p = _props(m.group(1))
        title = _unescape(p.get("SUMMARY") or "")
        if len(title) < 6:
            continue
        start, start_time = _parse_ics_dt(p.get("DTSTART") or "")
        end, end_time = _parse_ics_dt(p.get("DTEND") or "")
        if start_time and end_time and start_time != end_time:
            time = f"{start_time}–{end_time}"
        else:
            time = start_time or parse_time_label(_unescape(p.get("DESCRIPTION") or ""))
        events.append({
            "title": title,
            "date": start,
            "endDate": end if end and end != start else "",
            "time": time,
            "address": ics_address(p.get("LOCATION") or ""),
            "url": event_detail_url(p, source_url),
        })
    return events
