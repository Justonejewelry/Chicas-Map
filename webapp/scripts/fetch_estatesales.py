#!/usr/bin/env python3
"""Lightweight EstateSales.net discovery for Chicas-Map / GSIN.
SPA-heavy site; free HTTP often thin. Estate sales primarily come from EstateSales.org.
Uses city_io middleware so PLACEHOLDER / corrupt JSON never crashes the job.
Usage: python3 webapp/scripts/fetch_estatesales.py --city san-antonio
"""
from __future__ import annotations
import argparse, json, re, sys, time, urllib.error, urllib.parse, urllib.request
from datetime import date, datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from city_io import safe_load_city, safe_write_city

CT = ZoneInfo("America/Chicago")
UA = "Mozilla/5.0 (compatible; ChicasMapBot/1.1; +https://github.com/Justonejewelry/Chicas-Map)"
ROOT = Path(__file__).resolve().parents[1]
CITY_DIR = ROOT / "data" / "cities"
CITY_CFG = {
    "san-antonio": {"name": "San Antonio", "path": "/TX/San-Antonio", "state": "TX", "center": (29.4241, -98.4936)},
    "austin": {"name": "Austin", "path": "/TX/Austin", "state": "TX", "center": (30.2672, -97.7431)},
    "houston": {"name": "Houston", "path": "/TX/Houston", "state": "TX", "center": (29.7604, -95.3698)},
}

def today_ct() -> date:
    return datetime.now(CT).date()

def fetch(url: str, accept: str = "text/html,application/json") -> tuple[int, str]:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": accept, "Referer": "https://www.estatesales.net/"})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status, resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        return e.code, (e.read().decode("utf-8", errors="replace") if e.fp else "")
    except Exception as e:
        return 0, str(e)

def normalize_key(a: str) -> str:
    return re.sub(r"[^a-z0-9]", "", (a or "").lower())[:48]

def normalize_sale(raw: dict, cfg: dict) -> dict | None:
    title = raw.get("title") or raw.get("name") or raw.get("saleName") or "Estate sale"
    address = raw.get("address") or raw.get("saleAddress") or raw.get("street") or ""
    if isinstance(address, dict):
        address = address.get("street") or address.get("formatted") or ""
    city, state = raw.get("city") or cfg["name"], raw.get("state") or cfg["state"]
    zipc = str(raw.get("zip") or raw.get("zipCode") or raw.get("zipcode") or "")
    if address and city.lower() not in address.lower():
        address = f"{address}, {city}, {state} {zipc}".strip()
    def to_iso(s):
        s = str(s or "")[:19]
        m = re.search(r"(\d{4}-\d{2}-\d{2})", s)
        if m: return m.group(1)
        for fmt in ("%Y-%m-%d", "%m/%d/%Y"):
            try: return datetime.strptime(s[:10], fmt).date().isoformat()
            except ValueError: pass
        return today_ct().isoformat()
    start = to_iso(raw.get("start_date") or raw.get("startDate") or "")
    end = to_iso(raw.get("end_date") or raw.get("endDate") or start)
    lat, lon = raw.get("lat") or raw.get("latitude"), raw.get("lon") or raw.get("longitude") or raw.get("lng")
    try: lat, lon = (float(lat) if lat is not None else None), (float(lon) if lon is not None else None)
    except (TypeError, ValueError): lat = lon = None
    geocode = "source"
    if not lat or not lon:
        lat, lon = cfg["center"]; geocode = "city-center"
    url = raw.get("url") or raw.get("sale_url") or ""
    if url and not str(url).startswith("http"): url = "https://www.estatesales.net" + str(url)
    photos = raw.get("picture_count") or raw.get("photos") or 0
    try: photos = int(photos)
    except (TypeError, ValueError): photos = 0
    company = raw.get("company") or raw.get("companyName") or ""
    details = (raw.get("description") or raw.get("description_excerpt") or "")[:400]
    if company: details = f"{company}. {details}".strip()
    if not address and not title: return None
    return {
        "address": address or f"{cfg['name']}, {cfg['state']}",
        "dates": f"{start} – {end}", "date_from": start, "date_to": end, "end_date": end,
        "title": str(title)[:160], "details": details, "source": "EstateSales.net",
        "url": url or f"https://www.estatesales.net{cfg['path']}", "photos": photos,
        "type": "estate", "categories": ["estate-sale"],
        "confidence": 0.88 if geocode == "source" else 0.65, "status": "verified",
        "lat": lat, "lon": lon, "geocode": geocode, "company": company or None,
    }

def try_api(cfg):
    city_q = urllib.parse.quote(cfg["name"])
    urls = [
        f"https://www.estatesales.net/api/sales?state={cfg['state']}&city={city_q}",
        f"https://www.estatesales.net/api/v1/sales?state={cfg['state']}&city={city_q}",
    ]
    out = []
    for url in urls:
        code, body = fetch(url, accept="application/json")
        host = urllib.parse.urlparse(url).netloc
        print(f"  probe {host} → HTTP {code}")
        if code != 200: continue
        try: data = json.loads(body)
        except json.JSONDecodeError: continue
        items = data if isinstance(data, list) else data.get("sales") or data.get("items") or data.get("results") or []
        if isinstance(items, list):
            out.extend([i for i in items if isinstance(i, dict)])
            if out: break
        time.sleep(0.5)
    return out

def parse_embedded(html):
    found = []
    for m in re.finditer(r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', html, re.S|re.I):
        try:
            blob = json.loads(m.group(1))
            if isinstance(blob, dict): found.append(blob)
            elif isinstance(blob, list): found.extend([x for x in blob if isinstance(x, dict)])
        except json.JSONDecodeError: pass
    return found

def merge(slug, sales, today):
    data = safe_load_city(slug)
    by_key = {normalize_key(s.get("address") or s.get("title") or ""): s for s in (data.get("public") or [])}
    added = 0
    for s in sales:
        try:
            if date.fromisoformat(s.get("end_date") or "") < today: continue
        except ValueError: pass
        k = normalize_key(s.get("address") or s.get("title") or "")
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
    data["sources"] = sorted(set(data.get("sources") or []) | {"estatesales.net"})
    data["city"] = slug
    safe_write_city(slug, data)
    return added, len(kept)

def discover(slug):
    cfg = CITY_CFG[slug]
    print(f"[{slug}] EstateSales.net path={cfg['path']}")
    raw = try_api(cfg)
    code, html = fetch(f"https://www.estatesales.net{cfg['path']}")
    print(f"  page → HTTP {code} ({len(html)} bytes)")
    if code == 200: raw.extend(parse_embedded(html))
    seen, out = set(), []
    for r in raw:
        s = normalize_sale(r, cfg)
        if not s: continue
        k = normalize_key(s["address"])
        if k in seen: continue
        seen.add(k); out.append(s)
    print(f"  normalized={len(out)}")
    if not out:
        print("  NOTE: SPA often returns 0. Primary estate coverage is fetch_estatesales_org.py.", file=sys.stderr)
    return out

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--city", default="san-antonio")
    ap.add_argument("--cities", default="")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    cities = [c.strip() for c in (args.cities or args.city).split(",") if c.strip()]
    today = today_ct()
    print(f"fetch_estatesales {today.isoformat()} cities={cities}")
    for slug in cities:
        if slug not in CITY_CFG:
            print(f"unknown {slug}", file=sys.stderr); continue
        sales = discover(slug)
        if args.dry_run:
            print(f"  dry-run: {len(sales)} normalized sales (details omitted)")
            continue
        added, live = merge(slug, sales, today)
        print(f"  merge added={added} public_live={live}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
