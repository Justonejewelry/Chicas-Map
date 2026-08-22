#!/usr/bin/env python3
"""
Chica Map — unified daily populate (all source actions).

Runs every discovery / ingest / hygiene / publish step that actually
populates the map, then the daily orchestrator + community events layer.

Designed for GitHub Actions at 5:00 AM America/Chicago.
Safe to run locally: python3 scripts/master_populate.py [--dry-run] [--cities slug,slug]
"""
from __future__ import annotations

import argparse
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
CT = ZoneInfo("America/Chicago")
PY = sys.executable or "python3"


def log(msg: str) -> None:
    ts = datetime.now(CT).strftime("%Y-%m-%d %H:%M:%S %Z")
    print(f"[{ts}] {msg}", flush=True)


def run_step(name: str, argv: list[str], env: dict | None = None, required: bool = False) -> int:
    log(f"START {name}: {' '.join(argv)}")
    merged = os.environ.copy()
    if env:
        merged.update(env)
    try:
        proc = subprocess.run(
            argv,
            cwd=str(ROOT),
            env=merged,
            check=False,
        )
        code = proc.returncode
    except FileNotFoundError as exc:
        log(f"MISS {name}: {exc}")
        code = 127
    if code == 0:
        log(f"OK   {name}")
    else:
        level = "FAIL" if required else "WARN"
        log(f"{level} {name} exit={code}")
        if required:
            raise SystemExit(code)
    return code


def latest_sales_json() -> Path | None:
    sales_dir = ROOT / "data" / "sales"
    if not sales_dir.exists():
        return None
    files = sorted(sales_dir.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True)
    return files[0] if files else None


def main() -> int:
    ap = argparse.ArgumentParser(description="Unified Chica Map populate")
    ap.add_argument("--cities", default=os.environ.get("CITIES", "san-antonio,austin"))
    ap.add_argument("--permit-days", default=os.environ.get("PERMIT_DAYS", "14"))
    ap.add_argument("--date", default="", help="Force chica_daily target YYYY-MM-DD")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--skip-events", action="store_true")
    ap.add_argument("--skip-orchestrator", action="store_true")
    args = ap.parse_args()

    cities = args.cities
    days = str(args.permit_days)
    log("=== MASTER POPULATE ===")
    log(f"cities={cities} permit_days={days} dry_run={args.dry_run}")

    (ROOT / "scripts").mkdir(parents=True, exist_ok=True)
    (ROOT / "data" / "sales").mkdir(parents=True, exist_ok=True)
    (ROOT / "daily-packs").mkdir(parents=True, exist_ok=True)
    (ROOT / "social").mkdir(parents=True, exist_ok=True)
    (ROOT / "forecast").mkdir(parents=True, exist_ok=True)
    (ROOT / "reports").mkdir(parents=True, exist_ok=True)
    (ROOT / "webapp" / "data" / "cities").mkdir(parents=True, exist_ok=True)

    city_env = {"CITIES": cities}

    steps: list[tuple[str, list[str], bool]] = [
        ("discover_sales (GarageSaleFinder)", [PY, "webapp/scripts/discover_sales.py", "--cities", cities], False),
        ("fetch_permits (Open Data SA)", [PY, "webapp/scripts/fetch_permits.py", "--days", days], False),
        ("fetch_estatesales_org", [PY, "webapp/scripts/fetch_estatesales_org.py", "--cities", cities], False),
        ("fetch_yardsalesearch", [PY, "webapp/scripts/fetch_yardsalesearch.py", "--cities", cities], False),
        ("fetch_gsalr", [PY, "webapp/scripts/fetch_gsalr.py", "--cities", cities], False),
        ("fetch_craigslist", [PY, "webapp/scripts/fetch_craigslist.py", "--cities", cities], False),
        ("fetch_estatesales.net", [PY, "webapp/scripts/fetch_estatesales.py", "--cities", cities], False),
        ("purge_expired", [PY, "webapp/scripts/purge_expired.py"], False),
        ("check_scraper_health", [PY, "webapp/scripts/check_scraper_health.py"], False),
    ]

    failed: list[str] = []
    for name, argv, required in steps:
        script = Path(argv[1]) if len(argv) > 1 else None
        if script and not (ROOT / script).exists():
            log(f"SKIP {name} — missing {script}")
            continue
        code = run_step(name, argv, env=city_env, required=required)
        if code != 0:
            failed.append(f"{name}({code})")

    rebuild = ROOT / "webapp" / "scripts" / "rebuild_feed.py"
    if rebuild.exists():
        run_step("rebuild_feed", [PY, str(rebuild.relative_to(ROOT))])

    if not args.skip_orchestrator:
        orch = ROOT / "scripts" / "chica_daily.py"
        if orch.exists():
            argv = [PY, "scripts/chica_daily.py"]
            target = args.date or datetime.now(CT).date().isoformat()
            argv += ["--date", target]
            if args.dry_run:
                argv += ["--dry-run"]
            code = run_step("chica_daily orchestrator", argv, required=False)
            if code != 0:
                failed.append(f"chica_daily({code})")
        else:
            log("SKIP chica_daily — scripts/chica_daily.py missing")

    if not args.skip_events:
        swarm = ROOT / "scripts" / "community_events_swarm.py"
        if swarm.exists() and not args.dry_run:
            code = run_step("community_events_swarm", [PY, "scripts/community_events_swarm.py"])
            if code != 0:
                failed.append(f"community_events({code})")
        elif args.dry_run:
            log("SKIP community_events_swarm (dry-run)")
        else:
            log("SKIP community_events_swarm — missing script")

    sales = latest_sales_json()
    forecast_script = ROOT / "scripts" / "populate_forecast.py"
    if sales and forecast_script.exists() and not args.dry_run:
        out = ROOT / "forecast" / f"{sales.stem}-weekend.json"
        run_step(
            "populate_forecast",
            [
                PY,
                "scripts/populate_forecast.py",
                "--sales",
                str(sales.relative_to(ROOT)),
                "--city",
                cities.split(",")[0].strip(),
                "--out",
                str(out.relative_to(ROOT)),
            ],
        )
    else:
        log("SKIP populate_forecast")

    cluster = ROOT / "scripts" / "apply_cluster_intelligence.py"
    permits_f = ROOT / "data" / "permits_recent.json"
    clusters_f = ROOT / "data" / "neighborhood_clusters.json"
    if (
        cluster.exists()
        and permits_f.exists()
        and clusters_f.exists()
        and not args.dry_run
    ):
        run_step(
            "apply_cluster_intelligence",
            [
                PY,
                "scripts/apply_cluster_intelligence.py",
                "--permits",
                "data/permits_recent.json",
                "--clusters",
                "data/neighborhood_clusters.json",
                "--out-dir",
                "data",
            ],
        )
    else:
        log("SKIP apply_cluster_intelligence (needs data/permits_recent.json + neighborhood_clusters.json)")

    log("=== MASTER POPULATE COMPLETE ===")
    if failed:
        log("non-fatal failures: " + ", ".join(failed))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
