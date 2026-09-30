#!/usr/bin/env python3
"""Resolve thin addresses (street-only, zip-only, hidden estate, online).

Used after ingest so neighborhood clusters can plot without inventing a house
number. Never fabricates a street number. Online auctions stay unplottable.

Usage:
  python3 scripts/thin_address_resolve.py
  python3 scripts/thin_address_resolve.py --city-file webapp/data/cities/san-antonio.json
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
CT = ZoneInfo("America/Chicago")
CENSUS = "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress"
UA = "ChicasMap/thin-address-resolve (+https://github.com/Justonejewelry/Chicas-Map)"

COMMUNITY_ANCHORS = {
    "larchmont": {
        "query": "Greenwich Blvd and Larchmont Dr, San Antonio, TX 78209",
        "address": "Greenwich Blvd & Larchmont Dr, San Antonio, TX 78209",
        "note": "Terrell Heights map pickup / community garden — listing says Greenwich & Larchmont",
        "type": "community",
    },
    "greenwich": {
        "query": "Greenwich Blvd and Larchmont Dr, San Antonio, TX 78209",
        "address": "Greenwich Blvd & Larchmont Dr, San Antonio, TX 78209",
        "note": "Terrell Heights map pickup / community garden — listing says Greenwich & Larchmont",
        "type": "community",
    },
    "redhorse": {
        "query": "17150 Jones Maltsberger Rd, San Antonio, TX 78247",
        "address": "Redland Ranch at Elm Creek gate, 17150 Jones Maltsberger Rd, San Antonio, TX 78247",
        "note": "HOA plat: private street at 17150 Jones Maltsberger; sales on Redhorse Pass",
        "type": "community",
    },
    "redland ranch": {
        "query": "17150 Jones Maltsberger Rd, San Antonio, TX 78247",
        "address": "Redland Ranch at Elm Creek gate, 17150 Jones Maltsberger Rd, San Antonio, TX 78247",
        "note": "HOA plat: private street at 17150 Jones Maltsberger; sales on Redhorse Pass",
        "type": "community",
    },
}

ONLINE_MARKERS = (
    "bidding ends",
    "online auction",
    "ctbids",
    "bidrush",
    "ships!",
    "online only",
    "items start closing",
)

INTERSECT_RE = re.compile(
    r"(?:@|at|pickup|maps?\s+(?:at|@))?\s*"
    r"([A-Z][A-Za-z0-9 .'-]{2,40}?)\s*(?:&|and|/)\s*"
    r"([A-Z][A-Za-z0-9 .'-]{2,40}?)(?:\b|$)",
    re.I,
)
HOURS_RE = re.compile(
    r"(\d{1,2}(?::\d{2})?\s*(?:am|pm)\s*[-–to]+\s*\d{1,2}(?::\d{2})?\s*(?:am|pm))",
    re.I,
)
STREET_NUM_RE = re.compile(r"^\s*\d{1,6}\s+[A-Za-z]")


def _blob(pin: dict[str, Any]) -> str:
    return " ".join(
        str(pin.get(k) or "")
        for k in ("title", "address", "details", "hours", "source")
    )


def _is_online(pin: dict[str, Any]) -> bool:
    b = _blob(pin).lower()
    return any(m in b for m in ONLINE_MARKERS)


def census_geocode(query: str) -> tuple[float, float, str] | None:
    qs = urllib.parse.urlencode(
        {"address": query, "benchmark": "Public_AR_Current", "format": "json"}
    )
    req = urllib.request.Request(
        f"{CENSUS}?{qs}",
        headers={"User-Agent": UA, "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=18) as resp:
            data = json.loads(resp.read().decode())
    except Exception as exc:
        print(f"  geocode fail {query!r}: {exc}")
        return None
    matches = (data.get("result") or {}).get("addressMatches") or []
    if not matches:
        return None
    c = matches[0]["coordinates"]
    return float(c["y"]), float(c["x"]), matches[0].get("matchedAddress") or query


def resolve_pin(pin: dict[str, Any]) -> str:
    addr = pin.get("address") or ""
    title = pin.get("title") or ""
    blob = _blob(pin)

    if _is_online(pin):
        pin["status"] = "online_only"
        pin["plot"] = False
        pin.setdefault("resolve_note", "online auction / bidding — not a driveway pin")
        return "online_only"

    if "hidden" in blob.lower() or "see source for address after" in blob.lower():
        pin["address_status"] = "hidden_until_sale"
        hours_m = HOURS_RE.search(blob)
        if hours_m and not pin.get("hours"):
            pin["hours"] = hours_m.group(1)
        pin.setdefault("resolve_note", "street withheld by lister until morning of sale")
        return "hidden_estate"

    if pin.get("lat") not in (None, "", 0) and pin.get("lon") not in (None, "", 0):
        return "already_geocoded"

    low = (addr + " " + title + " " + blob).lower()
    for key, spec in COMMUNITY_ANCHORS.items():
        if key in low:
            hit = census_geocode(spec["query"])
            if hit:
                lat, lon, matched = hit
                pin["lat"] = lat
                pin["lon"] = lon
                pin["geocode_accuracy"] = "intersection"
                pin["geocode_query"] = spec["query"]
                pin["geocode_match"] = matched
                pin["type"] = spec["type"]
                pin["meetup_address"] = spec["address"]
                pin["resolve_note"] = spec["note"]
                pin["status"] = pin.get("status") or "verified"
                return f"anchor:{key}"
            return "anchor_miss"

    im = INTERSECT_RE.search(blob)
    if im and not STREET_NUM_RE.search(addr):
        a, b = im.group(1).strip(), im.group(2).strip()
        zipc = ""
        zm = re.search(r"\b(78\d{3})\b", addr + " " + blob)
        if zm:
            zipc = zm.group(1)
        query = f"{a} and {b}, San Antonio, TX {zipc}".strip()
        hit = census_geocode(query)
        if hit:
            lat, lon, matched = hit
            pin["lat"] = lat
            pin["lon"] = lon
            pin["geocode_accuracy"] = "intersection"
            pin["geocode_query"] = query
            pin["geocode_match"] = matched
            pin["type"] = "community"
            pin["meetup_address"] = matched
            pin["resolve_note"] = f"intersection from listing copy: {a} & {b}"
            return "intersection"

    return "unresolved"


def run(city_file: Path, dry_run: bool = False) -> int:
    data = json.loads(city_file.read_text(encoding="utf-8"))
    pins = data.get("public") or []
    counts: dict[str, int] = {}
    for pin in pins:
        label = resolve_pin(pin)
        counts[label] = counts.get(label, 0) + 1
        print(f"  {label:20}  {pin.get('title','')[:48]}  |  {pin.get('address','')[:48]}")
    data["last_thin_resolve"] = datetime.now(CT).isoformat(timespec="seconds")
    if not dry_run:
        city_file.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
        print(f"wrote {city_file}")
    print("counts", counts)
    return 0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--city-file", default=str(ROOT / "webapp/data/cities/san-antonio.json"))
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    path = Path(args.city_file)
    if not path.exists():
        print(f"missing {path}", file=sys.stderr)
        return 2
    return run(path, dry_run=args.dry_run)


if __name__ == "__main__":
    raise SystemExit(main())
