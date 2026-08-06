#!/usr/bin/env python3
"""
Chica Daily Pack Generator
Builds a complete ready-to-post pack from the latest forecast JSON.

Usage (local):
  python scripts/content-packs/generate-pack.py
  python scripts/content-packs/generate-pack.py --date 2026-08-09

Usage (GitHub Actions / repo mode):
  python scripts/content-packs/generate-pack.py --repo-mode --output-dir packs
"""

from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timedelta
from pathlib import Path
import sys


def find_latest_forecast(repo_root: Path) -> Path:
    forecast_dir = repo_root / "forecast"
    if not forecast_dir.exists():
        print("ERROR: forecast/ directory not found")
        sys.exit(1)
    candidates = list(forecast_dir.glob("*.json"))
    if not candidates:
        print("ERROR: No forecast JSON files found in forecast/")
        sys.exit(1)
    return max(candidates, key=lambda p: p.stat().st_mtime)


def load_forecast(path: Path) -> dict:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def one_line_summary(data: dict) -> str:
    if "selene_briefing_draft" in data and data["selene_briefing_draft"]:
        return data["selene_briefing_draft"].strip()

    zones = data.get("hot_zones") or data.get("san_antonio", {}).get("hot_zones_emerging") or []
    zone_str = ", ".join(zones[:3]) if zones else "key corridors"
    weather = data.get("weather_impact", {})
    heat = weather.get("high_f")
    heat_note = f" Heat builds to {heat}°." if heat else ""
    return f"Weekend outlook · {zone_str} leading.{heat_note} Get there early."


def hot_zones_list(data: dict) -> list:
    if "hot_zones" in data:
        return data["hot_zones"]
    return data.get("san_antonio", {}).get("hot_zones_emerging", [])


def build_pack(data: dict, target_date: datetime) -> str:
    day_name = target_date.strftime("%A")
    date_str = target_date.strftime("%Y-%m-%d")
    summary = one_line_summary(data)
    zones = hot_zones_list(data)
    zone_line = " · ".join(zones[:4]) if zones else "See map for current hot zones"

    weather = data.get("weather_impact", {})
    weather_line = ""
    if weather:
        weather_line = f"{weather.get('condition', '')} · high {weather.get('high_f', '?')}° · {weather.get('shopping_quality', '')}"

    fb_post = f"""🦴 Chica Map — {day_name} update

{summary}

Hot zones right now:
{chr(10).join('• ' + z for z in zones[:5]) if zones else '• Check the live map'}

Open the verified map (free):
https://justonejewelry.github.io/Project-YardBird/map.html

Near Me · Routes · Verified first.
#SanAntonioGarageSale #ChicaMap"""

    ig_caption = f"""{summary}

Hot zones: {zone_line}

Map link in bio → Near Me + multi-stop routes.

#ChicaMap #GarageSale #SanAntonio #YardSale #EstateSale"""

    tt_caption = f"""{summary}

{zone_line} energy this weekend.

Map in bio. Get there early.

#ChicaMap #GarageSaleFinds #SanAntonio"""

    primary_zone = zones[0] if zones else "hot zones"
    firefly_prompt = f"""Clean vertical 9:16 map animation for Chica Garage Sale Map.
Start on a clean San Antonio street map view.
Smooth zoom toward the cluster of {primary_zone}.
Subtle pin drops appear one by one in the hot zones.
Soft green verified glow on pins.
Final frame: bold text overlay "{day_name} Hot Zones" with the Chica watermark bottom-left.
Premium, minimal, no clutter, soft lighting, high-end product feel.
Duration 5 seconds, 24fps."""

    pack = f"""# Chica Daily Pack — {day_name} {date_str}

## Header
{summary}

Zones: {zone_line}
{weather_line}

## Facebook
{fb_post}

## Instagram
{ig_caption}

## TikTok
{tt_caption}

## Video Scripts

### 15–20s (primary)
[Selene / Chica voice]
"Hey, it's {day_name}. {summary}
I'm seeing the strongest energy in {zone_line}.
Open Chica, hit Near Me, build your route, and get there before the heat.
Link in bio — verified first."

### 35–45s (optional)
[longer version with more zone color and one specific highlight if available]

## Adobe Firefly Motion Pack

**Primary 9:16 prompt**
{firefly_prompt}

**Settings**
- Model: Firefly Video
- Aspect: 9:16
- Duration: 5s
- Motion: Zoom in + subtle pan (or use Motion Reference of a clean map fly-over)
- Start frame: clean map screenshot centered on San Antonio

**Post-generation**
- Add official Chica watermark bottom-left
- Export 1080×1920

## Visual Checklist
- [ ] Fresh map screenshot (hot zones visible)
- [ ] Watermark applied
- [ ] 9:16 vertical

## Posting Commands
```bash
python scripts/content-packs/post-social.sh facebook
python scripts/content-packs/post-social.sh instagram
python scripts/content-packs/post-social.sh tiktok
```

## Human Touch
Add one personal observation before you post (something you noticed on the map or a neighborhood note).
"""
    return pack


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate Chica daily content pack")
    parser.add_argument("--date", help="Target date YYYY-MM-DD")
    parser.add_argument("--output-dir", default="packs", help="Output directory for packs")
    parser.add_argument("--repo-mode", action="store_true", help="Run relative to repo root")
    args = parser.parse_args()

    repo_root = Path.cwd()
    if not (repo_root / "forecast").exists() and (repo_root / "Project-YardBird" / "forecast").exists():
        repo_root = repo_root / "Project-YardBird"

    forecast_path = find_latest_forecast(repo_root)
    print(f"Using forecast: {forecast_path}")
    data = load_forecast(forecast_path)

    if args.date:
        target = datetime.strptime(args.date, "%Y-%m-%d")
    else:
        today = datetime.now()
        # Default to next Saturday
        days_ahead = (5 - today.weekday()) % 7
        if days_ahead == 0:
            days_ahead = 7
        target = today + timedelta(days=days_ahead)

    pack_content = build_pack(data, target)

    out_root = Path(args.output_dir)
    day_folder = out_root / f"{target.strftime('%Y-%m-%d')}-{target.strftime('%A')}"
    day_folder.mkdir(parents=True, exist_ok=True)
    out_file = day_folder / "pack.md"
    out_file.write_text(pack_content, encoding="utf-8")

    print(f"\n✓ Pack written to:\n  {out_file}")
    print("\nNext:")
    print("  ./scripts/content-packs/post-social.sh facebook")
    print("  ./scripts/content-packs/post-social.sh instagram")
    print("  ./scripts/content-packs/post-social.sh tiktok")


if __name__ == "__main__":
    main()
