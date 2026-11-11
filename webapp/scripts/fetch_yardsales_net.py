#!/usr/bin/env python3
"""yardsales.net San Antonio listings (Treasure Listings family).

City page: https://yardsales.net/san-antonio-tx/
Same family as YardSaleSearch, GarageSaleFinder, and gsalr — hard-deduped
against those sources at merge time. GitHub Actions runners often get HTTP
403; that is a soft failure (warn, snapshot, exit 0).

Usage:
  python3 webapp/scripts/fetch_yardsales_net.py --city san-antonio
  python3 webapp/scripts/fetch_yardsales_net.py --city san-antonio --dry-run
"""
from __future__ import annotations

import argparse
import html as html_mod
import json
import re
import sys
from datetime import date
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from source_common import (  # noqa: E402
    ALLOW_CITIES,
    abs_url,
    build_sale,
    extract_hours,
    family_duplicate,
    fetch,
    geocode_sale,
    iso_date,
    load_overlay_sales,
    merge_sales,
    save_snapshot,
    sale_type_from_text,
    strip_tags,
    today_ct,
    nominatim_geocode,
    valid_coords,
)

BASE = "https://yardsales.net"
CITY_URL = f"{BASE}/san-antonio-tx/"
SOURCE_NAME = "yardsales.net"
SOURCE_TAG = "yardsales-net"

CITY_CFG = {
    "san-antonio": {
        "name": "San Antonio",
        "url": CITY_URL,
        "state": "TX",
    },
}


def _meta(block: str, prop: str) -> str:
    pat = (
        r'(?:itemprop="' + re.escape(prop) + r'"[^>]*?content="([^"]*)"'
        r'|content="([^"]*)"[^>]*?itemprop="' + re.escape(prop) + r'"'
        r'|itemprop="' + re.escape(prop) + r'"[^>]*>([^<]*))'
    )
    m = re.search(pat, block, re.I)
    if not m:
        return ""
    return html_mod.unescape(next((g for g in m.groups() if g), "") or "").strip()


def parse_listings(html: str) -> list[dict]:
    ads: list[dict] = []
    seen: set[str] = set()
    parts = re.split(r'itemtype="https://schema.org/Event"', html or "")
    for block in parts[1:]:
        name = _meta(block, "name") or "Garage sale"
        title_m = re.search(
            r'class="[^"]*card__title[^"]*"[\s\S]{0,400}?itemprop="name"[^>]*>([^<]+)',
            block,
            re.I,
        )
        if title_m and title_m.group(1).strip():
            name = html_mod.unescape(title_m.group(1)).strip()
        street = _meta(block, "streetAddress")
        city = _meta(block, "addressLocality")
        region = _meta(block, "addressRegion") or "TX"
        zipc = _meta(block, "postalCode")
        start = (_meta(block, "startDate") or "")[:10]
        end = (_meta(block, "endDate") or start)[:10]
        desc = _meta(block, "description")
        if not desc:
            dm = re.search(r'itemprop="description"[^>]*>([\s\S]*?)</(?:div|p|span)>', block, re.I)
            if dm:
                desc = strip_tags(dm.group(1))
        try:
            lat = float(_meta(block, "latitude")) if _meta(block, "latitude") else None
            lon = float(_meta(block, "longitude")) if _meta(block, "longitude") else None
        except ValueError:
            lat = lon = None
        href_m = re.search(r'href="(/s/[A-Za-z0-9]+)"', block)
        if not href_m:
            href_m = re.search(r'href="(https://yardsales\.net/s/[A-Za-z0-9]+)"', block)
        url = abs_url(href_m.group(1), BASE) if href_m else CITY_URL
        slug = ""
        sm = re.search(r"/s/([A-Za-z0-9]+)", url)
        if sm:
            slug = sm.group(1)
        key = slug or f"{street}|{start}"
        if key in seen:
            continue
        seen.add(key)
        ads.append(
            {
                "title": name,
                "street": street,
                "city": city,
                "region": region,
                "zip": zipc,
                "start": start,
                "end": end,
                "description": desc,
                "lat": lat,
                "lon": lon,
                "url": url,
                "slug": slug,
            }
        )
    return ads


def normalize_ad(listing: dict, today: date, geocode: bool = False) -> tuple[dict | None, str]:
    street = (listing.get("street") or "").strip()
    city = (listing.get("city") or "").strip() or "San Antonio"
    if city.lower() not in ALLOW_CITIES and "san antonio" not in city.lower():
        return None, f"outside SA-area ({city})"
    if not street:
        return None, "no usable street address or clear area"

    start = iso_date(listing.get("start"))
    end = iso_date(listing.get("end")) or start
    if not start or not end:
        return None, "no explicit sale dates"
    if end < start:
        return None, "invalid date range"
    if end < today:
        return None, f"ended {end.isoformat()}"

    zipc = listing.get("zip") or ""
    region = listing.get("region") or "TX"
    has_number = bool(re.match(r"\d", street))
    # Community street name without a house number → area pin.
    is_area = not has_number
    desc = listing.get("description") or ""
    title = listing.get("title") or "Garage sale"
    # Prefer a named community when the description has one.
    comm = re.search(r"\b([A-Z][A-Za-z0-9'’\-]+(?:\s+[A-Z][A-Za-z0-9'’\-]+){0,3})\s+community\b", desc, re.I)
    hoa = re.search(r"\b(?:the\s+)?([A-Z][A-Za-z0-9'’\-]+(?:\s+[A-Z][A-Za-z0-9'’\-]+){0,3})\s+HOA\b", desc, re.I)
    if is_area and comm:
        address = f"{comm.group(1)} community, {city}, {region}".strip()
        area_query = f"{comm.group(1)}, {city}, Texas, USA"
    elif is_area and hoa:
        address = f"{hoa.group(1)} community, {city}, {region}".strip()
        area_query = f"{hoa.group(1)}, {city}, Texas, USA"
    else:
        address = f"{street}, {city}, {region}"
        if zipc:
            address = f"{address} {zipc}"
        area_query = f"{street}, {city}, Texas, USA"

    lat = listing.get("lat")
    lon = listing.get("lon")
    geocode_label = "source" if valid_coords(lat, lon) else ""
    if not geocode_label:
        lat = lon = None
        if geocode:
            lat, lon, geocode_label = geocode_sale(address, area_query, is_area)
            if lat is None and is_area:
                hit = nominatim_geocode(f"{city}, Texas, USA")
                if hit:
                    lat, lon, geocode_label = hit[0], hit[1], "nominatim-city"
            if lat is None:
                return None, "could not geocode"

    slug = listing.get("slug") or ""
    eid = f"ysn-{slug}" if slug else f"ysn-{re.sub(r'[^a-z0-9]', '', address.lower())[:24]}-{start.isoformat()}"
    hours = extract_hours(desc)
    sale = build_sale(
        title=title,
        address=address,
        start=start,
        end=end,
        url=listing.get("url") or CITY_URL,
        source=SOURCE_NAME,
        external_id=eid,
        hours=hours,
        details=desc,
        sale_type=sale_type_from_text(title, desc, is_area=is_area),
        lat=lat,
        lon=lon,
        geocode=geocode_label,
        is_area=is_area,
        confidence=0.8 if (geocode_label in {"source", "census"} and has_number) else 0.68,
    )
    return sale, ""


def discover(slug: str, today: date, geocode: bool) -> tuple[list[dict], list[tuple[dict, str]]]:
    cfg = CITY_CFG.get(slug)
    if not cfg:
        return [], []
    url = cfg["url"]
    print(f"[{slug}] yardsales.net {url}")
    code, html = fetch(url, referer=BASE + "/", retries_429=1, backoff=10)
    print(f"  page → HTTP {code} ({len(html)} bytes)")
    if code == 403:
        print("  WARN: 403 from yardsales.net (common on GitHub runners); failing soft", file=sys.stderr)
        save_snapshot("ysn", slug, code, html, "http403")
        return [], []
    if code != 200:
        print(f"  WARN: non-200; skipping ({code})", file=sys.stderr)
        save_snapshot("ysn", slug, code, html, f"http{code}")
        return [], []
    listings = parse_listings(html)
    print(f"  listings={len(listings)}")
    if not listings:
        save_snapshot("ysn", slug, code, html, "zero")
        return [], []
    accepted, skipped = [], []
    for listing in listings:
        sale, reason = normalize_ad(listing, today, geocode=geocode)
        if sale:
            accepted.append(sale)
        else:
            skipped.append((listing, reason))
    print(f"  normalized={len(accepted)} skipped={len(skipped)}")
    return accepted, skipped


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--city", default="san-antonio")
    ap.add_argument("--cities", default="")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--no-geocode", action="store_true")
    args = ap.parse_args()
    cities = [c.strip() for c in (args.cities or args.city).split(",") if c.strip()]
    today = today_ct()
    print(f"fetch_yardsales_net {today.isoformat()} cities={cities}")
    for slug in cities:
        if slug not in CITY_CFG:
            print(f"  skip {slug} (no yardsales.net city page configured)")
            continue
        sales, skipped = discover(slug, today, geocode=not args.no_geocode)
        for listing, reason in skipped:
            print(f"  skip {listing.get('slug') or listing.get('title')}: {reason}")
        if args.dry_run:
            print(json.dumps(sales, indent=2)[:4000])
            continue
        added, live, merge_skipped = merge_sales(
            slug, sales, today, SOURCE_TAG, skip_family=True, skip_address_overlays=True
        )
        for s, reason in merge_skipped:
            print(f"  skip merge {s.get('external_id')}: {reason}")
        print(f"  merge added={added} public_live={live}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
