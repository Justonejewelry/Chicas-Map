#!/usr/bin/env python3
"""Refuse a scheduled populate that would wipe most of the upcoming map.

Compares the working-tree sales-clean.json (and san-antonio.json) to a
baseline snapshot or git HEAD. A drop of more than 40% in upcoming pins
fails the job so Chica Daily will not commit a gutted feed.

Usage:
  python3 scripts/guard_populate_feed.py
  python3 scripts/guard_populate_feed.py --baseline-dir /tmp/feed-baseline
  python3 scripts/guard_populate_feed.py --restore-on-fail
"""
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from datetime import date, datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
CT = ZoneInfo("America/Chicago")
CLEAN = ROOT / "webapp" / "data" / "sales-clean.json"
CITY = ROOT / "webapp" / "data" / "cities" / "san-antonio.json"
DROP_LIMIT = 0.40  # more than 40% drop is a wipe


def today_ct() -> date:
    return datetime.now(CT).date()


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def end_date(sale: dict) -> date | None:
    for key in ("date_end", "date_to", "end_date"):
        raw = sale.get(key)
        if not raw:
            continue
        try:
            return date.fromisoformat(str(raw)[:10])
        except ValueError:
            continue
    return None


def upcoming_count(data: dict, today: date) -> int:
    sales = data.get("public") or data.get("sales") or []
    n = 0
    for sale in sales:
        if not isinstance(sale, dict):
            continue
        end = end_date(sale)
        if end is None or end >= today:
            n += 1
    return n


def load_baseline_json(path: Path, git_ref: str, repo_path: str) -> dict | None:
    if path.exists():
        return load_json(path)
    try:
        raw = subprocess.check_output(
            ["git", "show", f"{git_ref}:{repo_path}"],
            cwd=str(ROOT),
            stderr=subprocess.DEVNULL,
        )
        return json.loads(raw)
    except Exception:
        return None


def evaluate(baseline: dict | None, current: dict | None, today: date, label: str) -> tuple[bool, str]:
    if not baseline or not current:
        return True, f"{label}: skipped (missing file)"
    before = upcoming_count(baseline, today)
    after = upcoming_count(current, today)
    if before >= 10 and after < before * (1.0 - DROP_LIMIT):
        return False, (
            f"{label}: upcoming pins fell {before} -> {after} "
            f"(more than {int(DROP_LIMIT * 100)}% drop)"
        )
    return True, f"{label}: upcoming {before} -> {after}"


def snapshot(dest: Path) -> None:
    dest.mkdir(parents=True, exist_ok=True)
    if CLEAN.exists():
        shutil.copy2(CLEAN, dest / "sales-clean.json")
    if CITY.exists():
        shutil.copy2(CITY, dest / "san-antonio.json")


def restore(src: Path) -> None:
    clean_src = src / "sales-clean.json"
    city_src = src / "san-antonio.json"
    if clean_src.exists():
        shutil.copy2(clean_src, CLEAN)
        print(f"restored {CLEAN}", file=sys.stderr)
    if city_src.exists():
        shutil.copy2(city_src, CITY)
        print(f"restored {CITY}", file=sys.stderr)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--baseline-dir", default="")
    ap.add_argument("--git-ref", default="HEAD")
    ap.add_argument("--today", default="")
    ap.add_argument("--restore-on-fail", action="store_true")
    ap.add_argument("--snapshot-dir", default="", help="Write a baseline snapshot and exit")
    args = ap.parse_args()
    if args.snapshot_dir:
        snapshot(Path(args.snapshot_dir))
        print(f"snapshot -> {args.snapshot_dir}")
        return 0
    today = date.fromisoformat(args.today) if args.today else today_ct()
    base_dir = Path(args.baseline_dir) if args.baseline_dir else None
    def baseline(file_path: Path, repo_path: str):
        if base_dir and (base_dir / file_path.name).exists():
            return load_json(base_dir / file_path.name)
        return load_baseline_json(Path("_missing_"), args.git_ref, repo_path)

    baseline_clean = baseline(CLEAN, "webapp/data/sales-clean.json")
    baseline_city = baseline(CITY, "webapp/data/cities/san-antonio.json")
    current_clean = load_json(CLEAN) if CLEAN.exists() else None
    current_city = load_json(CITY) if CITY.exists() else None
    ok1, msg1 = evaluate(baseline_clean, current_clean, today, "sales-clean.json")
    ok2, msg2 = evaluate(baseline_city, current_city, today, "san-antonio.json")
    print(msg1)
    print(msg2)
    if ok1 and ok2:
        return 0
    print("GUARD FAIL: refusing to publish a gutted map feed", file=sys.stderr)
    if args.restore_on_fail and base_dir:
        restore(base_dir)
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
