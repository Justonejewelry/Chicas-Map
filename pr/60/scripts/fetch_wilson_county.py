#!/usr/bin/env python3
"""Wilson County News garage classifieds.

Public GeoDirectory listings at
https://www.wilsoncountynews.com/classifieds/category/garage-sale/

Usage:
  python3 webapp/scripts/fetch_wilson_county.py --city san-antonio
  python3 webapp/scripts/fetch_wilson_county.py --city san-antonio --dry-run
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import date
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from source_common import (  # noqa: E402
    abs_url,
    build_sale,
    extract_hours,
    fetch,
    geocode_sale,
    merge_sales,
    parse_dates_from_text,
    sale_type_from_text,
    save_snapshot,
    strip_tags,
    tidy_street,
    today_ct,
)

BASE = "https://www.wilsoncountynews.com"
CATEGORY_URL = f"{BASE}/classifieds/category/garage-sale/"
SOURCE_NAME = "Wilson County News"
SOURCE_TAG = "wilson-county-news"

TOWN_RE = re.compile(
    r"^\s*(Stockdale|Adkins|Floresville|Poth|La Vernia|St\.?\s*Hedwig|"
    r"Sutherland Springs|Wilson|Nixon|Falls City|Elmendorf|San Antonio|"
    r"China Grove|New Berlin)\s*[,.]?",
    re.I,
)
# House number + FM/RM/RR/CR/Hwy or regular street
STREET_RE = re.compile(
    r"\b(\d{2,6})\s+"
    r"((?:FM|RM|RR|CR|SH|US|Hwy|HWY|IH|I-?)\s*\d+[A-Za-z]?"
    r"|(?:[A-Z][A-Za-z0-9.'\-]*)(?:\s+(?:[A-Z][A-Za-z0-9.'\-]*)){0,4})"
    r"(?:\s+(?:Rd|Road|Dr|Drive|Ln|Lane|St|Street|Ave|Avenue|Blvd|Cir|Ct|Way|Trl|Trail|Loop)\.?)?",
    re.I,
)
POST_ID_RE = re.compile(r"(?:data-post-id|post-)[\"'=-]*(\d{4,})")
DETAIL_RE = re.compile(r"https?://(?:www\.)?wilsoncountynews\.com/classifieds/garage-sale/(\d+)/?")
CRAFT_RE = re.compile(r"\b(craft show|craft fair|vendor show|bazaar)\b", re.I)
SALE_WORD_RE = re.compile(r"\b(garage|yard|estate|rummage|moving)\s+sale|\bmulti[-\s]?family\b", re.I)


def parse_listings(html: str) -> list[dict]:
    ads: list[dict] = []
    seen: set[str] = set()
    chunks = re.split(r'(?=<div[^>]*\bdata-post-id=")', html or "")
    for chunk in chunks[1:]:
        pid_m = re.search(r'data-post-id="(\d+)"', chunk) or POST_ID_RE.search(chunk)
        href_m = re.search(r'href="(https?://[^"]*/classifieds/garage-sale/\d+/)"', chunk)
        if not href_m:
            href_m = re.search(r'href="(/classifieds/garage-sale/\d+/)"', chunk)
        body_m = re.search(
            r'geodir-field-post_content[^"]*"[^>]*>([\s\S]*?)(?:</div>\s*){1,3}',
            chunk,
            re.I,
        )
        body = strip_tags(body_m.group(1)) if body_m else ""
        body = re.sub(r"\s*Read more\.?\s*$", "", body, flags=re.I)
        if not body:
            continue
        post_id = pid_m.group(1) if pid_m else ""
        if href_m:
            url = abs_url(href_m.group(1), BASE)
            if not post_id:
                dm = DETAIL_RE.search(url)
                post_id = dm.group(1) if dm else ""
        else:
            url = f"{BASE}/classifieds/garage-sale/{post_id}/" if post_id else CATEGORY_URL
        key = post_id or url
        if key in seen:
            continue
        seen.add(key)
        ads.append({"post_id": post_id, "url": url, "body": body, "title": ""})
    return ads


def _title_from_body(body: str, city: str) -> str:
    text = body.strip()
    text = TOWN_RE.sub("", text, count=1).lstrip(" .,")
    # take up to the address comma / date
    cut = re.split(r",\s*(?:\d{2,6}\s|Fri|Sat|Sun|Mon|Tue|Wed|Thu|Nov|Dec|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct)", text, maxsplit=1)
    raw = cut[0].strip(" .,") if cut else text
    raw = re.sub(r"\s+", " ", raw)
    if city and city.lower() not in raw.lower():
        raw = f"{city} {raw}".strip()
    return raw[:160] or (f"{city} garage sale" if city else "Garage sale")


def parse_body(body: str) -> dict:
    city = ""
    tm = TOWN_RE.search(body or "")
    if tm:
        city = re.sub(r"\s+", " ", tm.group(1)).replace("St.", "St").strip(" .,")
        if city.lower().startswith("st "):
            city = "St. " + city[3:]
        else:
            city = city.title()
            if city.lower() == "st. hedwig" or city.lower() == "st hedwig":
                city = "St. Hedwig"
    street = ""
    sm = STREET_RE.search(body or "")
    if sm:
        num, name = sm.group(1), sm.group(2)
        suffix = sm.group(0)[len(sm.group(1)) + 1 + len(name):].strip() if sm.group(0) else ""
        # rebuild from the full match and tidy
        street = tidy_street(sm.group(0))
        # Avoid capturing "Sat" etc.
        first = name.split()[0].lower().rstrip(".") if name else ""
        if first in {"am", "pm", "sat", "sun", "fri", "mon", "tue", "wed", "thu", "nov", "dec", "jan"}:
            street = ""
    return {"city": city, "street": street}


def normalize_ad(listing: dict, today: date, geocode: bool = False) -> tuple[dict | None, str]:
    body = (listing.get("body") or "").strip()
    if CRAFT_RE.search(body) and not SALE_WORD_RE.search(body):
        return None, "craft/vendor show, not a garage/yard/estate/rummage/moving sale"

    start, end = parse_dates_from_text(body, today)
    if not start or not end:
        return None, "no explicit sale dates"
    if end < start:
        return None, "invalid date range"
    if end < today:
        return None, f"ended {end.isoformat()}"

    parsed = parse_body(body)
    city = parsed.get("city") or ""
    street = parsed.get("street") or ""
    if not street:
        return None, "no usable street address or clear area"
    city = city or "Wilson County"
    address = f"{street}, {city}, TX"
    is_area = not re.match(r"\d", street)
    area_query = f"{street}, {city}, Texas, USA"

    lat = lon = None
    geocode_label = ""
    if geocode:
        lat, lon, geocode_label = geocode_sale(address, area_query, is_area)
        if lat is None:
            return None, "could not geocode"

    title = listing.get("title") or _title_from_body(body, city)
    hours = extract_hours(body)
    post_id = listing.get("post_id") or ""
    eid = f"wcn-{post_id}" if post_id else f"wcn-{re.sub(r'[^a-z0-9]', '', address.lower())[:24]}"
    sale = build_sale(
        title=title,
        address=address,
        start=start,
        end=end,
        url=listing.get("url") or CATEGORY_URL,
        source=SOURCE_NAME,
        external_id=eid,
        hours=hours,
        details=body,
        sale_type=sale_type_from_text(title, body, is_area=is_area),
        lat=lat,
        lon=lon,
        geocode=geocode_label,
        is_area=is_area,
    )
    return sale, ""


def discover(today: date, geocode: bool) -> tuple[list[dict], list[tuple[dict, str]]]:
    print(f"[san-antonio] Wilson County News {CATEGORY_URL}")
    code, html = fetch(CATEGORY_URL, referer=BASE + "/")
    print(f"  page → HTTP {code} ({len(html)} bytes)")
    if code != 200:
        print(f"  WARN: non-200; skipping ({code})", file=sys.stderr)
        save_snapshot("wcn", "san-antonio", code, html, f"http{code}")
        return [], []
    listings = parse_listings(html)
    print(f"  listings={len(listings)}")
    if not listings:
        save_snapshot("wcn", "san-antonio", code, html, "zero")
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
    print(f"fetch_wilson_county {today.isoformat()} cities={cities}")
    for slug in cities:
        if slug != "san-antonio":
            print(f"  skip {slug} (Wilson County News is SA-metro only)")
            continue
        sales, skipped = discover(today, geocode=not args.no_geocode)
        for listing, reason in skipped:
            print(f"  skip {listing.get('post_id') or listing.get('title')}: {reason}")
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
