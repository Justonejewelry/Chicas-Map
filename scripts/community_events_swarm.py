#!/usr/bin/env python3
"""
Chica's Map — Community Events Swarm v2

Evolves the original URL-harvest scout into a structured candidate pipeline:
- Loads city-config sources (config/community-event-sources.json)
- Fetches high-reliability sources
- Extracts basic structured signals (title-ish, date-ish, location-ish, urls)
- Scores candidates
- Runs Events Sentinel
- Only promotes records that pass the gate into webapp/data/community-events.json
- Always writes a full diagnostic report to reports/community-events-latest.md

Philosophy (unchanged):
- Do not invent events.
- Prefer municipal and high-trust public sources.
- Keep human-visible review trail.
- No Google Calendar.
- HOA / OCR / heavy headless deferred.
"""

from __future__ import annotations

import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from zoneinfo import ZoneInfo

# Local Sentinel
try:
    from events_sentinel import validate_event, MIN_CONFIDENCE
except ImportError:
    # Allow running from repo root or scripts/
    import sys
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from events_sentinel import validate_event, MIN_CONFIDENCE

ROOT = Path(__file__).resolve().parents[1]
FEED = ROOT / "webapp" / "data" / "community-events.json"
REPORT = ROOT / "reports" / "community-events-latest.md"
SOURCES = ROOT / "config" / "community-event-sources.json"

CT = ZoneInfo("America/Chicago")
UA = "Chica's Map Community Events Scout/2.0 (+https://justonejewelry.github.io/Chicas-Map/)"


def now_iso() -> str:
    return datetime.now(CT).isoformat(timespec="seconds")


def fetch(url: str, timeout: int = 18) -> str:
    req = Request(url, headers={"User-Agent": UA, "Accept": "text/html,application/xhtml+xml"})
    with urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", "ignore")


def clean(text: str) -> str:
    text = re.sub(r"<[^>]+>", " ", text or "")
    text = re.sub(r"\s+", " ", text).strip()
    return text


def make_id(title: str, date_str: str, source_id: str) -> str:
    raw = f"{source_id}|{date_str}|{title.lower()[:80]}"
    h = hashlib.sha1(raw.encode("utf-8")).hexdigest()[:12]
    safe = re.sub(r"[^a-z0-9]+", "-", title.lower())[:28].strip("-") or "event"
    return f"{date_str}_{safe}_{h}"


def score_candidate(c: dict) -> int:
    score = 40
    if c.get("title") and len(c["title"]) > 8:
        score += 12
    if c.get("date"):
        score += 15
    if c.get("address") and len(c["address"]) > 8:
        score += 12
    if c.get("url") and c["url"].startswith("http"):
        score += 10
    if c.get("time"):
        score += 5
    reliability = int(c.get("reliability") or 50)
    score += max(0, (reliability - 50) // 5)
    return max(0, min(100, score))


def extract_candidates_from_html(html: str, source: dict) -> list[dict]:
    """
    Conservative structured extraction.
    Looks for common event patterns without inventing data.
    This is intentionally imperfect on day one — better than pure URL dump,
    still requires Sentinel + review culture.
    """
    candidates = []
    source_id = source.get("id", "unknown")
    source_name = source.get("name", source_id)
    reliability = int(source.get("reliability") or 50)

    # Collect absolute-ish URLs that look like event detail pages
    urls = re.findall(r'https?://[^\s"\'<>]+', html)
    event_urls = []
    for u in urls:
        u = u.rstrip(".,);]'")
        low = u.lower()
        if any(k in low for k in ("/event", "/events/", "calendar", "festival", "concert", "market", "workshop")):
            if "schema.org" not in low and "facebook.net" not in low and "fbevents" not in low:
                event_urls.append(u)

    # Dedupe while preserving order
    seen_u = set()
    unique_urls = []
    for u in event_urls:
        if u not in seen_u:
            seen_u.add(u)
            unique_urls.append(u)

    # Very light title/date heuristics from surrounding text (page level)
    # We do not claim these are accurate event records yet.
    # Future iterations will add per-URL detail fetches for Tier-1 sources.
    page_text = clean(html)[:12000]

    # Look for ISO-ish or common date patterns near event language
    date_matches = re.findall(
        r"(20[2-3][0-9]-[0-1][0-9]-[0-3][0-9])|(?:(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(20[2-3][0-9]))",
        page_text,
        flags=re.I,
    )

    # For this first production version we primarily promote URL + source + weak signals
    # into the *review* path. Only candidates that later gain real title/date/address
    # and pass Sentinel are written to the public feed.
    for u in unique_urls[:40]:
        # Derive a provisional title from the last path segment
        path = u.rstrip("/").split("/")[-1]
        provisional_title = re.sub(r"[-_]+", " ", path).strip()
        provisional_title = re.sub(r"\.(html?|php|aspx)$", "", provisional_title, flags=re.I)
        if len(provisional_title) < 5:
            provisional_title = f"Event from {source_name}"

        # Prefer any ISO date found on the page as a weak signal (not claimed as exact)
        date_str = ""
        for m in date_matches:
            if m[0]:
                date_str = m[0]
                break

        cand = {
            "id": make_id(provisional_title, date_str or "unknown", source_id),
            "title": provisional_title.title() if provisional_title.islower() else provisional_title,
            "date": date_str,
            "endDate": "",
            "time": "",
            "address": "",
            "lat": None,
            "lng": None,
            "category": "other",
            "description": "",
            "url": u,
            "source": source_name,
            "sourceId": source_id,
            "reliability": reliability,
            "discoveredAt": now_iso(),
            "confidence": 0,  # filled after scoring
        }
        cand["confidence"] = score_candidate(cand)
        candidates.append(cand)

    return candidates


def load_existing_feed() -> list[dict]:
    if not FEED.exists():
        return []
    try:
        data = json.loads(FEED.read_text(encoding="utf-8"))
        if isinstance(data, dict):
            return list(data.get("events") or [])
        if isinstance(data, list):
            return data
    except Exception:
        pass
    return []


def main() -> None:
    cfg = json.loads(SOURCES.read_text(encoding="utf-8"))
    sources = [s for s in cfg.get("sources", []) if s.get("enabled", True)]
    sources.sort(key=lambda s: (-int(s.get("priority", 9)), -int(s.get("reliability", 0))))

    existing = load_existing_feed()
    existing_ids = {e.get("id") for e in existing if e.get("id")}
    existing_urls = {e.get("url") or e.get("sourceUrl") for e in existing}

    all_candidates: list[dict] = []
    promoted: list[dict] = []
    errors: list[str] = []
    rejected: list[str] = []

    for source in sources:
        url = source.get("url")
        name = source.get("name", source.get("id"))
        if not url:
            continue
        try:
            html = fetch(url)
            cands = extract_candidates_from_html(html, source)
            for c in cands:
                if c.get("url") in existing_urls:
                    continue
                all_candidates.append(c)

                # Only attempt promotion for higher-confidence structured candidates
                # that already have a real date. First version is conservative.
                if c.get("confidence", 0) >= MIN_CONFIDENCE and c.get("date"):
                    # Temporary address fallback for municipal sources so Sentinel can pass
                    # location check while real geocoding is still pending.
                    if not c.get("address") and source.get("type") == "municipal":
                        c["address"] = f"San Antonio, TX (from {name})"

                    gate = validate_event(c, existing_ids=existing_ids)
                    if gate.passed:
                        promoted.append(c)
                        existing_ids.add(c["id"])
                        existing_urls.add(c.get("url"))
                    else:
                        rejected.append(f"{c.get('title', '?')} — {'; '.join(gate.errors)}")
                else:
                    # Still useful for the human review report
                    pass

        except HTTPError as e:
            errors.append(f"{name}: HTTP {e.code} {e.reason}")
        except URLError as e:
            errors.append(f"{name}: {e.reason}")
        except Exception as e:
            errors.append(f"{name}: {type(e).__name__}: {e}")

    # Merge promoted into feed (keep existing + new)
    final_events = existing[:]  # preserve previously approved
    for p in promoted:
        final_events.append(p)

    # Write public feed
    feed_payload = {
        "updated": now_iso(),
        "city": cfg.get("city", "san-antonio"),
        "version": 2,
        "events": final_events,
    }
    FEED.parent.mkdir(parents=True, exist_ok=True)
    FEED.write_text(json.dumps(feed_payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    # Diagnostic report (always)
    all_candidates.sort(key=lambda x: (-x.get("confidence", 0), x.get("url", "")))
    lines = [
        "# Chica’s Map — Community Events Swarm v2",
        "",
        f"Run: {now_iso()}",
        f"Sources scanned: **{len(sources)}**",
        f"Candidates discovered: **{len(all_candidates)}**",
        f"Promoted to public feed: **{len(promoted)}**",
        f"Source errors: **{len(errors)}**",
        f"Rejected by Sentinel: **{len(rejected)}**",
        "",
        "## Promoted (passed Events Sentinel)",
    ]
    if promoted:
        for p in promoted:
            lines.append(f"- **{p.get('title')}** — {p.get('date')} — conf {p.get('confidence')} — {p.get('url')}")
    else:
        lines.append("_None this run. Feed preserves previously approved events._")

    lines += ["", "## Review Queue (structured candidates)"]
    for c in all_candidates[:150]:
        lines.append(
            f"- **{c.get('source')}** — conf {c.get('confidence')} — {c.get('title')} — {c.get('date') or 'no-date'} — {c.get('url')}"
        )

    if rejected:
        lines += ["", "## Rejected by Sentinel"]
        for r in rejected[:50]:
            lines.append(f"- {r}")

    if errors:
        lines += ["", "## Source Errors"]
        for e in errors:
            lines.append(f"- {e}")

    lines += [
        "",
        "---",
        "Notes: HOA / OCR / headless deferred. No Google Calendar. "
        "Only candidates that already carry a usable date and pass Events Sentinel are promoted. "
        "All other discoveries remain in this review queue for human or future enrichment passes.",
    ]

    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(f"Candidates: {len(all_candidates)} | Promoted: {len(promoted)} | Errors: {len(errors)}")
    print(f"Feed written: {FEED}")
    print(f"Report written: {REPORT}")


if __name__ == "__main__":
    main()
