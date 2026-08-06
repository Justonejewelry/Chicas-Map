#!/usr/bin/env python3
"""Discover live garage/yard/estate sales via HTTP fetch + parse.

Primary source: GarageSaleFinder city pages (structured sale-address / sale-date).
Writes/merges into webapp/data/cities/<slug>.json

Uses city_io middleware so PLACEHOLDER / corrupt JSON never crashes the job.

Usage (repo root):
  python3 webapp/scripts/discover_sales.py
  python3 webapp/scripts/discover_sales.py --cities san-antonio,austin
"""
from __future__ import annotations

import argparse
import html as html_mod
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import date, datetime
from zoneinfo import ZoneInfo

from city_io import safe_load_city, safe_write_city

CT = ZoneInfo("America/Chicago")
UA = (
    "Mozilla/5.0 (compatible; YardBirdBot/1.0; "
    "+https://github.com/Justonejewelry/Project-YardBird)"
)

# Approximate ZIP centroids (enough for map pins without external geocode API)
ZIP_COORDS: dict[str, tuple[float, float]] = {
    # San Antonio core
    "78201": (29.47, -98.53),
    "78202": (29.43, -98.46),
    "78204": (29.41, -98.50),
    "78205": (29.42, -98.49),
    "78207": (29.43, -98.52),
    "78209": (29.49, -98.46),
    "78210": (29.39, -98.48),
    "78211": (29.35, -98.54),
    "78212": (29.46, -98.50),
    "78213": (29.52, -98.52),
    "78214": (29.35, -98.49),
    "78216": (29.53, -98.50),
    "78217": (29.54, -98.42),
    "78218": (29.50, -98.39),
    "78219": (29.45, -98.38),
    "78220": (29.42, -98.40),
    "78221": (29.35, -98.48),
    "78222": (29.39, -98.39),
    "78223": (29.36, -98.42),
    "78224": (29.32, -98.52),
    "78225": (29.38, -98.55),
    "78227": (29.40, -98.64),
    "78228": (29.46, -98.58),
    "78229": (29.51, -98.58),
    "78230": (29.55, -98.58),
    "78231": (29.58, -98.54),
    "78232": (29.59, -98.47),
    "78233": (29.56, -98.39),
    "78237": (29.42, -98.57),
    "78238": (29.47, -98.63),
    "78239": (29.52, -98.36),
    "78240": (29.53, -98.59),
    "78244": (29.47, -98.34),
    "78245": (29.42, -98.70),
    "78247": (29.58, -98.42),
    "78248": (29.59, -98.53),
    "78249": (29.57, -98.62),
    "78250": (29.51, -98.67),
    "78251": (29.46, -98.68),
    "78253": (29.47, -98.78),
    "78254": (29.54, -98.71),
    "78255": (29.62, -98.67),
    "78256": (29.64, -98.63),
    "78257": (29.62, -98.60),
    "78258": (29.64, -98.50),
    "78259": (29.63, -98.44),
    "78260": (29.70, -98.48),
    "78261": (29.68, -98.40),
    "78263": (29.35, -98.32),
    "78264": (29.20, -98.55),
    # Boerne / Fair Oaks
    "78006": (29.79, -98.73),
    "78015": (29.74, -98.65),
    # Marion
    "78124": (29.57, -98.15),
    # Austin metro
    "78610": (30.08, -97.84),  # Buda
    "78613": (30.51, -97.82),
    "78617": (30.14, -97.62),
    "78641": (30.56, -97.86),
    "78644": (29.88, -97.67),  # Lockhart
    "78645": (30.47, -97.98),
    "78653": (30.30, -97.52),
    "78660": (30.44, -97.62),
    "78664": (30.51, -97.67),
    "78665": (30.53, -97.64),
    "78681": (30.53, -97.72),
    "78701": (30.27, -97.74),
    "78702": (30.26, -97.72),
    "78703": (30.29, -97.77),
    "78704": (30.24, -97.77),
    "78705": (30.29, -97.74),
    "78717": (30.49, -97.75),
    "78721": (30.27, -97.69),
    "78722": (30.29, -97.72),
    "78723": (30.30, -97.69),
    "78724": (30.29, -97.62),
    "78725": (30.23, -97.59),
    "78726": (30.43, -97.84),
    "78727": (30.43, -97.72),
    "78728": (30.44, -97.68),
    "78729": (30.45, -97.77),
    "78730": (30.36, -97.83),
    "78731": (30.35, -97.77),
    "78732": (30.38, -97.89),
    "78733": (30.32, -97.88),
    "78734": (30.38, -97.95),
    "78735": (30.25, -97.84),
    "78736": (30.24, -97.89),
    "78737": (30.20, -97.95),
    "78738": (30.32, -97.98),
    "78739": (30.18, -97.87),
    "78741": (30.23, -97.72),
    "78744": (30.19, -97.73),
    "78745": (30.20, -97.80),
    "78746": (30.27, -97.80),
    "78747": (30.13, -97.75),
    "78748": (30.17, -97.82),
    "78749": (30.21, -97.86),
    "78750": (30.44, -97.80),
    "78751": (30.31, -97.72),
    "78752": (30.33, -97.70),
    "78753": (30.38, -97.67),
    "78754": (30.35, -97.65),
    "78756": (30.32, -97.74),
    "78757": (30.35, -97.73),
    "78758": (30.38, -97.71),
    "78759": (30.40, -97.75),
}

CITY_SOURCES = {
    "san-antonio": {
        "name": "San Antonio",
        "urls": [
            "https://garagesalefinder.com/yard-sales/san-antonio-tx/",
        ],
        "default_center": (29.4241, -98.4936),
    },
    "austin": {
        "name": "Austin",
        "urls": [
            "https://garagesalefinder.com/yard-sales/austin-tx/",
        ],
        "default_center": (30.2672, -97.7431),
    },
    "houston": {
        "name": "Houston",
        "urls": [
            "https://garagesalefinder.com/yard-sales/houston-tx/",
        ],
        "default_center": (29.7604, -95.3698),
    },
}


def today_ct() -> date:
    return datetime.now(CT).date()


def fetch(url: str, timeout: int = 25) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read().decode("utf-8", errors="replace")


def parse_gsf(html: str, source_label: str) -> list[dict]:
    """Parse GarageSaleFinder list page into normalized sale dicts."""
    addrs = re.findall(r'class="sale-click">([^<]+)</span>', html)
    date_pairs = re.findall(
        r'data-date-from="([^"]+)"[^>]*data-date-to="([^"]+)"', html
    )
    # titles may be slightly more numerous; zip to min length
    titles = re.findall(r'class="sale-url"[^>]*href="([^"]+)"[^>]*>([^<]+)</a>', html)
    n = min(len(addrs), len(date_pairs), len(titles))
    out: list[dict] = []
    for i in range(n):
        address = html_mod.unescape(addrs[i]).strip()
        d_from, d_to = date_pairs[i]
        href, title = titles[i]
        title = html_mod.unescape(title).strip()
        title = re.sub(r"\s+", " ", title)
        try:
            end = datetime.strptime(d_to, "%m/%d/%Y").date()
            start = datetime.strptime(d_from, "%m/%d/%Y").date()
        except ValueError:
            continue
        sale_type = "estate" if re.search(r"estate|auction|bidding", title, re.I) else "garage"
        out.append(
            {
                "address": address,
                "dates": f"{start.strftime('%a %b %-d')} – {end.strftime('%a %b %-d')}".replace(
                    " 0", " "
                ),
                "date_from": d_from,
                "date_to": d_to,
                "end_date": end.isoformat(),
                "title": title[:160],
                "details": "",
                "source": source_label,
                "url": href if href.startswith("http") else f"https://garagesalefinder.com{href}",
                "photos": 0,
                "type": sale_type,
                "confidence": 0.85 if "," in address and re.search(r"\d", address) else 0.72,
                "status": "verified",
            }
        )
    return out


def zip_from_address(address: str) -> str | None:
    m = re.search(r"\b(7[78]\d{3})\b", address)
    return m.group(1) if m else None


def attach_coords(sale: dict, default: tuple[float, float]) -> None:
    if sale.get("lat") and sale.get("lon"):
        return
    z = zip_from_address(sale.get("address") or "")
    if z and z in ZIP_COORDS:
        sale["lat"], sale["lon"] = ZIP_COORDS[z]
        sale["geocode"] = "zip-centroid"
    else:
        sale["lat"], sale["lon"] = default
        sale["geocode"] = "city-center"
        sale["confidence"] = min(float(sale.get("confidence") or 0.7), 0.65)


def normalize_key(address: str) -> str:
    a = address.lower()
    a = re.sub(r"[^a-z0-9]", "", a)
    return a[:48]


def merge_city(slug: str, discovered: list[dict], today: date) -> tuple[int, int]:
    cfg = CITY_SOURCES[slug]
    # Middleware: never crashes on PLACEHOLDER / corrupt JSON
    data = safe_load_city(slug)

    # Filter active by end_date
    active = []
    for s in discovered:
        try:
            end = date.fromisoformat(s["end_date"])
        except Exception:
            end = today
        if end < today:
            continue
        attach_coords(s, cfg["default_center"])
        active.append(s)

    existing = data.get("public") or []
    by_key: dict[str, dict] = {}
    for s in existing:
        by_key[normalize_key(s.get("address") or s.get("title") or "")] = s

    added = 0
    for s in active:
        k = normalize_key(s.get("address") or s.get("title") or "")
        if not k:
            continue
        if k in by_key:
            # refresh dates / title from fresh scrape; keep higher confidence coords if present
            old = by_key[k]
            for field in ("dates", "date_from", "date_to", "end_date", "title", "url", "source"):
                if s.get(field):
                    old[field] = s[field]
            if old.get("geocode") == "city-center" and s.get("geocode") == "zip-centroid":
                old["lat"], old["lon"] = s["lat"], s["lon"]
                old["geocode"] = s["geocode"]
            old["status"] = "verified"
            old["confidence"] = max(float(old.get("confidence") or 0), float(s.get("confidence") or 0))
        else:
            by_key[k] = s
            added += 1

    public = list(by_key.values())
    # Drop expired existing
    kept = []
    for s in public:
        end_s = s.get("end_date") or ""
        if end_s:
            try:
                if date.fromisoformat(end_s) < today:
                    continue
            except ValueError:
                pass
        kept.append(s)

    data["public"] = kept
    data["total_locations"] = len(kept) + len(data.get("permits") or [])
    data["date"] = today.isoformat()
    data["last_refresh"] = datetime.now(CT).isoformat(timespec="seconds")
    data["status"] = "live"
    srcs = set(data.get("sources") or [])
    srcs.add("garagesalefinder.com")
    data["sources"] = sorted(srcs)
    data["city"] = slug

    safe_write_city(slug, data)
    return added, len(kept)


def discover_city(slug: str) -> list[dict]:
    cfg = CITY_SOURCES[slug]
    all_sales: list[dict] = []
    for url in cfg["urls"]:
        try:
            html = fetch(url)
            sales = parse_gsf(html, "GarageSaleFinder")
            print(f"  {url} → {len(sales)} parsed")
            all_sales.extend(sales)
            time.sleep(1.2)  # polite
        except urllib.error.HTTPError as e:
            print(f"  HTTP {e.code} {url}", file=sys.stderr)
        except Exception as e:
            print(f"  fail {url}: {type(e).__name__}: {e}", file=sys.stderr)
    return all_sales


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--cities",
        default="san-antonio,austin",
        help="Comma-separated city slugs",
    )
    args = ap.parse_args()
    cities = [c.strip() for c in args.cities.split(",") if c.strip()]
    today = today_ct()
    print(f"discover {today.isoformat()} cities={cities}")

    for slug in cities:
        if slug not in CITY_SOURCES:
            print(f"unknown city {slug}, skip", file=sys.stderr)
            continue
        print(f"[{slug}]")
        found = discover_city(slug)
        added, live = merge_city(slug, found, today)
        print(f"  merge added={added} live={live}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
