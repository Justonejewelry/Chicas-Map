#!/usr/bin/env python3
"""Build webapp/data/mission-status.json for the Mission Control page.

Public, non-sensitive facts only: when each sale first appeared in the repo's public
sale feeds (git history, Central Time), plus the routine/pipeline status board.
No emails, tokens, seller names or home addresses. Run from the repo root:
    python3 scripts/build_mission_status.py [--routines-only]
"""
import json, re, subprocess, sys
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "webapp/data/mission-status.json"
CT = ZoneInfo("America/Chicago")
FEEDS = [
    "webapp/data/sales-clean.json",
    "webapp/data/cities/san-antonio.json",
    "webapp/data/cities/san-antonio-user.json",
    "webapp/data/cities/san-antonio-email.json",
]


def git(*a):
    return subprocess.run(["git", *a], cwd=ROOT, capture_output=True, text=True, check=True).stdout


def norm_addr(a):
    return re.sub(r"[^a-z0-9]+", " ", str(a or "").lower()).strip()


def sale_key(s):
    return (s.get("external_id") or "") or ("addr:" + norm_addr(s.get("address")))


def history():
    seen = {}  # key -> record
    for path in FEEDS:
        log = git("log", "--reverse", "--format=%H|%aI", "--", path).strip().splitlines()
        for line in log:
            sha, iso = line.split("|", 1)
            try:
                doc = json.loads(git("show", f"{sha}:{path}"))
            except Exception:
                continue
            when = datetime.fromisoformat(iso).astimezone(CT)
            for s in (doc.get("public") or []):
                if not isinstance(s, dict) or not s.get("address"):
                    continue
                k = sale_key(s)
                a = norm_addr(str(s.get("address")).split(",")[0]) + "|" + str(s.get("date_from") or s.get("date_start") or "")
                rec = seen.get(a)
                if rec is None:
                    seen[a] = rec = {
                        "id": s.get("external_id") or "",
                        "ak": a,
                        "added": when.isoformat(timespec="minutes"),
                        "day": when.strftime("%Y-%m-%d"),
                        "src": str(s.get("source") or "")[:40],
                        "from": s.get("date_from") or s.get("date_start") or "",
                        "to": s.get("date_to") or s.get("end_date") or s.get("date_end") or s.get("date_from") or "",
                        "zip": str(s.get("zip") or "")[:5],
                        "title": str(s.get("title") or "")[:90],
                        "address": str(s.get("source_address") or s.get("address") or "")[:90],
                        "hours": str(s.get("hours") or "")[:60],
                        "url": next((u for u in [(s.get("source_urls") or [""])[0], s.get("url") or ""] if str(u).startswith("https://")), ""),
                    }
                elif when.isoformat(timespec="minutes") < rec["added"]:
                    rec["added"], rec["day"] = when.isoformat(timespec="minutes"), when.strftime("%Y-%m-%d")
    return sorted(seen.values(), key=lambda r: r["added"])


ROUTINES = [
    {"id": "fb-check", "name": "Facebook sale check", "kind": "Facebook",
     "schedule": "Daily around noon and 6 PM CT", "last_run": "2026-11-09T12:00:00-06:00",
     "status": "ok", "outcome": "Noon check done: +1 sale (Congregation Beth Simcha yard sale).",
     "note": "The 6 PM check on Nov 8 failed when plan usage ran out."},
    {"id": "yss", "name": "YardSaleSearch / listing-site run", "kind": "YardSaleSearch",
     "schedule": "Periodic, plus a planned Tue-Thu noon midweek check", "last_run": "2026-11-09T14:30:00-06:00",
     "status": "ok", "outcome": "Added 7 sales for Nov 9-15 (commit e463bb3)."},
    {"id": "email-leads", "name": "Email sale leads", "kind": "Email",
     "schedule": "Every few hours when Gmail is connected", "last_run": None,
     "status": "paused", "outcome": "Paused, waiting for Gmail to be reconnected."},
    {"id": "alerts", "name": "Saved-search alerts", "kind": "Alerts",
     "schedule": "Sends from the outbox when Gmail is connected", "last_run": None,
     "status": "paused", "outcome": "Paused, waiting for Gmail to be reconnected."},
    {"id": "ebay", "name": "eBay Partner Network check", "kind": "eBay",
     "schedule": "Daily 9 AM CT", "last_run": None,
     "status": "blocked", "outcome": "Blocked: partner site needs a fresh sign-in. Application is under review."},
    {"id": "map-refresh", "name": "Map refresh and publish", "kind": "Site",
     "schedule": "Scheduled in Central Time", "last_run": "2026-11-09T15:21:00-06:00",
     "status": "ok", "outcome": "Chica master populate rebuilt the feeds and the site."},
]


def main():
    now = datetime.now(CT)
    doc = {
        "generated_at": now.isoformat(timespec="seconds"),
        "timezone": "America/Chicago",
        "note": "Public repo-derived stats only. 'added' = first time a sale appeared in the public sale feeds (git history, Central Time).",
        "routines": ROUTINES,
        "added": history(),
    }
    if "--routines-only" in sys.argv and OUT.exists():
        old = json.loads(OUT.read_text())
        old["routines"], old["generated_at"] = ROUTINES, doc["generated_at"]
        doc = old
    OUT.write_text(json.dumps(doc, indent=1, ensure_ascii=False) + "\n")
    print("mission-status:", len(doc["added"]), "sales in history; wrote", OUT.relative_to(ROOT))


if __name__ == "__main__":
    main()
