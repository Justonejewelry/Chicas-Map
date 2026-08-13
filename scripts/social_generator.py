#!/usr/bin/env python3
"""
Chica Map — Social Content Generator
Generates Facebook, Nextdoor, and TikTok posts (~200 words each)
STRICTLY from the final verified daily dataset.
Never invents counts, items, addresses, or weather.
"""

from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

CT = ZoneInfo("America/Chicago")

MAP_URL = "https://justonejewelry.github.io/Chicas-Map/"


def _day_name(d: str) -> str:
    try:
        return datetime.strptime(d, "%Y-%m-%d").strftime("%A")
    except Exception:
        return "the weekend"


def _safe_count(sales: list[dict]) -> int:
    return len(sales)


def _highlights(sales: list[dict], limit: int = 4) -> list[str]:
    out = []
    for s in sales:
        h = s.get("highlights") or []
        if h:
            out.append(f"{s.get('title', 'Sale')} — {', '.join(h[:3])}")
        elif s.get("description"):
            desc = (s.get("description") or "")[:90].strip()
            if desc:
                out.append(f"{s.get('title', 'Sale')} — {desc}…")
        if len(out) >= limit:
            break
    return out


def _picks(sales: list[dict]) -> list[str]:
    picks = []
    for s in sales:
        conf = int(s.get("confidence") or 0)
        if conf >= 90 or "estate" in (s.get("sale_type") or "").lower():
            title = s.get("title") or s.get("address") or "a strong stop"
            picks.append(title)
        if len(picks) >= 3:
            break
    return picks


def facebook(sales: list[dict], target_date: str, area: str = "San Antonio & nearby") -> str:
    day = _day_name(target_date)
    n = _safe_count(sales)
    hl = _highlights(sales)
    picks = _picks(sales)

    lines = [
        f"Hey pack — Chica just finished sniffing the trails for {day}.",
        "",
        f"I verified {n} garage, yard, and estate sales across {area} for {target_date}.",
        "Everything on the map has a real address, a source link, and coordinates so you can actually get there.",
        "",
    ]
    if hl:
        lines.append("A few things that caught my nose:")
        for h in hl:
            lines.append(f"• {h}")
        lines.append("")
    if picks:
        lines.append("Worth a special stop:")
        for p in picks:
            lines.append(f"⭐ {p}")
        lines.append("")
    lines.extend([
        f"Open the free verified map: {MAP_URL}",
        "",
        "Near Me sorts by distance. Routes open in Google Maps, Apple Maps, or Waze with one tap.",
        "",
        "If you know a sale I missed, list it free on the site — the pack thanks you.",
        "",
        "Share Chica Map with the pack!",
        "",
        "#SanAntonioGarageSale #ChicaMap #YardSale #TreasureHunt",
    ])
    return "\n".join(lines)


def nextdoor(sales: list[dict], target_date: str, area: str = "San Antonio and surrounding neighborhoods") -> str:
    day = _day_name(target_date)
    n = _safe_count(sales)
    hl = _highlights(sales, limit=3)

    lines = [
        f"Neighbors — quick note from Chica for {day} ({target_date}).",
        "",
        f"I put together a verified list of {n} garage, yard, and estate sales around {area}.",
        "Every pin has a source and a real address. No guessing, no dead ends.",
        "",
    ]
    if hl:
        lines.append("A couple of highlights from the listings:")
        for h in hl:
            lines.append(f"• {h}")
        lines.append("")
    lines.extend([
        f"Map is free and mobile-friendly: {MAP_URL}",
        "",
        "Use Near Me to sort by how close you are, then build a multi-stop route.",
        "",
        "If your street or neighborhood has a sale that isn't on the map yet, please submit it — it helps everyone.",
        "",
        "Share Chica Map with the pack so more neighbors can find the good ones before they're gone.",
        "",
        "Happy hunting.",
    ])
    return "\n".join(lines)


def tiktok(sales: list[dict], target_date: str) -> str:
    day = _day_name(target_date)
    n = _safe_count(sales)
    picks = _picks(sales)

    hooks = [
        f"San Antonio treasure hunters — Chica found {n} verified sales for {day}.",
        f"If your weekend plan is still 'scroll phone,' Chica has a better idea for {day}.",
        f"{n} real garage and estate sales are on the map for {day}. Let's go.",
    ]
    try:
        doy = datetime.strptime(target_date, "%Y-%m-%d").timetuple().tm_yday
        hook = hooks[doy % len(hooks)]
    except Exception:
        hook = hooks[0]

    lines = [
        hook,
        "",
        "Every pin is verified. Source link, address, Google Maps, Street View — the whole trail.",
        "",
    ]
    if picks:
        lines.append("A few that made my tail wag:")
        for p in picks:
            lines.append(f"• {p}")
        lines.append("")
    lines.extend([
        f"Map is free → {MAP_URL}",
        "",
        "Near Me · multi-stop routes · one-tap navigation.",
        "",
        "If you spot a sale I missed, list it. Then share Chica Map with the pack.",
        "",
        "Now go find something weird and wonderful.",
        "",
        "#ChicaMap #SanAntonio #GarageSale #TreasureHunt #YardSale",
    ])
    return "\n".join(lines)


def write_social(sales: list[dict], target_date: str, out_dir: Path) -> dict[str, Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    files = {
        "facebook": out_dir / f"{target_date}-facebook.md",
        "nextdoor": out_dir / f"{target_date}-nextdoor.md",
        "tiktok": out_dir / f"{target_date}-tiktok.md",
    }
    files["facebook"].write_text(facebook(sales, target_date), encoding="utf-8")
    files["nextdoor"].write_text(nextdoor(sales, target_date), encoding="utf-8")
    files["tiktok"].write_text(tiktok(sales, target_date), encoding="utf-8")
    return files


if __name__ == "__main__":
    print(facebook([], "2026-08-15")[:300])
    print("---")
    print(tiktok([], "2026-08-15")[:300])
