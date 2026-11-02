#!/usr/bin/env python3
"""
Alamo City Resources — Canonical Resource Schema
Every published resource pin must conform to this shape.
Separate from Sale. Do not mix into sales feeds.
"""

from __future__ import annotations

from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo

CT = ZoneInfo("America/Chicago")

# Publication threshold — do not lower without explicit decision
MIN_CONFIDENCE = 70

RESOURCE_TYPES = {
    "pantry",
    "wifi",
    "parking",
    "school-zone",
    "emergency",
    "thrift",
    "other",
}


@dataclass
class Resource:
    resource_id: str = ""
    name: str = ""
    resource_type: str = "other"  # pantry | wifi | parking | school-zone | emergency | thrift | other
    address: str = ""
    city: str = "San Antonio"
    state: str = "TX"
    zip: str = ""
    latitude: float = 0.0
    longitude: float = 0.0
    description: str = ""
    hours: str = ""
    source_urls: list[str] = field(default_factory=list)
    original_url: str = ""
    source_names: list[str] = field(default_factory=list)
    confidence: int = 0        # 0–100
    verified_at: str = ""      # ISO timestamp in America/Chicago
    street_view_url: str = ""
    google_maps_url: str = ""
    status: str = "verified"   # verified | probable | rejected
    geocode_method: str = ""
    notes: str = ""

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "Resource":
        known = {f.name for f in cls.__dataclass_fields__.values()}
        filtered = {k: v for k, v in d.items() if k in known}
        return cls(**filtered)

    def is_valid_type(self) -> bool:
        return self.resource_type in RESOURCE_TYPES


def make_resource_id(resource_type: str, address: str, name: str = "") -> str:
    """Stable resource_id: type_normalized-address"""
    import re
    addr = (address or "").lower()
    addr = re.sub(r"[^a-z0-9]+", "-", addr).strip("-")[:48]
    if not addr:
        name_part = re.sub(r"[^a-z0-9]+", "-", (name or "unknown").lower())[:24]
        addr = name_part or "unknown"
    return f"{resource_type}_{addr}"


def google_maps_url(lat: float, lon: float, address: str = "") -> str:
    if lat and lon:
        return f"https://www.google.com/maps/search/?api=1&query={lat},{lon}"
    if address:
        from urllib.parse import quote_plus
        return f"https://www.google.com/maps/search/?api=1&query={quote_plus(address)}"
    return ""


def street_view_url(lat: float, lon: float) -> str:
    if not lat or not lon:
        return ""
    return f"https://www.google.com/maps/@?api=1&map_action=pano&viewpoint={lat},{lon}"


def now_ct_iso() -> str:
    return datetime.now(CT).isoformat(timespec="seconds")


def score_confidence(resource: Resource) -> int:
    """Heuristic confidence 0–100. Call after extraction."""
    score = 40
    if resource.address and any(c.isdigit() for c in resource.address):
        score += 18
    if resource.latitude and resource.longitude:
        score += 12
    if resource.original_url:
        score += 10
    if resource.hours:
        score += 6
    if len(resource.source_names) >= 2:
        score += 8
    if resource.description and len(resource.description) > 20:
        score += 4
    if resource.is_valid_type():
        score += 2

    # Penalties
    if not resource.address:
        score -= 25
    if not resource.is_valid_type():
        score -= 10
    return max(0, min(100, score))
