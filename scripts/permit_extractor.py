#!/usr/bin/env python3
"""
Permit-Extractor — Project YardBird / GSIN
Parses City of San Antonio Open Data "Building Permits - PERMITS ISSUED"
CSV and emits canonical GSIN sale records for Garage Sale permits.

Source: https://data.sanantonio.gov/dataset/building-permits
Resource: permits_issued.csv (includes all garage sale permits)

Usage:
  python scripts/permit_extractor.py --csv /path/to/permits_issued.csv --days 21 --out data/permits_recent.json
"""

from __future__ import annotations
import argparse
import csv
import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any


def parse_date(s: str | None) -> datetime | None:
    if not s:
        return None
    s = s.strip()[:10]
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue
    return None


def clean_address(raw: str) -> str:
    """Strip trailing ', City of San Antonio, TX #####' noise."""
    if not raw:
        return ""
    m = re.match(r"^(.*?)(?:,\s*City of San Antonio.*)?$", raw.strip(), re.I)
    return (m.group(1) if m else raw).strip().rstrip(",")


def row_to_record(row: dict[str, str]) -> dict[str, Any] | None:
    ptype = (row.get("PERMIT TYPE") or "").strip()
    if ptype.lower() != "garage sale":
        return None

    permit_id = (row.get("PERMIT #") or "").strip()
    address_raw = (row.get("ADDRESS") or "").strip()
    if not address_raw:
        return None

    issued = parse_date(row.get("DATE ISSUED"))
    submitted = parse_date(row.get("DATE SUBMITTED"))

    try:
        lon = float(row["X_COORD"]) if row.get("X_COORD") else None
        lat = float(row["Y_COORD"]) if row.get("Y_COORD") else None
    except (ValueError, TypeError):
        lon = lat = None

    if lon is not None and not (-99.2 < lon < -97.8):
        lon = None
    if lat is not None and not (29.0 < lat < 30.0):
        lat = None

    addr_clean = clean_address(address_raw)
    contact = (row.get("PRIMARY CONTACT") or "").strip()

    return {
        "id": f"permit-{permit_id}",
        "title": f"Garage Sale — {addr_clean}",
        "description": f"City of San Antonio garage sale permit. Issued {row.get('DATE ISSUED') or 'unknown'}. Contact on file: {contact or 'n/a'}.",
        "address_raw": address_raw,
        "address_resolved": addr_clean,
        "lat": lat,
        "lon": lon,
        "start_date": (issued or submitted).strftime("%Y-%m-%d") if (issued or submitted) else None,
        "end_date": None,
        "hours": None,
        "categories": ["garage-sale"],
        "sources": ["municipal_permit", "open_data_sa"],
        "confidence": 0.92,
        "status": "active",
        "neighborhood": None,
        "city": "San Antonio",
        "permit_number": permit_id,
        "issued_date": row.get("DATE ISSUED"),
        "primary_contact": contact or None,
        "council_district": row.get("CD") or None,
        "raw_permit_type": ptype,
    }


def extract(csv_path: Path, days: int = 21, as_of: datetime | None = None) -> list[dict[str, Any]]:
    as_of = as_of or datetime.now(timezone.utc).replace(tzinfo=None)
    cutoff = as_of - timedelta(days=days)
    records = []
    with csv_path.open(newline="", encoding="utf-8", errors="replace") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rec = row_to_record(row)
            if not rec:
                continue
            d = parse_date(rec.get("issued_date"))
            if d and d >= cutoff:
                records.append(rec)
    records.sort(key=lambda r: r.get("issued_date") or "", reverse=True)
    return records


def main():
    parser = argparse.ArgumentParser(description="Permit-Extractor for Open Data SA garage sales")
    parser.add_argument("--csv", type=Path, required=True, help="Path to permits_issued.csv")
    parser.add_argument("--days", type=int, default=21, help="Look-back window in days")
    parser.add_argument("--out", type=Path, default=Path("data/permits_recent.json"))
    args = parser.parse_args()

    if not args.csv.exists():
        raise SystemExit(f"CSV not found: {args.csv}")

    records = extract(args.csv, days=args.days)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "generated_at": datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds"),
        "source": "open_data_sa_permits_issued",
        "lookback_days": args.days,
        "count": len(records),
        "records": records,
    }
    args.out.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Extracted {len(records)} garage-sale permits (last {args.days} days) → {args.out}")


if __name__ == "__main__":
    main()
