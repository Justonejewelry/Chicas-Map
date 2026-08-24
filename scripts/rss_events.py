#!/usr/bin/env python3
"""Parse RSS/Atom event feeds without extra packages."""
from __future__ import annotations
import html as htmlmod
import re
from email.utils import parsedate_to_datetime
try:
    from event_dates import extract_address, normalize_event_dates, parse_time_label
except ImportError:
    import sys
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from event_dates import extract_address, normalize_event_dates, parse_time_label
ITEM_RE = re.compile(r"<(?:item|entry)\b[^>]*>(.*?)</(?:item|entry)>", re.I | re.S)
def _tag(block: str, names: tuple[str, ...]) -> str:
    for name in names:
        m = re.search(rf"<{name}\b[^>]*>(.*?)</{name}>", block, re.I | re.S)
        if m:
            return _clean(m.group(1))
        m = re.search(rf"<{name}\b[^>]*href=[\"']([^\"']+)[\"']", block, re.I)
        if m:
            return m.group(1).strip()
    return ""
def _clean(val: str) -> str:
    val = htmlmod.unescape(val or "")
    val = re.sub(r"<!\[CDATA\[(.*?)\]\]>", r"\1", val, flags=re.S)
    val = re.sub(r"(?is)<[^>]+", " ", val)
    return re.sub(r"\s+", " ", val).strip()
def _rfc822_date(val: str) -> str:
    if not val:
        return ""
    try:
        return parsedate_to_datetime(val).date().isoformat()
    except Exception:
        d, _ = normalize_event_dates(val)
        return d
def parse_rss_items(xml: str, source_url: str = "") -> list[dict]:
    out = []
    seen = set()
    for m in ITEM_RE.finditer(xml or ""):
        block = m.group(1)
        title = _tag(block, ("title",))
        if len(title) < 6:
            continue
        url = _tag(block, ("link", "id", "guid"))
        if url and not url.startswith("http"):
            url = ""
        desc = _tag(block, ("description", "summary", "content", "content:encoded"))
        blob = f"{title} {desc}"
        date_str, end_date = normalize_event_dates(blob)
        if not date_str:
            date_str = _rfc822_date(_tag(block, ("pubDate", "published", "updated", "dc:date")))
        rec = {
            "title": title[:160],
            "date": date_str,
            "endDate": end_date,
            "time": parse_time_label(blob),
            "address": extract_address(blob),
            "url": url or source_url,
        }
        key = (rec["title"].lower()[:60], rec["date"], rec["url"])
        if key in seen:
            continue
        seen.add(key)
        out.append(rec)
    return out
