#!/usr/bin/env python3
"""San Antonio Express-News / Hearst Marketplace classifieds.

Public Estate & Garage Sales category. No API key. No paid services.

Usage:
  python3 webapp/scripts/fetch_express_news.py --city san-antonio
  python3 webapp/scripts/fetch_express_news.py --city san-antonio --dry-run
"""
from __future__ import annotations

import argparse
import html as html_mod
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from city_io import safe_load_city, safe_write_city

CT = ZoneInfo("America/Chicago")
UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)
ROOT = Path(__file__).resolve().parents[1]
SNAPSHOT_DIR = ROOT / "data" / "scraper-snapshots"
SCRIPTS = Path(__file__).resolve().parents[2] / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from sales_quality import parse_explicit_dates, parsed as parse_date  # noqa: E402

BASE = "https://hearst-mp.ipublishmarketplace.com"
CATEGORY_URL = f"{BASE}/marketplace/sanantonio/category/estate-garage-sales"
SOURCE_NAME = "Express-News Marketplace"
SOURCE_TAG = "expressnews-marketplace"

CITY_CFG = {
    "san-antonio": {
        "name": "San Antonio",
        "url": CATEGORY_URL,
        "state": "TX",
        "center": (29.4241, -98.4936),
    },
}

ZIP_CITY = {
    "78023": "Helotes",
    "78213": "Castle Hills",
    "78238": "Leon Valley",
    "78239": "San Antonio",
    "78242": "San Antonio",
    "78253": "San Antonio",
    "78222": "San Antonio",
    "78230": "San Antonio",
}

CENSUS = "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress"
NOMINATIM = "https://nominatim.openstreetmap.org/search"

# Named area sales that have no house number. Coords come from Nominatim
# at ingest time; these labels stay area-level, not a driveway.
AREA_HINTS = (
    (re.compile(r"\bleon valley\b", re.I), "Leon Valley citywide, Leon Valley, TX 78238", "Leon Valley, Texas, USA"),
    (re.compile(r"\bshavano ridge\b", re.I), "Shavano Ridge community, San Antonio, TX 78230", "Shavano Ridge, San Antonio, Texas"),
    (re.compile(r"\bbraun station\b", re.I), "Braun Station community, San Antonio, TX", "Braun Station, San Antonio, Texas"),
)

TIME_RE = re.compile(
    r"\b\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?|noon)\b(?:\s*[-–—to]+\s*(?:noon|\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?))?)?",
    re.I,
)
SLASH_DATE_RE = re.compile(r"\b\d{1,2}/\d{1,2}(?:/\d{2,4})?\b")
STREET_RE = re.compile(
    r"\b(\d{2,6})\s+"
    r"((?:[A-Z][A-Za-z0-9.'\-]*)(?:\s+(?:[A-Z][A-Za-z0-9.'\-]*)){0,4})"
    r"(?:\s*,\s*([A-Z][A-Za-z .'-]{2,30}?))?"
    r"(?:\s*,?\s*(TX|Texas))?"
    r"(?:\s*,?\s*(78\d{3}))?",
)
ZIP_RE = re.compile(r"\b(78\d{3})\b")
KNOWN_CITIES = {
    "san antonio", "helotes", "castle hills", "leon valley", "garden ridge",
    "schertz", "cibolo", "boerne", "shavano park", "hollywood park",
    "terrell hills", "alamo heights", "live oak", "universal city",
    "converse", "selma", "windcrest", "fair oaks ranch", "leon springs",
}
REF_RE = re.compile(r"#?(IPCSAE\d+)", re.I)
HOURS_RE = re.compile(
    r"(\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?|noon)\s*[-–—to]+\s*(?:noon|\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)?))",
    re.I,
)
STARTING_HOURS_RE = re.compile(r"\bstarting at\s+(\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?))", re.I)


def today_ct() -> date:
    return datetime.now(CT).date()


def fetch(url: str) -> tuple[int, str]:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": UA,
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "en-US,en;q=0.9",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=35) as resp:
            return resp.status, resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace") if e.fp else ""
        return e.code, body
    except Exception as e:
        return 0, str(e)


def save_snapshot(slug: str, code: int, html: str, reason: str) -> None:
    try:
        SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)
        ts = datetime.now(CT).strftime("%Y%m%dT%H%M%S")
        path = SNAPSHOT_DIR / f"exn-{slug}-{ts}-{reason}.txt"
        header = (
            f"# Express-News Marketplace snapshot\n"
            f"# slug={slug} http={code} reason={reason} bytes={len(html)}\n"
            f"# generated={datetime.now(CT).isoformat(timespec='seconds')}\n\n"
        )
        path.write_text(header + (html or "")[:4000], encoding="utf-8")
        print(f"  snapshot → {path.name}", file=sys.stderr)
    except Exception as e:
        print(f"  snapshot failed: {e}", file=sys.stderr)


def normalize_key(a: str) -> str:
    return re.sub(r"[^a-z0-9]", "", (a or "").lower())[:48]


def abs_url(href: str) -> str:
    href = (href or "").strip()
    if not href:
        return CATEGORY_URL
    if href.startswith("http"):
        return href
    return BASE + href


def _strip_tags(chunk: str) -> str:
    text = re.sub(r"<br\s*/?>", "\n", chunk, flags=re.I)
    text = re.sub(r"</(?:p|div|li|h\d|tr)>", "\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = html_mod.unescape(text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n\s+", "\n", text)
    return text.strip()


def parse_listings(html: str) -> list[dict]:
    """Extract ad cards from the category page."""
    ads: list[dict] = []
    seen: set[str] = set()
    blocks = re.split(r'class="[^"]*panel-result[^"]*"', html)
    for block in blocks[1:]:
        href_m = re.search(r'href="(/marketplace/sanantonio/advert/[^"]+)"', block)
        if not href_m:
            continue
        href = html_mod.unescape(href_m.group(1))
        title_m = re.search(
            r'href="' + re.escape(href_m.group(1)) + r'"[^>]*>\s*([^<]{3,160})',
            block,
        )
        title = html_mod.unescape(title_m.group(1)).strip() if title_m else ""
        title = re.sub(r"\s+", " ", title)
        desc_m = re.search(r'class="[^"]*description[^"]*"[^>]*>([\s\S]*?)</div>', block, re.I)
        snippet = _strip_tags(desc_m.group(1)) if desc_m else ""
        snippet = re.sub(r"\s*Show more\s*»?\s*$", "", snippet, flags=re.I)
        stamp_m = re.search(r"Post Date:\s*([^<\n]+)", block, re.I)
        ref_m = REF_RE.search(block)
        refcode = (ref_m.group(1).upper() if ref_m else "")
        key = refcode or href
        if key in seen:
            continue
        seen.add(key)
        ads.append(
            {
                "title": title,
                "url": abs_url(href),
                "snippet": snippet,
                "post_date_raw": (stamp_m.group(1).strip() if stamp_m else ""),
                "refcode": refcode,
            }
        )
    return ads


def parse_detail(html: str, url: str = "") -> dict:
    """Pull the featured ad panel (not the similar-listings rail)."""
    ad_id = ""
    m = re.search(r"general_(\d+)", url or "")
    if m:
        ad_id = m.group(1)
    chunk = ""
    if ad_id:
        pat = re.search(
            r'<div[^>]+id="advert_' + re.escape(ad_id) + r'"[^>]*>([\s\S]*?)</div>\s*(?:<div[^>]+id="advert_|\s*</div>\s*<div id="rightbar")',
            html,
            re.I,
        )
        if not pat:
            # slim fixture: just the panel inside #details
            pat = re.search(
                r'<div[^>]+id="advert_' + re.escape(ad_id) + r'"[^>]*>([\s\S]*)$',
                html,
                re.I,
            )
        if pat:
            chunk = pat.group(1)
    if not chunk:
        details = re.search(r'<div[^>]+id="details"[^>]*>([\s\S]*?)<div[^>]+id="(?:rightbar|advert_)', html, re.I)
        if details:
            chunk = details.group(1)
        else:
            details = re.search(r'<div[^>]+id="details"[^>]*>([\s\S]+)', html, re.I)
            chunk = details.group(1) if details else html
    heading_m = re.search(r'<div[^>]+class="[^"]*panel-heading[^"]*"[^>]*>([\s\S]*?)</div>', chunk, re.I)
    body_m = re.search(r'<div[^>]+class="[^"]*panel-body[^"]*"[^>]*>([\s\S]*?)</div>', chunk, re.I)
    title = _strip_tags(heading_m.group(1)) if heading_m else ""
    body = _strip_tags(body_m.group(1)) if body_m else _strip_tags(chunk)
    body = re.sub(r"\s*Show more\s*»?\s*$", "", body, flags=re.I)
    loc_m = re.search(r"<dt>\s*location\s*</dt>\s*<dd>([^<]+)</dd>", chunk, re.I)
    if loc_m:
        loc = _strip_tags(loc_m.group(1))
        if loc and loc.lower() not in body.lower():
            body = body + "\nlocation\n" + loc
    stamp_m = re.search(r"Post Date:\s*([^\n<]+)", chunk, re.I)
    ref_m = REF_RE.search(chunk)
    return {
        "title": re.sub(r"\s+", " ", title).strip(),
        "body": body,
        "post_date_raw": (stamp_m.group(1).strip() if stamp_m else ""),
        "refcode": (ref_m.group(1).upper() if ref_m else ""),
    }


def parse_post_date(raw: str, today: date) -> date | None:
    raw = (raw or "").strip()
    m = re.search(r"(\d{1,2})/(\d{1,2})(?:/(\d{2,4}))?", raw)
    if not m:
        return None
    mo, d, y = int(m.group(1)), int(m.group(2)), m.group(3)
    year = today.year if not y else (int(y) + 2000 if len(y) == 2 else int(y))
    try:
        return date(year, mo, d)
    except ValueError:
        return None


def extract_hours(text: str) -> str | None:
    found = []
    for m in HOURS_RE.finditer(text or ""):
        h = re.sub(r"\s+", "", m.group(1).lower())
        h = h.replace("a.m.", "am").replace("p.m.", "pm")
        h = h.replace("–", "-").replace("—", "-").replace("to", "-")
        if h not in found:
            found.append(h)
    def tidy(h: str) -> str:
        return re.sub(r"[\s.,;]+$", "", h)
    if found:
        return ", ".join(tidy(h) for h in found)
    m = STARTING_HOURS_RE.search(text or "")
    if m:
        return "starting at " + tidy(re.sub(r"\s+", "", m.group(1).lower()))
    return None


def extract_street(text: str) -> tuple[str, str, str] | None:
    """Return (street, city, zip) if a house-numbered street is present."""
    cleaned = TIME_RE.sub(" ", text or "")
    cleaned = SLASH_DATE_RE.sub(" ", cleaned)
    cleaned = re.sub(r"\b20\d{2}\b", " ", cleaned)
    for m in STREET_RE.finditer(cleaned):
        num, name, city, _st, zipc = m.groups()
        name = re.sub(r"\s+", " ", name).strip(" ,.")
        first = name.split()[0].lower().rstrip(".") if name else ""
        if first in {"am", "pm", "a.m", "p.m", "nov", "dec", "jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "november", "december", "january", "february"}:
            continue
        # Drop trailing product words accidentally glued on (HAMMOND KEYBOARD…).
        # Keep the first 1–4 tokens; city is only kept when it is a known place or beside a ZIP/TX.
        street = f"{num} {name}".strip()
        city = (city or "").strip(" ,.")
        zipc = zipc or ""
        if city and city.lower() not in KNOWN_CITIES and not zipc and not _st:
            # "1102 Dwyerbrook, HAMMOND KEYBOARD" — HAM is not a city.
            city = ""
        return street, city, zipc
    return None


def looks_online_auction(title: str, body: str) -> bool:
    t = f"{title} {body}".lower()
    if re.search(r"\bon-?line only\b|\bonline only\b|\binternet only\b|\bbid and buy online\b", t):
        return True
    if re.search(r"\bauction\b", t) and re.search(r"\bon-?line\b|\bonline\b", t):
        return True
    return False


def looks_area_sale(title: str, body: str) -> bool:
    t = f"{title} {body}".lower()
    if re.search(r"\bcitywide\b|\bcity-wide\b|\bcommunity (?:yard|garage|rummage) sale\b", t):
        return True
    return any(pat.search(t) for pat, _addr, _q in AREA_HINTS)


def build_address(title: str, body: str) -> tuple[str, str, bool]:
    """Returns (address, area_query_or_empty, is_area)."""
    blob = f"{title}\n{body}"
    street = extract_street(blob)
    zip_m = ZIP_RE.search(blob)
    zipc = zip_m.group(1) if zip_m else ""
    if street:
        st, city, z2 = street
        zipc = z2 or zipc
        if not city:
            # city mentioned in title/body
            for name in ("Helotes", "Castle Hills", "Leon Valley", "Garden Ridge", "Schertz", "Cibolo", "Boerne", "Shavano Park"):
                if re.search(r"\b" + re.escape(name) + r"\b", blob, re.I):
                    city = name
                    break
        if not city:
            city = ZIP_CITY.get(zipc, "San Antonio")
        st = st.title()
        if city:
            city = city.title()
        addr = f"{st}, {city}, TX"
        if zipc:
            addr = f"{addr} {zipc}"
        return addr, "", False
    for pat, addr, query in AREA_HINTS:
        if pat.search(blob):
            return addr, query, True
    if looks_area_sale(title, body):
        if zipc:
            city = ZIP_CITY.get(zipc, "San Antonio")
            return f"{title.strip()}, {city}, TX {zipc}", f"{city}, Texas {zipc}", True
        return f"{title.strip()}, San Antonio, TX", "San Antonio, Texas, USA", True
    return "", "", False


def census_geocode(query: str) -> tuple[float, float, str] | None:
    qs = urllib.parse.urlencode({"address": query, "benchmark": "Public_AR_Current", "format": "json"})
    req = urllib.request.Request(
        f"{CENSUS}?{qs}",
        headers={"User-Agent": "ChicasMap/express-news (+https://www.chicasmap.com/)", "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=18) as resp:
            data = json.loads(resp.read().decode())
    except Exception as exc:
        print(f"  geocode fail {query!r}: {exc}")
        return None
    matches = (data.get("result") or {}).get("addressMatches") or []
    if not matches:
        return None
    c = matches[0]["coordinates"]
    return float(c["y"]), float(c["x"]), matches[0].get("matchedAddress") or query


def nominatim_geocode(query: str) -> tuple[float, float, str] | None:
    qs = urllib.parse.urlencode({"q": query, "format": "json", "limit": 1, "countrycodes": "us"})
    req = urllib.request.Request(
        f"{NOMINATIM}?{qs}",
        headers={"User-Agent": "ChicasMap/express-news (+https://www.chicasmap.com/)", "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read().decode())
    except Exception as exc:
        print(f"  nominatim fail {query!r}: {exc}")
        return None
    if not data:
        return None
    d = data[0]
    try:
        return float(d["lat"]), float(d["lon"]), d.get("display_name") or query
    except (KeyError, TypeError, ValueError):
        return None


def geocode_sale(address: str, area_query: str, is_area: bool) -> tuple[float | None, float | None, str]:
    if not is_area:
        hit = census_geocode(address)
        if hit:
            return hit[0], hit[1], "census"
    if area_query:
        hit = nominatim_geocode(area_query)
        if hit:
            return hit[0], hit[1], "nominatim-place"
        time.sleep(1.0)
    if not is_area:
        # last try via nominatim on the street address
        hit = nominatim_geocode(address)
        if hit:
            return hit[0], hit[1], "nominatim"
    return None, None, ""


def normalize_ad(listing: dict, detail: dict | None, today: date, geocode: bool = False) -> tuple[dict | None, str]:
    """Build a sale record, or return (None, skip_reason)."""
    detail = detail or {}
    title = (detail.get("title") or listing.get("title") or "").strip()
    body = (detail.get("body") or listing.get("snippet") or "").strip()
    refcode = (detail.get("refcode") or listing.get("refcode") or "").upper()
    url = listing.get("url") or CATEGORY_URL
    post_raw = detail.get("post_date_raw") or listing.get("post_date_raw") or ""
    post = parse_post_date(post_raw, today)

    if looks_online_auction(title, body):
        return None, "online/auction, not an in-person sale"

    date_text = f"{title}\n{body}"
    date_text = re.sub(
        r"\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(\d{1,2})\s*/\s*(\d{1,2})\b",
        r"\1 \2-\3",
        date_text,
        flags=re.I,
    )
    start, end, certainty = parse_explicit_dates(
        date_text,
        post,
        (post.year if post else today.year),
    )
    if not start or not end:
        return None, "no explicit sale dates"
    if end < start:
        return None, "invalid date range"
    if end < today:
        return None, f"ended {end.isoformat()}"

    address, area_query, is_area = build_address(title, body)
    if not address:
        return None, "no usable street address or clear area"

    lat = lon = None
    geocode_label = ""
    if geocode:
        lat, lon, geocode_label = geocode_sale(address, area_query, is_area)
        if lat is None:
            return None, "could not geocode"

    hours = extract_hours(body) or extract_hours(title)
    is_estate = bool(re.search(r"\bestate\b", title + " " + body, re.I))
    sale_type = "community" if is_area else ("estate" if is_estate else "garage")
    eid = f"exn-{refcode.lower()}" if refcode else f"exn-{normalize_key(url.split('/')[-1])}"

    sale = {
        "address": address,
        "dates": f"{start.isoformat()} – {end.isoformat()}",
        "date_from": start.isoformat(),
        "date_to": end.isoformat(),
        "date_start": start.isoformat(),
        "date_end": end.isoformat(),
        "end_date": end.isoformat(),
        "hours": hours,
        "title": title[:160] or "Garage sale",
        "details": body[:800],
        "source": SOURCE_NAME,
        "url": url,
        "photos": 0,
        "type": sale_type,
        "categories": ["community-sale"] if is_area else (["estate-sale"] if is_estate else ["garage-sale"]),
        "confidence": 0.86 if (geocode_label == "census" and not is_area) else 0.72,
        "status": "verified",
        "lat": lat,
        "lon": lon,
        "geocode": geocode_label or ("area" if is_area else ""),
        "in_person": True,
        "external_id": eid,
        "refcode": refcode,
        "posted_at": (post.isoformat() if post else None),
    }
    return sale, ""


def merge(slug: str, sales: list[dict], today: date) -> tuple[int, int]:
    data = safe_load_city(slug)
    by_key: dict[str, dict] = {}
    for s in data.get("public") or []:
        k = normalize_key(s.get("address") or s.get("title") or "")
        if k:
            by_key[k] = s
        eid = s.get("external_id")
        if eid:
            by_key[f"id:{eid}"] = s

    added = 0
    for s in sales:
        try:
            if s.get("end_date") and date.fromisoformat(s["end_date"]) < today:
                continue
        except ValueError:
            pass
        keys = []
        if s.get("external_id"):
            keys.append(f"id:{s['external_id']}")
        keys.append(normalize_key(s.get("address") or s.get("title") or ""))
        existing = None
        for k in keys:
            if k and k in by_key:
                existing = by_key[k]
                break
        if existing is not None:
            for f in (
                "dates", "date_from", "date_to", "date_start", "date_end", "end_date",
                "hours", "title", "url", "source", "details", "lat", "lon", "geocode",
                "type", "external_id", "refcode", "posted_at", "in_person",
            ):
                if s.get(f) is not None:
                    existing[f] = s[f]
            existing["status"] = "verified"
            existing["confidence"] = max(float(existing.get("confidence") or 0), float(s.get("confidence") or 0))
            existing["categories"] = list(set((existing.get("categories") or []) + (s.get("categories") or [])))
        else:
            k = keys[0] if keys[0] else normalize_key(s.get("title") or "x")
            by_key[k] = s
            added += 1

    unique: list[dict] = []
    seen: set[int] = set()
    for s in by_key.values():
        oid = id(s)
        if oid in seen:
            continue
        seen.add(oid)
        try:
            if s.get("end_date") and date.fromisoformat(str(s["end_date"])[:10]) < today:
                continue
        except ValueError:
            pass
        unique.append(s)

    data["public"] = unique
    data["total_locations"] = len(unique) + len(data.get("permits") or [])
    data["date"] = today.isoformat()
    data["last_refresh"] = datetime.now(CT).isoformat(timespec="seconds")
    data["status"] = "live"
    data["sources"] = sorted(set(data.get("sources") or []) | {SOURCE_TAG})
    data["city"] = slug
    safe_write_city(slug, data)
    return added, len(unique)


def discover(slug: str, today: date, geocode: bool, sleep_s: float = 0.6) -> tuple[list[dict], list[tuple[dict, str]]]:
    cfg = CITY_CFG[slug]
    url = cfg["url"]
    print(f"[{slug}] Express-News Marketplace {url}")
    code, html = fetch(url)
    print(f"  page → HTTP {code} ({len(html)} bytes)")
    if code != 200:
        print(f"  WARN: non-200; skipping ({code})", file=sys.stderr)
        save_snapshot(slug, code, html, f"http{code}")
        return [], []
    listings = parse_listings(html)
    print(f"  listings={len(listings)}")
    if not listings:
        save_snapshot(slug, code, html, "zero")
        return [], []

    accepted: list[dict] = []
    skipped: list[tuple[dict, str]] = []
    for listing in listings:
        detail = None
        if listing.get("url"):
            time.sleep(sleep_s)
            dcode, dhtml = fetch(listing["url"])
            print(f"  detail {listing.get('refcode') or listing['url'].rsplit('/',1)[-1]} → HTTP {dcode}")
            if dcode == 200:
                detail = parse_detail(dhtml, listing["url"])
        sale, reason = normalize_ad(listing, detail, today, geocode=geocode)
        if sale:
            accepted.append(sale)
        else:
            skipped.append((listing, reason))
    print(f"  normalized={len(accepted)} skipped={len(skipped)}")
    return accepted, skipped


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--city", default="san-antonio")
    ap.add_argument("--cities", default="")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--no-geocode", action="store_true")
    args = ap.parse_args()
    cities = [c.strip() for c in (args.cities or args.city).split(",") if c.strip()]
    today = today_ct()
    print(f"fetch_express_news {today.isoformat()} cities={cities}")
    for slug in cities:
        if slug not in CITY_CFG:
            print(f"unknown {slug}", file=sys.stderr)
            continue
        sales, skipped = discover(slug, today, geocode=not args.no_geocode)
        for listing, reason in skipped:
            print(f"  skip {listing.get('refcode') or listing.get('title')}: {reason}")
        if args.dry_run:
            print(json.dumps(sales, indent=2)[:4000])
            continue
        added, live = merge(slug, sales, today)
        print(f"  merge added={added} public_live={live}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
