#!/usr/bin/env python3
"""Free Craigslist garage/moving/estate discovery for YardBird / GSIN.

Uses no-JS static search results (cl-static-search-result) then enriches a
bounded set of detail pages for street address + lat/lon. No API key.

Usage:
  python3 webapp/scripts/fetch_craigslist.py --city san-antonio
  python3 webapp/scripts/fetch_craigslist.py --cities san-antonio --dry-run
"""
from __future__ import annotations

import argparse
import html as html_mod
import json
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

CT = ZoneInfo("America/Chicago")
UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)
ROOT = Path(__file__).resolve().parents[1]
CITY_DIR = ROOT / "data" / "cities"
MAX_DETAIL = 18  # polite cap per city per run

CITY_CFG = {
    "san-antonio": {
        "name": "San Antonio",
        "search": "https://sanantonio.craigslist.org/search/gms",
        "state": "TX",
        "center": (29.4241, -98.4936),
    },
    "austin": {
        "name": "Austin",
        "search": "https://austin.craigslist.org/search/gms",
        "state": "TX",
        "center": (30.2672, -97.7431),
    },
    "houston": {
        "name": "Houston",
        "search": "https://houston.craigslist.org/search/gms",
        "state": "TX",
        "center": (29.7604, -95.3698),
    },
}


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
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status, resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace") if e.fp else ""
        return e.code, body
    except Exception as e:
        return 0, str(e)


def normalize_key(a: str) -> str:
    return re.sub(r"[^a-z0-9]", "", (a or "").lower())[:48]


def parse_search(html: str) -> list[dict]:
    out: list[dict] = []
    for m in re.finditer(
        r'<li class="cl-static-search-result"[^>]*title="([^"]*)"[^>]*>\s*<a href="([^"]+)">',
        html,
    ):
        title = html_mod.unescape(m.group(1)).strip()
        url = m.group(2).strip()
        if not title or not url:
            continue
        # Skip pure retail/flea noise when obvious
        if re.search(r"flea mkt|flea market|indoor flea|charm bracelet|pottery$", title, re.I):
            if not re.search(r"garage|yard|estate|moving", title, re.I):
                continue
        out.append({"title": title[:160], "url": url})
    return out


def enrich_detail(url: str, cfg: dict) -> dict | None:
    code, html = fetch(url)
    if code != 200 or "blocked" in html[:400].lower():
        return None

    title_m = re.search(r"id=\"titletextonly\"[^>]*>([^<]+)", html)
    if not title_m:
        title_m = re.search(r"<title>([^<]+)", html, re.I)
    title = html_mod.unescape(title_m.group(1)).strip() if title_m else "Garage sale"
    title = re.sub(r"\s+-\s+garage.*$", "", title, flags=re.I).strip()[:160]

    street = None
    m = re.search(r'class="mapaddress"[^>]*>([^<]+)', html)
    if m:
        street = html_mod.unescape(m.group(1)).strip()
        street = re.sub(r"\s+", " ", street)

    lat = lon = None
    m = re.search(r'data-latitude="([^"]+)"', html)
    if m:
        try:
            lat = float(m.group(1))
        except ValueError:
            pass
    m = re.search(r'data-longitude="([^"]+)"', html)
    if m:
        try:
            lon = float(m.group(1))
        except ValueError:
            pass

    body = ""
    bm = re.search(r'id="postingbody"[^>]*>(.*?)</section>', html, re.S)
    if bm:
        body = re.sub(r"<[^>]+>", " ", bm.group(1))
        body = re.sub(r"\s+", " ", body).strip()[:400]

    # Date hints in body/title — default this weekend window
    today = today_ct()
    start = today
    end = today + timedelta(days=2)
    text = f"{title} {body}"
    # Explicit month day patterns
    months = {
        "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
        "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
    }
    found_days: list[date] = []
    for mon, day in re.findall(
        r"\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*(\d{1,2})\b",
        text,
        re.I,
    ):
        try:
            d = date(today.year, months[mon[:3].lower()], int(day))
            # if far in past relative to today, assume next year not needed for weekend sales
            found_days.append(d)
        except ValueError:
            pass
    if found_days:
        start = min(found_days)
        end = max(found_days)

    if not street:
        # neighborhood-only pins are weak — skip or city-center with low confidence
        address = f"{cfg['name']}, {cfg['state']}"
        geocode = "city-center"
        lat, lon = cfg["center"]
        confidence = 0.45
    else:
        address = f"{street}, {cfg['name']}, {cfg['state']}"
        geocode = "source" if lat is not None else "address-only"
        if lat is None:
            lat, lon = cfg["center"]
            geocode = "city-center"
        confidence = 0.82 if geocode == "source" else 0.60

    is_estate = bool(re.search(r"estate|heirloom|liquidat", text, re.I))
    is_moving = bool(re.search(r"moving", text, re.I))
    sale_type = "estate" if is_estate else "garage"
    cats = ["garage-sale"]
    if is_estate:
        cats = ["estate-sale"]
    if is_moving:
        cats.append("moving-sale")

    return {
        "address": address,
        "dates": f"{start.isoformat()} – {end.isoformat()}",
        "date_from": start.isoformat(),
        "date_to": end.isoformat(),
        "end_date": end.isoformat(),
        "hours": None,
        "title": title,
        "details": body,
        "source": "Craigslist",
        "url": url,
        "photos": 0,
        "type": sale_type,
        "categories": cats,
        "confidence": confidence,
        "status": "verified",
        "lat": lat,
        "lon": lon,
        "geocode": geocode,
        "in_person": True,
        "external_id": f"cl-{normalize_key(url[-40:])}",
    }


def merge(slug: str, sales: list[dict], today: date) -> tuple[int, int]:
    path = CITY_DIR / f"{slug}.json"
    if path.exists():
        data = json.loads(path.read_text(encoding="utf-8"))
    else:
        data = {
            "edition": f"{CITY_CFG[slug]['name']} Yard-Bird Discovery",
            "city": slug,
            "public": [],
            "permits": [],
            "sources": [],
        }

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
        # Skip very weak city-center-only pins without street
        if s.get("geocode") == "city-center" and "," not in (s.get("address") or ""):
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
                "dates", "date_from", "date_to", "end_date", "title", "url",
                "source", "details", "lat", "lon", "geocode", "type", "external_id",
            ):
                if s.get(f) is not None:
                    existing[f] = s[f]
            existing["status"] = "verified"
            existing["confidence"] = max(
                float(existing.get("confidence") or 0), float(s.get("confidence") or 0)
            )
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
            if s.get("end_date") and date.fromisoformat(s["end_date"]) < today:
                continue
        except ValueError:
            pass
        unique.append(s)

    data["public"] = unique
    data["total_locations"] = len(unique) + len(data.get("permits") or [])
    data["date"] = today.isoformat()
    data["last_refresh"] = datetime.now(CT).isoformat(timespec="seconds")
    data["status"] = "live"
    data["sources"] = sorted(set(data.get("sources") or []) | {"craigslist.org"})
    data["city"] = slug
    CITY_DIR.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return added, len(unique)


def discover(slug: str) -> list[dict]:
    cfg = CITY_CFG[slug]
    url = cfg["search"]
    print(f"[{slug}] Craigslist {url}")
    code, html = fetch(url)
    print(f"  search → HTTP {code} ({len(html)} bytes)")
    if code != 200:
        print(f"  WARN: non-200; skipping ({code})", file=sys.stderr)
        return []
    if "blocked" in html[:500].lower():
        print("  WARN: blocked by Craigslist", file=sys.stderr)
        return []

    listings = parse_search(html)
    print(f"  static results={len(listings)}")
    # Prefer estate/moving titles first, then others
    listings.sort(
        key=lambda x: (
            0 if re.search(r"estate|moving|liquidat", x["title"], re.I) else 1,
            x["title"],
        )
    )

    out: list[dict] = []
    for i, item in enumerate(listings[:MAX_DETAIL]):
        time.sleep(0.7)
        enriched = enrich_detail(item["url"], cfg)
        if not enriched:
            # fallback thin record from search only
            continue
        if not enriched.get("title"):
            enriched["title"] = item["title"]
        out.append(enriched)
        print(f"  + {enriched.get('title','?')[:50]} | {enriched.get('address','?')[:40]}")
    print(f"  enriched={len(out)}")
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--city", default="san-antonio")
    ap.add_argument("--cities", default="")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    cities = [c.strip() for c in (args.cities or args.city).split(",") if c.strip()]
    today = today_ct()
    print(f"fetch_craigslist {today.isoformat()} cities={cities}")
    for slug in cities:
        if slug not in CITY_CFG:
            print(f"unknown {slug}", file=sys.stderr)
            continue
        sales = discover(slug)
        if args.dry_run:
            print(json.dumps(sales[:5], indent=2)[:1500])
            continue
        added, live = merge(slug, sales, today)
        print(f"  merge added={added} public_live={live}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
