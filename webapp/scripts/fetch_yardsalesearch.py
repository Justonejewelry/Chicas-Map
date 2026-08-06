#!/usr/bin/env python3
"""Free YardSaleSearch.com discovery for YardBird / GSIN.

Parses schema.org Place / PostalAddress / GeoCoordinates + startDate/endDate
from city list pages. No API key. No paid services.

Uses city_io middleware so PLACEHOLDER / corrupt JSON never crashes the job.

Usage:
  python3 webapp/scripts/fetch_yardsalesearch.py --city san-antonio
  python3 webapp/scripts/fetch_yardsalesearch.py --cities san-antonio,austin --dry-run
"""
from __future__ import annotations

import argparse
import html as html_mod
import json
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import date, datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from city_io import safe_load_city, safe_write_city

CT = ZoneInfo("America/Chicago")
UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)
ROOT = Path(__file__).resolve().parents[1]
CITY_DIR = ROOT / "data" / "cities"

CITY_CFG = {
    "san-antonio": {
        "name": "San Antonio",
        "url": "https://www.yardsalesearch.com/garage-sales-san-antonio-tx.html",
        "state": "TX",
        "center": (29.4241, -98.4936),
        "allow_cities": {
            "san antonio", "boerne", "schertz", "cibolo", "converse",
            "live oak", "universal city", "helotes", "fair oaks ranch",
            "marion", "new braunfels", "selma", "windcrest",
        },
    },
    "austin": {
        "name": "Austin",
        "url": "https://www.yardsalesearch.com/garage-sales-austin-tx.html",
        "state": "TX",
        "center": (30.2672, -97.7431),
        "allow_cities": {
            "austin", "round rock", "cedar park", "pflugerville",
            "georgetown", "kyle", "buda", "leander",
        },
    },
    "houston": {
        "name": "Houston",
        "url": "https://www.yardsalesearch.com/garage-sales-houston-tx.html",
        "state": "TX",
        "center": (29.7604, -95.3698),
        "allow_cities": {
            "houston", "pasadena", "pearland", "sugar land",
            "the woodlands", "katy", "cypress", "spring",
        },
    },
}


def today_ct() -> date:
    return datetime.now(CT).date()


def fetch(url: str) -> tuple[int, str]:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": UA,
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "en-US,en;q=0.9",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=35) as resp:
            return resp.status, resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace") if e.fp else ""
        return e.code, body
    except Exception as e:
        return 0, str(e)


def normalize_key(a: str) -> str:
    return re.sub(r"[^a-z0-9]", "", (a or "").lower())[:48]


def parse_listings(html: str, cfg: dict) -> list[dict]:
    """Extract schema.org-backed sale cards."""
    sales: list[dict] = []
    blocks = re.split(r'class="[^"]*sale-details[^"]*"', html)
    for block in blocks[1:]:
        title_m = re.search(
            r'itemprop="name"[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>([^<]+)</a>',
            block,
            re.I,
        )
        if not title_m:
            title_m = re.search(
                r'itemprop="name"[^>]*>\s*([^<]{4,160})',
                block,
                re.I,
            )
            url = ""
            title = html_mod.unescape(title_m.group(1)).strip() if title_m else ""
        else:
            url = title_m.group(1).strip()
            title = html_mod.unescape(title_m.group(2)).strip()
            title = re.sub(r"\s*\(\s*\d+\s*photos?\s*\)\s*$", "", title, flags=re.I)

        street_m = re.search(r'itemprop="streetAddress">([^<]+)</span>', block)
        city_m = re.search(r'itemprop="addressLocality">([^<]+)</span>', block)
        regions = re.findall(r'itemprop="addressRegion">([^<]+)</span>', block)
        lat_m = re.search(r'itemprop="latitude"\s+content="([^"]+)"', block)
        lon_m = re.search(r'itemprop="longitude"\s+content="([^"]+)"', block)
        start_m = re.search(r'itemprop="startDate"\s+content="([^"]+)"', block)
        end_m = re.search(r'itemprop="endDate"\s+content="([^"]+)"', block)
        when_m = re.search(r"<strong>When:</strong>\s*([^<]+)", block)

        if not street_m and not city_m:
            continue

        street = (street_m.group(1).strip() if street_m else "")
        city = (city_m.group(1).strip() if city_m else cfg["name"])
        state = cfg["state"]
        zipc = ""
        for r in regions:
            r = r.strip()
            if re.fullmatch(r"\d{5}", r):
                zipc = r
            elif re.fullmatch(r"[A-Z]{2}", r):
                state = r

        allow = cfg.get("allow_cities") or {cfg["name"].lower()}
        if city.lower() not in allow and cfg["name"].lower() not in city.lower():
            continue

        if street:
            address = f"{street}, {city}, {state} {zipc}".strip()
        else:
            address = f"{city}, {state} {zipc}".strip()

        start = (start_m.group(1)[:10] if start_m else None)
        end = (end_m.group(1)[:10] if end_m else start)
        if not start and when_m:
            dates = re.findall(r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),\s*(\d{4})", when_m.group(1), re.I)
            months = {
                "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
                "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
            }
            parsed = []
            for mon, day, year in dates:
                parsed.append(f"{year}-{months[mon[:3].lower()]:02d}-{int(day):02d}")
            if parsed:
                start = parsed[0]
                end = parsed[-1]

        if not start:
            start = today_ct().isoformat()
        if not end:
            end = start

        try:
            lat = float(lat_m.group(1)) if lat_m else None
            lon = float(lon_m.group(1)) if lon_m else None
        except (TypeError, ValueError):
            lat = lon = None

        geocode = "source"
        if lat is None or lon is None:
            lat, lon = cfg["center"]
            geocode = "city-center"

        if url and not url.startswith("http"):
            url = "https://www.yardsalesearch.com" + url

        is_estate = bool(re.search(r"estate|auction|heirloom|liquidat", title or "", re.I))
        sale_type = "estate" if is_estate else "garage"
        confidence = 0.88 if geocode == "source" and street else 0.70

        sales.append(
            {
                "address": address,
                "dates": f"{start} – {end}",
                "date_from": start,
                "date_to": end,
                "end_date": end,
                "hours": None,
                "title": (title or f"{sale_type.title()} sale")[:160],
                "details": "",
                "source": "YardSaleSearch",
                "url": url or cfg["url"],
                "photos": 0,
                "type": sale_type,
                "categories": ["estate-sale"] if is_estate else ["garage-sale"],
                "confidence": confidence,
                "status": "verified",
                "lat": lat,
                "lon": lon,
                "geocode": geocode,
                "in_person": True,
                "external_id": f"yss-{normalize_key(address)}-{start}",
            }
        )
    return sales


def merge(slug: str, sales: list[dict], today: date) -> tuple[int, int]:
    # Middleware: never crashes on PLACEHOLDER / corrupt JSON
    data = safe_load_city(slug)

    by_key: dict[str, dict] = {}
    for s in data.get("public") or []:
        k = normalize_key(s.get("address") or s.get("title") or "")
        if k:
            by_key[k] = s
        eid = s.get("external_id")
        if eid:
            by_key[f"id:{eid}"] = s

    added = 0
    for s in sales:
        try:
            if s.get("end_date") and date.fromisoformat(s["end_date"]) < today:
                continue
        except ValueError:
            pass

        keys = []
        if s.get("external_id"):
            keys.append(f"id:{s['external_id']}")
        keys.append(normalize_key(s.get("address") or s.get("title") or ""))

        existing = None
        for k in keys:
            if k and k in by_key:
                existing = by_key[k]
                break

        if existing is not None:
            for f in (
                "dates", "date_from", "date_to", "end_date", "hours", "title",
                "url", "source", "details", "lat", "lon", "geocode", "type",
                "external_id",
            ):
                if s.get(f) is not None:
                    existing[f] = s[f]
            existing["status"] = "verified"
            existing["confidence"] = max(
                float(existing.get("confidence") or 0), float(s.get("confidence") or 0)
            )
            existing["categories"] = list(
                set((existing.get("categories") or []) + (s.get("categories") or []))
            )
        else:
            k = keys[0] if keys[0] else normalize_key(s.get("title") or "x")
            by_key[k] = s
            added += 1

    unique: list[dict] = []
    seen: set[int] = set()
    for s in by_key.values():
        oid = id(s)
        if oid in seen:
            continue
        seen.add(oid)
        try:
            if s.get("end_date") and date.fromisoformat(s["end_date"]) < today:
                continue
        except ValueError:
            pass
        unique.append(s)

    data["public"] = unique
    data["total_locations"] = len(unique) + len(data.get("permits") or [])
    data["date"] = today.isoformat()
    data["last_refresh"] = datetime.now(CT).isoformat(timespec="seconds")
    data["status"] = "live"
    data["sources"] = sorted(set(data.get("sources") or []) | {"yardsalesearch.com"})
    data["city"] = slug
    safe_write_city(slug, data)
    return added, len(unique)


def discover(slug: str) -> list[dict]:
    cfg = CITY_CFG[slug]
    url = cfg["url"]
    print(f"[{slug}] YardSaleSearch {url}")
    code, html = fetch(url)
    print(f"  page → HTTP {code} ({len(html)} bytes)")
    if code != 200:
        print(f"  WARN: non-200; skipping ({code})", file=sys.stderr)
        return []
    sales = parse_listings(html, cfg)
    print(f"  normalized={len(sales)}")
    return sales


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--city", default="san-antonio")
    ap.add_argument("--cities", default="")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    cities = [c.strip() for c in (args.cities or args.city).split(",") if c.strip()]
    today = today_ct()
    print(f"fetch_yardsalesearch {today.isoformat()} cities={cities}")
    for slug in cities:
        if slug not in CITY_CFG:
            print(f"unknown {slug}", file=sys.stderr)
            continue
        sales = discover(slug)
        time.sleep(0.8)
        if args.dry_run:
            print(json.dumps(sales[:8], indent=2)[:1500])
            continue
        added, live = merge(slug, sales, today)
        print(f"  merge added={added} public_live={live}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
