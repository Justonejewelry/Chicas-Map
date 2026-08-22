#!/usr/bin/env python3
"""
Chica's Map — Community Events Swarm v2.2

Conservative discovery + date parsing + quality gate.
Does not invent events. Does not attach one page-level date to every URL.
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
    from event_dates import (
        extract_dated_blocks,
        normalize_event_dates,
        parse_single_date,
        parse_time_label,
        to_iso,
    )
except ImportError:
    import sys
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from events_sentinel import validate_event, MIN_CONFIDENCE, JUNK_URL_RE
    from event_dates import (
        extract_dated_blocks,
        normalize_event_dates,
        parse_single_date,
        parse_time_label,
        to_iso,
    )

ROOT = Path(__file__).resolve().parents[1]
FEED = ROOT / "webapp" / "data" / "community-events.json"
REPORT = ROOT / "reports" / "community-events-latest.md"
SOURCES = ROOT / "config" / "community-event-sources.json"

CT = ZoneInfo("America/Chicago")
UA = "Chica's Map Community Events Scout/2.2 (+https://justonejewelry.github.io/Chicas-Map/)"


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


def candidate(source: dict, title: str, date_str: str, end_date: str = "", time: str = "", address: str = "", url: str = "") -> dict:
    date_str, end_date = normalize_event_dates(date_str, end_date)
    source_id = source.get("id", "unknown")
    source_name = source.get("name", source_id)
    title = re.sub(r"\s+", " ", title).strip()
    rec = {
        "id": make_id(title, date_str or "unknown", source_id),
        "title": title,
        "date": date_str,
        "endDate": end_date,
        "time": time or "",
        "address": address,
        "lat": None,
        "lng": None,
        "category": "other",
        "description": "",
        "url": url or source.get("url") or "",
        "source": source_name,
        "sourceId": source_id,
        "reliability": int(source.get("reliability") or 50),
        "discoveredAt": now_iso(),
        "confidence": 0,
    }
    rec["confidence"] = score_candidate(rec)
    return rec


def extract_from_blocks(html: str, source: dict) -> list[dict]:
    """Pull title+date pairs from cleaned listing text."""
    out = []
    for block in extract_dated_blocks(clean(html)[:20000]):
        out.append(candidate(
            source,
            title=block["title"],
            date_str=block["date"],
            end_date=block.get("endDate") or "",
            time=block.get("time") or "",
            url=source.get("url") or "",
        ))
    return out


def extract_from_urls(html: str, source: dict) -> list[dict]:
    """URL harvest — date comes from the slug or nearby path only, never a global page date."""
    candidates = []
    urls = re.findall(r'https?://[^\s"\'<>]+', html)
    seen = set()
    for u in urls:
        u = strip_tracking(u.rstrip(".,);]'"))
        if u in seen or is_junk_url(u):
            continue
        low = u.lower()
        if not any(k in low for k in ("/event", "/events/", "festival", "concert", "workshop")):
            continue
        seen.add(u)
        path = u.rstrip("/").split("/")[-1]
        title = re.sub(r"[-_]+", " ", path).strip()
        title = re.sub(r"\.(html?|php|aspx)$", "", title, flags=re.I)
        if len(title) < 6 or re.fullmatch(r"\d+", title):
            continue
        decoded_date = parse_single_date(title) or parse_single_date(u)
        rec = candidate(
            source,
            title=title.title() if title.islower() else title,
            date_str=to_iso(decoded_date),
            url=u,
        )
        candidates.append(rec)
        if len(candidates) >= 40:
            break
    return candidates


def extract_candidates_from_html(html: str, source: dict) -> list[dict]:
    blocks = extract_from_blocks(html, source)
    urls = extract_from_urls(html, source)
    # Prefer dated blocks; keep URL finds that have their own date or a strong title
    merged = []
    seen_keys = set()
    for rec in blocks + urls:
        key = (rec.get("title", "").lower()[:48], rec.get("date"), rec.get("url"))
        if key in seen_keys:
            continue
        seen_keys.add(key)
        merged.append(rec)
    return merged


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

    kept: list[dict] = []
    purged: list[str] = []
    existing_ids: set[str] = set()
    existing_urls: set[str] = set()
    for e in load_existing_feed():
        # Normalize leftover free-text dates before re-validation
        e["date"], e["endDate"] = normalize_event_dates(e.get("date") or "", e.get("endDate") or "")
        if e.get("time"):
            e["time"] = parse_time_label(str(e["time"])) or e["time"]
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
    dated = 0

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
                if c.get("date"):
                    dated += 1
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
        "version": 2.2,
        "events": final_events,
    }
    FEED.parent.mkdir(parents=True, exist_ok=True)
    FEED.write_text(json.dumps(feed_payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    all_candidates.sort(key=lambda x: (-x.get("confidence", 0), x.get("url", "")))
    lines = [
        "# Chica’s Map — Community Events Swarm v2.2",
        "",
        f"Run: {now_iso()}",
        f"Sources scanned: **{len(sources)}**",
        f"Candidates discovered: **{len(all_candidates)}**",
        f"Candidates with parsed dates: **{dated}**",
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
        "Notes: v2.2 date parsing. Per-block dates (ISO, US numeric, month names, ranges, times). "
        "No global page-date stamp. No Google Calendar. Public feed stays empty until street-level records exist.",
    ]
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(
        f"Candidates: {len(all_candidates)} | Dated: {dated} | Promoted: {len(promoted)} | "
        f"Kept: {len(kept)} | Purged: {len(purged)} | Errors: {len(errors)}"
    )


if __name__ == "__main__":
    main()
