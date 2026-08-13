#!/usr/bin/env python3
"""Lookup active Boost passes from ops/boost-passes.json.

Usage:
  python scripts/boost_lookup.py seller@email.com
  python scripts/boost_lookup.py 2105551234
  python scripts/boost_lookup.py --list-active
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "ops" / "boost-passes.json"


def norm_key(s: str) -> str:
    t = (s or "").strip().lower()
    if "@" in t:
        return t
    digits = re.sub(r"\D", "", t)
    return digits or t


def load():
    if not REGISTRY.exists():
        return {"passes": []}
    return json.loads(REGISTRY.read_text(encoding="utf-8"))


def active_pass_for(contact: str, today: date | None = None):
    today = today or date.today()
    key = norm_key(contact)
    if not key:
        return None
    data = load()
    best = None
    for p in data.get("passes") or []:
        if norm_key(p.get("contact_key") or "") != key:
            continue
        if (p.get("status") or "").lower() not in ("active", "pending_contact"):
            # pending_contact never matches without key; active only
            if (p.get("status") or "").lower() != "active":
                continue
        until = p.get("boost_until") or ""
        try:
            until_d = date.fromisoformat(until[:10])
        except ValueError:
            continue
        if until_d < today:
            continue
        if best is None or until_d > date.fromisoformat(best["boost_until"][:10]):
            best = p
    return best


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description="Boost pass lookup")
    ap.add_argument("contact", nargs="?", help="Email or phone")
    ap.add_argument("--list-active", action="store_true")
    args = ap.parse_args(argv)

    data = load()
    today = date.today()

    if args.list_active:
        rows = []
        for p in data.get("passes") or []:
            if (p.get("status") or "").lower() != "active":
                continue
            until = (p.get("boost_until") or "")[:10]
            try:
                if date.fromisoformat(until) < today:
                    continue
            except ValueError:
                continue
            rows.append(p)
        print(json.dumps(rows, indent=2))
        return 0

    if not args.contact:
        ap.print_help()
        return 2

    hit = active_pass_for(args.contact, today)
    if not hit:
        print("NO_ACTIVE_BOOST")
        return 1
    print(json.dumps(hit, indent=2))
    print(
        f"\nStamp listing: {{\"boost\": true, \"boost_until\": \"{hit.get('boost_until')}\"}}",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
