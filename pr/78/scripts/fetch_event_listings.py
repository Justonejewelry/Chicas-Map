#!/usr/bin/env python3
"""AllEvents and Eventbrite garage/yard/estate/rummage/moving sales.

Strict title filter and SA-area locations only. Search pages:

  https://allevents.in/san-antonio/garage-sale
  https://allevents.in/san-antonio/rummage-sale
  https://allevents.in/san-antonio/estate-sale
  https://www.eventbrite.com/d/tx--san-antonio/rummage-sale/
  https://www.eventbrite.com/d/tx--san-antonio/garage-sale/
  https://www.eventbrite.com/d/tx--san-antonio/estate-sale/

Usage:
  python3 webapp/scripts/fetch_event_listings.py --city san-antonio
  python3 webapp/scripts/fetch_event_listings.py --city san-antonio --dry-run
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
from datetime import date
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from source_common import (  # noqa: E402
    address_key,
    build_sale,
    extract_hours,
    fetch,
    geocode_sale,
    in_sa_area,
    iso_date,
    merge_sales,
    sale_type_from_text,
    save_snapshot,
    title_is_sale_event,
    today_ct,
    valid_coords,
)

ALLEVENTS_PAGES = [
    "https://allevents.in/san-antonio/garage-sale",
    "https://allevents.in/san-antonio/rummage-sale",
    "https://allevents.in/san-antonio/estate-sale",
    "https://allevents.in/san-antonio/yard-sale",
]
EVENTBRITE_PAGES = [
    "https://www.eventbrite.com/d/tx--san-antonio/rummage-sale/",
    "https://www.eventbrite.com/d/tx--san-antonio/garage-sale/",
    "https://www.eventbrite.com/d/tx--san-antonio/estate-sale/",
    "https://www.eventbrite.com/d/tx--san-antonio/yard-sale/",
]

LOOP_RE = re.compile(r"\bI-?410-?LOOP\b|\bIH-?410\b", re.I)


def _load_ldjson(html: str) -> list[dict]:
    blobs: list[object] = []
    for m in re.finditer(
        r'<script[^>]+type="application/ld\+json"[^>]*>([\s\S]*?)</script>',
        html or "",
        re.I,
    ):
        raw = m.group(1).strip()
        try:
            blobs.append(json.loads(raw))
        except json.JSONDecodeError:
            continue
    events: list[dict] = []

    def walk(obj: object) -> None:
        if isinstance(obj, list):
            for item in obj:
                walk(item)
            return
        if not isinstance(obj, dict):
            return
        typ = obj.get("@type")
        if typ == "Event" or (isinstance(typ, list) and "Event" in typ):
            events.append(obj)
            return
        if typ == "ItemList":
            for el in obj.get("itemListElement") or []:
                if isinstance(el, dict):
                    walk(el.get("item") or el)
            return
        for v in obj.values():
            if isinstance(v, (dict, list)):
                walk(v)

    for blob in blobs:
        walk(blob)
    return events


def _addr_parts(event: dict) -> dict:
    loc = event.get("location") or {}
    if isinstance(loc, list):
        loc = loc[0] if loc else {}
    addr = loc.get("address") if isinstance(loc, dict) else {}
    if isinstance(addr, str):
        addr = {"streetAddress": addr}
    if not isinstance(addr, dict):
        addr = {}
    street = (addr.get("streetAddress") or loc.get("name") or "").strip()
    city = (addr.get("addressLocality") or "").strip()
    region = (addr.get("addressRegion") or "").strip() or "TX"
    zipc = (addr.get("postalCode") or "").strip()
    zm = re.search(r"\b(78\d{3})(?:-\d{4})?\b", street)
    if zm and not zipc:
        zipc = zm.group(1)
    # Drop country / repeated city from the street line
    street = re.sub(r",?\s*United States\s*$", "", street, flags=re.I)
    street = LOOP_RE.sub("Loop 410", street)
    street = re.sub(r",\s*San Antonio,?\s*TX(?:\s+78\d{3}(?:-\d{4})?)?\s*$", "", street, flags=re.I)
    street = street.strip(" ,")
    geo = loc.get("geo") if isinstance(loc, dict) else {}
    try:
        lat = float(geo.get("latitude")) if geo and geo.get("latitude") not in (None, "") else None
        lon = float(geo.get("longitude")) if geo and geo.get("longitude") not in (None, "") else None
    except (TypeError, ValueError):
        lat = lon = None
    return {
        "street": street,
        "city": city,
        "region": region,
        "zip": zipc,
        "lat": lat,
        "lon": lon,
        "place_name": (loc.get("name") if isinstance(loc, dict) else "") or "",
    }


def _event_id(url: str, source: str) -> str:
    if source == "AllEvents":
        m = re.search(r"/(\d{8,})/?$", url or "")
        if m:
            return f"ae-{m.group(1)}"
        return f"ae-{re.sub(r'[^a-z0-9]', '', (url or '')[-24:].lower())}"
    m = re.search(r"tickets-(\d+)", url or "")
    if m:
        return f"eb-{m.group(1)}"
    m = re.search(r"/e/[^/]*?(\d{10,})/?$", url or "")
    if m:
        return f"eb-{m.group(1)}"
    return f"eb-{re.sub(r'[^a-z0-9]', '', (url or '')[-24:].lower())}"


def normalize_event(event: dict, today: date, source: str, geocode: bool = False) -> tuple[dict | None, str]:
    title = (event.get("name") or "").strip()
    if not title_is_sale_event(title):
        return None, "title is not a garage/yard/estate/rummage/moving sale"
    mode = (event.get("eventAttendanceMode") or "")
    if "OnlineEventAttendanceMode" in mode:
        return None, "online-only event"

    start = iso_date(event.get("startDate"))
    end = iso_date(event.get("endDate")) or start
    if not start or not end:
        return None, "no explicit sale dates"
    if end < start:
        return None, "invalid date range"
    if end < today:
        return None, f"ended {end.isoformat()}"

    parts = _addr_parts(event)
    city = parts["city"] or "San Antonio"
    street = parts["street"]
    zipc = parts["zip"]
    if not in_sa_area(city=city, zipc=zipc, address=f"{street} {parts['place_name']}", region=parts["region"]):
        return None, f"outside SA-area ({city or street})"

    # City-only / "San Antonio, TX" as the street — not a usable location.
    street_l = re.sub(r"[^a-z0-9 ]", "", (street or "").lower()).strip()
    if not street or street_l in {"san antonio", "san antonio tx", "san antoniotx", "bexar county", "bexar co"}:
        return None, "no usable street address or clear area"

    has_number = bool(re.match(r"\d", street))
    is_area = not has_number
    address = f"{street}, {city}, {parts['region']}"
    if zipc and zipc not in address:
        address = f"{address} {zipc}"
    area_query = f"{street}, {city}, Texas, USA"

    lat, lon = parts["lat"], parts["lon"]
    geocode_label = "source" if valid_coords(lat, lon) else ""
    if not geocode_label:
        lat = lon = None
        if geocode:
            lat, lon, geocode_label = geocode_sale(address, area_query, is_area)
            if lat is None:
                return None, "could not geocode"

    url = event.get("url") or ""
    eid = _event_id(url, source)
    hours = extract_hours(event.get("description") or "")
    details = (event.get("description") or "")[:800]
    sale = build_sale(
        title=title,
        address=address,
        start=start,
        end=end,
        url=url,
        source=source,
        external_id=eid,
        hours=hours,
        details=details,
        sale_type=sale_type_from_text(title, details, is_area=is_area),
        lat=lat,
        lon=lon,
        geocode=geocode_label,
        is_area=is_area,
        confidence=0.8 if (geocode_label in {"source", "census"} and has_number) else 0.68,
    )
    return sale, ""


def parse_events(html: str, source: str, today: date, geocode: bool = False) -> tuple[list[dict], list[tuple[dict, str]]]:
    accepted, skipped = [], []
    seen: set[str] = set()
    for ev in _load_ldjson(html):
        sale, reason = normalize_event(ev, today, source, geocode=geocode)
        key = (sale or {}).get("external_id") or (ev.get("url") or ev.get("name") or "")
        if key in seen:
            continue
        seen.add(key)
        if sale:
            accepted.append(sale)
        else:
            skipped.append(({"title": ev.get("name"), "url": ev.get("url")}, reason))
    return accepted, skipped


def _fetch_pages(urls: list[str], label: str, referer: str, today: date, geocode: bool, sleep_s: float) -> tuple[list[dict], list[tuple[dict, str]]]:
    accepted: list[dict] = []
    skipped: list[tuple[dict, str]] = []
    seen_ids: set[str] = set()
    for i, url in enumerate(urls):
        if i:
            time.sleep(sleep_s)
        print(f"  {label} {url}")
        code, html = fetch(url, referer=referer, retries_429=2, backoff=15)
        print(f"    → HTTP {code} ({len(html)} bytes)")
        if code in {403, 429} or code != 200:
            print(f"    WARN: {label} HTTP {code}; continuing", file=sys.stderr)
            save_snapshot(label.lower(), "san-antonio", code, html, f"http{code}")
            continue
        sales, skips = parse_events(html, label, today, geocode=geocode)
        skipped.extend(skips)
        for s in sales:
            eid = s.get("external_id") or s.get("url")
            if eid in seen_ids:
                continue
            seen_ids.add(eid)
            accepted.append(s)
    return accepted, skipped


def discover(today: date, geocode: bool, sleep_s: float = 2.0) -> tuple[list[dict], list[tuple[dict, str]]]:
    print("[san-antonio] AllEvents + Eventbrite sale listings")
    ae_sales, ae_skip = _fetch_pages(
        ALLEVENTS_PAGES, "AllEvents", "https://allevents.in/", today, geocode, sleep_s
    )
    time.sleep(sleep_s)
    eb_sales, eb_skip = _fetch_pages(
        EVENTBRITE_PAGES, "Eventbrite", "https://www.eventbrite.com/", today, geocode, sleep_s
    )
    # Cross-source address dedupe (e.g. Fairlawn Drive on both)
    accepted: list[dict] = []
    seen_addr: set[str] = set()
    skipped = ae_skip + eb_skip
    for s in ae_sales + eb_sales:
        key = address_key(s.get("address") or "")
        if key and key in seen_addr:
            skipped.append((s, f"duplicate of earlier event listing at {s.get('address')}"))
            continue
        if key:
            seen_addr.add(key)
        accepted.append(s)
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
    print(f"fetch_event_listings {today.isoformat()} cities={cities}")
    if "san-antonio" not in cities:
        print("  event listings are SA-metro only")
        return 0
    sales, skipped = discover(today, geocode=not args.no_geocode)
    for listing, reason in skipped:
        print(f"  skip {listing.get('title') or listing.get('external_id')}: {reason}")
    if args.dry_run:
        print(json.dumps(sales, indent=2)[:4000])
        return 0
    added, live, merge_skipped = merge_sales("san-antonio", sales, today, "event-listings")
    for s, reason in merge_skipped:
        print(f"  skip merge {s.get('external_id')}: {reason}")
    print(f"  merge added={added} public_live={live}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
