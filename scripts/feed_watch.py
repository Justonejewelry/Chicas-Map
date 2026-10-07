#!/usr/bin/env python3
"""Read-only public-feed gate. Does not publish, score, or mutate pins.

Exit 0: feed is usable.
Exit 1: quality problem (issue only).
Exit 2: San Antonio public feed empty or stale (safe to re-dispatch daily).
"""
from __future__ import annotations

import json
import sys
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
CITIES = ROOT / "webapp" / "data" / "cities"
CT = ZoneInfo("America/Chicago")
MIN_CONFIDENCE = 0.70
STALE_HOURS = 30


def norm_confidence(value: object) -> float:
    """Live pins store 0.82. Orchestrator schema still uses 70. Accept both."""
    try:
        number = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return 0.0
    if number > 1:
        number = number / 100.0
    return number


def parse_day(value: object):
    if not value:
        return None
    text = str(value).strip()[:10]
    for fmt in ("%Y-%m-%d", "%m/%d/%Y"):
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    return None


def main() -> int:
    today = datetime.now(CT).date()
    hard: list[str] = []
    heal: list[str] = []
    warns: list[str] = []
    if not CITIES.exists():
        print("FAIL missing webapp/data/cities")
        return 2
    files = sorted(CITIES.glob("*.json"))
    if not files:
        print("FAIL no city feeds")
        return 2
    for path in files:
        try:
            doc = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            hard.append(f"{path.name}: invalid json {exc}")
            continue
        public = doc.get("public") or []
        print(
            f"{path.name}: public={len(public)} total={doc.get('total_locations')} "
            f"status={doc.get('status')} refresh={doc.get('last_refresh')}"
        )
        if path.stem == "san-antonio" and not public:
            heal.append("san-antonio public[] empty")
        refresh = doc.get("last_refresh") or ""
        if refresh:
            try:
                stamp = datetime.fromisoformat(str(refresh))
                if stamp.tzinfo is None:
                    stamp = stamp.replace(tzinfo=CT)
                age_h = (datetime.now(CT) - stamp.astimezone(CT)).total_seconds() / 3600
                print(f"  refresh_age_h={age_h:.1f}")
                if path.stem == "san-antonio" and age_h > STALE_HOURS:
                    heal.append(f"san-antonio last_refresh {age_h:.0f}h old")
            except ValueError:
                warns.append(f"{path.name}: bad last_refresh")
        elif path.stem == "san-antonio":
            heal.append("san-antonio missing last_refresh")
        expired = low = nocoord = 0
        for pin in public:
            if not isinstance(pin, dict):
                warns.append(f"{path.name}: non-object pin")
                continue
            if not pin.get("lat") or not pin.get("lon"):
                nocoord += 1
            if norm_confidence(pin.get("confidence")) < MIN_CONFIDENCE:
                low += 1
            end = parse_day(pin.get("date_end") or pin.get("date_to") or pin.get("end_date"))
            if end and end < today:
                expired += 1
        if public:
            print(f"  expired={expired} low_conf={low} no_coord={nocoord}")
        if expired:
            warns.append(f"{path.name}: {expired} expired pins still public")
            if len(public) and expired / len(public) > 0.5:
                hard.append(f"{path.name}: majority of public pins expired")
        if nocoord:
            hard.append(f"{path.name}: {nocoord} public pins missing lat/lon")
        if low:
            warns.append(f"{path.name}: {low} public pins under confidence 0.70")
    for item in warns:
        print(f"WARN {item}")
    for item in hard:
        print(f"FAIL {item}")
    for item in heal:
        print(f"HEAL {item}")
    if heal:
        return 2
    if hard:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
