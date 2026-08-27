#!/usr/bin/env python3
"""Chica's Map Community Events Swarm v2.6. ICS + RSS + follow-calendar. No Google Calendar."""
from __future__ import annotations
import hashlib, html as htmlmod, json, re
from datetime import datetime
from pathlib import Path
from urllib.parse import urljoin, urlparse, urlunparse
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from zoneinfo import ZoneInfo
try:
    from events_sentinel import validate_event, MIN_CONFIDENCE, JUNK_URL_RE
    from event_dates import extract_address, extract_dated_blocks, normalize_event_dates, parse_dashed_date, parse_single_date, parse_time_label, to_iso
    from ics_events import expand_ics_urls, parse_vevents
    from rss_events import parse_rss_items
except ImportError:
    import sys
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from events_sentinel import validate_event, MIN_CONFIDENCE, JUNK_URL_RE
    from event_dates import extract_address, extract_dated_blocks, normalize_event_dates, parse_dashed_date, parse_single_date, parse_time_label, to_iso
    from ics_events import expand_ics_urls, parse_vevents
    from rss_events import parse_rss_items
ROOT = Path(__file__).resolve().parents[1]
FEED = ROOT / "webapp" / "data" / "community-events.json"
REPORT = ROOT / "reports" / "community-events-latest.md"
SOURCES = ROOT / "config" / "community-event-sources.json"
CT = ZoneInfo("America/Chicago")
UA = "Chica's Map Community Events Scout/2.6 (+https://justonejewelry.github.io/Chicas-Map/)"
HREF_RE = re.compile(r"""<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)</a>""", re.I | re.S)
CATEGORY_PATH_RE = re.compile(r"CategoryID|CategoryName|authorid|mcat/|PID/15381", re.I)
CAL_PATH_RE = re.compile(r"/(calendar|events|event|events-calendar|community-calendar|announcements-calendars)(/|$|\?)", re.I)
ICS_HINT_RE = re.compile(r"ical=1|format=ical|ical\.php|icalendar\.aspx|calendar/feed", re.I)
EVENT_HREF_HINTS = ("event-details", "articleid", "artdate", "/events/", "/event/", "events-calendar/", "community-calendar/event", "eid=")
DETAIL_URL_BONUS = ("articleid", "eid=", "/event/", "events-calendar/")
LISTING_PATHS = {"/", "/events", "/calendar", "/find", "/community-calendar", "/calendars"}
def now_iso() -> str:
    return datetime.now(CT).isoformat(timespec="seconds")
def fetch(url: str, timeout: int = 16) -> str:
    req = Request(url, headers={"User-Agent": UA, "Accept": "text/calendar, application/rss+xml, application/atom+xml, text/html, */*"})
    with urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", "ignore")
def clean(text: str) -> str:
    text = htmlmod.unescape(text or "")
    text = re.sub(r"(?is)<script[^>]*>.*?</script>", " ", text)
    text = re.sub(r"(?is)<style[^>]*>.*?</style>", " ", text)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"&nbsp;|&#160;", " ", text, flags=re.I)
    return re.sub(r"\s+", " ", text).strip()
def strip_tracking(url: str) -> str:
    try:
        p = urlparse(url)
        query = p.query if re.search(r"(?i)\b(EID|ical|format)=", p.query) else ""
        return urlunparse((p.scheme, p.netloc, p.path, "", query, ""))
    except Exception:
        return url.split("#", 1)[0]
def same_host(a: str, b: str) -> bool:
    try:
        return urlparse(a).netloc.lower().removeprefix("www.") == urlparse(b).netloc.lower().removeprefix("www.")
    except Exception:
        return False
def is_junk_url(url: str) -> bool:
    low = url.lower()
    if JUNK_URL_RE.search(url):
        return True
    if any(x in low for x in ("meetupstatic.com", "secure-content.meetup", "facebook.com/", "/login", "/cart")):
        return True
    if "icalendar.aspx" in low:
        return True
    if "calendar.aspx" in low and "eid=" not in low:
        return True
    if CATEGORY_PATH_RE.search(url) and "articleid" not in low:
        return True
    path = urlparse(url).path.lower().rstrip("/") or "/"
    if path in LISTING_PATHS:
        return True
    if path.endswith(("/events", "/calendar", "/community-calendar", "/calendars")):
        return True
    last = path.split("/")[-1]
    if re.fullmatch(r"\d+", last) and "/events/" not in path and "/event/" not in path:
        return True
    return False
def slug_title(url: str) -> str:
    path = urlparse(url).path.rstrip("/").split("/")[-1]
    if path.lower().startswith("artdate") or re.fullmatch(r"\d{1,2}-\d{1,2}-20\d{2}", path):
        return ""
    title = re.sub(r"[-_]+", " ", path).strip()
    title = re.sub(r"\.(html?|php|aspx)$", "", title, flags=re.I)
    if len(title) < 6 or re.fullmatch(r"\d+", title):
        return ""
    return title.title() if title.islower() else title
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
    url = c.get("url") or ""
    if url.startswith("http") and not is_junk_url(url):
        score += 10
    if c.get("time"):
        score += 5
    score += max(0, (int(c.get("reliability") or 50) - 50) // 5)
    if is_junk_url(url):
        score -= 25
    return max(0, min(100, score))
def candidate(source: dict, title: str, date_str: str, end_date: str = "", time: str = "", address: str = "", url: str = "") -> dict:
    date_str, end_date = normalize_event_dates(date_str, end_date)
    source_id = source.get("id", "unknown")
    title = re.sub(r"\s+", " ", title).strip()
    rec = {"id": make_id(title, date_str or "unknown", source_id), "title": title, "date": date_str, "endDate": end_date, "time": time or "", "address": address or "", "lat": None, "lng": None, "category": "other", "description": "", "url": url or source.get("url") or "", "source": source.get("name", source_id), "sourceId": source_id, "reliability": int(source.get("reliability") or 50), "discoveredAt": now_iso(), "confidence": 0}
    rec["confidence"] = score_candidate(rec)
    return rec
def parsed_to_candidates(source: dict, parsed: list[dict]) -> list[dict]:
    return [candidate(source, title=p["title"], date_str=p.get("date") or "", end_date=p.get("endDate") or "", time=p.get("time") or "", address=p.get("address") or "", url=p.get("url") or "") for p in parsed]
def extract_cards_from_html(raw_html: str, source: dict) -> list[dict]:
    base = source.get("url") or ""
    out = []
    for m in HREF_RE.finditer(raw_html):
        href = htmlmod.unescape(m.group(1).strip())
        if href.startswith("/"):
            href = urljoin(base, href)
        href = strip_tracking(href)
        if not href.startswith("http") or is_junk_url(href):
            continue
        low = href.lower()
        if not any(k in low for k in EVENT_HREF_HINTS):
            continue
        window = raw_html[max(0, m.start() - 120): min(len(raw_html), m.end() + 800)]
        text = clean(window)
        anchor = clean(m.group(2))
        title = anchor if len(anchor) >= 6 else slug_title(href)
        if not title:
            continue
        if title.lower() in {"learn more", "read more", "details", "more", "add to calendar"}:
            title = slug_title(href) or title
        start = parse_single_date(href) or parse_dashed_date(href, prefer="dmy") or parse_single_date(text)
        _s, end = normalize_event_dates(text)
        if start and not _s:
            date_str, end_date = to_iso(start), ""
        else:
            date_str, end_date = _s, end
            if not date_str and start:
                date_str = to_iso(start)
        out.append(candidate(source, title=title, date_str=date_str, end_date=end_date, time=parse_time_label(text), address=extract_address(text), url=href))
    return out
def extract_from_blocks(html: str, source: dict) -> list[dict]:
    return [candidate(source, title=b["title"], date_str=b["date"], end_date=b.get("endDate") or "", time=b.get("time") or "", address=b.get("address") or "", url=source.get("url") or "") for b in extract_dated_blocks(clean(html)[:25000])]
def merge_by_title(records: list[dict]) -> list[dict]:
    by_key: dict[str, dict] = {}
    order: list[str] = []
    for rec in records:
        key = re.sub(r"[^a-z0-9]+", "", (rec.get("title") or "").lower())[:40]
        if not key:
            continue
        if key not in by_key:
            by_key[key] = rec
            order.append(key)
            continue
        base = by_key[key]
        if (not base.get("date")) and rec.get("date"):
            base["date"] = rec["date"]
            base["endDate"] = rec.get("endDate") or base.get("endDate") or ""
        if (not base.get("address")) and rec.get("address"):
            base["address"] = rec["address"]
        if (not base.get("time")) and rec.get("time"):
            base["time"] = rec["time"]
        bu, ru = base.get("url") or "", rec.get("url") or ""
        if any(k in ru.lower() for k in DETAIL_URL_BONUS) and not any(k in bu.lower() for k in DETAIL_URL_BONUS):
            base["url"] = ru
        base["confidence"] = score_candidate(base)
        base["id"] = make_id(base["title"], base.get("date") or "unknown", base.get("sourceId") or "")
    return [by_key[k] for k in order]
def extract_candidates_from_html(html: str, source: dict) -> list[dict]:
    return merge_by_title(extract_cards_from_html(html, source) + extract_from_blocks(html, source))
def looks_like_ics(raw: str) -> bool:
    head = (raw or "")[:400].lstrip()
    return head.startswith("BEGIN:VCALENDAR") or "BEGIN:VEVENT" in head
def looks_like_rss(raw: str) -> bool:
    head = (raw or "")[:500].lower()
    return "<rss" in head or "<feed" in head or head.startswith("<?xml")
def discover_follow_urls(html: str, base: str, limit: int = 4) -> list[str]:
    urls: list[str] = []
    for m in HREF_RE.finditer(html or ""):
        href = htmlmod.unescape(m.group(1).strip())
        if href.startswith("/"):
            href = urljoin(base, href)
        if not href.startswith("http") or not same_host(href, base) or "/login" in href.lower():
            continue
        path = urlparse(href).path.lower()
        if CAL_PATH_RE.search(path) or ICS_HINT_RE.search(href):
            href = href.split("#", 1)[0]
            if href.rstrip("/") != (base or "").rstrip("/") and href not in urls:
                urls.append(href)
        if len(urls) >= limit:
            break
    return urls
def harvest_source(source: dict) -> list[dict]:
    method = (source.get("extraction") or "structured-html").lower()
    url = source.get("url") or ""
    cands: list[dict] = []
    if method == "ics":
        for u in expand_ics_urls(url, int(source.get("ics_months") or 3)):
            cands.extend(parsed_to_candidates(source, parse_vevents(fetch(u), source_url=url)))
        return cands
    if method == "rss":
        return parsed_to_candidates(source, parse_rss_items(fetch(url), url))
    raw = fetch(url)
    pages = [raw]
    if method == "follow-html" or source.get("follow_calendar"):
        for fu in discover_follow_urls(raw, url):
            try:
                extra = fetch(fu)
            except Exception:
                continue
            if looks_like_ics(extra):
                cands.extend(parsed_to_candidates(source, parse_vevents(extra, source_url=fu)))
            elif looks_like_rss(extra):
                cands.extend(parsed_to_candidates(source, parse_rss_items(extra, fu)))
            else:
                pages.append(extra)
                for iu in discover_follow_urls(extra, fu, limit=2):
                    if not ICS_HINT_RE.search(iu):
                        continue
                    try:
                        icsraw = fetch(iu)
                    except Exception:
                        continue
                    if looks_like_ics(icsraw):
                        cands.extend(parsed_to_candidates(source, parse_vevents(icsraw, source_url=iu)))
                    elif looks_like_rss(icsraw):
                        cands.extend(parsed_to_candidates(source, parse_rss_items(icsraw, iu)))
    html_cands: list[dict] = []
    for page in pages:
        html_cands.extend(extract_candidates_from_html(page, source))
    return cands + merge_by_title(html_cands)
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
    sources.sort(key=lambda s: (int(s.get("priority", 9)), -int(s.get("reliability", 0))))
    kept: list[dict] = []
    purged: list[str] = []
    existing_ids: set[str] = set()
    existing_urls: set[str] = set()
    for e in load_existing_feed():
        e["date"], e["endDate"] = normalize_event_dates(e.get("date") or "", e.get("endDate") or "")
        if e.get("time"):
            e["time"] = parse_time_label(str(e["time"])) or e["time"]
        gate = validate_event(e, existing_ids=existing_ids)
        if gate.passed:
            kept.append(e)
            if e.get("id"):
                existing_ids.add(e["id"])
            existing_urls.add(e.get("url") or "")
        else:
            purged.append(f"{e.get('title', '?')} -- {'; '.join(gate.errors)}")
    all_candidates: list[dict] = []
    promoted: list[dict] = []
    errors: list[str] = []
    rejected: list[str] = []
    dated = 0
    addressed = 0
    for source in sources:
        name = source.get("name", source.get("id"))
        if not source.get("url"):
            continue
        try:
            for c in harvest_source(source):
                if c.get("url") in existing_urls:
                    continue
                all_candidates.append(c)
                if c.get("date"):
                    dated += 1
                if c.get("address"):
                    addressed += 1
                if c.get("confidence", 0) >= MIN_CONFIDENCE and c.get("date") and c.get("address"):
                    gate = validate_event(c, existing_ids=existing_ids)
                    if gate.passed:
                        promoted.append(c)
                        existing_ids.add(c["id"])
                        existing_urls.add(c.get("url"))
                    else:
                        rejected.append(f"{c.get('title', '?')} -- {'; '.join(gate.errors)}")
        except HTTPError as e:
            errors.append(f"{name}: HTTP {e.code} {e.reason}")
        except URLError as e:
            errors.append(f"{name}: {e.reason}")
        except Exception as e:
            errors.append(f"{name}: {type(e).__name__}: {e}")
    feed_payload = {"updated": now_iso(), "city": cfg.get("city", "san-antonio"), "version": 2.6, "events": kept + promoted}
    FEED.parent.mkdir(parents=True, exist_ok=True)
    FEED.write_text(json.dumps(feed_payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    all_candidates.sort(key=lambda x: (-x.get("confidence", 0), x.get("url", "")))
    lines = ["# Chica's Map -- Community Events Swarm v2.6", "", f"Run: {now_iso()}", f"Sources scanned: **{len(sources)}**", f"Candidates discovered: **{len(all_candidates)}**", f"With parsed dates: **{dated}**", f"With street/venue address: **{addressed}**", f"Promoted this run: **{len(promoted)}**", f"Kept from prior feed: **{len(kept)}**", f"Purged from prior feed: **{len(purged)}**", f"Source errors: **{len(errors)}**", f"Rejected by Sentinel: **{len(rejected)}**", "", "## Promoted (passed Events Sentinel)"]
    if promoted:
        for p in promoted:
            lines.append(f"- **{p.get('title')}** -- {p.get('date')} -- {p.get('address') or 'no-address'} -- conf {p.get('confidence')} -- {p.get('url')}")
    else:
        lines.append("_None this run._")
    if purged:
        lines += ["", "## Purged (failed re-validation)"] + [f"- {p}" for p in purged[:40]]
    lines += ["", "## Review Queue"]
    for c in all_candidates[:160]:
        lines.append(f"- **{c.get('source')}** -- conf {c.get('confidence')} -- {c.get('title')} -- {c.get('date') or 'no-date'} -- {c.get('address') or 'no-address'} -- {c.get('url')}")
    if rejected:
        lines += ["", "## Rejected by Sentinel"] + [f"- {r}" for r in rejected[:50]]
    if errors:
        lines += ["", "## Source Errors"] + [f"- {e}" for e in errors]
    lines += ["", "---", "Notes: v2.6 caps events at 180 days, drops office-closed holidays, city-only stubs, listing URLs, and HTML fragments. CivicEngage ICS, Tribe ICS, RSS. No Google Calendar."]
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Candidates: {len(all_candidates)} | Dated: {dated} | Addressed: {addressed} | Promoted: {len(promoted)} | Kept: {len(kept)} | Purged: {len(purged)} | Errors: {len(errors)}")
if __name__ == "__main__":
    main()
