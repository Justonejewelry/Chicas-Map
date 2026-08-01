#!/usr/bin/env python3
"""
Permit-Extractor (stub) — Project YardBird

Purpose: Ingest City of San Antonio garage/yard/estate sale permits from
Open Data SA bulk CSVs (and later Accela public search) into canonical
GSIN sale records.

Current status: Skeleton ready for real CSV path.
Open Data portal: https://data.sanantonio.gov/dataset/building-permits
Look for rows / permit types that include garage sale, yard sale, estate sale.

When a matching permit is found:
- confidence starts at 0.85–0.95
- source = ["municipal_permit", "open_data_sa"]
- status = "verified" after Sentinel
"""

from __future__ import annotations
import csv
import json
from datetime import datetime
from pathlib import Path
from typing import Any


def normalize_permit_row(row: dict[str, str]) -> dict[str, Any] | None:
    """Map a raw Open Data row into a minimal GSIN sale candidate.
    Real implementation will inspect actual column names and permit type codes.
    """
    # Placeholder logic — replace with real field mapping once CSV schema is confirmed
    permit_type = (row.get("PERMIT_TYPE") or row.get("permit_type") or "").lower()
    if not any(k in permit_type for k in ("garage", "yard", "estate", "rummage")):
        return None

    address = row.get("ADDRESS") or row.get("address") or row.get("SITE_ADDRESS") or ""
    if not address.strip():
        return None

    return {
        "id": f"permit-{row.get('PERMIT_NUMBER') or row.get('permit_number') or 'unknown'}",
        "title": f"Permit-backed sale — {address[:60]}",
        "description": f"Municipal garage/yard/estate sale permit. Type: {permit_type}",
        "address_raw": address,
        "start_date": row.get("ISSUE_DATE") or row.get("issue_date") or None,
        "end_date": row.get("EXPIRATION_DATE") or row.get("expiration_date") or None,
        "sources": ["municipal_permit", "open_data_sa"],
        "confidence": 0.90,
        "status": "active",
        "categories": [],
        "raw_permit": {k: v for k, v in row.items() if v},
    }


def extract_from_csv(csv_path: Path) -> list[dict[str, Any]]:
    records = []
    with csv_path.open(newline="", encoding="utf-8", errors="replace") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rec = normalize_permit_row(row)
            if rec:
                records.append(rec)
    return records


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Permit-Extractor stub")
    parser.add_argument("--csv", type=Path, help="Path to Open Data SA permits CSV")
    parser.add_argument("--out", type=Path, default=Path("data/permits_extracted.json"))
    args = parser.parse_args()

    if not args.csv or not args.csv.exists():
        print("No CSV provided or file missing. Stub ready — supply --csv when data is available.")
        print("Expected output schema matches GSIN sale record minimum fields.")
        return

    records = extract_from_csv(args.csv)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(records, indent=2), encoding="utf-8")
    print(f"Extracted {len(records)} permit-backed candidates → {args.out}")


if __name__ == "__main__":
    main()
