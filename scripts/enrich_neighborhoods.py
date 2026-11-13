#!/usr/bin/env python3
"""Conservatively enrich precise San Antonio sale pins with association names.

Uses the City of San Antonio's public Neighborhood Associations polygons.
Only source-provided coordinates paired with a numbered San Antonio street
address are eligible. ZIP/city centroids, Census interpolation, intersections,
place-level geocodes, ambiguous overlaps, and points outside polygons stay blank.

The boundary service is fetched at runtime. If it is unavailable, this step
logs a warning and leaves the feed untouched; scraper publishing can continue.
"""
from __future__ import annotations

import json
import math
import re
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
CITY_FILE = ROOT / "webapp" / "data" / "cities" / "san-antonio.json"
LAYER_URL = (
    "https://services.arcgis.com/g1fRTDLeMgspWrYp/arcgis/rest/services/"
    "Neighborhood_Associations/FeatureServer/9"
)
SOURCE_TAG = "city-of-san-antonio-neighborhood-associations"
CENTER = (29.4241, -98.4936)
MAX_RADIUS_M = 60 * 1609.344
UA = "ChicasMap/NeighborhoodEnrichment (+https://github.com/Justonejewelry/Chicas-Map)"


def request_json(url: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
    if params:
        url += "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=25) as response:
        return json.loads(response.read().decode("utf-8"))


def fetch_boundaries() -> tuple[list[dict[str, Any]], str]:
    metadata = request_json(LAYER_URL, {"f": "json"})
    if metadata.get("error"):
        raise RuntimeError(metadata["error"])
    edit_ms = (metadata.get("editingInfo") or {}).get("lastEditDate")
    updated = (
        datetime.fromtimestamp(edit_ms / 1000, timezone.utc).isoformat(timespec="seconds")
        if edit_ms else "unknown"
    )
    ids_result = request_json(LAYER_URL + "/query", {
        "where": "1=1", "returnIdsOnly": "true", "f": "json"
    })
    if ids_result.get("error"):
        raise RuntimeError(ids_result["error"])
    ids = ids_result.get("objectIds") or []
    if not ids:
        raise RuntimeError("City boundary service returned no object IDs")
    features: list[dict[str, Any]] = []
    for start in range(0, len(ids), 100):
        result = request_json(LAYER_URL + "/query", {
            "objectIds": ",".join(str(x) for x in ids[start:start + 100]),
            "outFields": "Name", "returnGeometry": "true",
            "outSR": "4326", "f": "json",
        })
        if result.get("error"):
            raise RuntimeError(result["error"])
        features.extend(result.get("features") or [])
    if not features:
        raise RuntimeError("City boundary service returned no polygon features")
    return features, updated


def point_on_segment(x: float, y: float, a: list[float], b: list[float]) -> bool:
    ax, ay = float(a[0]), float(a[1])
    bx, by = float(b[0]), float(b[1])
    cross = (x - ax) * (by - ay) - (y - ay) * (bx - ax)
    if abs(cross) > 1e-10:
        return False
    return min(ax, bx) - 1e-10 <= x <= max(ax, bx) + 1e-10 and min(ay, by) - 1e-10 <= y <= max(ay, by) + 1e-10


def ring_contains(x: float, y: float, ring: list[list[float]]) -> bool:
    inside = False
    if len(ring) < 3:
        return False
    for i, current in enumerate(ring):
        previous = ring[i - 1]
        if point_on_segment(x, y, previous, current):
            return True
        x1, y1 = float(previous[0]), float(previous[1])
        x2, y2 = float(current[0]), float(current[1])
        if (y1 > y) != (y2 > y):
            crossing_x = (x2 - x1) * (y - y1) / (y2 - y1) + x1
            if x < crossing_x:
                inside = not inside
    return inside


def polygon_contains(x: float, y: float, rings: list[list[list[float]]]) -> bool:
    # Esri polygon rings use even/odd containment; this also excludes holes.
    inside = False
    for ring in rings:
        if ring_contains(x, y, ring):
            inside = not inside
    return inside


def polygon_names_at_point(features: list[dict[str, Any]], lat: float, lon: float) -> list[str]:
    matches = set()
    for feature in features:
        name = str((feature.get("attributes") or {}).get("Name") or "").strip()
        rings = (feature.get("geometry") or {}).get("rings") or []
        if name and polygon_contains(lon, lat, rings):
            matches.add(name)
    return sorted(matches, key=str.casefold)


def distance_m(a: tuple[float, float], b: tuple[float, float]) -> float:
    lat1, lat2 = math.radians(a[0]), math.radians(b[0])
    dlat = math.radians(b[0] - a[0])
    dlon = math.radians(b[1] - a[1])
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 6371000 * 2 * math.asin(min(1.0, math.sqrt(h)))


def eligible(pin: dict[str, Any]) -> bool:
    address = str(pin.get("address") or "")
    if pin.get("geocode") != "source":
        return False
    if not re.match(r"^\s*\d{1,6}\s+[A-Za-z]", address):
        return False
    if not re.search(r"\bSan Antonio\s*,?\s*TX\b", address, re.I):
        return False
    try:
        lat, lon = float(pin.get("lat")), float(pin.get("lon"))
    except (TypeError, ValueError):
        return False
    if not (math.isfinite(lat) and math.isfinite(lon) and -90 <= lat <= 90 and -180 <= lon <= 180):
        return False
    return distance_m(CENTER, (lat, lon)) <= MAX_RADIUS_M


def aliases_for(name: str) -> list[str]:
    values = {name.strip()}
    values.update(part.strip() for part in re.split(r"\s*/\s*|\s+[-–]\s+", name) if part.strip())
    return sorted(values, key=str.casefold)


def enrich_pins(pins: list[dict[str, Any]], features: list[dict[str, Any]], updated: str) -> dict[str, int]:
    counts = {"assigned": 0, "ambiguous": 0, "outside_or_unmatched": 0, "ineligible": 0}
    for pin in pins:
        # Recompute only our own earlier assignments; never overwrite a manual label.
        if pin.get("neighborhood_source") == SOURCE_TAG:
            old_aliases = set(pin.get("neighborhood_aliases") or [])
            pin["aliases"] = [
                value for value in (pin.get("aliases") or []) if value not in old_aliases
            ]
            pin.pop("neighborhood", None)
            pin.pop("neighborhood_aliases", None)
            pin.pop("neighborhood_source", None)
            pin.pop("neighborhood_dataset_updated_at", None)
        if pin.get("neighborhood"):
            counts["ineligible"] += 1
            continue
        if not eligible(pin):
            counts["ineligible"] += 1
            continue
        names = polygon_names_at_point(features, float(pin["lat"]), float(pin["lon"]))
        if len(names) == 1:
            name = names[0]
            aliases = aliases_for(name)
            pin["neighborhood"] = name
            pin["neighborhood_aliases"] = aliases
            pin["neighborhood_source"] = SOURCE_TAG
            pin["neighborhood_dataset_updated_at"] = updated
            existing = list(pin.get("aliases") or [])
            pin["aliases"] = sorted(set(existing + aliases), key=str.casefold)
            counts["assigned"] += 1
        elif len(names) > 1:
            counts["ambiguous"] += 1
        else:
            counts["outside_or_unmatched"] += 1
    return counts


def main() -> int:
    if not CITY_FILE.exists():
        print(f"[neighborhoods] no city feed at {CITY_FILE}; skipping")
        return 0
    try:
        features, updated = fetch_boundaries()
    except Exception as exc:
        print(f"[neighborhoods] WARNING: boundary lookup unavailable; no changes made: {exc}")
        return 0
    data = json.loads(CITY_FILE.read_text(encoding="utf-8"))
    pins = data.get("public") or []
    counts = enrich_pins(pins, features, updated)
    data["public"] = pins
    data["neighborhood_boundary_source"] = LAYER_URL
    data["neighborhood_boundary_attribution"] = (
        "City of San Antonio Planning and Community Development Department, Neighborhoods Division"
    )
    data["neighborhood_boundary_dataset_updated_at"] = updated
    CITY_FILE.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"[neighborhoods] {counts}; boundary features={len(features)}; dataset updated={updated}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
