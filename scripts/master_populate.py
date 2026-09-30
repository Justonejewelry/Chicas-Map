#!/usr/bin/env python3
"""Chica Map — unified daily populate."""
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
        proc = subprocess.run(argv, cwd=str(ROOT), env=merged, check=False)
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
    ap.add_argument("--date", default="")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--skip-events", action="store_true")
    ap.add_argument("--skip-orchestrator", action="store_true")
    args = ap.parse_args()
    cities = args.cities
    days = str(args.permit_days)
    log("=== MASTER POPULATE ===")
    for p in (ROOT / "scripts", ROOT / "data" / "sales", ROOT / "daily-packs", ROOT / "social", ROOT / "forecast", ROOT / "reports", ROOT / "webapp" / "data" / "cities"):
        p.mkdir(parents=True, exist_ok=True)
    city_env = {"CITIES": cities}
    discovery = [
        ("discover_sales (GarageSaleFinder)", [PY, "webapp/scripts/discover_sales.py", "--cities", cities]),
        ("fetch_permits (Open Data SA)", [PY, "webapp/scripts/fetch_permits.py", "--days", days]),
        ("fetch_estatesales_org", [PY, "webapp/scripts/fetch_estatesales_org.py", "--cities", cities]),
        ("fetch_yardsalesearch", [PY, "webapp/scripts/fetch_yardsalesearch.py", "--cities", cities]),
        ("fetch_gsalr", [PY, "webapp/scripts/fetch_gsalr.py", "--cities", cities]),
        ("fetch_craigslist", [PY, "webapp/scripts/fetch_craigslist.py", "--cities", cities]),
        ("fetch_estatesales.net", [PY, "webapp/scripts/fetch_estatesales.py", "--cities", cities]),
    ]
    failed: list[str] = []
    discovery_ok = discovery_ran = 0
    for name, argv in discovery:
        script = Path(argv[1])
        if not (ROOT / script).exists():
            log(f"SKIP {name} — missing {script}")
            failed.append(f"{name}(missing)")
            continue
        discovery_ran += 1
        code = run_step(name, argv, env=city_env)
        if code == 0:
            discovery_ok += 1
        else:
            failed.append(f"{name}({code})")
    for name, argv, required in (("purge_expired", [PY, "webapp/scripts/purge_expired.py"], True), ("check_scraper_health", [PY, "webapp/scripts/check_scraper_health.py"], False)):
        if not (ROOT / Path(argv[1])).exists():
            continue
        code = run_step(name, argv, env=city_env, required=required)
        if code != 0:
            failed.append(f"{name}({code})")
    rebuild = ROOT / "webapp" / "scripts" / "rebuild_feed.py"
    if rebuild.exists():
        run_step("rebuild_feed", [PY, "webapp/scripts/rebuild_feed.py"])
    if (ROOT / "scripts" / "thin_address_resolve.py").exists() and not args.dry_run:
        run_step("thin_address_resolve", [PY, "scripts/thin_address_resolve.py"])
    if (ROOT / "scripts" / "date_window.py").exists() and not args.dry_run:
        run_step("date_window", [PY, "scripts/date_window.py"])
    elif args.dry_run:
        log("SKIP date_window (dry-run)")
    if not args.skip_orchestrator and (ROOT / "scripts" / "chica_daily.py").exists():
        argv = [PY, "scripts/chica_daily.py", "--date", args.date or datetime.now(CT).date().isoformat()]
        if args.dry_run:
            argv.append("--dry-run")
        code = run_step("chica_daily orchestrator", argv)
        if code != 0:
            failed.append(f"chica_daily({code})")
    if not args.skip_events and not args.dry_run and (ROOT / "scripts" / "community_events_swarm.py").exists():
        run_step("community_events_swarm", [PY, "scripts/community_events_swarm.py"])
    log("=== MASTER POPULATE COMPLETE ===")
    log(f"discovery ok={discovery_ok}/{discovery_ran}")
    if discovery_ran > 0 and discovery_ok == 0:
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
