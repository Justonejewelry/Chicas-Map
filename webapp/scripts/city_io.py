#!/usr/bin/env python3
"""City-feed I/O middleware for YardBird map-refresh scripts.

Provides resilient load/write helpers so a single bad or PLACEHOLDER
file can never crash the entire GitHub Actions job or leave the map empty.

Usage from any scraper:

    from city_io import safe_load_city, safe_write_city, CITY_DIR

    data = safe_load_city("san-antonio")
    # ... mutate data ...
    safe_write_city("san-antonio", data)
"""
from __future__ import annotations

import json
import sys
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo
from typing import Any

CT = ZoneInfo("America/Chicago")
ROOT = Path(__file__).resolve().parents[1]  # webapp/
CITY_DIR = ROOT / "data" / "cities"


def empty_skeleton(slug: str = "san-antonio") -> dict[str, Any]:
    """Canonical empty city feed. Always safe to write."""
    name = slug.replace("-", " ").title()
    return {
        "edition": f"{name} Yard-Bird Discovery",
        "city": slug,
        "public": [],
        "permits": [],
        "hot_zones": [],
        "sources": [],
        "total_locations": 0,
        "status": "live",
        "date": datetime.now(CT).date().isoformat(),
        "last_refresh": datetime.now(CT).isoformat(timespec="seconds"),
    }


def _path_for(slug_or_path: str | Path) -> Path:
    if isinstance(slug_or_path, Path):
        return slug_or_path
    p = Path(slug_or_path)
    if p.suffix == ".json":
        return p if p.is_absolute() else CITY_DIR / p.name
    return CITY_DIR / f"{slug_or_path}.json"


def safe_load_city(slug_or_path: str | Path = "san-antonio") -> dict[str, Any]:
    """Load a city JSON feed with full error isolation.

    Never raises on:
      - missing file
      - empty file
      - literal "PLACEHOLDER"
      - invalid JSON
      - non-dict JSON

    Returns a clean skeleton and prints a warning so the job can recover
    instead of aborting under set -e.
    """
    path = _path_for(slug_or_path)
    slug = path.stem

    if not path.exists():
        print(f"[city_io] {path.name} missing → empty skeleton", file=sys.stderr)
        return empty_skeleton(slug)

    try:
        raw = path.read_text(encoding="utf-8").strip()
    except OSError as e:
        print(f"[city_io] cannot read {path.name}: {e} → empty skeleton", file=sys.stderr)
        return empty_skeleton(slug)

    if not raw or raw in ("PLACEHOLDER", '"PLACEHOLDER"'):
        print(f"[city_io] {path.name} is empty/PLACEHOLDER → empty skeleton", file=sys.stderr)
        return empty_skeleton(slug)

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"[city_io] {path.name} invalid JSON ({e}) → empty skeleton", file=sys.stderr)
        return empty_skeleton(slug)

    if not isinstance(data, dict):
        print(f"[city_io] {path.name} is not a JSON object → empty skeleton", file=sys.stderr)
        return empty_skeleton(slug)

    # Guarantee required keys so callers never KeyError
    data.setdefault("public", [])
    data.setdefault("permits", [])
    data.setdefault("hot_zones", [])
    data.setdefault("sources", [])
    data.setdefault("city", slug)
    data.setdefault("status", "live")
    if not isinstance(data["public"], list):
        data["public"] = []
    if not isinstance(data["permits"], list):
        data["permits"] = []
    return data


def safe_write_city(slug_or_path: str | Path, data: dict[str, Any]) -> Path:
    """Write a city feed atomically and safely.

    - Ensures parent directory exists
    - Forces required metadata
    - Writes with trailing newline
    - Never writes the string PLACEHOLDER
    """
    path = _path_for(slug_or_path)
    slug = path.stem

    if not isinstance(data, dict):
        raise TypeError("safe_write_city expects a dict")

    # Normalize
    data = dict(data)  # shallow copy
    data.setdefault("city", slug)
    data.setdefault("public", [])
    data.setdefault("permits", [])
    data.setdefault("hot_zones", [])
    data.setdefault("sources", [])
    data["total_locations"] = len(data.get("public") or []) + len(data.get("permits") or [])
    data["status"] = data.get("status") or "live"
    data["last_refresh"] = datetime.now(CT).isoformat(timespec="seconds")
    if "date" not in data:
        data["date"] = datetime.now(CT).date().isoformat()

    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(data, indent=2, ensure_ascii=False) + "\n"

    # Atomic-ish write (temp then replace) to reduce partial-write races
    tmp = path.with_suffix(path.suffix + ".tmp")
    try:
        tmp.write_text(text, encoding="utf-8")
        tmp.replace(path)
    except OSError:
        # Fallback to direct write if replace fails (e.g. cross-device)
        path.write_text(text, encoding="utf-8")
        if tmp.exists():
            tmp.unlink(missing_ok=True)

    return path


def run_isolated(step_name: str, fn, *args, **kwargs):
    """Execute a scraper step with error isolation (soft-fail middleware).

    Returns (ok: bool, result_or_none).
    Never re-raises; prints the error and continues the pipeline.
    """
    try:
        result = fn(*args, **kwargs)
        return True, result
    except Exception as e:
        print(
            f"[city_io] step '{step_name}' failed: {type(e).__name__}: {e}",
            file=sys.stderr,
        )
        return False, None
