#!/usr/bin/env python3
"""Rebuild webapp/data/feed.json from the newest discovery JSON under data/."""
from __future__ import annotations
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main() -> None:
    candidates = sorted(
        list(ROOT.glob("data/*discovery*.json")) + list(ROOT.glob("data/sunday_discovery*.json")),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    if not candidates:
        raise SystemExit("No discovery JSON under data/")

    src_path = candidates[0]
    src = json.loads(src_path.read_text(encoding="utf-8"))
    sales = src.get("sales") or []
    public = [s for s in sales if s.get("type") != "permit"]
    permits = sorted(
        [s for s in sales if s.get("type") == "permit"],
        key=lambda x: float(x.get("confidence") or 0),
        reverse=True,
    )[:80]

    feed = {
        "edition": src.get("edition") or "Yard-Bird Discovery",
        "date": src.get("date") or datetime.now(timezone.utc).date().isoformat(),
        "generated_at": src.get("generated_at") or datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "refreshed_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "total_locations": src.get("total_locations") or len(sales),
        "sources": src.get("sources") or [],
        "public": public,
        "permits": permits,
        "permit_total": sum(1 for s in sales if s.get("type") == "permit"),
        "hot_zones": src.get("hot_zones")
        or [
            {"name": "South Side", "badge": "CLUSTER-HOT", "size": 30, "lat": 29.2975, "lon": -98.481},
            {"name": "Northwest Side", "badge": "ACTIVE", "lat": 29.55, "lon": -98.62},
            {"name": "Northeast Side", "badge": "ACTIVE", "lat": 29.54, "lon": -98.40},
            {"name": "Alamo Ranch", "badge": "ACTIVE", "lat": 29.48, "lon": -98.70},
        ],
        "source_file": str(src_path.relative_to(ROOT)).replace("\\", "/"),
    }

    out = ROOT / "webapp" / "data" / "feed.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(feed, indent=2), encoding="utf-8")
    print(f"wrote {out} ({out.stat().st_size} bytes) public={len(public)} permits={len(permits)}")


if __name__ == "__main__":
    main()
