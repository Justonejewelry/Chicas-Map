#!/usr/bin/env python3
"""
Chica's Map — Community Events Swarm v2.1

Conservative discovery + quality gate.
Does not invent events. Does not promote listing pages, images, or city-only stubs.
No Google Calendar. HOA / OCR / headless deferred.
"""

from __future__ import annotations

import hashlib
import json
import re
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse, urlunparse
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from zoneinfo import ZoneInfo

try:
    from events_sentinel import validate_event, MIN_CONFIDENCE, JUNK_URL_RE
except ImportError:
    import sys
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from events_sentinel import validate_event, MIN_CONFIDENCE, JUNK_URL_RE

ROOT = Path(__file__).resolve().parents[1]
FEED = ROOT / "webapp" / "data" / "community-events.json"
REPORT = ROOT / "reports" / "community-events-latest.md"
SOURCES = ROOT / "config" / "community-event-sources.json"

CT = ZoneInfo("America/Chicago")
UA = "Chica's Map Community Events Scout/2.1 (+https://justonejewelry.github.io/Chicas-Map/)"

LISTING_PATHS = {
    "/events", "/events/", "/calendar", "/calendar.aspx", "/find/",
}


def now_iso() -> str:
    return datetime.now(CT).isoformat(timespec="seconds")


def fetch(url: str, timeout: int = 18) -> str:
    req = Request(url, headers={"User-Agent": UA, "Accept": "text/html,application/xhtml+xml"})
    with urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", "ignore")


def clean(text: str) -> str:
    text = re.sub(r"<[^>]+", " ", text or "")
    text = re.sub(r"\s+", " ", text).strip()
    return text


def strip_tracking(url: str) -> str:
    try:
        p = urlparse(url)
        return urlunparse((p.scheme, p.netloc, p.path, "", "", ""))
    except Exception:
        return url.split("?", 1)[0]


def is_junk_url(url: str) -> bool:
    low = url.lower()
    if JUNK_URL_RE.search(url):
        return True
    if any(x in low for x in ("meetupstatic.com", "secure-content.meetup", "facebook.com/pg/")):
        return True
    path = urlparse(url).path.lower().rstrip("/") or "/"
    if path in {"/events", "/calendar", "/find"} or path.endswith("/events") or path.endswith("/calendar"):
        return True
    last = path.split("/")[-1]
    if re.fullmatch(r"\d+", last) and "/events/" not in path:
        return True
    return False


def make_id(title: str, date_str: str, source_id: str) -> str:
    raw = f"{source_id}|{date_str}|{title.lower()[:80]}"
    h = hashlib.sha1(raw.encode("utf-8")).hexdigest()[:12]
    safe = re.sub(r"[^a-z0-9]+", "-", title.lower())[:28].strip("-") or "event"
    return f"{date_str}_{safe}_{h}"


def score_candidate(c: dict) -> int:
    score = 35
    title = c.get("title") or ""
    if len(title) > 12:
        score += 12
    if c.get("date"):
        score += 15
    if c.get("address") and any(ch.isdigit() for ch in c["address"]):
        score += 14
    if c.get("url") and c["url"].startswith("http") and not is_junk_url(c["url"]):
        score += 10
    if c.get("time"):
        score += 5
    reliability = int(c.get("reliability") or 50)
    score += max(0, (reliability - 50) // 5)
    if is_junk_url(c.get("url") or ""):
        score -= 25
    return max(0, min(100, score))


def extract_candidates_from_html(html: str, source: dict) -> list[dict]:
    candidates = []
    source_id = source.get("id", "unknown")
    source_name = source.get("name", source_id)
    reliability = int(source.get("reliability") or 50)

    urls = re.findall(r'https?://[^\s"\'<>]+', html)
    event_urls = []
    for u in urls:
        u = strip_tracking(u.rstrip(".,);]'"))
        low = u.lower()
        if not any(k in low for k in ("/event", "/events/", "calendar", "festival", "concert", "market", "workshop")):
            continue
        if is_junk_url(u):
            continue
        event_urls.append(u)

    seen_u = set()
    unique_urls = []
    for u in event_urls:
        if u not in seen_u:
            seen_u.add(u)
            unique_urls.append(u)

    page_text = clean(html)[:12000]
    date_matches = re.findall(r"(20[2-3][0-9]-[0-1][0-9]-[0-3][0-9])", page_text)

    for u in unique_urls[:40]:
        path = u.rstrip("/").split("/")[-1]
        provisional_title = re.sub(r"[-_]+", " ", path).strip()
        provisional_title = re.sub(r"\.(html?|php|aspx)$", "", provisional_title, flags=re.I)
        if len(provisional_title) < 6 or re.fullmatch(r"\d+", provisional_title):
            continue

        date_str = date_matches[0] if date_matches else ""

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
            "confidence": 0,
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

    # Re-validate previous feed; drop anything that no longer passes Sentinel.
    kept: list[dict] = []
    purged: list[str] = []
    existing_ids: set[str] = set()
    existing_urls: set[str] = set()
    for e in load_existing_feed():
        gate = validate_event(e, existing_ids=existing_ids)
        if gate.passed:
            kept.append(e)
            if e.get("id"):
                existing_ids.add(e["id"])
            existing_urls.add(e.get("url") or e.get("sourceUrl") or "")
        else:
            purged.append(f"{e.get('title', '?')} — {'; '.join(gate.errors)}")

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
                if c.get("confidence", 0) >= MIN_CONFIDENCE and c.get("date") and c.get("address"):
                    gate = validate_event(c, existing_ids=existing_ids)
                    if gate.passed:
                        promoted.append(c)
                        existing_ids.add(c["id"])
                        existing_urls.add(c.get("url"))
                    else:
                        rejected.append(f"{c.get('title', '?')} — {'; '.join(gate.errors)}")
        except HTTPError as e:
            errors.append(f"{name}: HTTP {e.code} {e.reason}")
        except URLError as e:
            errors.append(f"{name}: {e.reason}")
        except Exception as e:
            errors.append(f"{name}: {type(e).__name__}: {e}")

    final_events = kept + promoted
    feed_payload = {
        "updated": now_iso(),
        "city": cfg.get("city", "san-antonio"),
        "version": 2.1,
        "events": final_events,
    }
    FEED.parent.mkdir(parents=True, exist_ok=True)
    FEED.write_text(json.dumps(feed_payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    all_candidates.sort(key=lambda x: (-x.get("confidence", 0), x.get("url", "")))
    lines = [
        "# Chica’s Map — Community Events Swarm v2.1",
        "",
        f"Run: {now_iso()}",
        f"Sources scanned: **{len(sources)}**",
        f"Candidates discovered: **{len(all_candidates)}**",
        f"Promoted this run: **{len(promoted)}**",
        f"Kept from prior feed: **{len(kept)}**",
        f"Purged from prior feed: **{len(purged)}**",
        f"Source errors: **{len(errors)}**",
        f"Rejected by Sentinel: **{len(rejected)}**",
        "",
        "## Promoted (passed Events Sentinel)",
    ]
    if promoted:
        for p in promoted:
            lines.append(f"- **{p.get('title')}** — {p.get('date')} — conf {p.get('confidence')} — {p.get('url')}")
    else:
        lines.append("_None this run._")

    if purged:
        lines += ["", "## Purged (failed re-validation)"]
        for p in purged[:40]:
            lines.append(f"- {p}")

    lines += ["", "## Review Queue"]
    for c in all_candidates[:120]:
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
        "Notes: v2.1 tightening. No city-only stub addresses. No listing pages, images, or tracking URLs. "
        "No Google Calendar. HOA / OCR deferred. Public feed stays empty until real event records exist.",
    ]
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(f"Candidates: {len(all_candidates)} | Promoted: {len(promoted)} | Kept: {len(kept)} | Purged: {len(purged)} | Errors: {len(errors)}")


if __name__ == "__main__":
    main()
