#!/usr/bin/env python3
"""
Chica Map — Events Sentinel Quality Gate
Nothing reaches the public community-events feed until it passes.
Mirrors the philosophy of scripts/sentinel.py for sales.
"""

from __future__ import annotations

import re
from datetime import datetime, timezone, date
from typing import Any
from zoneinfo import ZoneInfo

CT = ZoneInfo("America/Chicago")
MIN_CONFIDENCE = 70


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


def validate_event(raw: dict[str, Any], existing_ids: set[str] | None = None) -> EventsSentinelResult:
    """Validate a single candidate event. Returns result with passed/errors/warnings."""
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

    # Required identity
    if not title or len(title) < 4:
        result.fail(f"{prefix}: missing or too-short title")
    if not eid:
        result.fail(f"{prefix}: missing id")
    elif eid in existing_ids:
        result.fail(f"{prefix}: duplicate id already in feed")

    # Date must be present and future (or today)
    d = _parse_date(date_str)
    if not d:
        result.fail(f"{prefix}: missing or unparseable date")
    else:
        today = datetime.now(CT).date()
        if d < today:
            result.fail(f"{prefix}: date {d} is in the past")

    # End date sanity
    ed = _parse_date(end_str)
    if ed and d and ed < d:
        result.fail(f"{prefix}: endDate before start date")

    # Location: need either coordinates or a usable address
    has_coords = isinstance(lat, (int, float)) and isinstance(lng, (int, float)) and lat != 0 and lng != 0
    has_address = bool(address) and len(address) > 5
    if not has_coords and not has_address:
        result.fail(f"{prefix}: no usable coordinates and no usable address")

    # Source URL required for transparency
    if not url or not url.startswith("http"):
        result.fail(f"{prefix}: missing or invalid source URL")

    # Confidence gate
    if confidence < MIN_CONFIDENCE:
        result.fail(f"{prefix}: confidence {confidence} below threshold {MIN_CONFIDENCE}")

    # Soft warnings
    if not has_coords:
        result.warn(f"{prefix}: no coordinates (will not render as map pin until geocoded)")
    if not raw.get("time") and not raw.get("startTime"):
        result.warn(f"{prefix}: missing time")
    if category in ("", "other", "unknown"):
        result.warn(f"{prefix}: category is generic/other")

    # Very basic spam / emptiness filter
    if title.lower() in ("tba", "tbd", "event", "community event", "meeting"):
        result.fail(f"{prefix}: title too generic")

    return result


def validate_events(events: list[dict[str, Any]]) -> EventsSentinelResult:
    """Validate a list of events. Aggregates results."""
    result = EventsSentinelResult()
    seen: set[str] = set()
    for i, raw in enumerate(events):
        sub = validate_event(raw, existing_ids=seen)
        if not sub.passed:
            result.passed = False
        result.errors.extend(sub.errors)
        result.warnings.extend(sub.warnings)
        eid = str(raw.get("id") or "").strip()
        if eid:
            seen.add(eid)
    if not events:
        result.warn("Zero events — empty feed is allowed but unusual")
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
