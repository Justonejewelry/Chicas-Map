"""Shared helpers for Chica Map sale-source fetchers."""
from __future__ import annotations

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

from sales_quality import parse_explicit_dates  # noqa: E402

CENSUS = "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress"
NOMINATIM = "https://nominatim.openstreetmap.org/search"

FAMILY_SOURCES = {
    "yardsalesearch",
    "yard sale search",
    "garagesalefinder",
    "garage sale finder",
    "gsalr",
    "yardsales.net",
    "yardsales net",
}
FAMILY_ID_PREFIXES = ("yss-", "gsf-", "gsalr-", "ysn-")

ALLOW_CITIES = {
    "san antonio", "helotes", "castle hills", "leon valley", "garden ridge",
    "schertz", "cibolo", "boerne", "shavano park", "hollywood park",
    "terrell hills", "alamo heights", "live oak", "universal city",
    "converse", "selma", "windcrest", "fair oaks ranch", "leon springs",
    "kirby", "adkins", "stockdale", "floresville", "poth", "la vernia",
    "st hedwig", "st. hedwig", "sutherland springs", "new braunfels",
    "seguin", "marion", "bulverde", "spring branch", "canyon lake",
    "pleasanton", "lytle", "devine", "elmendorf", "somerset", "von ormy",
    "balcones heights", "olmos park", "hill country village", "china grove",
    "nixon", "falls city", "castroville", "lacoste", "fair oaks",
    "mcqueeney", "geronimo", "new berlin", "randolph", "lackland",
    "alamo ranch", "converse", "selma", "cibolo", "schertz", "wetmore",
    "scenic oaks", "timberwood park", "grey forest", "helotes",
}

SALE_TITLE_RE = re.compile(
    r"\b((garage|yard|estate|rummage|moving)\s+sales?"
    r"|community[-\s]+wide\s+(garage|yard|rummage|estate|moving)(?:\s+sale)?s?"
    r"|multi[-\s]?family\s+(garage|yard|sale)s?)\b",
    re.I,
)

HOURS_RE = re.compile(
    r"(\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?|noon)\s*[-–—to]+\s*"
    r"(?:noon|\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)?))",
    re.I,
)
STARTING_HOURS_RE = re.compile(
    r"\b(?:starting at|from)\s+(\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?))",
    re.I,
)
BARE_HOURS_RE = re.compile(
    r"\bfrom\s+(\d{1,2}(?::\d{2})?)\s*[-–—to]+\s*(\d{1,2}(?::\d{2})?|\?)(?=\s|$|[.,;!])",
    re.I,
)


def today_ct() -> date:
    return datetime.now(CT).date()


def normalize_key(a: str) -> str:
    return re.sub(r"[^a-z0-9]", "", (a or "").lower())[:48]


def address_key(address: str) -> str:
    """Stable street key that ignores ZIP, state, and common abbreviations."""
    a = (address or "").lower()
    a = a.replace("united states", " ")
    a = re.sub(r"\b(tx|texas)\b", " ", a)
    a = re.sub(r"\b\d{5}(?:-\d{4})?\b", " ", a)
    a = re.sub(
        r"\b(highway|hwy|street|st|road|rd|drive|dr|lane|ln|avenue|ave|"
        r"boulevard|blvd|circle|cir|court|ct|trail|trl|way)\b",
        " ",
        a,
    )
    a = a.replace("u.s.", "us ").replace("us-", "us ").replace("us hwy", "us ")
    return re.sub(r"[^a-z0-9]", "", a)[:48]


def strip_tags(chunk: str) -> str:
    text = re.sub(r"<br\s*/?>", "\n", chunk or "", flags=re.I)
    text = re.sub(r"</(?:p|div|li|h\d|tr)>", "\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = html_mod.unescape(text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n\s+", "\n", text)
    return text.strip()


def abs_url(href: str, base: str) -> str:
    href = (href or "").strip()
    if not href:
        return base
    return urllib.parse.urljoin(base if base.endswith("/") else base + "/", href)


def strip_query(url: str) -> str:
    """BLOX robots disallow /classifieds/*? — never keep a query string."""
    parts = urllib.parse.urlsplit(url)
    return urllib.parse.urlunsplit((parts.scheme, parts.netloc, parts.path, "", parts.fragment))


def fetch(
    url: str,
    *,
    referer: str | None = None,
    retries_429: int = 3,
    backoff: float = 15.0,
    timeout: int = 35,
) -> tuple[int, str]:
    headers = {
        "User-Agent": UA,
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
    }
    if referer:
        headers["Referer"] = referer
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace") if e.fp else ""
        if e.code == 429 and retries_429 > 0:
            wait = backoff
            raw = e.headers.get("Retry-After") if e.headers else None
            if raw:
                try:
                    wait = max(wait, float(raw))
                except ValueError:
                    pass
            print(f"  HTTP 429 for {url} — backing off {wait:.0f}s", file=sys.stderr)
            time.sleep(wait)
            return fetch(
                url,
                referer=referer,
                retries_429=retries_429 - 1,
                backoff=min(backoff * 2, 120.0),
                timeout=timeout,
            )
        return e.code, body
    except Exception as e:
        return 0, str(e)


def save_snapshot(prefix: str, slug: str, code: int, html: str, reason: str) -> None:
    try:
        SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)
        ts = datetime.now(CT).strftime("%Y%m%dT%H%M%S")
        path = SNAPSHOT_DIR / f"{prefix}-{slug}-{ts}-{reason}.txt"
        header = (
            f"# {prefix} snapshot\n"
            f"# slug={slug} http={code} reason={reason} bytes={len(html or '')}\n"
            f"# generated={datetime.now(CT).isoformat(timespec='seconds')}\n\n"
        )
        path.write_text(header + (html or "")[:4000], encoding="utf-8")
        print(f"  snapshot → {path.name}", file=sys.stderr)
    except Exception as e:
        print(f"  snapshot failed: {e}", file=sys.stderr)


def tidy_street(street: str) -> str:
    s = re.sub(r"\s+", " ", (street or "")).strip(" ,.")
    s = s.title()
    s = re.sub(r"\b(Fm|Rm|Rr|Cr|Sh|Us|Hwy|Ih|Tx)\b", lambda m: m.group(1).upper(), s)
    return s


def extract_hours(text: str) -> str | None:
    found: list[str] = []

    def tidy(h: str) -> str:
        return re.sub(r"[\s.,;]+$", "", h)

    for m in HOURS_RE.finditer(text or ""):
        h = re.sub(r"\s+", "", m.group(1).lower())
        h = h.replace("a.m.", "am").replace("p.m.", "pm")
        h = h.replace("–", "-").replace("—", "-").replace("to", "-")
        if h not in found:
            found.append(h)
    if found:
        return ", ".join(tidy(h) for h in found)
    m = STARTING_HOURS_RE.search(text or "")
    if m:
        return "starting at " + tidy(re.sub(r"\s+", "", m.group(1).lower()))
    m = BARE_HOURS_RE.search(text or "")
    if m:
        start, end = m.group(1), m.group(2)
        if end in {"?", "??"}:
            return f"starting at {start}am"
        return f"{start}am-{end}pm"
    return None


def title_is_sale_event(title: str) -> bool:
    t = title or ""
    if re.search(r"\b(job fair|suite sale|blowout sale|on sale now|tickets on sale)\b", t, re.I):
        return False
    return bool(SALE_TITLE_RE.search(t))


def in_sa_area(city: str = "", zipc: str = "", address: str = "", region: str = "") -> bool:
    city_l = re.sub(r"[^a-z .]", "", (city or "").lower()).strip()
    if city_l in ALLOW_CITIES or city_l.replace(".", "") in ALLOW_CITIES:
        return True
    blob = f"{city} {address}".lower()
    if "san antonio" in blob:
        return True
    if re.fullmatch(r"78\d{3}", zipc or ""):
        return True
    zm = re.search(r"\b(78\d{3})\b", address or "")
    if zm:
        return True
    if (region or "").upper() in {"TX", "TEXAS"} and city_l:
        # unnamed hamlet in TX with a street still needs a metro cue
        return False
    return False


def census_geocode(query: str) -> tuple[float, float, str] | None:
    qs = urllib.parse.urlencode({"address": query, "benchmark": "Public_AR_Current", "format": "json"})
    req = urllib.request.Request(
        f"{CENSUS}?{qs}",
        headers={"User-Agent": "ChicasMap/sales-sources (+https://www.chicasmap.com/)", "Accept": "application/json"},
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
        headers={"User-Agent": "ChicasMap/sales-sources (+https://www.chicasmap.com/)", "Accept": "application/json"},
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
        hit = nominatim_geocode(address)
        if hit:
            return hit[0], hit[1], "nominatim"
    return None, None, ""


def valid_coords(lat: float | None, lon: float | None) -> bool:
    if lat is None or lon is None:
        return False
    if abs(lat) < 0.5 and abs(lon) < 0.5:
        return False
    if not (25.0 <= lat <= 37.0 and -107.0 <= lon <= -93.0):
        return False
    return True


def parse_dates_from_text(text: str, today: date, posted: date | None = None) -> tuple[date | None, date | None]:
    date_text = re.sub(
        r"\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|"
        r"sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(\d{1,2})\s*/\s*(\d{1,2})\b",
        r"\1 \2-\3",
        text or "",
        flags=re.I,
    )
    # "Nov. 13th & 14th" / "Nov. 13 and 14" -> "Nov. 13-14"
    # Do not treat "Nov. 6, 9-1" (hours) as a date range.
    date_text = re.sub(
        r"\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|"
        r"sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(\d{1,2})(?:st|nd|rd|th)?"
        r"\s*(?:&|and)\s*(\d{1,2})(?:st|nd|rd|th)?\b",
        r"\1 \2-\3",
        date_text,
        flags=re.I,
    )
    start, end, _certainty = parse_explicit_dates(
        date_text,
        posted,
        (posted.year if posted else today.year),
    )
    return start, end


def iso_date(value: str | None) -> date | None:
    if not value:
        return None
    m = re.search(r"(\d{4}-\d{2}-\d{2})", value)
    if not m:
        return None
    try:
        return date.fromisoformat(m.group(1))
    except ValueError:
        return None


def sale_type_from_text(title: str, body: str = "", is_area: bool = False) -> str:
    if is_area:
        return "community"
    blob = f"{title} {body}"
    if re.search(r"\bestate\b", blob, re.I):
        return "estate"
    if re.search(r"\b(community|citywide|city-wide|neighborhood[-\s]?wide)\b", blob, re.I):
        return "community"
    return "garage"


def build_sale(
    *,
    title: str,
    address: str,
    start: date,
    end: date,
    url: str,
    source: str,
    external_id: str,
    hours: str | None = None,
    details: str = "",
    sale_type: str = "garage",
    lat: float | None = None,
    lon: float | None = None,
    geocode: str = "",
    is_area: bool = False,
    confidence: float | None = None,
) -> dict:
    if is_area and sale_type == "garage":
        sale_type = "community"
    if confidence is None:
        confidence = 0.86 if (geocode == "census" and not is_area) else (0.72 if address else 0.6)
    cats = ["community-sale"] if sale_type == "community" or is_area else (
        ["estate-sale"] if sale_type == "estate" else ["garage-sale"]
    )
    return {
        "address": address,
        "dates": f"{start.isoformat()} – {end.isoformat()}",
        "date_from": start.isoformat(),
        "date_to": end.isoformat(),
        "date_start": start.isoformat(),
        "date_end": end.isoformat(),
        "end_date": end.isoformat(),
        "hours": hours,
        "title": (title or "Garage sale")[:160],
        "details": (details or "")[:800],
        "source": source,
        "url": url,
        "photos": 0,
        "type": sale_type,
        "categories": cats,
        "confidence": confidence,
        "status": "verified",
        "lat": lat,
        "lon": lon,
        "geocode": geocode or ("area" if is_area else ""),
        "in_person": True,
        "external_id": external_id,
    }


def load_overlay_sales(slug: str) -> list[dict]:
    """public[] from the city file plus user and email overlays."""
    sales: list[dict] = []
    data = safe_load_city(slug)
    sales.extend(data.get("public") or [])
    cities = ROOT / "data" / "cities"
    for suffix in ("-user", "-email"):
        path = cities / f"{slug}{suffix}.json"
        if not path.exists():
            continue
        try:
            extra = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        sales.extend(extra.get("public") or [])
    return sales


def is_family_source(sale: dict) -> bool:
    src = (sale.get("source") or "").strip().lower()
    if src in FAMILY_SOURCES:
        return True
    eid = (sale.get("external_id") or "").lower()
    return eid.startswith(FAMILY_ID_PREFIXES)


def dates_overlap(a: dict, b: dict) -> bool:
    def bounds(s: dict) -> tuple[date | None, date | None]:
        start = iso_date(s.get("date_start") or s.get("date_from"))
        end = iso_date(s.get("date_end") or s.get("date_to") or s.get("end_date")) or start
        return start, end

    a0, a1 = bounds(a)
    b0, b1 = bounds(b)
    if not (a0 and a1 and b0 and b1):
        return True
    return not (a1 < b0 or b1 < a0)


def family_duplicate(sale: dict, existing: list[dict]) -> dict | None:
    key = address_key(sale.get("address") or "")
    if not key or len(key) < 6:
        return None
    for other in existing:
        if not is_family_source(other):
            continue
        okey = address_key(other.get("address") or "")
        if okey and okey == key:
            return other
    return None


def address_duplicate(sale: dict, existing: list[dict]) -> dict | None:
    key = address_key(sale.get("address") or "")
    if not key or len(key) < 6:
        return None
    # Ignore very generic city-only keys
    if key in {"sanantonio", "sanantoniotexas"}:
        return None
    for other in existing:
        okey = address_key(other.get("address") or "")
        if okey and okey == key:
            return other
    return None


def merge_sales(
    slug: str,
    sales: list[dict],
    today: date,
    source_tag: str,
    *,
    skip_family: bool = False,
    skip_address_overlays: bool = True,
) -> tuple[int, int, list[tuple[dict, str]]]:
    """Merge into city public[]. Returns (added, live, skipped)."""
    data = safe_load_city(slug)
    overlays = load_overlay_sales(slug)
    skipped: list[tuple[dict, str]] = []

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
            if s.get("end_date") and date.fromisoformat(str(s["end_date"])[:10]) < today:
                skipped.append((s, f"ended {s['end_date']}"))
                continue
        except ValueError:
            pass

        if skip_family:
            hit = family_duplicate(s, overlays)
            if hit is not None:
                skipped.append((s, f"family duplicate of {hit.get('source')} {hit.get('external_id') or hit.get('address')}"))
                continue

        if skip_address_overlays:
            # Overlays include city public, so this also covers same-address updates from other sources.
            # Still allow updating our own external_id in city public.
            own = s.get("external_id") and by_key.get(f"id:{s['external_id']}")
            if not own:
                hit = address_duplicate(s, overlays)
                if hit is not None:
                    skipped.append((s, f"duplicate of {hit.get('source')} {hit.get('external_id') or hit.get('address')}"))
                    continue

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
                "type", "external_id", "in_person",
            ):
                if s.get(f) is not None:
                    existing[f] = s[f]
            existing["status"] = "verified"
            existing["confidence"] = max(float(existing.get("confidence") or 0), float(s.get("confidence") or 0))
            existing["categories"] = list(set((existing.get("categories") or []) + (s.get("categories") or [])))
        else:
            k = keys[0] if keys and keys[0] else normalize_key(s.get("title") or "x")
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
    data["sources"] = sorted(set(data.get("sources") or []) | {source_tag})
    data["city"] = slug
    safe_write_city(slug, data)
    return added, len(unique), skipped
