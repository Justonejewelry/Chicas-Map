#!/usr/bin/env python3
"""Build episode brief JSON from live YardBird cluster + forecast intel."""
from __future__ import annotations
import argparse, json
from datetime import datetime, timezone
from pathlib import Path

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--clusters", type=Path, default=Path("data/neighborhood_clusters_top.json"))
    p.add_argument("--date", default="2026-08-01")
    p.add_argument("--edition", default="sunday", choices=["friday", "saturday", "sunday"])
    p.add_argument("--out", type=Path, default=Path("animation/storyboard/episode_brief.json"))
    args = p.parse_args()

    clusters = []
    if args.clusters.exists():
        payload = json.loads(args.clusters.read_text())
        clusters = payload.get("top_clusters") or payload.get("clusters") or []

    top = sorted(clusters, key=lambda c: c.get("size", 0), reverse=True)
    lead = top[0] if top else {"hot_zone_label": "South Side", "size": 0}
    secondaries = []
    seen = set()
    for c in top[1:6]:
        z = c.get("hot_zone_label")
        if z and z != lead.get("hot_zone_label") and z not in seen:
            seen.add(z)
            secondaries.append(z)

    brief = {
        "episode": f"{args.edition.title()} Yard-Bird Update",
        "date": args.date,
        "runtime_target_s": [14, 18],
        "lead_cluster": {
            "zone": lead.get("hot_zone_label"),
            "size": lead.get("size"),
            "badge": "CLUSTER-HOT" if (lead.get("size") or 0) >= 15 else "CLUSTER",
        },
        "secondaries": secondaries[:4],
        "weather_note": "Heat high · early start recommended",
        "cta": "Be hunting, y'all!",
        "map_asset": f"maps/san-antonio/{args.date}-clustered.kml",
        "shots": [
            {"id": "S01", "name": "logo_open", "t": [0.0, 2.8]},
            {"id": "S02", "name": "host_intro", "t": [2.8, 5.5]},
            {"id": "S03", "name": "map_point", "t": [5.5, 9.5]},
            {"id": "S04", "name": "map_dense", "t": [9.5, 12.5]},
            {"id": "S05", "name": "closer_cta", "t": [12.5, 17.0]},
        ],
        "generated_at": datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds"),
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(brief, indent=2), encoding="utf-8")
    print(json.dumps(brief, indent=2))

if __name__ == "__main__":
    main()
