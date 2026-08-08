#!/usr/bin/env python3
"""Purge expired garage/estate listings from city JSON feeds.

Run from repo root or webapp/:
  python3 webapp/scripts/purge_expired.py

Keeps a sale if its end date is on or after today (America/Chicago).
Updates date, last_refresh, total_locations. Exits 0 always; prints summary.

Uses city_io middleware so a PLACEHOLDER or corrupt file never crashes the job.
"""
from __future__ import annotations

import re
import sys
from datetime import date, datetime
from pathlib import Path
from zoneinfo import ZoneInfo

# Shared error-handling middleware
from city_io import CITY_DIR, safe_load_city, safe_write_city

CT = ZoneInfo("America/Chicago")
MONTHS = {
    m: i
    for i, m in enumerate(
        [
            "",
            "jan",
            "feb",
            "mar",
            "apr",
            "may",
            "jun",
            "jul",
            "aug",
            "sep",
            "oct",
            "nov",
            "dec",
        ],
        0,
    )
}
# also full names
for i, m in enumerate(
    ["", "january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"],
    0,
):
    MONTHS[m] = i


def today_ct() -> date:
    return datetime.now(CT).date()


def parse_end_date(text: str, year: int) -> date | None:
    """Best-effort end date from free-text dates field."""
    if not text:
        return None
    t = text.lower().replace("–", "-").replace("—", "-")
    t = re.sub(r"\s+", " ", t).strip()

    # Explicit ISO
    m = re.search(r"(20\d{2})-(\d{2})-(\d{2})", t)
    if m:
        try:
            return date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
        except ValueError:
            pass

    # "closing sun aug 9" / "through sun aug 16" / "closing ~aug 2"
    m = re.search(
        r"(?:closing|through|until|ends?)\s*(?:~\s*)?(?:mon|tue|wed|thu|fri|sat|sun)?\s*([a-z]{3,9})\s*(\d{1,2})",
        t,
    )
    if m:
        mon = MONTHS.get(m.group(1)[:3], MONTHS.get(m.group(1)))
        if mon:
            try:
                return date(year, mon, int(m.group(2)))
            except ValueError:
                pass

    # Ranges: "fri aug 7 - sat aug 8" or "aug 7-8" or "8/7 - 8/8"
    # Prefer the last month+day in the string as end
    hits = list(
        re.finditer(
            r"(?:mon|tue|wed|thu|fri|sat|sun)?\s*([a-z]{3,9})\.?\s*(\d{1,2})(?:st|nd|rd|th)?",
            t,
        )
    )
    if hits:
        last = hits[-1]
        mon = MONTHS.get(last.group(1)[:3], MONTHS.get(last.group(1)))
        if mon:
            try:
                return date(year, mon, int(last.group(2)))
            except ValueError:
                pass

    # Numeric "8/7-8/8" or "8/7"
    nums = list(re.finditer(r"(\d{1,2})/(\d{1,2})(?:/(\d{2,4}))?", t))
    if nums:
        last = nums[-1]
        mo, day = int(last.group(1)), int(last.group(2))
        y = year
        if last.group(3):
            y = int(last.group(3))
            if y < 100:
                y += 2000
        try:
            return date(y, mo, day)
        except ValueError:
            pass

    # Bare "sat-sun" without month — unknown; keep
    return None


def is_active(sale: dict, today: date, year: int) -> bool:
    status = str(sale.get("status") or "").lower()
    if status in ("expired", "rejected", "removed"):
        return False

    # Prefer structured end_date / date_to (written by fetch_permits and most scrapers)
    for key in ("end_date", "date_to"):
        raw = sale.get(key)
        if raw:
            s = str(raw).strip()[:10]
            try:
                end = date.fromisoformat(s)
                return end >= today
            except ValueError:
                pass

    # Fallback: free-text dates field
    dates = str(sale.get("dates") or sale.get("date") or "")
    end = parse_end_date(dates, year)
    if end is None:
        # No parseable end → keep (Sentinel may refine later)
        return True
    return end >= today


def process_city(path: Path, today: date) -> tuple[int, int]:
    """Purge expired listings using the shared safe loader/writer."""
    slug = path.stem
    raw = safe_load_city(slug)  # never raises on PLACEHOLDER / corrupt JSON
    year = today.year
    before = len(raw.get("public") or []) + len(raw.get("permits") or [])

    public = [s for s in (raw.get("public") or []) if is_active(s, today, year)]
    permits = [s for s in (raw.get("permits") or []) if is_active(s, today, year)]

    raw["public"] = public
    raw["permits"] = permits
    raw["total_locations"] = len(public) + len(permits)
    raw["date"] = today.isoformat()
    raw["last_refresh"] = datetime.now(CT).isoformat(timespec="seconds")
    raw["status"] = "live"

    safe_write_city(slug, raw)
    after = len(public) + len(permits)
    removed = before - after
    return removed, after


def main() -> int:
    today = today_ct()
    if not CITY_DIR.is_dir():
        print(f"No city dir at {CITY_DIR}", file=sys.stderr)
        return 1

    total_removed = 0
    total_kept = 0
    for path in sorted(CITY_DIR.glob("*.json")):
        if path.name.endswith("-clusters.json") or path.name.endswith("-user.json"):
            continue
        try:
            removed, kept = process_city(path, today)
        except Exception as e:
            # Final safety net — never let one city kill the whole purge pass
            print(f"skip {path.name}: {type(e).__name__}: {e}", file=sys.stderr)
            continue
        total_removed += removed
        total_kept += kept
        print(f"{path.name}: removed={removed} live={kept}")

    print(f"summary removed={total_removed} live={total_kept} today={today.isoformat()}")
    # Non-zero removed helps CI decide to commit; always exit 0
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
