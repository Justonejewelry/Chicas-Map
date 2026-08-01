#!/usr/bin/env python3
"""
Apply Neighborhood Cluster Intelligence — Project YardBird / GSIN

1. Boost confidence scores based on cluster size
2. Emit cluster-aware KML with badges
3. Generate Selene briefing language that references concentrations

Usage:
  python scripts/apply_cluster_intelligence.py \
    --permits data/permits_recent.json \
    --clusters data/neighborhood_clusters.json \
    --out-dir data/
"""

from __future__ import annotations
import argparse
import json
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def cluster_boost(size: int) -> float:
    """Confidence uplift from belonging to a dense neighborhood cluster."""
    if size >= 15:
        return 0.08
    if size >= 8:
        return 0.06
    if size >= 4:
        return 0.04
    if size >= 2:
        return 0.02
    return 0.0


def badge_for_size(size: int) -> str | None:
    if size >= 15:
        return "CLUSTER-HOT"
    if size >= 8:
        return "CLUSTER-STRONG"
    if size >= 4:
        return "CLUSTER"
    if size >= 2:
        return "MULTI"
    return None


def apply_confidence(
    permits: list[dict],
    clusters: list[dict],
) -> tuple[list[dict], dict[str, dict]]:
    id_to_cluster: dict[str, dict] = {}
    for cl in clusters:
        meta = {
            "cluster_id": cl["cluster_id"],
            "size": cl["size"],
            "hot_zone_label": cl.get("hot_zone_label"),
            "centroid": cl.get("centroid"),
            "boost": cluster_boost(cl["size"]),
            "badge": badge_for_size(cl["size"]),
        }
        for pid in cl.get("permit_ids", []):
            id_to_cluster[pid] = meta

    boosted = []
    for r in permits:
        rec = dict(r)
        meta = id_to_cluster.get(rec["id"])
        base = float(rec.get("confidence", 0.70))
        if meta:
            rec["confidence"] = round(min(0.98, base + meta["boost"]), 3)
            rec["cluster_id"] = meta["cluster_id"]
            rec["cluster_size"] = meta["size"]
            rec["cluster_badge"] = meta["badge"]
            rec["hot_zone_label"] = meta["hot_zone_label"]
            rec["confidence_note"] = f"base {base:.2f} + cluster boost {meta['boost']:.2f} (n={meta['size']})"
        else:
            rec["cluster_id"] = None
            rec["cluster_size"] = 1
            rec["cluster_badge"] = None
        boosted.append(rec)
    return boosted, id_to_cluster


def build_kml(records: list[dict], clusters: list[dict]) -> str:
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<kml xmlns="http://www.opengis.net/kml/2.2">',
        "<Document>",
        "<name>YardBird SA — Clustered Garage Sales</name>",
        "<description>Municipal permits with neighborhood cluster badges</description>",
        "",
        "<!-- Styles -->",
        '<Style id="pin-default"><IconStyle><scale>0.9</scale>'
        '<Icon><href>http://maps.google.com/mapfiles/kml/paddle/blu-circle.png</href></Icon></IconStyle></Style>',
        '<Style id="pin-multi"><IconStyle><scale>1.0</scale>'
        '<Icon><href>http://maps.google.com/mapfiles/kml/paddle/ltblu-circle.png</href></Icon></IconStyle></Style>',
        '<Style id="pin-cluster"><IconStyle><scale>1.1</scale>'
        '<Icon><href>http://maps.google.com/mapfiles/kml/paddle/ylw-circle.png</href></Icon></IconStyle></Style>',
        '<Style id="pin-strong"><IconStyle><scale>1.2</scale>'
        '<Icon><href>http://maps.google.com/mapfiles/kml/paddle/orange-circle.png</href></Icon></IconStyle></Style>',
        '<Style id="pin-hot"><IconStyle><scale>1.35</scale>'
        '<Icon><href>http://maps.google.com/mapfiles/kml/paddle/red-circle.png</href></Icon></IconStyle></Style>',
        '<Style id="cluster-centroid"><IconStyle><scale>1.4</scale>'
        '<Icon><href>http://maps.google.com/mapfiles/kml/shapes/star.png</href></Icon></IconStyle></Style>',
        "",
    ]
    lines.append("<Folder><name>Neighborhood Clusters</name>")
    for cl in clusters:
        if cl["size"] < 2:
            continue
        badge = badge_for_size(cl["size"]) or "MULTI"
        c = cl["centroid"]
        name = f"[{badge}] {cl['hot_zone_label']} — {cl['size']} sales"
        desc = f"Cluster {cl['cluster_id']}<br/>Size: {cl['size']}<br/>Zone: {cl['hot_zone_label']}"
        lines += [
            "<Placemark>",
            f"<name>{name}</name>",
            f"<description>{desc}</description>",
            "<styleUrl>#cluster-centroid</styleUrl>",
            "<Point>",
            f"<coordinates>{c['lon']},{c['lat']},0</coordinates>",
            "</Point>",
            "</Placemark>",
        ]
    lines.append("</Folder>")
    lines.append("<Folder><name>Garage Sale Permits</name>")
    style_map = {
        "CLUSTER-HOT": "pin-hot",
        "CLUSTER-STRONG": "pin-strong",
        "CLUSTER": "pin-cluster",
        "MULTI": "pin-multi",
        None: "pin-default",
    }
    for r in records:
        if r.get("lat") is None or r.get("lon") is None:
            continue
        badge = r.get("cluster_badge")
        style = style_map.get(badge, "pin-default")
        prefix = f"[{badge}] " if badge else ""
        name = f"{prefix}{r.get('address_resolved') or r.get('title')}"
        conf = r.get("confidence", 0)
        desc = (
            f"{r.get('description', '')}<br/>"
            f"Confidence: {conf}<br/>"
            f"Cluster: {r.get('cluster_id') or 'solo'} (n={r.get('cluster_size', 1)})<br/>"
            f"Issued: {r.get('issued_date')}"
        )
        lines += [
            "<Placemark>",
            f"<name>{_xml_escape(name)}</name>",
            f"<description>{_xml_escape(desc)}</description>",
            f"<styleUrl>#{style}</styleUrl>",
            "<Point>",
            f"<coordinates>{r['lon']},{r['lat']},0</coordinates>",
            "</Point>",
            "</Placemark>",
        ]
    lines.append("</Folder>")
    lines += ["</Document>", "</kml>"]
    return "\n".join(lines)


def _xml_escape(s: str) -> str:
    return (
        s.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def selene_cluster_language(clusters: list[dict], top_n: int = 5) -> str:
    ranked = sorted(clusters, key=lambda c: c["size"], reverse=True)
    significant = [c for c in ranked if c["size"] >= 3][:top_n]
    if not significant:
        return (
            "Neighborhood activity looks spread out this cycle — "
            "no major multi-house concentrations showing yet."
        )
    parts = []
    for c in significant:
        zone = c.get("hot_zone_label") or "the area"
        n = c["size"]
        if n >= 15:
            parts.append(f"a major concentration of {n} sales on the {zone}")
        elif n >= 8:
            parts.append(f"a strong multi-house cluster ({n}) in {zone}")
        else:
            parts.append(f"a {n}-sale pocket in {zone}")
    if len(parts) == 1:
        body = parts[0]
    elif len(parts) == 2:
        body = f"{parts[0]} and {parts[1]}"
    else:
        body = ", ".join(parts[:-1]) + f", and {parts[-1]}"
    return (
        f"Watch the neighborhood clusters: we are seeing {body}. "
        f"These denser pockets tend to reward an early start and shorter hops between stops."
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--permits", type=Path, required=True)
    parser.add_argument("--clusters", type=Path, required=True)
    parser.add_argument("--out-dir", type=Path, default=Path("data"))
    args = parser.parse_args()

    permits_payload = json.loads(args.permits.read_text(encoding="utf-8"))
    clusters_payload = json.loads(args.clusters.read_text(encoding="utf-8"))
    records = permits_payload.get("records", permits_payload)
    clusters = clusters_payload.get("clusters", clusters_payload)

    boosted, _ = apply_confidence(records, clusters)
    kml = build_kml(boosted, clusters)
    briefing = selene_cluster_language(clusters)

    args.out_dir.mkdir(parents=True, exist_ok=True)

    boosted_path = args.out_dir / "permits_cluster_boosted.json"
    boosted_path.write_text(
        json.dumps(
            {
                "generated_at": datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds"),
                "count": len(boosted),
                "cluster_boost_applied": True,
                "records": boosted,
            },
            indent=2,
        ),
        encoding="utf-8",
    )

    kml_path = args.out_dir / "sa_clustered_sales.kml"
    kml_path.write_text(kml, encoding="utf-8")

    briefing_path = args.out_dir / "selene_cluster_briefing.txt"
    briefing_path.write_text(briefing + "\n", encoding="utf-8")

    snippet = {
        "cluster_intelligence": {
            "total_clusters": clusters_payload.get("total_clusters"),
            "top_cluster_size": max((c["size"] for c in clusters), default=0),
            "selene_language": briefing,
            "badge_legend": {
                "CLUSTER-HOT": "15+ sales within 1.2 km",
                "CLUSTER-STRONG": "8–14 sales",
                "CLUSTER": "4–7 sales",
                "MULTI": "2–3 sales",
            },
        }
    }
    (args.out_dir / "cluster_forecast_snippet.json").write_text(
        json.dumps(snippet, indent=2), encoding="utf-8"
    )

    print(f"Boosted records → {boosted_path}")
    print(f"KML             → {kml_path}")
    print(f"Selene language → {briefing_path}")
    print(f"Forecast snippet→ {args.out_dir / 'cluster_forecast_snippet.json'}")
    print("\nSelene briefing preview:")
    print(briefing)


if __name__ == "__main__":
    main()
