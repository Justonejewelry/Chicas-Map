#!/usr/bin/env python3
"""Rebuild webapp/data/feed.json from the latest sunday discovery JSON."""
from __future__ import annotations
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DISC = ROOT / "data" / "sunday_discovery_2026-08-01.json"
OUT = ROOT / "webapp" / "data" / "feed.json"

def main():
    src = json.loads(DISC.read_text(encoding="utf-8"))
    public = [s for s in src["sales"] if s.get("type") != "permit"]
    permits = sorted(
        [s for s in src["sales"] if s.get("type") == "permit"],
        key=lambda x: float(x.get("confidence") or 0),
        reverse=True,
    )[:80]
    feed = {
        "edition": src["edition"],
        "date": src["date"],
        "generated_at": src["generated_at"],
        "total_locations": src["total_locations"],
        "sources": src["sources"],
        "public": public,
        "permits": permits,
        "permit_total": sum(1 for s in src["sales"] if s.get("type") == "permit"),
        "hot_zones": [
            {"name": "South Side", "badge": "CLUSTER-HOT", "size": 30, "lat": 29.2975, "lon": -98.481},
            {"name": "Northwest Side", "badge": "ACTIVE", "lat": 29.55, "lon": -98.62},
            {"name": "Northeast Side", "badge": "ACTIVE", "lat": 29.54, "lon": -98.40},
            {"name": "Alamo Ranch", "badge": "ACTIVE", "lat": 29.48, "lon": -98.70},
        ],
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(feed, indent=2), encoding="utf-8")
    print(f"wrote {OUT} ({OUT.stat().st_size} bytes) public={len(public)} permits={len(permits)}")

if __name__ == "__main__":
    main()
