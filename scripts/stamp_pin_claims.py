#!/usr/bin/env python3
"""Stamp weekend $5 pin claims onto the public San Antonio feed.

Copies claimed listings onto boost=true / boost_until so the existing gold-star
map highlights them. Writes a PII-free public file at webapp/data/pin-claims.json.
"""
from __future__ import annotations

import json
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OPS = ROOT / "ops" / "pin-claims.json"
FEED = ROOT / "webapp" / "data" / "cities" / "san-antonio.json"
PUBLIC = ROOT / "webapp" / "data" / "pin-claims.json"


def today() -> str:
    return date.today().isoformat()


def listings(feed: dict) -> list[dict]:
    out: list[dict] = []
    for key in ("public", "permits", "preferred", "listings", "sales"):
        val = feed.get(key)
        if isinstance(val, list):
            out.extend(val)
    return out


def ids_of(sale: dict) -> set[str]:
    keys = []
    for k in ("external_id", "id", "sale_id"):
        v = sale.get(k)
        if v:
            keys.append(str(v))
    addr = (sale.get("address") or "").strip().lower()
    if addr:
        keys.append(addr)
    return set(keys)


def find_sale(feed: dict, claim: dict) -> dict | None:
    wanted = {
        str(claim.get(k) or "").strip()
        for k in ("sale_id", "external_id", "id")
        if claim.get(k)
    }
    addr = (claim.get("address") or "").strip().lower()
    if addr:
        wanted.add(addr)
    wanted.discard("")
    if not wanted:
        return None
    for sale in listings(feed):
        if ids_of(sale) & wanted:
            return sale
        saddr = (sale.get("address") or "").strip().lower()
        if addr and saddr and (addr in saddr or saddr in addr):
            return sale
    return None


def main() -> int:
    if not OPS.exists() or not FEED.exists():
        print("missing ops or feed", file=sys.stderr)
        return 1

    ops = json.loads(OPS.read_text(encoding="utf-8"))
    feed = json.loads(FEED.read_text(encoding="utf-8"))
    now = today()
    public_rows = []
    stamped = 0

    for claim in ops.get("claims") or []:
        status = (claim.get("status") or "").lower()
        until = str(claim.get("claimed_until") or "")[:10]
        if status not in ("active", "live"):
            continue
        if until and until < now:
            continue
        sale = find_sale(feed, claim)
        if not sale:
            continue
        until = until or str(sale.get("date_to") or sale.get("end_date") or now)[:10]
        sale["boost"] = True
        sale["boost_until"] = until
        sale["claimed"] = True
        sale["claimed_until"] = until
        cats = sale.get("categories")
        if isinstance(cats, list) and "boost" not in cats:
            cats.append("boost")
        stamped += 1
        public_rows.append(
            {
                "id": sale.get("external_id") or sale.get("id") or claim.get("sale_id"),
                "title": sale.get("title") or claim.get("title"),
                "address": sale.get("address"),
                "lat": sale.get("lat"),
                "lon": sale.get("lon"),
                "claimed_until": until,
                "status": claim.get("live_status") or "live",
            }
        )

    PUBLIC.parent.mkdir(parents=True, exist_ok=True)
    PUBLIC.write_text(
        json.dumps(
            {
                "updated": now,
                "product": "pin_claim_weekend",
                "price_usd": 5,
                "note": "Public claimed pins this weekend. No emails.",
                "claims": public_rows,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    FEED.write_text(json.dumps(feed, indent=2) + "\n", encoding="utf-8")
    print(f"stamped {stamped} claims; public {len(public_rows)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
