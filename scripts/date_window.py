#!/usr/bin/env python3
"""Date-window pins + dated email list.

If a listing has parseable dates, it is only shown on the map while
today (America/Chicago) is inside [date_start, date_end].
Upcoming dated sales stay in the calendar/email pack, not on today's map.
Undated / recurring (Tue-Sat, ongoing shop) stay visible.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import date, datetime
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
CT = ZoneInfo("America/Chicago")
CITY = ROOT / "webapp" / "data" / "cities" / "san-antonio.json"
CAL = ROOT / "webapp" / "data" / "sale-calendar.json"
PACK = ROOT / "daily-packs"

MONTHS = {
    "jan": 1, "january": 1, "feb": 2, "february": 2, "mar": 3, "march": 3,
    "apr": 4, "april": 4, "may": 5, "jun": 6, "june": 6, "jul": 7, "july": 7,
    "aug": 8, "august": 8, "sep": 9, "sept": 9, "september": 9,
    "oct": 10, "october": 10, "nov": 11, "november": 11, "dec": 12, "december": 12,
}
RECURRING = re.compile(r"^(tue-sat|mon-sat|mon-sun|daily|ongoing|open daily|weekdays)", re.I)


def parse_window(text: str, year: int) -> tuple[date | None, date | None]:
    if not text:
        return None, None
    t = text.lower().replace("\u2013", "-").replace("\u2014", "-").replace("–", "-")
    t = re.sub(r"\s+", " ", t).strip()
    if RECURRING.search(t):
        return None, None
    isos = re.findall(r"(20\d{2}-\d{2}-\d{2})", t)
    if isos:
        try:
            start = date.fromisoformat(isos[0])
            end = date.fromisoformat(isos[-1])
            if t.startswith("through") or t.startswith("until"):
                return None, end
            return start, end
        except ValueError:
            pass
    hits = list(re.finditer(r"(?:mon|tue|wed|thu|fri|sat|sun)?\.?\s*([a-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?", t))
    parsed: list[date] = []
    for h in hits:
        mon = MONTHS.get(h.group(1)[:3]) or MONTHS.get(h.group(1))
        if not mon:
            continue
        try:
            parsed.append(date(year, mon, int(h.group(2))))
        except ValueError:
            pass
    if parsed:
        return parsed[0], parsed[-1]
    return None, None


def window_of(pin: dict[str, Any], year: int) -> tuple[date | None, date | None]:
    return parse_window(str(pin.get("dates") or pin.get("date") or ""), year)


def classify(pin: dict[str, Any], today: date) -> str:
    status = str(pin.get("status") or "").lower()
    blob = " ".join(str(pin.get(k) or "") for k in ("title", "dates", "status", "source")).lower()
    if status in ("expired", "rejected", "removed", "online_only") or pin.get("plot") is False:
        return "hidden"
    if any(x in blob for x in ("bidding ends", "online auction", "ctbids", "online only")):
        return "hidden"
    start, end = window_of(pin, today.year)
    pin["date_start"] = start.isoformat() if start else None
    pin["date_end"] = end.isoformat() if end else None
    if start is None and end is None:
        return "undated"
    if end and end < today:
        return "expired"
    if start and start > today:
        return "upcoming"
    if end and today > end:
        return "expired"
    return "live"


def _line(p: dict[str, Any]) -> str:
    window = ""
    if p.get("date_start") or p.get("date_end"):
        window = f" [{p.get('date_start') or '?'} → {p.get('date_end') or '?'}]"
    hours = f" | {p['hours']}" if p.get("hours") else ""
    return f"- {p.get('title') or 'Sale'} — {p.get('address') or ''}{window}{hours}"


def email_body(today: date, groups: dict[str, list]) -> str:
    lines = [
        f"Subject: Chica Map dates — {today.isoformat()}",
        "",
        f"Hey pack — dated sales as of {today.strftime('%A, %B %-d')}.",
        "Map only shows pins whose listed dates include today.",
        "",
    ]
    labels = {
        "live": f"ON THE MAP TODAY ({today.isoformat()})",
        "upcoming": "COMING UP (remembered, not on today's map)",
        "undated": "NO HARD DATES (shops / recurring — still on map)",
        "expired": "ENDED (off the map)",
        "hidden": "ONLINE / UNPLOTTABLE",
    }
    for key in ("live", "upcoming", "undated", "expired", "hidden"):
        pins = groups.get(key) or []
        if not pins:
            continue
        lines.append(f"## {labels[key]}")
        lines.append("")
        if key == "upcoming":
            by: dict[str, list] = {}
            for p in pins:
                by.setdefault(p.get("date_start") or "unknown", []).append(p)
            for d in sorted(by):
                lines.append(f"### Starts {d}")
                for p in by[d]:
                    lines.append(_line(p))
                lines.append("")
            continue
        for p in pins:
            lines.append(_line(p))
        lines.append("")
    lines.append("— Chica\n")
    return "\n".join(lines)


def _slim(p: dict[str, Any]) -> dict[str, Any]:
    return {k: p.get(k) for k in ("title", "address", "dates", "date_start", "date_end", "hours", "type", "source", "lat", "lon", "status")}


def run(today: date, dry_run: bool = False) -> int:
    data = json.loads(CITY.read_text(encoding="utf-8"))
    groups = {k: [] for k in ("live", "upcoming", "undated", "expired", "hidden")}
    annotated = []
    for pin in data.get("public") or []:
        bucket = classify(pin, today)
        pin["date_bucket"] = bucket
        groups[bucket].append(pin)
        annotated.append(pin)
    live_map = [p for p in annotated if p.get("date_bucket") in ("live", "undated")]
    data["public"] = live_map
    data["total_locations"] = len(live_map)
    data["date"] = today.isoformat()
    data["last_refresh"] = datetime.now(CT).isoformat(timespec="seconds")
    data["date_window"] = {"today": today.isoformat(), **{k: len(groups[k]) for k in groups}}
    calendar = {"generated": data["last_refresh"], "today": today.isoformat(), **{k: [_slim(p) for p in groups[k]] for k in groups}}
    body = email_body(today, groups)
    print(f"today={today} live={len(groups['live'])} undated={len(groups['undated'])} upcoming={len(groups['upcoming'])} expired={len(groups['expired'])} hidden={len(groups['hidden'])}")
    if dry_run:
        print(body)
        return 0
    CITY.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    CAL.parent.mkdir(parents=True, exist_ok=True)
    CAL.write_text(json.dumps(calendar, indent=2) + "\n", encoding="utf-8")
    PACK.mkdir(parents=True, exist_ok=True)
    mail = PACK / f"{today.isoformat()}-dated-sales-email.md"
    mail.write_text(body, encoding="utf-8")
    print(f"wrote {CITY}\nwrote {CAL}\nwrote {mail}")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--today", default="")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    today = date.fromisoformat(args.today) if args.today else datetime.now(CT).date()
    if not CITY.exists():
        print(f"missing {CITY}", file=sys.stderr)
        return 2
    return run(today, dry_run=args.dry_run)


if __name__ == "__main__":
    raise SystemExit(main())
