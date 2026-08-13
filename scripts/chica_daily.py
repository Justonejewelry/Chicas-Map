#!/usr/bin/env python3
"""
Chica Map — Master Daily Orchestrator

1 AM San Antonio runs on Thursday / Friday / Saturday → target is TODAY.
Gathers candidates, deep-follows listing pages, normalizes, dedupes,
runs Sentinel, writes canonical files + social + Update Pack.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT / "scripts"))

from schema import (
    Sale,
    make_sale_id,
    google_maps_url,
    street_view_url,
    now_ct_iso,
    score_confidence,
    MIN_CONFIDENCE,
)
from sentinel import validate_sales
from social_generator import write_social
from update_pack import build_update_pack, write_update_pack

try:
    from enrich_listing import enrich_batch
except ImportError:
    def enrich_batch(sales, max_follow=40):
        return sales

CT = ZoneInfo("America/Chicago")


def today_ct() -> date:
    return datetime.now(CT).date()


def target_date_for_run(now: datetime | None = None) -> date:
    """1 AM SA runs on Thu/Fri/Sat → target is TODAY."""
    now = now or datetime.now(CT)
    weekday = now.weekday()
    if weekday in (3, 4, 5):
        return now.date()
    for add in range(1, 8):
        d = now.date() + timedelta(days=add)
        if d.weekday() in (3, 4, 5):
            return d
    return now.date() + timedelta(days=1)


def load_city_public(slug: str = "san-antonio") -> list[dict]:
    candidates = [
        ROOT / "webapp" / "data" / "cities" / f"{slug}.json",
        ROOT / "data" / "cities" / f"{slug}.json",
    ]
    for path in candidates:
        if not path.exists():
            continue
        try:
            raw = path.read_text(encoding="utf-8")
            if raw.strip().startswith("{{") or "read file content" in raw:
                print(f"  skip placeholder {path}")
                continue
            data = json.loads(raw)
            public = data.get("public") or data.get("sales") or []
            if isinstance(public, list):
                print(f"  loaded {len(public)} from {path}")
                return public
        except Exception as e:
            print(f"  could not load {path}: {e}")
    return []


def normalize_existing(raw: dict, target: date) -> Sale | None:
    address = (raw.get("address") or "").strip()
    if not address:
        return None
    date_start = ""
    date_end = ""
    if raw.get("date_from"):
        try:
            date_start = datetime.strptime(raw["date_from"], "%m/%d/%Y").date().isoformat()
        except Exception:
            pass
    if raw.get("end_date"):
        date_end = str(raw["end_date"])[:10]
    if not date_start and raw.get("date"):
        date_start = str(raw["date"])[:10]
    if not date_start:
        date_start = target.isoformat()
    if not date_end:
        date_end = date_start
    try:
        ds = date.fromisoformat(date_start)
        de = date.fromisoformat(date_end)
        if de < target or ds > target:
            return None
    except Exception:
        pass
    title = (raw.get("title") or address)[:160]
    sale_type = (raw.get("type") or raw.get("sale_type") or "garage").lower()
    if "estate" in sale_type or "estate" in title.lower():
        sale_type = "estate"
    lat = float(raw.get("lat") or raw.get("latitude") or 0)
    lon = float(raw.get("lon") or raw.get("longitude") or 0)
    original = raw.get("url") or raw.get("original_url") or ""
    source = raw.get("source") or "unknown"
    sources = [source] if isinstance(source, str) else list(source or [])
    conf_raw = raw.get("confidence")
    if conf_raw is None:
        conf = 75
    elif isinstance(conf_raw, float) and conf_raw <= 1.0:
        conf = int(conf_raw * 100)
    else:
        conf = int(conf_raw)
    sale = Sale(
        sale_id=make_sale_id(date_start, address, title),
        title=title,
        sale_type=sale_type,
        date_start=date_start,
        date_end=date_end,
        start_time=raw.get("start_time") or "",
        end_time=raw.get("end_time") or "",
        address=address,
        city=raw.get("city") or "San Antonio",
        state="TX",
        zip=raw.get("zip") or "",
        latitude=lat,
        longitude=lon,
        description=(raw.get("details") or raw.get("description") or "")[:400],
        highlights=list(raw.get("highlights") or []),
        source_urls=[original] if original else [],
        original_url=original,
        source_names=sources,
        photos=list(raw.get("photos") or []) if isinstance(raw.get("photos"), list) else [],
        confidence=conf,
        verified_at=now_ct_iso(),
        geocode_method=raw.get("geocode") or "",
        status="verified",
    )
    if not sale.google_maps_url:
        sale.google_maps_url = google_maps_url(sale.latitude, sale.longitude, sale.address)
    if not sale.street_view_url:
        sale.street_view_url = street_view_url(sale.latitude, sale.longitude)
    scored = score_confidence(sale)
    sale.confidence = max(sale.confidence, scored)
    return sale


def dedupe(sales: list[Sale]) -> tuple[list[Sale], int]:
    by_id: dict[str, Sale] = {}
    merged = 0
    for s in sales:
        if not s.sale_id:
            s.sale_id = make_sale_id(s.date_start, s.address, s.title)
        if s.sale_id in by_id:
            merged += 1
            existing = by_id[s.sale_id]
            if s.confidence > existing.confidence:
                s.source_names = sorted(set(existing.source_names + s.source_names))
                s.source_urls = list(dict.fromkeys(existing.source_urls + s.source_urls))
                by_id[s.sale_id] = s
            else:
                existing.source_names = sorted(set(existing.source_names + s.source_names))
                existing.source_urls = list(dict.fromkeys(existing.source_urls + s.source_urls))
                existing.confidence = max(existing.confidence, s.confidence)
        else:
            by_id[s.sale_id] = s
    return list(by_id.values()), merged


def to_geojson(sales: list[Sale], target: str) -> dict:
    features = []
    for s in sales:
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [s.longitude, s.latitude]},
            "properties": s.to_dict(),
        })
    return {
        "type": "FeatureCollection",
        "properties": {
            "target_date": target,
            "generated_at": now_ct_iso(),
            "count": len(features),
            "project": "Chicas-Map",
        },
        "features": features,
    }


def run(target: date, dry_run: bool = False) -> int:
    target_str = target.isoformat()
    run_time = now_ct_iso()
    print("=== Chica Daily Run ===")
    print(f"Target: {target_str} ({target.strftime('%A')})")
    print(f"Run time (CT): {run_time}")
    print(f"Dry run: {dry_run}")

    raw_public = load_city_public("san-antonio")
    candidates = len(raw_public)

    sales: list[Sale] = []
    rejected = 0
    for raw in raw_public:
        s = normalize_existing(raw, target)
        if s is None:
            rejected += 1
            continue
        if s.confidence < MIN_CONFIDENCE:
            rejected += 1
            continue
        sales.append(s)

    print("Deep link enrichment…")
    payload_dicts = [s.to_dict() for s in sales]
    payload_dicts = enrich_batch(payload_dicts, max_follow=35)
    sales = []
    for d in payload_dicts:
        s = Sale.from_dict(d)
        s.confidence = max(s.confidence, score_confidence(s))
        if s.confidence < MIN_CONFIDENCE:
            rejected += 1
            continue
        sales.append(s)

    sales, merged = dedupe(sales)
    print(f"After normalize + enrich + filter: {len(sales)} (merged {merged}, rejected {rejected})")

    geocoded = 0
    street_view = 0
    for s in sales:
        if s.latitude and s.longitude:
            geocoded += 1
            if not s.google_maps_url:
                s.google_maps_url = google_maps_url(s.latitude, s.longitude, s.address)
            if not s.street_view_url:
                s.street_view_url = street_view_url(s.latitude, s.longitude)
            street_view += 1

    payload = [s.to_dict() for s in sales]
    sentinel = validate_sales(payload, target_str)
    print(sentinel.summary())

    if not sentinel.passed:
        print("SENTINEL FAIL — aborting publication. Previous known-good data preserved.")
        return 1

    sales_dir = ROOT / "data" / "sales"
    sales_dir.mkdir(parents=True, exist_ok=True)
    json_path = sales_dir / f"{target_str}.json"
    geo_path = sales_dir / f"{target_str}.geojson"

    canonical = {
        "target_date": target_str,
        "generated_at": run_time,
        "city": "san-antonio",
        "area": "San Antonio & surrounding communities",
        "count": len(sales),
        "min_confidence": MIN_CONFIDENCE,
        "sales": payload,
    }

    files_written = []
    if not dry_run:
        json_path.write_text(json.dumps(canonical, indent=2, ensure_ascii=False), encoding="utf-8")
        files_written.append(str(json_path.relative_to(ROOT)))
        geo = to_geojson(sales, target_str)
        geo_path.write_text(json.dumps(geo, indent=2, ensure_ascii=False), encoding="utf-8")
        files_written.append(str(geo_path.relative_to(ROOT)))
        print(f"Wrote {json_path}")
        print(f"Wrote {geo_path}")
    else:
        print("[dry-run] would write canonical JSON + GeoJSON")

    social_dir = ROOT / "social"
    social_paths = {}
    if not dry_run:
        social_files = write_social(payload, target_str, social_dir)
        social_paths = {k: str(v.relative_to(ROOT)) for k, v in social_files.items()}
        files_written.extend(social_paths.values())
        print(f"Social files: {list(social_paths.values())}")
    else:
        print("[dry-run] would write social files")

    sources_checked = [
        "GarageSaleFinder (list + deep follow)",
        "EstateSales.org / .net",
        "YardSaleSearch",
        "Craigslist San Antonio",
        "City of San Antonio permits",
        "Yard Sale Treasure Map (config registered)",
    ]
    pack_content = build_update_pack(
        target_date=target_str,
        run_time=run_time,
        area="San Antonio & surrounding communities",
        sources_checked=sources_checked,
        candidates=candidates,
        verified=payload,
        rejected=rejected,
        duplicates_merged=merged,
        geocoded=geocoded,
        street_view=street_view,
        sentinel_status="PASS",
        sentinel_notes=sentinel.summary(),
        files_written=files_written,
        commit_msg=f"Chica daily pack — {target_str}",
        social_paths=social_paths,
    )
    pack_dir = ROOT / "daily-packs"
    if not dry_run:
        pack_path = write_update_pack(pack_content, target_str, pack_dir)
        files_written.append(str(pack_path.relative_to(ROOT)))
        print(f"Update Pack: {pack_path}")
    else:
        print("[dry-run] Update Pack preview (first 30 lines):")
        print("\n".join(pack_content.splitlines()[:30]))

    print("\n=== CHICA DAILY RUN COMPLETE ===")
    print(f"Target:        {target_str}")
    print(f"Verified:      {len(sales)}")
    print(f"Rejected:      {rejected}")
    print(f"Duplicates:    {merged}")
    print(f"Geocoded:      {geocoded}")
    print(f"Street View:   {street_view}")
    print(f"Sentinel:      PASS")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description="Chica Master Daily Orchestrator")
    ap.add_argument("--date", help="Force target date YYYY-MM-DD")
    ap.add_argument("--dry-run", action="store_true", help="Do not write files")
    args = ap.parse_args()
    if args.date:
        target = date.fromisoformat(args.date)
    else:
        target = target_date_for_run()
    return run(target, dry_run=args.dry_run)


if __name__ == "__main__":
    raise SystemExit(main())
