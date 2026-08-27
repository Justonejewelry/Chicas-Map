#!/usr/bin/env python3
"""Fetch City of San Antonio garage-sale permits from Open Data SA.

Primary: CKAN datastore API (filter PERMIT TYPE == Garage Sale).
Fallback: bulk CSV download (often 403s from Actions).

Writes webapp/data/cities/san-antonio.json → permits[].

Usage:
  python3 webapp/scripts/fetch_permits.py
  python3 webapp/scripts/fetch_permits.py --days 21
"""
from __future__ import annotations

import argparse
import csv
import io
import json
import re
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

from city_io import safe_load_city, safe_write_city

CT = ZoneInfo("America/Chicago")
BROWSER_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)
RESOURCE_ID = "c21106f9-3ef5-4f3a-8604-f992b4db7512"
CKAN_SEARCH = "https://data.sanantonio.gov/api/3/action/datastore_search"
PERMITS_CSV_URL = (
    "https://data.sanantonio.gov/dataset/05012dcb-ba1b-4ade-b5f3-7403bc7f52eb/"
    "resource/c21106f9-3ef5-4f3a-8604-f992b4db7512/download/permits_issued.csv"
)

ESTATE_PATTERNS = re.compile(
    r"\b(estate\s*sale|estate\s*liquidation|estate\s*auction|moving\s*sale|tag\s*sale|"
    r"liquidat(?:e|or|ion)|auctioneer|executor|executrix|probate|downsizing|"
    r"contents\s*of\s*(?:the\s*)?home|whole\s*house|entire\s*estate)\b",
    re.I,
)
COMPANY_HINT = re.compile(
    r"\b(llc|inc\.?|company|estate\s*sales?|auctions?|liquidators?|appraisers?)\b", re.I,
)


def is_estate_sale(row: dict) -> bool:
    text = " ".join(
        [
            row.get("PROJECT NAME") or "",
            row.get("PRIMARY CONTACT") or "",
            row.get("DESCRIPTION") or "",
            row.get("WORK DESCRIPTION") or "",
            row.get("COMMENTS") or "",
        ]
    )
    if ESTATE_PATTERNS.search(text):
        return True
    contact = row.get("PRIMARY CONTACT") or ""
    if COMPANY_HINT.search(contact) and len(contact.split()) >= 2:
        return True
    return False


def today_ct() -> date:
    return datetime.now(CT).date()


def parse_date(s: str) -> date | None:
    s = (s or "").strip()[:10]
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


def clean_address(addr: str) -> str:
    a = (addr or "").strip()
    a = re.sub(r",\s*City of San Antonio,\s*TX", ", San Antonio, TX", a, flags=re.I)
    a = re.sub(r"\s+", " ", a)
    return a


def fetch_ckan(limit: int = 300) -> list[dict]:
    params = {
        "resource_id": RESOURCE_ID,
        "filters": json.dumps({"PERMIT TYPE": "Garage Sale"}),
        "sort": "DATE ISSUED desc",
        "limit": str(limit),
    }
    url = CKAN_SEARCH + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(
        url,
        headers={"User-Agent": BROWSER_UA, "Accept": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        payload = json.loads(resp.read().decode("utf-8", errors="replace"))
    if not payload.get("success"):
        raise RuntimeError("CKAN datastore_search unsuccessful")
    recs = payload.get("result", {}).get("records") or []
    if not recs:
        raise RuntimeError("CKAN returned 0 garage-sale records")
    print(f"ckan garage-sale rows={len(recs)} total={payload['result'].get('total')}")
    return recs


def fetch_csv(url: str) -> str:
    try:
        result = subprocess.run(
            [
                "curl", "-sL", "--max-time", "120", "-A", BROWSER_UA,
                "-H", "Accept: text/csv,application/csv,*/*", url,
            ],
            check=True,
            capture_output=True,
        )
        text = result.stdout.decode("utf-8", errors="replace")
        if text.startswith("PERMIT") or "," in text[:200]:
            return text
        raise RuntimeError(f"curl returned unexpected body ({len(text)} bytes)")
    except (FileNotFoundError, subprocess.CalledProcessError, RuntimeError) as e:
        print(f"curl fallback reason: {e}", file=sys.stderr)

    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": BROWSER_UA,
            "Accept": "text/csv,application/csv,*/*",
            "Accept-Language": "en-US,en;q=0.9",
        },
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        return resp.read().decode("utf-8", errors="replace")


def rows_from_csv(text: str) -> list[dict]:
    return list(csv.DictReader(io.StringIO(text)))


def permit_to_sale(row: dict, issued: date) -> dict:
    addr = clean_address(row.get("ADDRESS") or "")
    try:
        lon = float(row.get("X_COORD") or 0)
        lat = float(row.get("Y_COORD") or 0)
    except ValueError:
        lon, lat = 0.0, 0.0
    if not (-99.2 < lon < -98.0 and 29.1 < lat < 29.9):
        lat, lon = 0.0, 0.0

    end = issued + timedelta(days=16)
    estate = is_estate_sale(row)
    contact = (row.get("PRIMARY CONTACT") or "").strip()
    raw_title = (row.get("PROJECT NAME") or "").strip()
    if estate:
        title = raw_title if raw_title and "garage" not in raw_title.lower() else "City-permitted estate sale"
        if title.upper() == addr.upper() or title.replace(",", "") == addr.split(",")[0]:
            title = "City-permitted estate sale"
        details = (
            "Official City of San Antonio permit flagged as estate / professional "
            "liquidation. Legal hours 9 a.m.–6 p.m. Exact sale day not published — verify on-site."
        )
        sale_type = "estate"
        categories = ["estate-sale", "permit"]
        source = "Open Data SA (Estate / Garage Sale permit)"
        confidence = 0.92 if lat else 0.75
    else:
        title = raw_title or "Permitted garage sale"
        if title.upper() == addr.upper() or title.replace(",", "") == addr.split(",")[0]:
            title = "City-permitted garage / yard sale"
        details = (
            "Official City of San Antonio garage-sale permit. "
            "Legal sale hours 9 a.m.–6 p.m. Exact sale day not published in open data — "
            "verify on-site or with seller."
        )
        sale_type = "permit"
        categories = ["garage-sale", "permit"]
        source = "Open Data SA (Garage Sale permit)"
        confidence = 0.9 if lat else 0.7

    mon = issued.strftime("%a %b")
    return {
        "address": addr,
        "dates": f"Permit issued {mon} {issued.day} · typical use within 2 weeks",
        "date_from": issued.isoformat(),
        "date_to": end.isoformat(),
        "end_date": end.isoformat(),
        "title": title[:120],
        "details": details,
        "source": source,
        "permit_number": (row.get("PERMIT #") or "").strip(),
        "primary_contact": contact or None,
        "photos": 0,
        "type": sale_type,
        "categories": categories,
        "confidence": confidence,
        "status": "verified",
        "lat": lat or None,
        "lon": lon or None,
        "geocode": "city-open-data" if lat else "missing",
        "hours": "9 a.m. – 6 p.m. (city rule)",
        "is_estate": estate,
    }


def select_permits(raw: list[dict], cutoff: date, max_n: int) -> tuple[list[dict], int]:
    selected: list[dict] = []
    estate_count = 0
    for row in raw:
        ptype = (row.get("PERMIT TYPE") or "").strip()
        if ptype and ptype != "Garage Sale":
            continue
        issued = parse_date(row.get("DATE ISSUED") or "")
        if not issued or issued < cutoff:
            continue
        sale = permit_to_sale(row, issued)
        if not sale.get("address"):
            continue
        if sale.get("is_estate"):
            estate_count += 1
        selected.append(sale)
    selected.sort(key=lambda s: s.get("date_from") or "", reverse=True)
    return selected[:max_n], estate_count


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=21)
    ap.add_argument("--max", type=int, default=200)
    args = ap.parse_args()

    today = today_ct()
    cutoff = today - timedelta(days=args.days)
    print(f"fetch permits cutoff>={cutoff.isoformat()} today={today.isoformat()}")

    raw: list[dict] = []
    try:
        raw = fetch_ckan(limit=max(300, args.max))
    except Exception as e:
        print(f"ckan failed: {type(e).__name__}: {e}", file=sys.stderr)
        try:
            text = fetch_csv(PERMITS_CSV_URL)
            raw = rows_from_csv(text)
            print(f"csv rows={len(raw)}")
        except Exception as e2:
            print(f"download failed: {type(e2).__name__}: {e2}", file=sys.stderr)
            return 1

    selected, estate_count = select_permits(raw, cutoff, args.max)
    print(f"garage/estate permits in window={len(selected)} (estate-tagged={estate_count})")

    if not selected:
        print("no permits selected — leaving existing permits[] untouched", file=sys.stderr)
        return 0

    data = safe_load_city("san-antonio")
    data["permits"] = selected
    data["permit_total"] = len(selected)
    data["permit_estate_count"] = estate_count
    data["total_locations"] = len(data.get("public") or []) + len(selected)
    data["date"] = today.isoformat()
    data["last_refresh"] = datetime.now(CT).isoformat(timespec="seconds")
    data["status"] = "live"
    srcs = set(data.get("sources") or [])
    srcs.add("data.sanantonio.gov")
    data["sources"] = sorted(srcs)

    out = safe_write_city("san-antonio", data)
    print(
        f"wrote {out} permits={len(selected)} estate={estate_count} "
        f"total_locations={data['total_locations']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
