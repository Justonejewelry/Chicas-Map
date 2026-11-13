#!/usr/bin/env python3
"""Herald-Zeitung and Seguin Gazette garage classifieds (BLOX CMS).

List pages (no query strings — robots Disallow /classifieds/*?):
  https://herald-zeitung.com/classifieds/garage_sales/garage_sales/
  https://seguingazette.com/classifieds/garage_sales/garage_sales/

Low volume. Serial requests with backoff on HTTP 429.

Usage:
  python3 webapp/scripts/fetch_blox_classifieds.py --city san-antonio
  python3 webapp/scripts/fetch_blox_classifieds.py --city san-antonio --dry-run
"""
from __future__ import annotations

import argparse
import html as html_mod
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
    abs_url,
    build_sale,
    extract_hours,
    fetch,
    geocode_sale,
    iso_date,
    merge_sales,
    parse_dates_from_text,
    sale_type_from_text,
    save_snapshot,
    strip_query,
    strip_tags,
    tidy_street,
    today_ct,
)

PAPERS = [
    {
        "name": "Herald-Zeitung",
        "tag": "herald-zeitung",
        "prefix": "hzg",
        "base": "https://herald-zeitung.com",
        "list": "https://herald-zeitung.com/classifieds/garage_sales/garage_sales/",
        "city": "New Braunfels",
    },
    {
        "name": "Seguin Gazette",
        "tag": "seguin-gazette",
        "prefix": "sgx",
        "base": "https://seguingazette.com",
        "list": "https://seguingazette.com/classifieds/garage_sales/garage_sales/",
        "city": "Seguin",
    },
]

AD_HREF_RE = re.compile(
    r'href="((?:https?://[^"/]+)?/classifieds/garage_sales/garage_sales/[^"]+/ad_([0-9a-f-]+)\.html)"',
    re.I,
)
STREET_RE = re.compile(
    r"\b(\d{1,6}(?:\s*(?:&|and)\s*\d{1,6})?)\s+"
    r"([A-Z][A-Za-z0-9.'\-]+(?:\s+[A-Z][A-Za-z0-9.'\-]+){0,4})",
)


def parse_listings(html: str, paper: dict) -> list[dict]:
    ads: list[dict] = []
    seen: set[str] = set()
    # Split on card containers when present
    chunks = re.split(r'class="[^"]*card-container[^"]*"', html or "")
    blocks = chunks[1:] if len(chunks) > 1 else [html or ""]
    for block in blocks:
        href_m = AD_HREF_RE.search(block)
        if not href_m:
            continue
        href = html_mod.unescape(href_m.group(1))
        uuid = href_m.group(2)
        if uuid in seen:
            continue
        seen.add(uuid)
        title_m = re.search(
            r'aria-label="([^"]+)"|tnt-headline[^>]*>[\s\S]*?ad_[^"]+"[^>]*>\s*([^<]+)',
            block,
            re.I,
        )
        title = html_mod.unescape((title_m.group(1) or title_m.group(2) or "").strip()) if title_m else ""
        if not title:
            # last path slug before ad_
            slug = href.rstrip("/").split("/")[-2] if "/ad_" in href else ""
            title = slug.replace("-", " ")
        time_m = re.search(r'<time[^>]*datetime="([^"]+)"[^>]*>([^<]*)</time>', block, re.I)
        datetime_raw = time_m.group(1) if time_m else ""
        time_label = strip_tags(time_m.group(2)) if time_m else ""
        url = strip_query(abs_url(href, paper["base"]))
        ads.append(
            {
                "title": re.sub(r"\s+", " ", title).strip(),
                "url": url,
                "uuid": uuid,
                "datetime_raw": datetime_raw,
                "time_label": time_label,
                "paper": paper,
            }
        )
    return ads


def parse_detail(html: str) -> dict:
    title = ""
    h1 = re.search(r"<h1[^>]*>([\s\S]*?)</h1>", html or "", re.I)
    if h1:
        title = re.sub(r"\s+", " ", strip_tags(h1.group(1)))
    desc = ""
    meta = re.search(r'<meta[^>]+name="description"[^>]+content="([^"]+)"', html or "", re.I)
    if not meta:
        meta = re.search(r'<meta[^>]+content="([^"]+)"[^>]+name="description"', html or "", re.I)
    if meta:
        desc = html_mod.unescape(meta.group(1)).replace("&amp;", "&")
        desc = html_mod.unescape(desc)
    body = ""
    cm = re.search(
        r'class="[^"]*asset-content-container[^"]*"[^>]*>([\s\S]*?)</div>',
        html or "",
        re.I,
    )
    if cm:
        body = strip_tags(cm.group(1))
    if not body:
        bm = re.search(r'class="[^"]*asset-body[^"]*"[^>]*>([\s\S]*?)</div>\s*</div>', html or "", re.I)
        if bm:
            body = strip_tags(bm.group(1))
    return {"title": title, "description": desc, "body": body}


def _primary_street(text: str) -> str:
    """First house-numbered street; '127 & 192 Placid Heights' → '127 Placid Heights'."""
    m = STREET_RE.search(text or "")
    if not m:
        return ""
    nums, name = m.group(1), m.group(2)
    first = name.split()[0].lower()
    if first in {"am", "pm", "nov", "dec", "jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct"}:
        return ""
    num = re.split(r"\s*(?:&|and)\s*", nums)[0].strip()
    name = re.sub(r"\s+", " ", name).strip(" ,.")
    return tidy_street(f"{num} {name}")


def normalize_ad(listing: dict, detail: dict | None, today: date, geocode: bool = False) -> tuple[dict | None, str]:
    paper = listing["paper"]
    detail = detail or {}
    title = (detail.get("title") or listing.get("title") or "").strip()
    body = " ".join(
        p for p in (detail.get("description"), detail.get("body"), listing.get("title")) if p
    )
    start, end = parse_dates_from_text(body, today)
    if not start or not end:
        # Only trust <time datetime> when the visible label looks like a calendar date,
        # not a relative "7 hrs ago" post stamp.
        label = listing.get("time_label") or ""
        if re.search(r"\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d", label, re.I) or re.search(
            r"\d{1,2}/\d{1,2}", label
        ):
            dt = iso_date(listing.get("datetime_raw") or "")
            if dt:
                start = end = dt
    if not start or not end:
        return None, "no explicit sale dates"
    if end < start:
        return None, "invalid date range"
    if end < today:
        return None, f"ended {end.isoformat()}"

    street = _primary_street(body) or _primary_street(title)
    if not street:
        return None, "no usable street address or clear area"
    city = paper["city"]
    # Neighborhood cue (Arrowhead Bluff) stays in the title/details, not the pin street.
    address = f"{street}, {city}, TX"
    is_area = "&" in title or " and " in title.lower()
    area_query = f"{street}, {city}, Texas, USA"

    lat = lon = None
    geocode_label = ""
    if geocode:
        lat, lon, geocode_label = geocode_sale(address, area_query, is_area=False)
        if lat is None:
            return None, "could not geocode"

    uuid = listing.get("uuid") or ""
    eid = f"{paper['prefix']}-{uuid.split('-')[0]}" if uuid else f"{paper['prefix']}-{re.sub(r'[^a-z0-9]','',street.lower())[:20]}"
    hours = extract_hours(body)
    sale = build_sale(
        title=title or f"{city} garage sale",
        address=address,
        start=start,
        end=end,
        url=listing.get("url") or paper["list"],
        source=paper["name"],
        external_id=eid,
        hours=hours,
        details=body[:800],
        sale_type=sale_type_from_text(title, body, is_area=is_area),
        lat=lat,
        lon=lon,
        geocode=geocode_label,
        is_area=is_area,
    )
    return sale, ""


def discover(today: date, geocode: bool, sleep_s: float = 8.0) -> tuple[list[dict], list[tuple[dict, str]]]:
    accepted: list[dict] = []
    skipped: list[tuple[dict, str]] = []
    for i, paper in enumerate(PAPERS):
        if i:
            time.sleep(sleep_s)
        print(f"[san-antonio] {paper['name']} {paper['list']}")
        code, html = fetch(paper["list"], referer=paper["base"] + "/", retries_429=3, backoff=15)
        print(f"  page → HTTP {code} ({len(html)} bytes)")
        if code != 200:
            print(f"  WARN: non-200; skipping {paper['name']} ({code})", file=sys.stderr)
            save_snapshot(paper["prefix"], "san-antonio", code, html, f"http{code}")
            continue
        listings = parse_listings(html, paper)
        print(f"  listings={len(listings)}")
        if not listings:
            save_snapshot(paper["prefix"], "san-antonio", code, html, "zero")
            continue
        for listing in listings:
            time.sleep(max(2.0, sleep_s / 2))
            dcode, dhtml = fetch(listing["url"], referer=paper["list"], retries_429=3, backoff=20)
            print(f"  detail {listing.get('uuid','')[:8]} → HTTP {dcode}")
            detail = parse_detail(dhtml) if dcode == 200 else None
            if dcode != 200:
                save_snapshot(paper["prefix"], listing.get("uuid") or "ad", dcode, dhtml, f"detail{dcode}")
            sale, reason = normalize_ad(listing, detail, today, geocode=geocode)
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
    print(f"fetch_blox_classifieds {today.isoformat()} cities={cities}")
    sales: list[dict] = []
    skipped: list[tuple[dict, str]] = []
    if "san-antonio" in cities:
        sales, skipped = discover(today, geocode=not args.no_geocode)
        for listing, reason in skipped:
            print(f"  skip {listing.get('title')}: {reason}")
    else:
        print("  BLOX classifieds are SA-metro only")
    if args.dry_run:
        print(json.dumps(sales, indent=2)[:4000])
        return 0
    if "san-antonio" in cities:
        added, live, merge_skipped = merge_sales(
            "san-antonio", sales, today, "blox-classifieds"
        )
        for s, reason in merge_skipped:
            print(f"  skip merge {s.get('external_id')}: {reason}")
        print(f"  merge added={added} public_live={live}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
