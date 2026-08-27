#!/usr/bin/env python3
"""Lookup active $5 weekend pin claims.

Usage:
  python scripts/pin_claim_lookup.py cl-salemovingsaleiylkr45drf81ty7rajr8d2
  python scripts/pin_claim_lookup.py --list-active
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "ops" / "pin-claims.json"


def load():
    if not REGISTRY.exists():
        return {"claims": []}
    return json.loads(REGISTRY.read_text(encoding="utf-8"))


def active(today: date | None = None):
    today = today or date.today()
    rows = []
    for p in load().get("claims") or []:
        if (p.get("status") or "").lower() not in ("active", "live"):
            continue
        until = (p.get("claimed_until") or "")[:10]
        try:
            if date.fromisoformat(until) < today:
                continue
        except ValueError:
            continue
        rows.append(p)
    return rows


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description="Pin claim lookup")
    ap.add_argument("sale_id", nargs="?")
    ap.add_argument("--list-active", action="store_true")
    args = ap.parse_args(argv)

    if args.list_active:
        print(json.dumps(active(), indent=2))
        return 0

    if not args.sale_id:
        ap.print_help()
        return 2

    wanted = args.sale_id.strip()
    for p in active():
        if wanted in {
            str(p.get("sale_id") or ""),
            str(p.get("external_id") or ""),
            str(p.get("id") or ""),
        }:
            print(json.dumps(p, indent=2))
            print(
                f'\nStamp listing: {{"boost": true, "boost_until": "{p.get("claimed_until")}", "claimed": true}}',
                file=sys.stderr,
            )
            return 0
    print("NO_ACTIVE_CLAIM")
    return 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
