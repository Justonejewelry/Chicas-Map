#!/usr/bin/env python3
"""
Chica Map — Sentinel Quality Gate
Final gate before any daily publication.
If Sentinel fails, the previous known-good data must be preserved.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from schema import MIN_CONFIDENCE, Sale


class SentinelResult:
    def __init__(self) -> None:
        self.passed = True
        self.errors: list[str] = []
        self.warnings: list[str] = []

    def fail(self, msg: str) -> None:
        self.passed = False
        self.errors.append(msg)

    def warn(self, msg: str) -> None:
        self.warnings.append(msg)

    def summary(self) -> str:
        status = "PASS" if self.passed else "FAIL"
        lines = [f"Sentinel: {status}"]
        for e in self.errors:
            lines.append(f"  ERROR: {e}")
        for w in self.warnings:
            lines.append(f"  WARN:  {w}")
        return "\n".join(lines)


def validate_sales(sales: list[dict[str, Any]], target_date: str) -> SentinelResult:
    result = SentinelResult()
    seen_ids: set[str] = set()
    seen_addrs: set[str] = set()

    if not sales:
        result.warn("Zero verified sales for target date — empty map is allowed but unusual")

    for i, raw in enumerate(sales):
        try:
            s = Sale.from_dict(raw)
        except Exception as e:
            result.fail(f"Sale #{i} failed schema parse: {e}")
            continue

        prefix = f"sale_id={s.sale_id or i}"

        # Required fields
        if not s.sale_id:
            result.fail(f"{prefix}: missing sale_id")
        if s.sale_id in seen_ids:
            result.fail(f"{prefix}: duplicate sale_id")
        seen_ids.add(s.sale_id)

        if not s.address or not any(c.isdigit() for c in s.address):
            result.fail(f"{prefix}: missing or unusable address")

        if not s.date_start:
            result.fail(f"{prefix}: missing date_start")

        if not (s.latitude and s.longitude):
            result.fail(f"{prefix}: missing coordinates")

        if not s.original_url and not s.source_urls:
            result.fail(f"{prefix}: no source / original URL")

        if s.confidence < MIN_CONFIDENCE:
            result.fail(f"{prefix}: confidence {s.confidence} below threshold {MIN_CONFIDENCE}")

        if not s.google_maps_url:
            result.warn(f"{prefix}: missing google_maps_url")
        if not s.street_view_url:
            result.warn(f"{prefix}: missing street_view_url")

        # Soft address dedupe
        norm = "".join(c for c in s.address.lower() if c.isalnum())[:40]
        if norm in seen_addrs:
            result.warn(f"{prefix}: possible physical duplicate of another address")
        seen_addrs.add(norm)

        # Date sanity for target
        if s.date_end and s.date_end < target_date:
            result.fail(f"{prefix}: date_end {s.date_end} is before target {target_date}")
        if s.date_start and s.date_start > target_date and (not s.date_end or s.date_end < target_date):
            result.fail(f"{prefix}: does not cover target date {target_date}")

    return result


def validate_json_file(path: Path, target_date: str) -> SentinelResult:
    result = SentinelResult()
    if not path.exists():
        result.fail(f"Canonical file missing: {path}")
        return result
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        result.fail(f"Invalid JSON in {path}: {e}")
        return result

    sales = data.get("sales") or data.get("features") or []
    if isinstance(sales, dict):
        # GeoJSON FeatureCollection
        sales = [f.get("properties", {}) for f in sales.get("features", [])]

    sub = validate_sales(sales if isinstance(sales, list) else [], target_date)
    result.errors.extend(sub.errors)
    result.warnings.extend(sub.warnings)
    result.passed = result.passed and sub.passed
    return result


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 3:
        print("Usage: sentinel.py <path-to-json> <YYYY-MM-DD>")
        sys.exit(2)
    r = validate_json_file(Path(sys.argv[1]), sys.argv[2])
    print(r.summary())
    sys.exit(0 if r.passed else 1)
