#!/usr/bin/env python3
"""
Project YardBird — Auto-populate weekend forecast skeleton from verified sale records.

Usage:
  python populate_forecast.py --sales sales.json --city san-antonio --out forecast/YYYY-MM-DD-weekend.json
  python populate_forecast.py --sales sales.json --city san-antonio --weather '{"condition":"Mostly sunny","high_f":99,"low_f":76}' 

Expects sales.json as a list of canonical GSIN sale records (see data-model.md).
Only records with status in ("active","verified") and confidence >= 0.55 are counted.
"""

from __future__ import annotations
import argparse
import json
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# Simple star thresholds (can be tuned by Oracle / Pulse later)
STAR_THRESHOLDS = [
    (0, 0),
    (25, 1),
    (50, 2),
    (90, 3),
    (140, 4),
    (200, 5),
]

def stars_for_count(count: int, quality_bonus: float = 0.0) -> int:
    adjusted = count + int(quality_bonus * 20)
    for threshold, stars in reversed(STAR_THRESHOLDS):
        if adjusted >= threshold:
            return stars
    return 0


def load_sales(path: Path) -> list[dict]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(data, dict) and "features" in data:  # GeoJSON
        return [f.get("properties", f) for f in data["features"]]
    if isinstance(data, list):
        return data
    raise ValueError("sales file must be a list of records or a GeoJSON FeatureCollection")


def day_key(d: str | None) -> str | None:
    if not d:
        return None
    try:
        dt = datetime.fromisoformat(d[:10])
        return dt.strftime("%A").lower()
    except Exception:
        return None


def populate(
    sales: list[dict],
    city: str,
    weather: dict | None = None,
    generated_at: str | None = None,
) -> dict[str, Any]:
    now = generated_at or datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")

    active = [
        s for s in sales
        if s.get("status") in ("active", "verified", "live")
        and float(s.get("confidence", 0)) >= 0.55
    ]

    by_day: dict[str, list] = defaultdict(list)
    cats: Counter = Counter()
    sources: Counter = Counter()
    neighborhoods: Counter = Counter()
    highlights = []

    for s in active:
        d = day_key(s.get("start_date")) or day_key(s.get("end_date"))
        if d in ("friday", "saturday", "sunday"):
            by_day[d].append(s)
        for c in s.get("categories") or []:
            cats[c.lower()] += 1
        for src in s.get("sources") or []:
            platform = (src.get("platform") or "other").lower()
            sources[platform] += 1
        nb = s.get("neighborhood") or s.get("city") or "unknown"
        neighborhoods[nb] += 1

        highlights.append({
            "name": s.get("title") or s.get("name") or "Unnamed sale",
            "addr": s.get("address_resolved") or s.get("address_raw") or "",
            "hours": s.get("hours") or "",
            "tags": (s.get("categories") or [])[:4] + (["estate"] if "estate" in str(s.get("title","")).lower() else []),
            "confidence": round(float(s.get("confidence", 0)), 2),
            "value_score": round(float(s.get("value_score", 0)), 2),
        })

    # Sort highlights by value_score * confidence
    highlights.sort(key=lambda h: h["value_score"] * h["confidence"], reverse=True)
    top_highlights = highlights[:8]

    # Hot zones: top neighborhoods that appear in city config style
    hot_zones = [n for n, _ in neighborhoods.most_common(6) if n != "unknown"]

    # Best categories
    best_categories = [c.title() for c, _ in cats.most_common(6)]

    # Day stats
    days = {}
    quality_bonus = min(1.0, sources.get("estate", 0) * 0.05 + sources.get("craigslist", 0) * 0.03)
    for day in ("friday", "saturday", "sunday"):
        cnt = len(by_day[day])
        days[day] = {
            "stars": stars_for_count(cnt, quality_bonus),
            "predicted_sales": cnt if cnt > 0 else max(0, int(cnt * 1.1)),  # slight projection if needed
            "status": "active" if cnt > 0 else "projected",
        }
    # If saturday has good data, keep others projected with scaled estimates
    if days["saturday"]["predicted_sales"] > 0 and days["friday"]["predicted_sales"] == 0:
        days["friday"]["predicted_sales"] = max(40, int(days["saturday"]["predicted_sales"] * 0.6))
        days["friday"]["stars"] = max(2, days["saturday"]["stars"] - 1)
    if days["sunday"]["predicted_sales"] == 0 and days["saturday"]["predicted_sales"] > 0:
        days["sunday"]["predicted_sales"] = max(30, int(days["saturday"]["predicted_sales"] * 0.45))
        days["sunday"]["stars"] = max(2, days["saturday"]["stars"] - 1)

    # Overall confidence
    confs = [float(s.get("confidence", 0)) for s in active]
    mean_conf = sum(confs) / len(confs) if confs else 0.5
    source_div = min(0.15, 0.03 * len([k for k, v in sources.items() if v > 0]))
    overall_conf = round(min(0.95, mean_conf + source_div), 2)

    # Weather stub (Nimbus will replace)
    wx = weather or {
        "condition": "Unknown — Nimbus not yet live",
        "high_f": None,
        "low_f": None,
        "risk": "Check local forecast",
        "shopping_quality": "Unknown",
    }

    # Simple Selene draft
    top_zone = hot_zones[0] if hot_zones else "the metro"
    top_cat = best_categories[0] if best_categories else "mixed inventory"
    sat_stars = days["saturday"]["stars"]
    briefing = (
        f"Good morning. Saturday is shaping up as a {sat_stars}-star day. "
        f"{top_zone} and nearby corridors are leading. "
        f"Watch for {top_cat.lower()} and related finds. "
        f"Weather risk: {wx.get('risk', 'check local conditions')}. "
        f"Get there early."
    )

    forecast = {
        "generated_at": now,
        "city": city,
        "status": "live" if overall_conf >= 0.65 else "seed",
        "confidence": overall_conf,
        "notes": (
            f"Auto-populated from {len(active)} verified records. "
            f"Mercury (CL)={sources.get('craigslist',0)}, Echo (FB)={sources.get('facebook',0)}, "
            f"Heritage={sources.get('estate',0)}. "
            f"Sentinel gate applied."
        ),
        "days": days,
        "weather_impact": wx,
        "hot_zones": hot_zones,
        "best_categories": best_categories,
        "verified_highlights": [
            {k: v for k, v in h.items() if k not in ("confidence", "value_score")}
            for h in top_highlights
        ],
        "source_breakdown": {
            "estate": sources.get("estate", 0),
            "craigslist": sources.get("craigslist", 0),
            "facebook": sources.get("facebook", 0),
            "nextdoor": sources.get("nextdoor", 0),
            "permit": sources.get("permit", 0),
            "other": sources.get("other", 0),
        },
        "selene_briefing_draft": briefing,
        "meta": {
            "mercury_records": sources.get("craigslist", 0),
            "echo_records": sources.get("facebook", 0),
            "heritage_records": sources.get("estate", 0),
            "last_sentinel_pass": now,
            "schema_version": "1.1",
            "total_active": len(active),
        },
    }
    return forecast


def main():
    ap = argparse.ArgumentParser(description="YardBird forecast auto-populator")
    ap.add_argument("--sales", required=True, type=Path, help="Path to sales JSON or GeoJSON")
    ap.add_argument("--city", required=True, help="City slug, e.g. san-antonio")
    ap.add_argument("--out", type=Path, help="Output path (default stdout)")
    ap.add_argument("--weather", type=str, help="JSON string of weather_impact override")
    args = ap.parse_args()

    sales = load_sales(args.sales)
    weather = json.loads(args.weather) if args.weather else None
    forecast = populate(sales, args.city, weather)

    text = json.dumps(forecast, indent=2, ensure_ascii=False)
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(text + "\n", encoding="utf-8")
        print(f"Wrote {args.out}", file=sys.stderr)
    else:
        print(text)


if __name__ == "__main__":
    main()
