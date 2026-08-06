#!/usr/bin/env python3
"""Apify-backed EstateSales.net ingestion for YardBird. Requires APIFY_TOKEN env/secret.
Uses city_io middleware so PLACEHOLDER / corrupt JSON never crashes the job.
Usage: APIFY_TOKEN=... python3 webapp/scripts/fetch_estatesales_apify.py --city san-antonio
Skips cleanly (exit 0) when token missing so map-refresh stays optional.
"""
from __future__ import annotations
import argparse, json, os, re, sys, time, urllib.request
from datetime import date, datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from city_io import safe_load_city, safe_write_city

CT = ZoneInfo("America/Chicago")
ROOT = Path(__file__).resolve().parents[1]
CITY_DIR = ROOT / "data" / "cities"
DEFAULT_ACTOR = "scrapersdelight~estatesales-net-scraper"
APIFY_BASE = "https://api.apify.com/v2"
CITY_CFG = {
    "san-antonio": {"name": "San Antonio", "state": "TX", "center": (29.4241, -98.4936),
                    "search": {"searchMode": "city", "state": "TX", "city": "San Antonio"}},
    "austin": {"name": "Austin", "state": "TX", "center": (30.2672, -97.7431),
               "search": {"searchMode": "city", "state": "TX", "city": "Austin"}},
    "houston": {"name": "Houston", "state": "TX", "center": (29.7604, -95.3698),
                "search": {"searchMode": "city", "state": "TX", "city": "Houston"}},
}

def today_ct(): return datetime.now(CT).date()

def api(method, path, token, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(f"{APIFY_BASE}{path}", data=data, method=method,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json", "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read().decode())

def run_actor(token, actor_id, run_input, wait=180):
    start = api("POST", f"/acts/{actor_id}/runs?waitForFinish={wait}", token, run_input)
    data = start.get("data") or start
    run_id, status = data.get("id"), data.get("status")
    print(f"  actor run id={run_id} status={status}")
    for _ in range(12):
        if status in ("SUCCEEDED", "SUCCEEDED_WITH_WARNINGS", "FAILED", "ABORTED", "TIMED-OUT"): break
        time.sleep(10)
        info = api("GET", f"/actor-runs/{run_id}", token)
        status = (info.get("data") or info).get("status")
        print(f"  poll status={status}")
    if status not in ("SUCCEEDED", "SUCCEEDED_WITH_WARNINGS"):
        raise RuntimeError(f"Apify status={status}")
    ds = data.get("defaultDatasetId") or (api("GET", f"/actor-runs/{run_id}", token).get("data") or {}).get("defaultDatasetId")
    items = api("GET", f"/datasets/{ds}/items?format=json&clean=true", token)
    return items if isinstance(items, list) else items.get("items") or items.get("data") or []

def normalize(item, cfg):
    title = item.get("title") or item.get("name") or item.get("sale") or "Estate sale"
    address = item.get("address") or ""
    city, state = item.get("city") or cfg["name"], item.get("state") or cfg["state"]
    zipc = str(item.get("zipcode") or item.get("zip") or "")
    if address and city.lower() not in address.lower():
        address = f"{address}, {city}, {state} {zipc}".strip()
    start = (item.get("start_date") or item.get("starts") or "")[:10] or today_ct().isoformat()
    end = (item.get("end_date") or item.get("ends") or start)[:10]
    if not re.match(r"\d{4}-\d{2}-\d{2}", start): start = today_ct().isoformat()
    if not re.match(r"\d{4}-\d{2}-\d{2}", end): end = start
    lat, lon = item.get("latitude") or item.get("lat"), item.get("longitude") or item.get("lon")
    try: lat, lon = (float(lat) if lat is not None else None), (float(lon) if lon is not None else None)
    except (TypeError, ValueError): lat = lon = None
    geocode = "source"
    if not lat or not lon: lat, lon = cfg["center"]; geocode = "city-center"
    url = item.get("sale_url") or item.get("url") or ""
    photos = item.get("picture_count") or item.get("photos") or 0
    try: photos = int(photos) if not isinstance(photos, list) else len(photos)
    except (TypeError, ValueError): photos = 0
    company = item.get("company") or item.get("companyName") or ""
    details = (item.get("description_excerpt") or item.get("description") or "")[:400]
    if company: details = f"{company}. {details}".strip()
    if not address and not title: return None
    return {"address": address or f"{cfg['name']}, {cfg['state']}", "dates": f"{start} – {end}",
            "date_from": start, "date_to": end, "end_date": end, "title": str(title)[:160],
            "details": details, "source": "EstateSales.net (Apify)", "url": url, "photos": photos,
            "type": "estate", "categories": ["estate-sale"], "confidence": 0.9 if geocode == "source" else 0.7,
            "status": "verified", "lat": lat, "lon": lon, "geocode": geocode, "company": company or None}

def nkey(a): return re.sub(r"[^a-z0-9]", "", (a or "").lower())[:48]

def merge(slug, sales, today):
    # Middleware: never crashes on PLACEHOLDER / corrupt JSON
    data = safe_load_city(slug)
    by_key = {nkey(s.get("address") or s.get("title") or ""): s for s in (data.get("public") or [])}
    added = 0
    for s in sales:
        try:
            if date.fromisoformat(s.get("end_date") or "") < today: continue
        except ValueError: pass
        k = nkey(s.get("address") or s.get("title") or "")
        if not k: continue
        if k in by_key:
            old = by_key[k]
            for f in ("dates","date_from","date_to","end_date","title","url","source","details","photos","company"):
                if s.get(f) is not None: old[f] = s[f]
            old["type"] = "estate"
            old["categories"] = list(set((old.get("categories") or []) + ["estate-sale"]))
            old["status"] = "verified"
            old["confidence"] = max(float(old.get("confidence") or 0), float(s.get("confidence") or 0))
        else:
            by_key[k] = s; added += 1
    kept = []
    for s in by_key.values():
        try:
            if s.get("end_date") and date.fromisoformat(s["end_date"]) < today: continue
        except ValueError: pass
        kept.append(s)
    data["public"] = kept
    data["total_locations"] = len(kept) + len(data.get("permits") or [])
    data["date"] = today.isoformat()
    data["last_refresh"] = datetime.now(CT).isoformat(timespec="seconds")
    data["status"] = "live"
    data["sources"] = sorted(set(data.get("sources") or []) | {"estatesales.net", "apify"})
    data["city"] = slug
    safe_write_city(slug, data)
    return added, len(kept)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--city", default="san-antonio")
    ap.add_argument("--cities", default="")
    ap.add_argument("--actor", default=DEFAULT_ACTOR)
    ap.add_argument("--radius", type=float, default=0)
    ap.add_argument("--max-items", type=int, default=80)
    args = ap.parse_args()
    token = os.environ.get("APIFY_TOKEN") or os.environ.get("APIFY_API_TOKEN")
    if not token:
        print("APIFY_TOKEN not set — skipping EstateSales.net Apify pull (optional).", file=sys.stderr)
        return 0
    cities = [c.strip() for c in (args.cities or args.city).split(",") if c.strip()]
    today = today_ct()
    print(f"fetch_estatesales_apify {today.isoformat()} cities={cities}")
    for slug in cities:
        if slug not in CITY_CFG:
            print(f"unknown {slug}", file=sys.stderr); continue
        cfg = CITY_CFG[slug]
        run_input = dict(cfg["search"]); run_input["maxItems"] = args.max_items
        if args.radius > 0:
            lat, lon = cfg["center"]
            run_input = {"searchMode": "coordinates", "latitude": lat, "longitude": lon,
                         "radiusMiles": args.radius, "maxItems": args.max_items}
        print(f"[{slug}] starting Apify …")
        try: items = run_actor(token, args.actor, run_input)
        except Exception as e:
            print(f"  Apify failed: {type(e).__name__}: {e}", file=sys.stderr); continue
        print(f"  items={len(items)}")
        sales = [n for it in items if (n := normalize(it, cfg))]
        print(f"  normalized={len(sales)}")
        added, live = merge(slug, sales, today)
        print(f"  merge added={added} public_live={live}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
