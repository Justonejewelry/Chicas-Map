#!/usr/bin/env python3
"""Chica Map Events Sentinel Quality Gate."""
from __future__ import annotations
import re
from datetime import date
from typing import Any
from urllib.parse import urlparse
from zoneinfo import ZoneInfo
try:
    from event_dates import parse_single_date, parse_date_range, today_ct
except ImportError:
    import sys
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from event_dates import parse_single_date, parse_date_range, today_ct
CT = ZoneInfo("America/Chicago")
MIN_CONFIDENCE = 70
MAX_HORIZON_DAYS = 180
GENERIC_TITLES = {
    "tba", "tbd", "event", "events", "community event", "meeting",
    "events directory", "calendar", "upcoming events", "news events",
    "news & events", "directory", "home", "index",
    "city offices closed", "offices closed", "city office closed",
    "municipal court",
}
GENERIC_TITLE_RE = re.compile(r"^(events?|calendar|directory|upcoming|home|index|city offices closed)([\s\-_].*)?$", re.I)
CLOSED_OFFICE_RE = re.compile(r"offices?\s+closed|city\s+hall\s+closed", re.I)
FRAGMENT_TITLE_RE = re.compile(r"^(view event|and |or |includes |craftspeople)|[→»]| and more on$", re.I)
STUB_ADDRESS_RE = re.compile(r"\(from\s+.+$|san antonio,?\s*tx\s*$", re.I)
CITY_ZIP_ONLY_RE = re.compile(
    r"^[\s,\-]*(?:city of\s+)?[A-Za-z][A-Za-z\s.']{1,40}\s+TX\s+\d{5}(?:-\d{4})?\s*$",
    re.I,
)
STREET_NUM_RE = re.compile(r"\b\d{1,6}\s+[A-Za-z]")
VENUE_WORD_RE = re.compile(
    r"\b(st|street|ave|avenue|blvd|boulevard|rd|road|dr|drive|ln|lane|pkwy|parkway|way|park|center|theatre|theater|hall|plaza|library|church|school)\b",
    re.I,
)
LISTING_PATHS = {
    "/", "/events", "/calendar", "/calendars", "/community-calendar",
    "/entertainment/calendars", "/find",
}
JUNK_URL_RE = re.compile(r"\.(jpe?g|png|gif|webp|svg|css|js)(\?|$)|schema\.org|facebook\.net|fbevents|[?&](recid|recsource|searchid|eventorigin)=", re.I)
ISO_IN_TITLE_RE = re.compile(r"20\d{2}-\d{2}-\d{2}T\d{2}:")
class EventsSentinelResult:
    def __init__(self) -> None:
        self.passed = True
        self.errors: list[str] = []
        self.warnings: list[str] = []
    def fail(self, msg: str) -> None:
        self.passed = False
        self.errors.append(msg)
    def warn(self, msg: str) -> None:
        self.warnings.append(msg)
    def summary(self) -> str:
        status = "PASS" if self.passed else "FAIL"
        lines = [f"Events Sentinel: {status}"]
        for e in self.errors:
            lines.append(f"  ERROR: {e}")
        for w in self.warnings:
            lines.append(f"  WARN:  {w}")
        return "\n".join(lines)
def _parse_range_fields(date_str: Any, end_str: Any) -> tuple[date | None, date | None]:
    blob = " ".join(str(x) for x in (date_str, end_str) if x)
    start, end = parse_date_range(blob) if blob else (None, None)
    if not start:
        start = parse_single_date(str(date_str or ""))
    if not end and end_str:
        end = parse_single_date(str(end_str))
    return start, end
def _usable_address(address: str) -> bool:
    if not address or len(address) < 8:
        return False
    if STUB_ADDRESS_RE.search(address):
        return False
    compact = address.strip(" -,")
    if CITY_ZIP_ONLY_RE.match(compact):
        return False
    if parse_single_date(address[:32]):
        return False
    if STREET_NUM_RE.search(address):
        return True
    return bool(VENUE_WORD_RE.search(address) and re.search(r"\d{1,6}", address))
def _listing_url(url: str) -> bool:
    if re.search(r"calendar\.aspx", url, re.I) and not re.search(r"[?&]EID=", url, re.I):
        return True
    if re.search(r"icalendar\.aspx", url, re.I):
        return True
    try:
        path = urlparse(url).path.lower().rstrip("/") or "/"
    except Exception:
        return False
    if path in LISTING_PATHS:
        return True
    if path.endswith(("/events", "/calendar", "/community-calendar", "/calendars")):
        return True
    return False
def validate_event(raw: dict[str, Any], existing_ids: set[str] | None = None) -> EventsSentinelResult:
    result = EventsSentinelResult()
    existing_ids = existing_ids or set()
    eid = str(raw.get("id") or "").strip()
    title = str(raw.get("title") or "").strip()
    date_str = raw.get("date") or raw.get("startDate") or ""
    end_str = raw.get("endDate") or ""
    address = str(raw.get("address") or "").strip()
    lat = raw.get("lat")
    lng = raw.get("lng")
    url = str(raw.get("url") or raw.get("sourceUrl") or "").strip()
    confidence = int(raw.get("confidence") or 0)
    category = str(raw.get("category") or "other").lower()
    prefix = f"event_id={eid or title[:40] or 'unknown'}"
    if not title or len(title) < 6:
        result.fail(f"{prefix}: missing or too-short title")
    elif title.lower() in GENERIC_TITLES or GENERIC_TITLE_RE.match(title):
        result.fail(f"{prefix}: title too generic ({title!r})")
    elif CLOSED_OFFICE_RE.search(title):
        result.fail(f"{prefix}: closed-office / holiday-closure title")
    elif FRAGMENT_TITLE_RE.search(title) or (title[:1].islower() and not title[:1].isdigit()):
        result.fail(f"{prefix}: title looks like a page fragment ({title!r})")
    if re.fullmatch(r"\d+", title):
        result.fail(f"{prefix}: title is a bare numeric id")
    if title.lower().endswith((".jpeg", ".jpg", ".png", ".gif", ".webp")):
        result.fail(f"{prefix}: title looks like a filename")
    if ISO_IN_TITLE_RE.search(title):
        result.fail(f"{prefix}: title contains raw ISO timestamp")
    if not eid:
        result.fail(f"{prefix}: missing id")
    elif eid in existing_ids:
        result.fail(f"{prefix}: duplicate id already in feed")
    today = today_ct()
    d, ed = _parse_range_fields(date_str, end_str)
    if not d:
        result.fail(f"{prefix}: missing or unparseable date")
    else:
        if (d - today).days > MAX_HORIZON_DAYS:
            result.fail(f"{prefix}: date {d} is more than {MAX_HORIZON_DAYS} days out")
        if ed and ed < d:
            result.fail(f"{prefix}: endDate before start date")
        elif ed and ed < today:
            result.fail(f"{prefix}: series ended {ed}")
        elif not ed and d < today:
            result.fail(f"{prefix}: date {d} is in the past")
        elif d < today and ed and ed >= today:
            result.warn(f"{prefix}: ongoing series {d} -> {ed}")
    has_coords = isinstance(lat, (int, float)) and isinstance(lng, (int, float)) and lat != 0 and lng != 0
    has_address = _usable_address(address)
    if not has_coords and not has_address:
        result.fail(f"{prefix}: no usable coordinates and no street-level address")
    if not url or not url.startswith("http"):
        result.fail(f"{prefix}: missing or invalid source URL")
    elif JUNK_URL_RE.search(url):
        result.fail(f"{prefix}: URL is media, tracking, or junk")
    elif _listing_url(url):
        result.fail(f"{prefix}: listing-page URL, not an event detail")
    elif re.search(r"/events/?$", url.rstrip("/"), re.I) and title.lower() in GENERIC_TITLES:
        result.fail(f"{prefix}: listing-page URL, not an event detail")
    if confidence < MIN_CONFIDENCE:
        result.fail(f"{prefix}: confidence {confidence} below threshold {MIN_CONFIDENCE}")
    if not has_coords:
        result.warn(f"{prefix}: no coordinates (will not render as map pin until geocoded)")
    if not raw.get("time") and not raw.get("startTime"):
        result.warn(f"{prefix}: missing time")
    if category in ("", "other", "unknown"):
        result.warn(f"{prefix}: category is generic/other")
    return result
def validate_events(events: list[dict[str, Any]]) -> EventsSentinelResult:
    result = EventsSentinelResult()
    seen: set[str] = set()
    for raw in events:
        sub = validate_event(raw, existing_ids=seen)
        if not sub.passed:
            result.passed = False
        result.errors.extend(sub.errors)
        result.warnings.extend(sub.warnings)
        eid = str(raw.get("id") or "").strip()
        if eid:
            seen.add(eid)
    if not events:
        result.warn("Zero events - empty feed is allowed")
    return result
if __name__ == "__main__":
    import json
    import sys
    from pathlib import Path
    if len(sys.argv) < 2:
        print("Usage: events_sentinel.py <path-to-community-events.json>")
        sys.exit(2)
    path = Path(sys.argv[1])
    data = json.loads(path.read_text(encoding="utf-8"))
    events = data.get("events", data) if isinstance(data, dict) else data
    r = validate_events(events if isinstance(events, list) else [])
    print(r.summary())
    sys.exit(0 if r.passed else 1)
