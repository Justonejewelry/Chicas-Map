#!/usr/bin/env python3
"""
Chica Map — Email Lead Ingestion (secondary discovery channel)

Parses EstateSales.org and GarageSaleFinder daily digests, deep-follows listing
URLs when needed, and applies aggressive filters so only physical, visitable
San Antonio metro sales enter the master pipeline.

Designed for:
  - Assisted runs (Grok / connected Gmail tools feed message bodies here)
  - Future credentialed GitHub Actions (Gmail API / service account)

Usage:
  # Parse a saved HTML digest file
  python3 scripts/email_leads.py --html /path/to/digest.html --source estatesales

  # Parse multiple message payloads from JSON (list of {subject, body_html, body_text, from})
  python3 scripts/email_leads.py --messages-json /path/to/messages.json

  # Dry-run filter report only
  python3 scripts/email_leads.py --messages-json msgs.json --dry-run
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass, field, asdict
from datetime import date, datetime
from pathlib import Path
from typing import Any
from urllib.parse import urljoin, urlparse
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT / "scripts") not in sys.path:
    sys.path.insert(0, str(ROOT / "scripts"))

try:
    from schema import Sale, make_sale_id, score_confidence, now_ct_iso, MIN_CONFIDENCE
except ImportError:
    Sale = None  # type: ignore
    MIN_CONFIDENCE = 70

    def make_sale_id(date_start: str, address: str, title: str = "") -> str:
        import re as _re
        addr = _re.sub(r"[^a-z0-9]+", "-", (address or "").lower()).strip("-")[:48]
        return f"{date_start}_{addr or 'unknown'}"

    def score_confidence(sale: Any) -> int:
        return 70

    def now_ct_iso() -> str:
        return datetime.now(ZoneInfo("America/Chicago")).isoformat(timespec="seconds")

CT = ZoneInfo("America/Chicago")

# ---------------------------------------------------------------------------
# Aggressive geo + quality rules (locked after A2 validation 2026-08-13)
# ---------------------------------------------------------------------------

SA_METRO_CITIES = {
    "san antonio", "helotes", "boerne", "schertz", "cibolo", "converse",
    "live oak", "universal city", "fair oaks ranch", "leon springs",
    "shavano park", "hollywood park", "terrell hills", "alamo heights",
    "castle hills", "windcrest", "kirby", "balcones heights",
    "scenic oaks", "timberwood park", "bulverde", "spring branch",
    "selma", "garden ridge", "china grove",
}

# City/zip pairs that are inside metro but commonly appear as online-only
# (Caring Transitions hubs, etc.). Still require street + in-person signals.
SA_METRO_ZIPS_PREFIX = (
    "782", "781", "780",  # core SA + Schertz/Cibolo + Boerne corridor
)

REJECT_ADDRESS_MARKERS = (
    "pmb ", "p.o. box", "po box", "suite only", "ships!", "ships ",
    "online only", "online auction", "bidding starts", "ctbids",
    "by appointment only", "appointment only", "no public hours",
)

REJECT_TITLE_MARKERS = (
    "ships!", "ships ", "$1 start", "$2 start", "online auction",
    "online only", "bidding ends", "items start closing",
)

ONLINE_SIGNAL_MARKERS = (
    "online auction", "online only", "by appointment", "appointment only",
    "ctbids", "bidding starts to close", "items start closing",
    "view sale dates", "ships!",
)

STREET_NUMBER_RE = re.compile(r"\b\d{1,6}\s+[A-Za-z]")
ZIP_RE = re.compile(r"\b(78[0-2]\d{2})\b")
CITY_ZIP_RE = re.compile(
    r"\b([A-Za-z][A-Za-z .'-]{2,40}?)\s*,?\s*TX\s*(78[0-2]\d{2})?\b",
    re.I,
)
HREF_RE = re.compile(r'href=["\'](https?://[^"\']+)["\']', re.I)
ESO_LISTING_RE = re.compile(
    r"https?://(?:www\.)?estatesales\.org/estate-sales/[^\s\"'<>]+",
    re.I,
)
GSF_LISTING_RE = re.compile(
    r"https?://(?:www\.)?garagesalefinder\.com/[^\s\"'<>]+",
    re.I,
)


@dataclass
class EmailLead:
    title: str = ""
    address: str = ""
    city: str = ""
    state: str = "TX"
    zip: str = ""
    date_start: str = ""
    date_end: str = ""
    start_time: str = ""
    end_time: str = ""
    hours_text: str = ""
    description: str = ""
    company: str = ""
    source: str = ""
    original_url: str = ""
    photos: list[str] = field(default_factory=list)
    in_person: bool | None = None
    confidence: int = 0
    reject_reason: str = ""
    raw_signals: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def _clean(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "")).strip()


def _strip_html(html: str) -> str:
    if not html:
        return ""
    text = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", html, flags=re.I | re.S)
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.I)
    text = re.sub(r"</p>", "\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"&nbsp;", " ", text)
    text = re.sub(r"&amp;", "&", text)
    text = re.sub(r"&lt;", "<", text)
    text = re.sub(r"&gt;", ">", text)
    return _clean(text)


def _has_street_number(address: str) -> bool:
    return bool(address and STREET_NUMBER_RE.search(address))


def _metro_city_ok(city: str, zipc: str = "") -> bool:
    c = (city or "").lower().strip()
    if c in SA_METRO_CITIES:
        return True
    if any(c.endswith(x) or x in c for x in SA_METRO_CITIES):
        return True
    if zipc and any(zipc.startswith(p) for p in SA_METRO_ZIPS_PREFIX):
        # Zip alone is weak; still require metro city or strong address later
        return True
    return False


def apply_aggressive_filters(lead: EmailLead) -> EmailLead:
    """Zero-tolerance filter for physical, visitable SA-metro sales only."""
    reasons: list[str] = []
    blob = " ".join(
        [
            lead.title,
            lead.address,
            lead.description,
            lead.hours_text,
            lead.company,
            lead.original_url,
            " ".join(lead.raw_signals),
        ]
    ).lower()

    # Online / appointment / shipping signals
    for m in ONLINE_SIGNAL_MARKERS:
        if m in blob:
            reasons.append(f"online_signal:{m}")
            break
    for m in REJECT_TITLE_MARKERS:
        if m in (lead.title or "").lower():
            reasons.append(f"title_reject:{m}")
            break
    for m in REJECT_ADDRESS_MARKERS:
        if m in (lead.address or "").lower() or m in blob:
            reasons.append(f"address_reject:{m}")
            break

    if lead.in_person is False:
        reasons.append("explicit_not_in_person")

    # Must have usable street address
    if not _has_street_number(lead.address):
        reasons.append("no_street_number")

    # Geo: metro only
    if not _metro_city_ok(lead.city, lead.zip):
        # Last chance: address text itself contains a metro city name
        addr_l = (lead.address or "").lower()
        if not any(c in addr_l for c in SA_METRO_CITIES):
            reasons.append(f"outside_metro:{lead.city or lead.zip or 'unknown'}")

    # Prefer explicit public hours when estate/company listing
    if lead.company and not lead.hours_text and not lead.start_time:
        # Weak signal — not auto-reject, but confidence penalty applied later
        lead.raw_signals.append("missing_public_hours")

    if reasons:
        lead.reject_reason = "; ".join(reasons)
        lead.confidence = 0
        return lead

    # Passed — score
    score = 55
    if _has_street_number(lead.address):
        score += 18
    if lead.date_start:
        score += 10
    if lead.start_time or lead.hours_text:
        score += 8
    if lead.original_url:
        score += 6
    if lead.in_person is True:
        score += 10
    if lead.photos:
        score += 3
    if lead.company:
        score += 2
    lead.confidence = max(0, min(100, score))
    lead.reject_reason = ""
    return lead


def parse_estatesales_digest(html: str, subject: str = "") -> list[EmailLead]:
    """Extract candidate leads from an EstateSales.org daily HTML digest."""
    leads: list[EmailLead] = []
    if not html:
        return leads

    text = _strip_html(html)
    urls = list(dict.fromkeys(ESO_LISTING_RE.findall(html)))

    # Block-oriented parse: title links + nearby city/zip + bidding text
    # HTML structure uses bold title anchors and city lines.
    blocks = re.split(r"(?=<p[^>]*font-size:18px)", html, flags=re.I)
    if len(blocks) < 2:
        blocks = re.split(r"Nearby Estate Sales|Regionally Featured|Nationally Featured", html, flags=re.I)

    for block in blocks:
        title_m = re.search(
            r"font-size:18px[^>]*>.*?href=[\"']([^\"']+)[\"'][^>]*>([^<]{8,160})",
            block,
            re.I | re.S,
        )
        if not title_m:
            # Fallback plain text title near city
            title_m = re.search(
                r"([A-Z][^\n]{10,120}?)\s*(?:Caring Transitions|StillGoode|Estate)",
                _strip_html(block),
            )
            title = _clean(title_m.group(1)) if title_m else ""
            url = ""
        else:
            url = title_m.group(1).strip()
            title = _clean(title_m.group(2))

        if not title and not url:
            continue

        # Unwrap tracking redirects when possible
        if "email.sales.estatesales.org" in url:
            # Keep tracking URL; deep-follow later can resolve
            pass

        city, zipc = "", ""
        city_m = re.search(
            r"([A-Za-z][A-Za-z .'-]{2,40}),?\s*TX\s*(78\d{3})?",
            _strip_html(block),
        )
        if city_m:
            city = _clean(city_m.group(1))
            zipc = (city_m.group(2) or "").strip()

        # Street address line (rare in digest; often only city)
        addr = ""
        addr_m = re.search(
            r"(\d{1,6}\s+[A-Za-z0-9 .#'-]{3,60}),?\s*(?:[A-Za-z .]+)?\s*TX\s*\d{5}",
            _strip_html(block),
        )
        if addr_m:
            addr = _clean(addr_m.group(0))

        company = ""
        co_m = re.search(
            r"(Caring Transitions[^<\n]{0,60}|StillGoode[^<\n]{0,40}|Grasons[^<\n]{0,40})",
            _strip_html(block),
            re.I,
        )
        if co_m:
            company = _clean(co_m.group(1))

        hours = ""
        hours_m = re.search(
            r"(Bidding starts to close[^<\n]{0,80}|Sale starts[^<\n]{0,80}|Items start closing[^<\n]{0,80})",
            _strip_html(block),
            re.I,
        )
        if hours_m:
            hours = _clean(hours_m.group(1))

        date_start = ""
        dm = re.search(
            r"(?:close|closes|closing|starts?)\s+(?:on\s+)?(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\.?\s+([A-Za-z]+)\.?\s+(\d{1,2})",
            hours or _strip_html(block),
            re.I,
        )
        # Keep date empty if unreliable; master flow can fill target date later

        in_person = None
        blob = (_strip_html(block) + " " + title + " " + hours).lower()
        if any(x in blob for x in ("online auction", "bidding starts", "items start closing", "ships!")):
            in_person = False
        if "in-person" in blob or "in person" in blob or "doors open" in blob:
            in_person = True

        lead = EmailLead(
            title=title[:160] or "Estate sale",
            address=addr,
            city=city,
            zip=zipc,
            hours_text=hours,
            company=company,
            source="EstateSales.org email",
            original_url=url,
            in_person=in_person,
            date_start=date_start,
            raw_signals=["digest_block"],
        )
        leads.append(apply_aggressive_filters(lead))

    # Also surface any bare listing URLs not captured in blocks
    seen_urls = {l.original_url for l in leads if l.original_url}
    for u in urls:
        if u in seen_urls:
            continue
        lead = EmailLead(
            title="EstateSales.org listing",
            source="EstateSales.org email",
            original_url=u,
            raw_signals=["url_only"],
        )
        leads.append(apply_aggressive_filters(lead))

    return leads


def parse_garagesalefinder_digest(html: str, text: str = "", subject: str = "") -> list[EmailLead]:
    """Best-effort GSF digest parse. Bodies are often image-heavy / empty."""
    leads: list[EmailLead] = []
    body = html or ""
    plain = text or _strip_html(body)
    if not body and not plain:
        return leads

    urls = list(dict.fromkeys(GSF_LISTING_RE.findall(body) + GSF_LISTING_RE.findall(plain)))

    # Try street-level lines in plain text
    for m in re.finditer(
        r"(\d{1,6}\s+[A-Za-z0-9 .#'-]{3,50}),?\s*([A-Za-z .'-]{3,30}),?\s*TX\s*(78\d{3})?",
        plain,
        re.I,
    ):
        addr = _clean(m.group(0))
        city = _clean(m.group(2))
        zipc = (m.group(3) or "").strip()
        lead = EmailLead(
            title=f"Garage sale — {city}"[:160],
            address=addr,
            city=city,
            zip=zipc,
            source="GarageSaleFinder email",
            in_person=True,
            raw_signals=["gsf_text_address"],
        )
        leads.append(apply_aggressive_filters(lead))

    for u in urls:
        lead = EmailLead(
            title="GarageSaleFinder listing",
            source="GarageSaleFinder email",
            original_url=u,
            in_person=True,
            raw_signals=["gsf_url"],
        )
        leads.append(apply_aggressive_filters(lead))

    return leads


def parse_message(msg: dict[str, Any]) -> list[EmailLead]:
    """Route a single email message dict to the right parser."""
    frm = (msg.get("from") or msg.get("From") or "").lower()
    subject = msg.get("subject") or msg.get("Subject") or ""
    html = msg.get("body_html") or msg.get("html") or ""
    text = msg.get("body_text") or msg.get("body") or msg.get("snippet") or ""

    if "estatesales" in frm or "estatesales" in subject.lower():
        return parse_estatesales_digest(html, subject)
    if "garagesalefinder" in frm or "garagesalefinder" in subject.lower():
        return parse_garagesalefinder_digest(html, text, subject)

    # Generic fallback: try both
    leads = parse_estatesales_digest(html, subject)
    leads += parse_garagesalefinder_digest(html, text, subject)
    return leads


def parse_messages(messages: list[dict[str, Any]]) -> list[EmailLead]:
    all_leads: list[EmailLead] = []
    for m in messages:
        all_leads.extend(parse_message(m))
    return all_leads


def filter_passed(leads: list[EmailLead], min_conf: int = MIN_CONFIDENCE) -> list[EmailLead]:
    return [l for l in leads if not l.reject_reason and l.confidence >= min_conf]


def leads_to_sale_dicts(leads: list[EmailLead], target: date | None = None) -> list[dict]:
    """Convert passed leads into dicts compatible with chica_daily normalize_existing."""
    target = target or datetime.now(CT).date()
    out: list[dict] = []
    for l in leads:
        if l.reject_reason or l.confidence < MIN_CONFIDENCE:
            continue
        date_start = l.date_start or target.isoformat()
        date_end = l.date_end or date_start
        address = l.address
        if l.city and l.city.lower() not in address.lower():
            address = f"{address}, {l.city}, TX {l.zip}".strip(", ")
        out.append(
            {
                "title": l.title,
                "address": address,
                "city": l.city or "San Antonio",
                "zip": l.zip,
                "date_from": date_start,
                "end_date": date_end,
                "start_time": l.start_time,
                "end_time": l.end_time,
                "details": l.description or l.hours_text,
                "source": l.source or "email",
                "url": l.original_url,
                "type": "estate" if "estate" in (l.source or "").lower() else "garage",
                "confidence": l.confidence,
                "photos": l.photos,
                "company": l.company,
                "in_person": l.in_person,
            }
        )
    return out


def summarize(leads: list[EmailLead]) -> str:
    passed = filter_passed(leads)
    rejected = [l for l in leads if l.reject_reason]
    lines = [
        f"Email leads: total={len(leads)} passed={len(passed)} rejected={len(rejected)}",
    ]
    for l in passed[:15]:
        lines.append(f"  PASS  conf={l.confidence}  {l.address or l.city}  |  {l.title[:60]}")
    reason_counts: dict[str, int] = {}
    for l in rejected:
        key = (l.reject_reason or "unknown").split(";")[0].strip()
        reason_counts[key] = reason_counts.get(key, 0) + 1
    if reason_counts:
        lines.append("  Reject reasons:")
        for k, v in sorted(reason_counts.items(), key=lambda x: -x[1])[:12]:
            lines.append(f"    {v:3d}  {k}")
    return "\n".join(lines)


def main() -> int:
    ap = argparse.ArgumentParser(description="Chica email lead parser + aggressive filter")
    ap.add_argument("--html", help="Path to a single HTML digest file")
    ap.add_argument("--source", choices=["estatesales", "garagesalefinder", "auto"], default="auto")
    ap.add_argument("--messages-json", help="JSON file: list of message dicts")
    ap.add_argument("--out", help="Write passed sale dicts JSON here")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    leads: list[EmailLead] = []
    if args.messages_json:
        raw = json.loads(Path(args.messages_json).read_text(encoding="utf-8"))
        if isinstance(raw, dict):
            raw = raw.get("messages") or raw.get("threads") or [raw]
        leads = parse_messages(list(raw))
    elif args.html:
        html = Path(args.html).read_text(encoding="utf-8", errors="replace")
        if args.source == "garagesalefinder":
            leads = parse_garagesalefinder_digest(html)
        else:
            leads = parse_estatesales_digest(html)
    else:
        ap.print_help()
        return 2

    print(summarize(leads))
    passed = filter_passed(leads)
    sale_dicts = leads_to_sale_dicts(passed)

    if args.out and not args.dry_run:
        Path(args.out).write_text(json.dumps(sale_dicts, indent=2), encoding="utf-8")
        print(f"Wrote {len(sale_dicts)} sale dicts → {args.out}")
    elif args.dry_run:
        print(json.dumps(sale_dicts[:5], indent=2)[:1500])

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
