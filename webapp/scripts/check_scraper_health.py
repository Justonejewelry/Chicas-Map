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

Secondary (warn-only):
  - GarageSaleFinder
  - SA permits
  - EstateSales.net lightweight
  - gsalr.com
"""
from __future__ import annotations

import argparse
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

LOGS = {
    "garagesalefinder": "discover.log",
    "permits": "permits.log",
    "estatesales_org": "estatesales-org.log",
    "yardsalesearch": "yardsalesearch.log",
    "gsalr": "gsalr.log",
    "craigslist": "craigslist.log",
    "estatesales_net": "estatesales.log",
}

PRIMARY = {"estatesales_org", "yardsalesearch", "craigslist"}

ZERO_PATTERNS = [
    re.compile(r"normalized=0\b", re.I),
    re.compile(r"0 listings?\b", re.I),
    re.compile(r"no sales? found\b", re.I),
    re.compile(r"static results=0\b", re.I),
    re.compile(r"enriched=0\b", re.I),
    re.compile(r"\b0 parsed\b", re.I),
    re.compile(r"garage/estate permits in window=0\b", re.I),
]

FAIL_PATTERNS = [
    re.compile(r"HTTP (403|429|5\d\d)\b"),
    re.compile(r"WARN: non-200", re.I),
    re.compile(r"Traceback \(most recent call last\)"),
    re.compile(r"blocked|forbidden|captcha|imperva", re.I),
    re.compile(r"ConnectionError|Timeout|URLError", re.I),
]

OK_PATTERNS = [
    re.compile(r"normalized=([1-9]\d*)\b", re.I),
    re.compile(r"(?:parsed|enriched|static results)=([1-9]\d*)\b", re.I),
    re.compile(r"\b[1-9]\d* parsed\b", re.I),
    re.compile(r"merge added=([1-9]\d*)\b", re.I),
]


def read_log(name: str, log_dir: Path) -> str:
    p = log_dir / name
    if not p.exists():
        return ""
    return p.read_text(encoding="utf-8", errors="replace")


# Final discovery-stage counts, not merge-added counts or accumulated inventory.
# Sum once per requested city. Missing markers remain null, not a false zero.
RECORD_COUNT_PATTERNS = {
    "garagesalefinder": ("parsed", re.compile(r"^\s*(\d+) parsed\b", re.I | re.M)),
    "permits": ("permits_in_window", re.compile(r"garage/estate permits in window=(\d+)\b", re.I)),
    "estatesales_org": ("normalized", re.compile(r"^\s*normalized=(\d+)\b", re.I | re.M)),
    "yardsalesearch": ("normalized", re.compile(r"^\s*normalized=(\d+)\b", re.I | re.M)),
    "gsalr": ("normalized", re.compile(r"^\s*normalized=(\d+)\b", re.I | re.M)),
    "craigslist": ("enriched", re.compile(r"^\s*enriched=(\d+)\b", re.I | re.M)),
    "estatesales_net": ("normalized", re.compile(r"^\s*normalized=(\d+)\b", re.I | re.M)),
}

def extract_records_found(key: str, text: str) -> tuple[int | None, str | None]:
    spec = RECORD_COUNT_PATTERNS.get(key)
    if not spec:
        return None, None
    metric, pattern = spec
    values = [int(value) for value in pattern.findall(text)]
    if not values:
        return None, metric
    return sum(values), metric

def analyze_log(key: str, text: str) -> dict:
    primary = key in PRIMARY
    if not text.strip():
        metric = RECORD_COUNT_PATTERNS.get(key, (None, None))[0]
        return {
            "source": key, "status": "not_run",
            "detail": "no source log captured for this run", "primary": primary,
            "records_found": None, "records_found_metric": metric,
        }

    def marker(name: str) -> str | None:
        match = re.search(rf"^__CHICA_{name}=(.+)$", text, re.M)
        return match.group(1).strip() if match else None

    exit_code = marker("EXIT_CODE")
    started_at = marker("STARTED_AT")
    finished_at = marker("FINISHED_AT")
    records_found, records_metric = extract_records_found(key, text)
    result = {
        "source": key, "primary": primary,
        "last_attempt_at": started_at,
        "finished_at": finished_at,
        "exit_code": int(exit_code) if exit_code and exit_code.isdigit() else None,
        "records_found": records_found,
        "records_found_metric": records_metric,
    }

    if result["exit_code"] not in (None, 0):
        result.update(status="fail", detail=f"source script exited {result['exit_code']}")
        return result

    for pat in FAIL_PATTERNS:
        match = pat.search(text)
        if match:
            result.update(status="fail", detail=match.group(0)[:120])
            return result

    for pat in OK_PATTERNS:
        match = pat.search(text)
        if match:
            result.update(status="ok", detail=match.group(0)[:80])
            result["last_successful_retrieval"] = finished_at
            return result

    for pat in ZERO_PATTERNS:
        if pat.search(text):
            result.update(status="zero", detail="source returned zero listings")
            result["last_successful_retrieval"] = finished_at
            return result

    if result["exit_code"] == 0:
        result.update(
            status="completed_unverified",
            detail="script exited successfully but emitted no recognized retrieval/result marker",
        )
    else:
        result.update(status="unknown", detail="log present without run metadata or result marker")
    return result


def source_counts_from_json() -> dict[str, int]:
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
    parser = argparse.ArgumentParser()
    parser.add_argument("--log-dir", type=Path, default=Path.cwd())
    args = parser.parse_args()
    now = datetime.now(CT).isoformat(timespec="seconds")
    previous_success = {}
    try:
        previous = json.loads(HEALTH_PATH.read_text(encoding="utf-8"))
        previous_success = {
            item.get("source"): item.get("last_successful_retrieval")
            for item in previous.get("sources", [])
            if item.get("last_successful_retrieval")
        }
    except (OSError, json.JSONDecodeError, AttributeError):
        pass

    results = []
    for key, logname in LOGS.items():
        text = read_log(logname, args.log_dir)
        item = analyze_log(key, text)
        if not item.get("last_successful_retrieval") and key in previous_success:
            item["last_successful_retrieval"] = previous_success[key]
        results.append(item)

    json_counts = source_counts_from_json()

    critical_fails = [
        r for r in results if r["primary"] and r["status"] == "fail"
    ]
    warns = [
        r for r in results if (not r["primary"]) and r["status"] in ("fail", "zero", "not_run", "unknown", "completed_unverified")
    ]
    uncertain_primary = [
        r for r in results if r["primary"] and r["status"] in ("not_run", "unknown", "completed_unverified")
    ]
    zero_sources = [r for r in results if r["status"] == "zero"]

    n_primary_problems = len(critical_fails)
    if n_primary_problems >= 2:
        overall = "critical"
    elif n_primary_problems == 1 or warns or uncertain_primary or zero_sources:
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
            "Secondary: gsalr, garagesalefinder, permits, estatesales_net. "
            "Only explicit source errors/nonzero exits count as failures. Missing logs are not_run, "
            "zero listings are a successful empty retrieval, and unrecognized output is unverified. "
            "Two or more failed primary sources are critical. "
            "Source-attributed JSON counts are inventory evidence, not proof of a fresh retrieval. "
            "Apify removed 2026-08-22."
        ),
    }

    HEALTH_PATH.parent.mkdir(parents=True, exist_ok=True)
    HEALTH_PATH.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

    print("### Scraper health")
    print("")
    print(f"- Overall: **{overall.upper()}**")
    print(f"- Generated: {now}")
    print(f"- Confirmed primary failures: {n_primary_problems}/3")
    print(f"- Primary sources without verified retrieval evidence: {len(uncertain_primary)}")
    print(f"- Sources with zero listings: {len(zero_sources)}")
    print("")
    print("| Source | Status | Records found | Detail |")
    print("|--------|--------|--------------:|--------|")
    for r in results:
        flag = "🔴" if r["status"] == "fail" else ("🟡" if r["status"] in ("zero", "not_run", "unknown", "completed_unverified") else "🟢")
        print(f"| {r['source']} | {flag} {r['status']} | {r.get('records_found') if r.get('records_found') is not None else '—'} | {r['detail'][:60]} |")
    print("")
    if json_counts:
        print("#### Live public counts by source (from city JSON)")
        for src, n in sorted(json_counts.items(), key=lambda x: -x[1]):
            print(f"- {src}: {n}")
        print("")

    if overall == "critical":
        print("#### ⚠️ Critical — two or more primary source failures confirmed")
        for r in critical_fails:
            print(f"- **{r['source']}**: {r['status']} — {r['detail']}")
        print("")
        print("An issue will be opened (or updated) if none is already open with label `scraper-failure`.")
        return 1

    if overall == "degraded":
        print("#### 🟡 Degraded — source failures, empty results, or incomplete monitoring evidence")
        for r in critical_fails:
            print(f"- **{r['source']}**: {r['status']} — {r['detail']}")
        for r in uncertain_primary:
            print(f"- **{r['source']}**: {r['status']} — {r['detail']}")
        for r in zero_sources:
            print(f"- {r['source']}: {r['status']} — {r['detail']}")
        for r in warns:
            print(f"- {r['source']}: {r['status']} — {r['detail']}")
        print("")
        print("Map remains usable. Soft-fail continues.")
        return 0

    print("All primary free sources look healthy (or soft-warn only).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
