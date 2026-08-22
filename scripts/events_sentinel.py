#!/usr/bin/env python3
"""
Chica Map — Events Sentinel Quality Gate
Nothing reaches the public community-events feed until it passes.
"""

from __future__ import annotations

import re
from datetime import datetime, date
from typing import Any
from zoneinfo import ZoneInfo

CT = ZoneInfo("America/Chicago")
MIN_CONFIDENCE = 70

GENERIC_TITLES = {
    "tba", "tbd", "event", "events", "community event", "meeting",
    "events directory", "calendar", "upcoming events", "news events",
    "news & events", "directory", "home", "index",
}

GENERIC_TITLE_RE = re.compile(
    r"^(events?|calendar|directory|upcoming|home|index)([\s\-_].*)?$",
    re.I,
)

STUB_ADDRESS_RE = re.compile(
    r"\(from\s+.+$|san antonio,?\s*tx\s*$",
    re.I,
)

JUNK_URL_RE = re.compile(
    r"\.(jpe?g|png|gif|webp|svg|css|js)(\?|$)|"
    r"schema\.org|facebook\.net|fbevents|"
    r"[?&](recid|recsource|searchid|eventorigin)=",
    re.I,
)


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


def _parse_date(val: Any) -> date | None:
    if not val:
        return None
    s = str(val).strip()[:10]
    try:
        return datetime.strptime(s, "%Y-%m-%d").date()
    except Exception:
        return None


def _usable_address(address: str) -> bool:
    if not address or len(address) < 8:
        return False
    if STUB_ADDRESS_RE.search(address):
        return False
    # Require some street-like signal: digit or named venue + street token
    has_digit = any(c.isdigit() for c in address)
    streetish = bool(re.search(r"\b(st|street|ave|avenue|blvd|rd|road|dr|drive|ln|lane|pkwy|way|park|center|theatre|theater|hall|plaza)\b", address, re.I))
    return has_digit or streetish


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
    if re.fullmatch(r"\d+", title):
        result.fail(f"{prefix}: title is a bare numeric id")
    if title.lower().endswith((".jpeg", ".jpg", ".png", ".gif", ".webp")):
        result.fail(f"{prefix}: title looks like a filename")

    if not eid:
        result.fail(f"{prefix}: missing id")
    elif eid in existing_ids:
        result.fail(f"{prefix}: duplicate id already in feed")

    d = _parse_date(date_str)
    if not d:
        result.fail(f"{prefix}: missing or unparseable date")
    else:
        today = datetime.now(CT).date()
        if d < today:
            result.fail(f"{prefix}: date {d} is in the past")

    ed = _parse_date(end_str)
    if ed and d and ed < d:
        result.fail(f"{prefix}: endDate before start date")

    has_coords = isinstance(lat, (int, float)) and isinstance(lng, (int, float)) and lat != 0 and lng != 0
    has_address = _usable_address(address)
    if not has_coords and not has_address:
        result.fail(f"{prefix}: no usable coordinates and no street-level address")

    if not url or not url.startswith("http"):
        result.fail(f"{prefix}: missing or invalid source URL")
    elif JUNK_URL_RE.search(url):
        result.fail(f"{prefix}: URL is media, tracking, or junk")
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
        result.warn("Zero events — empty feed is allowed")
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
