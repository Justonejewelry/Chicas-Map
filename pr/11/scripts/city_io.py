#!/usr/bin/env python3
"""City-feed I/O middleware for YardBird map-refresh scripts.

Provides resilient load/write helpers so a single bad or PLACEHOLDER
file can never crash the entire GitHub Actions job or leave the map empty.

Atomic write strategy
---------------------
safe_write_city uses a four-step pattern that is both atomic and
concurrent-safe on Linux (GitHub Actions runners):

  1. Create a uniquely-named temp file in the *same directory*
     (guarantees same filesystem → rename is atomic).
  2. Acquire an exclusive flock on the final target path (or a
     sibling lock file) so concurrent writers serialize.
  3. Write the full payload, then fsync so data is durable before
     the name swap.
  4. os.replace(tmp, final) — atomic on POSIX.

On any failure the temp file is cleaned up and the previous good
file (if any) is left untouched.

Usage from any scraper:

    from city_io import safe_load_city, safe_write_city, CITY_DIR

    data = safe_load_city("san-antonio")
    # ... mutate data ...
    safe_write_city("san-antonio", data)
"""
from __future__ import annotations

import json
import os
import sys
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

try:
    import fcntl  # POSIX only — fine on GitHub Actions Ubuntu runners
except ImportError:  # pragma: no cover
    fcntl = None  # type: ignore

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


def _acquire_lock(lock_path: Path):
    """Return an open file handle holding an exclusive flock, or None."""
    if fcntl is None:
        return None
    try:
        # Sibling lock file keeps the real data file free of lock metadata
        fh = open(lock_path, "a+", encoding="utf-8")
        fcntl.flock(fh.fileno(), fcntl.LOCK_EX)
        return fh
    except OSError as e:
        print(f"[city_io] lock acquire failed ({e}); continuing without lock", file=sys.stderr)
        return None


def safe_write_city(slug_or_path: str | Path, data: dict[str, Any]) -> Path:
    """Write a city feed with atomic + concurrent-safe semantics.

    Strategy (Linux / GitHub Actions):
      1. Unique temp file in the same directory (same FS → rename atomic)
      2. Exclusive flock on a sibling .lock file (serializes concurrent writers)
      3. Full write + fsync (data durable before name swap)
      4. os.replace(tmp, final) — atomic on POSIX
      5. Always clean up the temp file on any path

    Never writes the string PLACEHOLDER. Never leaves a partial file
    as the published name.
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
    payload = text.encode("utf-8")

    lock_path = path.with_suffix(path.suffix + ".lock")
    lock_fh = _acquire_lock(lock_path)
    tmp_path: Path | None = None

    try:
        # Unique name in same directory → same filesystem → atomic rename
        fd, tmp_name = tempfile.mkstemp(
            prefix=f".{path.stem}.",
            suffix=".json.tmp",
            dir=str(path.parent),
        )
        tmp_path = Path(tmp_name)
        try:
            with os.fdopen(fd, "wb") as f:
                f.write(payload)
                f.flush()
                os.fsync(f.fileno())  # durable before the name swap
            # Atomic publish
            os.replace(tmp_path, path)
            tmp_path = None  # successfully moved; don't unlink later
        except Exception:
            # Ensure the temp file does not linger on any write error
            if tmp_path is not None and tmp_path.exists():
                try:
                    tmp_path.unlink()
                except OSError:
                    pass
            raise
    finally:
        if lock_fh is not None:
            try:
                fcntl.flock(lock_fh.fileno(), fcntl.LOCK_UN)
                lock_fh.close()
            except OSError:
                pass
            # Best-effort cleanup of the lock file itself
            try:
                if lock_path.exists() and lock_path.stat().st_size == 0:
                    lock_path.unlink(missing_ok=True)
            except OSError:
                pass

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
