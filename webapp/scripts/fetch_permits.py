#!/usr/bin/env python3
"""Fetch City of San Antonio garage-sale permits from Open Data SA.

Source: https://data.sanantonio.gov/dataset/building-permits
Filters PERMIT TYPE == "Garage Sale", recent issue dates, writes into
webapp/data/cities/san-antonio.json → permits[].

Usage:
  python3 webapp/scripts/fetch_permits.py
  python3 webapp/scripts/fetch_permits.py --days 14
"""
from __future__ import annotations

import argparse
import csv
import io
import json
import re
import sys
import urllib.request
from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

CT = ZoneInfo("America/Chicago")
UA = (
    "Mozilla/5.0 (compatible; YardBirdBot/1.0; "
    "+https://github.com/Justonejewelry/Project-YardBird)"
)

# Rolling "PERMITS ISSUED" (includes Garage Sale)
PERMITS_URL = (
    "https://data.sanantonio.gov/dataset/05012dcb-ba1b-4ade-b5f3-7403bc7f52eb/"
    "resource/c21106f9-3ef5-4f3a-8604-f992b4db7512/download/permits_issued.csv"
)

ROOT = Path(__file__).resolve().parents[1]
CITY_PATH = ROOT / "data" / "cities" / "san-antonio.json"


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


def fetch_csv(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/csv"})
    with urllib.request.urlopen(req, timeout=120) as resp:
        return resp.read().decode("utf-8", errors="replace")


def rows_from_csv(text: str) -> list[dict]:
    return list(csv.DictReader(io.StringIO(text)))


def permit_to_sale(row: dict, issued: date) -> dict:
    """Normalize a permit row. Sale dates are not in the feed — use issue window."""
    addr = clean_address(row.get("ADDRESS") or "")
    # City publishes lon in X_COORD, lat in Y_COORD
    try:
        lon = float(row.get("X_COORD") or 0)
        lat = float(row.get("Y_COORD") or 0)
    except ValueError:
        lon, lat = 0.0, 0.0
    if not (-99.2 < lon < -98.0 and 29.1 < lat < 29.9):
        lat, lon = 0.0, 0.0

    # Heuristic: permit usually used within ~7 days; pin stays "hot" through that window
    end = issued + timedelta(days=7)
    title = (row.get("PROJECT NAME") or "").strip() or "Permitted garage sale"
    if title.upper() == addr.upper() or title.replace(",", "") == addr.split(",")[0]:
        title = "City-permitted garage / yard sale"

    return {
        "address": addr,
        "dates": f"Permit issued {issued.strftime('%a %b')} {issued.day} · typical use within 7 days",
        "date_from": issued.isoformat(),
        "date_to": end.isoformat(),
        "end_date": end.isoformat(),
        "title": title[:120],
        "details": (
            "Official City of San Antonio garage-sale permit. "
            "Legal sale hours 9 a.m.–6 p.m. Exact sale day not published in open data — "
            "verify on-site or with seller."
        ),
        "source": "Open Data SA (Garage Sale permit)",
        "permit_number": (row.get("PERMIT #") or "").strip(),
        "photos": 0,
        "type": "permit",
        "confidence": 0.9 if lat else 0.7,
        "status": "verified",
        "lat": lat or None,
        "lon": lon or None,
        "geocode": "city-open-data" if lat else "missing",
        "hours": "9 a.m. – 6 p.m. (city rule)",
    }


def load_city() -> dict:
    if CITY_PATH.exists():
        return json.loads(CITY_PATH.read_text(encoding="utf-8"))
    return {
        "edition": "San Antonio Yard-Bird Discovery",
        "city": "san-antonio",
        "public": [],
        "permits": [],
        "hot_zones": [],
        "sources": [],
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--days",
        type=int,
        default=14,
        help="Keep permits issued within this many days (default 14)",
    )
    ap.add_argument(
        "--max",
        type=int,
        default=200,
        help="Cap permit pins written to the map (default 200)",
    )
    args = ap.parse_args()

    today = today_ct()
    cutoff = today - timedelta(days=args.days)
    print(f"fetch permits cutoff>={cutoff.isoformat()} today={today.isoformat()}")

    try:
        text = fetch_csv(PERMITS_URL)
    except Exception as e:
        print(f"download failed: {type(e).__name__}: {e}", file=sys.stderr)
        return 1

    raw = rows_from_csv(text)
    print(f"csv rows={len(raw)}")

    selected: list[dict] = []
    for row in raw:
        if (row.get("PERMIT TYPE") or "").strip() != "Garage Sale":
            continue
        issued = parse_date(row.get("DATE ISSUED") or "")
        if not issued or issued < cutoff:
            continue
        # Still useful if issued slightly in the future (timezone/data quirks)
        selected.append(permit_to_sale(row, issued))

    # Newest first; drop rows without address
    selected = [s for s in selected if s.get("address")]
    selected.sort(key=lambda s: s.get("date_from") or "", reverse=True)
    selected = selected[: args.max]
    print(f"garage permits in window={len(selected)}")

    data = load_city()
    data["permits"] = selected
    data["permit_total"] = len(selected)
    data["total_locations"] = len(data.get("public") or []) + len(selected)
    data["date"] = today.isoformat()
    data["last_refresh"] = datetime.now(CT).isoformat(timespec="seconds")
    data["status"] = "live"
    srcs = set(data.get("sources") or [])
    srcs.add("data.sanantonio.gov")
    data["sources"] = sorted(srcs)

    CITY_PATH.parent.mkdir(parents=True, exist_ok=True)
    CITY_PATH.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {CITY_PATH} permits={len(selected)} total_locations={data['total_locations']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
