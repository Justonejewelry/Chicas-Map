#!/usr/bin/env python3
"""
Chica Map — Update Pack Generator
Produces the human-readable operational summary after a successful Sentinel pass.
"""

from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

CT = ZoneInfo("America/Chicago")


def build_update_pack(
    *,
    target_date: str,
    run_time: str,
    area: str,
    sources_checked: list[str],
    candidates: int,
    verified: list[dict[str, Any]],
    rejected: int,
    duplicates_merged: int,
    geocoded: int,
    street_view: int,
    sentinel_status: str,
    sentinel_notes: str = "",
    files_written: list[str] | None = None,
    commit_msg: str = "",
    social_paths: dict[str, str] | None = None,
) -> str:
    day = datetime.strptime(target_date, "%Y-%m-%d").strftime("%A, %B %-d, %Y")
    n = len(verified)

    lines = [
        f"# Chica Update Pack — {target_date}",
        "",
        "## 1. CHICA DAILY RUN",
        f"- **Target date:** {day}",
        f"- **San Antonio local run time:** {run_time}",
        f"- **Geographic area:** {area}",
        f"- **Sources searched:** {len(sources_checked)}",
        f"- **Candidates discovered:** {candidates}",
        f"- **Verified sales:** {n}",
        f"- **Rejected listings:** {rejected}",
        f"- **Duplicates merged:** {duplicates_merged}",
        f"- **Successfully geocoded:** {geocoded}",
        f"- **Street View links generated:** {street_view}",
        f"- **Sentinel:** {sentinel_status}",
        "",
        "## 2. VERIFIED SALES",
        "",
    ]

    if not verified:
        lines.append("_No sales passed verification for this target date._")
        lines.append("")
    else:
        for i, s in enumerate(verified, 1):
            title = s.get("title") or "Untitled sale"
            lines.append(f"### {i}. {title}")
            lines.append(f"- **Type:** {s.get('sale_type', 'garage')}")
            lines.append(f"- **Date:** {s.get('date_start', '')}" + (f" → {s.get('date_end')}" if s.get("date_end") and s.get("date_end") != s.get("date_start") else ""))
            if s.get("start_time") or s.get("end_time"):
                lines.append(f"- **Time:** {s.get('start_time', '?')} – {s.get('end_time', '?')}")
            lines.append(f"- **Address:** {s.get('address', '')}, {s.get('city', '')} {s.get('zip', '')}")
            if s.get("description"):
                lines.append(f"- **Notes:** {s['description'][:180]}")
            if s.get("highlights"):
                lines.append(f"- **Highlights:** {', '.join(s['highlights'][:6])}")
            lines.append(f"- **Confidence:** {s.get('confidence', 0)}%")
            sources = s.get("source_names") or []
            if sources:
                lines.append(f"- **Sources:** {', '.join(sources)}")
            if s.get("original_url"):
                lines.append(f"- **Original listing:** {s['original_url']}")
            if s.get("google_maps_url"):
                lines.append(f"- **Google Maps:** {s['google_maps_url']}")
            if s.get("street_view_url"):
                lines.append(f"- **Street View:** {s['street_view_url']}")
            lines.append(f"- **Verified at:** {s.get('verified_at', '')}")
            lines.append("")

    lines.append("## 3. CHICA PICKS")
    lines.append("")
    picks = []
    for s in verified:
        conf = int(s.get("confidence") or 0)
        stype = (s.get("sale_type") or "").lower()
        title = s.get("title") or s.get("address") or "Sale"
        if conf >= 92:
            picks.append(f"🔥 Chica Pick — {title}")
        elif "estate" in stype:
            picks.append(f"⭐ Worth a Stop — {title}")
        elif conf >= 85:
            picks.append(f"🐾 Pack Favorite — {title}")
    if picks:
        for p in picks[:8]:
            lines.append(f"- {p}")
    else:
        lines.append("_No special picks labeled for this run (labels only appear when data supports them)._")
    lines.append("")

    lines.append("## 4. SOURCES CHECKED")
    lines.append("")
    for src in sources_checked:
        lines.append(f"- {src}")
    lines.append("")

    lines.append("## 5. REJECTED / EXCLUDED")
    lines.append("")
    lines.append(f"Total rejected or filtered: **{rejected}**")
    lines.append("(Expired, duplicate, outside area, insufficient information, or confidence below threshold.)")
    lines.append("")

    lines.append("## 6. DATA / MAP OUTPUT")
    lines.append("")
    for f in (files_written or []):
        lines.append(f"- ✅ {f}")
    lines.append("")

    lines.append("## 7. QUALITY CONTROL")
    lines.append("")
    lines.append(f"**Sentinel: {sentinel_status}**")
    if sentinel_notes:
        lines.append("")
        lines.append("```")
        lines.append(sentinel_notes)
        lines.append("```")
    lines.append("")

    lines.append("## 8. GITHUB")
    lines.append("")
    if commit_msg:
        lines.append(f"- Commit message: `{commit_msg}`")
    else:
        lines.append("- Commit pending or dry-run")
    lines.append("")

    lines.append("## 9. SOCIAL CONTENT")
    lines.append("")
    if social_paths:
        for platform, path in social_paths.items():
            lines.append(f"- **{platform.title()}:** `{path}`")
    else:
        lines.append("_Social files generated alongside this pack._")
    lines.append("")
    lines.append("---")
    lines.append("*Generated from the final verified dataset after Sentinel validation. No unverified claims.*")

    return "\n".join(lines)


def write_update_pack(content: str, target_date: str, out_dir: Path) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / f"{target_date}-chica-update-pack.md"
    path.write_text(content, encoding="utf-8")
    return path
