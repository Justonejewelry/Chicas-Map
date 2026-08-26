#!/usr/bin/env python3
"""
Chica Map — Canonical Sale Schema (Master Workflow)
Every published sale must conform to this shape.
"""

from __future__ import annotations

from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo

CT = ZoneInfo("America/Chicago")

# Publication threshold — do not lower without explicit decision
MIN_CONFIDENCE = 70

# Recognized community / local-forum source names (lowercase)
COMMUNITY_SOURCES = {
    "nextdoor",
    "facebook",
    "facebook_public",
    "reddit",
    "community_tip",
    "community",
    "other_community",
}


@dataclass
class Sale:
    sale_id: str = ""
    title: str = ""
    sale_type: str = "garage"  # garage | yard | moving | estate | community | church | school | charity | other
    date_start: str = ""       # YYYY-MM-DD
    date_end: str = ""         # YYYY-MM-DD
    start_time: str = ""       # HH:MM or free text
    end_time: str = ""
    address: str = ""
    city: str = "San Antonio"
    state: str = "TX"
    zip: str = ""
    latitude: float = 0.0
    longitude: float = 0.0
    description: str = ""
    highlights: list[str] = field(default_factory=list)
    source_urls: list[str] = field(default_factory=list)
    original_url: str = ""
    source_names: list[str] = field(default_factory=list)
    photos: list[str] = field(default_factory=list)
    confidence: int = 0        # 0–100
    verified_at: str = ""      # ISO timestamp in America/Chicago
    street_view_url: str = ""
    google_maps_url: str = ""
    status: str = "verified"   # verified | probable | rejected
    geocode_method: str = ""
    notes: str = ""
    # Community forums integration (optional)
    community_source: str = ""          # nextdoor | facebook | reddit | community_tip | ...
    community_link_or_notes: str = ""   # public link or short tip text

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "Sale":
        known = {f.name for f in cls.__dataclass_fields__.values()}
        filtered = {k: v for k, v in d.items() if k in known}
        return cls(**filtered)

    def is_community_origin(self) -> bool:
        names = {n.lower() for n in (self.source_names or [])}
        if self.community_source and self.community_source.lower() in COMMUNITY_SOURCES:
            return True
        return bool(names & COMMUNITY_SOURCES)


def make_sale_id(date_start: str, address: str, title: str = "") -> str:
    """Stable sale_id: YYYY-MM-DD_normalized-address"""
    import re
    addr = (address or "").lower()
    addr = re.sub(r"[^a-z0-9]+", "-", addr).strip("-")[:48]
    if not addr:
        title_part = re.sub(r"[^a-z0-9]+", "-", (title or "unknown").lower())[:24]
        addr = title_part or "unknown"
    return f"{date_start}_{addr}"


def google_maps_url(lat: float, lon: float, address: str = "") -> str:
    """Apple Maps satellite pin. Name kept for schema compatibility. No Google."""
    from urllib.parse import quote_plus
    if lat and lon:
        q = quote_plus(address) if address else f"{lat},{lon}"
        return f"https://maps.apple.com/?ll={lat},{lon}&q={q}&t=k&z=19"
    if address:
        return f"https://maps.apple.com/?q={quote_plus(address)}&t=k"
    return ""


def street_view_url(lat: float, lon: float) -> str:
    if not lat or not lon:
        return ""
    # In-app / Apple satellite. Never Google Maps (iframe shows "API key required").
    return f"https://maps.apple.com/?ll={lat},{lon}&t=k&z=19"


def now_ct_iso() -> str:
    return datetime.now(CT).isoformat(timespec="seconds")


def score_confidence(sale: Sale) -> int:
    """Heuristic confidence 0–100. Call after extraction."""
    score = 40
    if sale.address and any(c.isdigit() for c in sale.address):
        score += 18
    if sale.date_start:
        score += 12
    if sale.start_time or sale.end_time:
        score += 8
    if sale.latitude and sale.longitude:
        score += 10
    if sale.original_url:
        score += 8
    if len(sale.source_names) >= 2:
        score += 8
    if sale.photos:
        score += 4
    if sale.description and len(sale.description) > 40:
        score += 4

    # Community origin: modest boost when a public link or multi-source confirmation exists
    if sale.is_community_origin():
        if sale.community_link_or_notes or sale.original_url:
            score += 4
        # Pure community tip without strong address still needs the normal address penalty

    # Penalties
    if not sale.address:
        score -= 25
    if not sale.date_start:
        score -= 20
    return max(0, min(100, score))
