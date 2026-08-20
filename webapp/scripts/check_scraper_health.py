#!/usr/bin/env python3
"""Scraper health monitor for YardBird / GSIN map-refresh.

Reads the *.log files produced by map-refresh steps and the live city JSON
source counts. Emits a clear health report to stdout (for GITHUB_STEP_SUMMARY)
and writes webapp/data/scraper-health.json.

Exit codes:
  0  — healthy or degraded (soft-warn only / single primary zero)
  1  — critical (majority of primary free sources failed / zero / missing)

Primary free sources:
  - EstateSales.org
  - YardSaleSearch
  - Craigslist

Scoring rule (updated 2026-08-20):
  - 0 primary problems → healthy
  - 1 primary problem  → degraded (still usable; other primaries cover)
  - 2+ primary problems → critical
  - Secondary failures alone → degraded

Zero detection (updated 2026-08-20):
  - True zero = normalized=0 or explicit "no sales found" with no positive count
  - "merge added=0" alone is NOT a failure (successful dedupe of existing listings)

Secondary (warn-only):
  - GarageSaleFinder
  - SA permits
  - EstateSales.net lightweight
  - Apify (optional)
"""
from __future__ import annotations

import json
import re
import sys
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

CT = ZoneInfo("America/Chicago")
ROOT = Path(__file__).resolve().parents[1]
CITY_DIR = ROOT / "data" / "cities"
HEALTH_PATH = ROOT / "data" / "scraper-health.json"

# Log files produced by map-refresh.yml (cwd is repo root in Actions)
LOGS = {
    "garagesalefinder": "discover.log",
    "permits": "permits.log",
    "estatesales_org": "estatesales-org.log",
    "yardsalesearch": "yardsalesearch.log",
    "craigslist": "craigslist.log",
    "estatesales_net": "estatesales.log",
    "estatesales_apify": "estatesales-apify.log",
}

PRIMARY = {"estatesales_org", "yardsalesearch", "craigslist"}

# True zero only — do NOT include "merge added=0" (that is successful dedupe)
ZERO_PATTERNS = [
    re.compile(r"normalized=0\b", re.I),
    re.compile(r"0 listings?\b", re.I),
    re.compile(r"no sales? found\b", re.I),
]

FAIL_PATTERNS = [
    re.compile(r"HTTP (403|429|5\d\d)\b"),
    re.compile(r"WARN: non-200", re.I),
    re.compile(r"Traceback \(most recent call last\)"),
    re.compile(r"blocked|forbidden|captcha|imperva", re.I),
    re.compile(r"ConnectionError|Timeout|URLError", re.I),
]

# Positive extraction signals (checked before zero)
OK_PATTERNS = [
    re.compile(r"normalized=([1-9]\d*)\b", re.I),
    re.compile(r"(?:parsed|enriched|static results)=([1-9]\d*)\b", re.I),
    re.compile(r"merge added=([1-9]\d*)\b", re.I),
]


def read_log(name: str) -> str:
    p = Path(name)
    if not p.exists():
        return ""
    return p.read_text(encoding="utf-8", errors="replace")


def analyze_log(key: str, text: str) -> dict:
    status = "missing"
    detail = "no log file"
    if not text.strip():
        return {"source": key, "status": status, "detail": detail, "primary": key in PRIMARY}

    # Hard failures first (HTTP errors, tracebacks, blocks)
    for pat in FAIL_PATTERNS:
        m = pat.search(text)
        if m:
            return {
                "source": key,
                "status": "fail",
                "detail": m.group(0)[:120],
                "primary": key in PRIMARY,
            }

    # Success signals BEFORE zero — normalized>0 means the scraper worked
    # even if merge added=0 (dedupe of existing listings is not a failure)
    for pat in OK_PATTERNS:
        m = pat.search(text)
        if m:
            return {
                "source": key,
                "status": "ok",
                "detail": m.group(0)[:80],
                "primary": key in PRIMARY,
            }

    # True zero only (no positive normalized/parsed count above)
    for pat in ZERO_PATTERNS:
        if pat.search(text):
            return {
                "source": key,
                "status": "zero",
                "detail": "normalized/added = 0",
                "primary": key in PRIMARY,
            }

    # Ran but no clear signal
    return {
        "source": key,
        "status": "unknown",
        "detail": "log present but no clear success/fail pattern",
        "primary": key in PRIMARY,
    }


def source_counts_from_json() -> dict[str, int]:
    """Count live public listings by source field (case-insensitive)."""
    counts: dict[str, int] = {}
    for path in CITY_DIR.glob("*.json"):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        for item in data.get("public") or []:
            src = (item.get("source") or "unknown").strip().lower()
            counts[src] = counts.get(src, 0) + 1
    return counts


def main() -> int:
    now = datetime.now(CT).isoformat(timespec="seconds")
    results = []
    for key, logname in LOGS.items():
        text = read_log(logname)
        results.append(analyze_log(key, text))

    json_counts = source_counts_from_json()

    critical_fails = [
        r for r in results if r["primary"] and r["status"] in ("fail", "zero", "missing")
    ]
    warns = [
        r for r in results if (not r["primary"]) and r["status"] in ("fail", "zero", "missing")
    ]

    # Softened scoring (2026-08-20):
    # 0 primary problems → healthy
    # 1 primary problem  → degraded (still usable)
    # 2+ primary problems → critical
    n_primary_problems = len(critical_fails)
    if n_primary_problems >= 2:
        overall = "critical"
    elif n_primary_problems == 1 or warns:
        overall = "degraded"
    else:
        overall = "healthy"

    report = {
        "generated_at": now,
        "overall": overall,
        "primary_failures": [r["source"] for r in critical_fails],
        "sources": results,
        "json_source_counts": json_counts,
        "notes": (
            "Primary free sources: estatesales_org, yardsalesearch, craigslist. "
            "Scoring: 0 primary problems=healthy, 1=degraded, 2+=critical. "
            "merge added=0 is treated as ok (dedupe), not zero. "
            "Soft-fail workflow continues; this report only alerts."
        ),
    }

    HEALTH_PATH.parent.mkdir(parents=True, exist_ok=True)
    HEALTH_PATH.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

    # Human summary for Actions step summary / logs
    print("### Scraper health")
    print("")
    print(f"- Overall: **{overall.upper()}**")
    print(f"- Generated: {now}")
    print(f"- Primary problems: {n_primary_problems}/3")
    print("")
    print("| Source | Status | Detail |")
    print("|--------|--------|--------|")
    for r in results:
        flag = "🔴" if r["status"] in ("fail", "zero", "missing") else ("🟡" if r["status"] == "unknown" else "🟢")
        print(f"| {r['source']} | {flag} {r['status']} | {r['detail'][:60]} |")
    print("")
    if json_counts:
        print("#### Live public counts by source (from city JSON)")
        for src, n in sorted(json_counts.items(), key=lambda x: -x[1]):
            print(f"- {src}: {n}")
        print("")

    if overall == "critical":
        print("#### ⚠️ Critical free-source problems (2+ primaries down)")
        for r in critical_fails:
            print(f"- **{r['source']}**: {r['status']} — {r['detail']}")
        print("")
        print("An issue will be opened (or updated) if none is already open with label `scraper-failure`.")
        return 1

    if overall == "degraded":
        print("#### 🟡 Degraded — single primary issue or secondary warnings")
        for r in critical_fails:
            print(f"- **{r['source']}**: {r['status']} — {r['detail']}")
        for r in warns:
            print(f"- {r['source']}: {r['status']} — {r['detail']}")
        print("")
        print("Map remains usable. Soft-fail continues.")
        return 0

    print("All primary free sources look healthy (or soft-warn only).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
