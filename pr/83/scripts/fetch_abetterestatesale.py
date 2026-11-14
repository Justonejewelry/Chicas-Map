#!/usr/bin/env python3
"""A Better Estate Sale upcoming calendar.

https://www.abetterestatesale.com/upcoming-sales/

The company posts the street address at 9 a.m. CT the day before a sale
begins. Until then, upcoming sales are added as clearly labeled area pins
(not driveway pins). Ended sales are skipped.

Usage:
  python3 webapp/scripts/fetch_abetterestatesale.py --city san-antonio
  python3 webapp/scripts/fetch_abetterestatesale.py --city san-antonio --dry-run
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
    build_sale,
    extract_hours,
    fetch,
    geocode_sale,
    merge_sales,
    parse_dates_from_text,
    save_snapshot,
    strip_tags,
    today_ct,
)

PAGE_URL = "https://www.abetterestatesale.com/upcoming-sales/"
SOURCE_NAME = "A Better Estate Sale"
SOURCE_TAG = "abetterestatesale"
ADDRESS_NOTE = "address posts 9 a.m. CT the day before"

# 11/20-11/22: #633: Chase Estate Sale
ITEM_RE = re.compile(
    r"(?P<start>\d{1,2}/\d{1,2}(?:/\d{2,4})?)\s*[-–—to]+\s*(?P<end>\d{1,2}/\d{1,2}(?:/\d{2,4})?)"
    r"\s*:\s*(?:#(?P<num>\d+)\s*:?\s*)?(?P<title>[^<\n]+)",
    re.I,
)
STREET_RE = re.compile(
    r"\b(\d{2,6})\s+((?:[A-Z][A-Za-z0-9.'\-]*)(?:\s+(?:[A-Z][A-Za-z0-9.'\-]*)){0,4})"
    r"(?:\s+(?:Rd|Road|Dr|Drive|Ln|Lane|St|Street|Ave|Avenue|Blvd|Cir|Ct|Way|Trl|Loop)\.?)?",
    re.I,
)
ESN_ZIP_RE = re.compile(r"estatesales\.net/TX/[^/]+/(\d{5})/", re.I)
MDY_RE = re.compile(r"^(\d{1,2})/(\d{1,2})(?:/(\d{2,4}))?$")


def _parse_mdy(raw: str, today: date) -> date | None:
    m = MDY_RE.match((raw or "").strip())
    if not m:
        return None
    mo, d, y = int(m.group(1)), int(m.group(2)), m.group(3)
    year = today.year if not y else (int(y) + 2000 if len(y) == 2 else int(y))
    # Jan dates seen in November belong to next year
    if not y and mo < today.month - 6:
        year += 1
    try:
        return date(year, mo, d)
    except ValueError:
        return None


def parse_listings(html: str) -> list[dict]:
    ads: list[dict] = []
    seen: set[str] = set()
    text = strip_tags(html or "")
    # Prefer the compact "Upcoming Sales" list items, which include ESN links.
    lis = re.findall(r"<li[^>]*>([\s\S]*?)</li>", html or "", flags=re.I)
    blobs = lis if lis else [html or ""]
    for blob in blobs:
        plain = strip_tags(blob)
        m = ITEM_RE.search(plain)
        if not m:
            continue
        title = re.sub(r"\s+", " ", html_mod.unescape(m.group("title"))).strip(" :")
        if not title or title.lower() in {"upcoming sales", "upcoming sales & auctions"}:
            continue
        # Skip boilerplate / photo-gallery headings
        if re.search(r"see more photos|we accept cash|no valuab", title, re.I):
            continue
        href_m = re.search(r'href="(https?://[^"]+)"', blob)
        esn_zip = ""
        zm = ESN_ZIP_RE.search(blob) or ESN_ZIP_RE.search(plain)
        if zm:
            esn_zip = zm.group(1)
        sm = STREET_RE.search(plain)
        street = ""
        if sm:
            first = sm.group(2).split()[0].lower() if sm.group(2) else ""
            if first not in {"am", "pm", "nov", "dec", "jan", "feb"}:
                street = re.sub(r"\s+", " ", sm.group(0)).strip(" ,.")
        key = (m.group("num") or "") + "|" + title.lower()
        if key in seen:
            continue
        seen.add(key)
        ads.append(
            {
                "title": title,
                "sale_no": m.group("num") or "",
                "start_raw": m.group("start"),
                "end_raw": m.group("end"),
                "street": street,
                "zip": esn_zip,
                "url": href_m.group(1) if href_m else PAGE_URL,
                "body": plain,
            }
        )
    return ads


def normalize_ad(listing: dict, today: date, geocode: bool = False) -> tuple[dict | None, str]:
    start = _parse_mdy(listing.get("start_raw") or "", today)
    end = _parse_mdy(listing.get("end_raw") or "", today) or start
    if not start or not end:
        start, end = parse_dates_from_text(
            f"{listing.get('start_raw')} - {listing.get('end_raw')} {listing.get('title')}",
            today,
        )
    if not start or not end:
        return None, "no explicit sale dates"
    if end < start:
        return None, "invalid date range"
    if end < today:
        return None, f"ended {end.isoformat()}"

    title = listing.get("title") or "Estate Sale"
    sale_no = listing.get("sale_no") or ""
    display_title = f"#{sale_no}: {title}" if sale_no and f"#{sale_no}" not in title else title
    street = (listing.get("street") or "").strip()
    zipc = listing.get("zip") or ""
    is_area = not street
    if street:
        address = f"{street}, San Antonio, TX"
        if zipc:
            address = f"{address} {zipc}"
        area_query = f"{street}, San Antonio, Texas, USA"
        details = listing.get("body") or ""
    else:
        where = f"San Antonio, TX {zipc}".strip() if zipc else "San Antonio, TX"
        address = f"{display_title} ({ADDRESS_NOTE}), {where}"
        area_query = f"San Antonio, Texas {zipc}".strip() if zipc else "San Antonio, Texas, USA"
        details = (
            f"{display_title}. The street address posts at 9 a.m. CT the day before "
            "the sale begins. This pin is the sale area, not a driveway."
        )

    lat = lon = None
    geocode_label = ""
    if geocode:
        lat, lon, geocode_label = geocode_sale(address if street else area_query, area_query, is_area)
        if lat is None:
            # Area pins may fall back to the city centroid rather than being dropped.
            if is_area:
                lat, lon, geocode_label = 29.4241, -98.4936, "city-center"
            else:
                return None, "could not geocode"

    slug = sale_no or re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")[:24]
    hours = extract_hours(listing.get("body") or "")
    sale = build_sale(
        title=display_title,
        address=address,
        start=start,
        end=end,
        url=listing.get("url") or PAGE_URL,
        source=SOURCE_NAME,
        external_id=f"abes-{slug}",
        hours=hours,
        details=details,
        sale_type="community" if is_area else "estate",
        lat=lat,
        lon=lon,
        geocode=geocode_label,
        is_area=is_area,
        confidence=0.7 if street else 0.6,
    )
    # Keep type estate even for area pins — these are company estate sales.
    if is_area:
        sale["type"] = "estate"
        sale["categories"] = ["estate-sale", "community-sale"]
    return sale, ""


def discover(today: date, geocode: bool) -> tuple[list[dict], list[tuple[dict, str]]]:
    print(f"[san-antonio] A Better Estate Sale {PAGE_URL}")
    code, html = fetch(PAGE_URL, referer="https://www.abetterestatesale.com/")
    print(f"  page → HTTP {code} ({len(html)} bytes)")
    if code != 200:
        print(f"  WARN: non-200; skipping ({code})", file=sys.stderr)
        save_snapshot("abes", "san-antonio", code, html, f"http{code}")
        return [], []
    listings = parse_listings(html)
    print(f"  listings={len(listings)}")
    if not listings:
        save_snapshot("abes", "san-antonio", code, html, "zero")
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
    print(f"fetch_abetterestatesale {today.isoformat()} cities={cities}")
    for slug in cities:
        if slug != "san-antonio":
            print(f"  skip {slug} (A Better Estate Sale is SA-metro only)")
            continue
        sales, skipped = discover(today, geocode=not args.no_geocode)
        for listing, reason in skipped:
            print(f"  skip {listing.get('sale_no') or listing.get('title')}: {reason}")
        if args.dry_run:
            print(json.dumps(sales, indent=2)[:4000])
            continue
        added, live, merge_skipped = merge_sales(slug, sales, today, SOURCE_TAG)
        for s, reason in merge_skipped:
            print(f"  skip merge {s.get('external_id')}: {reason}")
        print(f"  merge added={added} public_live={live}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
