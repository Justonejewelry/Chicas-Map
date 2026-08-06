#!/usr/bin/env python3
"""Free EstateSales.org discovery for YardBird / GSIN.

Parses server-rendered HTML that embeds full sale JSON (id, address, lat/lon,
dates, company, in-person vs online). No API key. No paid services.

Uses city_io middleware so PLACEHOLDER / corrupt JSON never crashes the job.

Usage:
  python3 webapp/scripts/fetch_estatesales_org.py --city san-antonio
  python3 webapp/scripts/fetch_estatesales_org.py --cities san-antonio,austin --dry-run
"""
from __future__ import annotations

import argparse
import json
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
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)

CITY_CFG = {
    "san-antonio": {
        "name": "San Antonio",
        "path": "tx/san-antonio",
        "state": "TX",
        "center": (29.4241, -98.4936),
        "allow_cities": {
            "san antonio", "boerne", "schertz", "cibolo", "converse",
            "live oak", "universal city", "helotes", "fair oaks ranch",
        },
    },
    "austin": {
        "name": "Austin",
        "path": "tx/austin",
        "state": "TX",
        "center": (30.2672, -97.7431),
        "allow_cities": {
            "austin", "round rock", "cedar park", "pflugerville",
            "georgetown", "kyle", "buda", "leander",
        },
    },
    "houston": {
        "name": "Houston",
        "path": "tx/houston",
        "state": "TX",
        "center": (29.7604, -95.3698),
        "allow_cities": {
            "houston", "pasadena", "pearland", "sugar land",
            "the woodlands", "katy", "cypress", "spring",
        },
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
            "Referer": "https://estatesales.org/",
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


def normalize_key(a: str) -> str:
    return re.sub(r"[^a-z0-9]", "", (a or "").lower())[:48]


def parse_sale_objects(html: str) -> list[dict]:
    sales: list[dict] = []
    seen_ids: set[int] = set()
    for m in re.finditer(r'\{"id":(\d{5,}),', html):
        pos = m.start()
        depth = 0
        end = None
        for j in range(pos, min(pos + 25000, len(html))):
            c = html[j]
            if c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
                if depth == 0:
                    end = j + 1
                    break
        if end is None:
            continue
        try:
            obj = json.loads(html[pos:end])
        except json.JSONDecodeError:
            continue
        sid = obj.get("id")
        if not isinstance(sid, int) or sid in seen_ids:
            continue
        if not (obj.get("title_sum") or obj.get("title")):
            continue
        if "url" not in obj and "url_abs" not in obj:
            continue
        seen_ids.add(sid)
        sales.append(obj)
    return sales


def to_iso_date(raw) -> str | None:
    if not raw:
        return None
    s = str(raw)
    m = re.search(r"(\d{4}-\d{2}-\d{2})", s)
    if m:
        return m.group(1)
    return None


def normalize_sale(raw: dict, cfg: dict) -> dict | None:
    title = (raw.get("title_sum") or raw.get("title") or "Estate sale").strip()
    city = (raw.get("city") or cfg["name"]).strip()
    state = (raw.get("state") or cfg["state"]).strip()
    zipc = str(raw.get("zip") or "").strip()
    street = (raw.get("address") or "").strip()

    allow = cfg.get("allow_cities") or {cfg["name"].lower()}
    if city.lower() not in allow and cfg["name"].lower() not in city.lower():
        url_path = str(raw.get("url") or "")
        if cfg["path"] not in url_path.lower():
            return None

    if street:
        address = f"{street}, {city}, {state} {zipc}".strip()
    else:
        address = f"{city}, {state} {zipc}".strip()

    start = (
        to_iso_date(raw.get("inperson_date_from"))
        or to_iso_date(raw.get("date_from_with_utc_offset"))
        or today_ct().isoformat()
    )
    end = (
        to_iso_date(raw.get("inperson_date_to"))
        or to_iso_date(raw.get("date_to_with_utc_offset"))
        or start
    )

    inperson = bool(raw.get("inperson") or raw.get("traditional"))
    type_name = (raw.get("type_name") or "").lower()
    if "in-person" in type_name or "in person" in type_name:
        inperson = True

    try:
        lat = float(raw["lat"]) if raw.get("lat") not in (None, "") else None
        lon = float(raw["lon"]) if raw.get("lon") not in (None, "") else None
    except (TypeError, ValueError):
        lat = lon = None

    geocode = "source"
    if lat is None or lon is None:
        lat, lon = cfg["center"]
        geocode = "city-center"

    url = raw.get("url_abs") or raw.get("url") or ""
    if url and not str(url).startswith("http"):
        url = "https://estatesales.org" + str(url)

    company = (raw.get("company_name") or "").strip()
    details = re.sub(r"<[^>]+>", " ", str(raw.get("descr_sum") or raw.get("descr") or ""))
    details = re.sub(r"\s+", " ", details).strip()[:400]
    if company:
        details = f"{company}. {details}".strip()

    if inperson:
        confidence = 0.90 if geocode == "source" and street else 0.78
        sale_type = "estate"
    else:
        confidence = 0.55 if geocode == "source" else 0.40
        sale_type = "estate"

    hours = ""
    dts = raw.get("dateTimes") or []
    if isinstance(dts, list) and dts:
        parts = []
        for d in dts[:4]:
            if not isinstance(d, dict):
                continue
            day = d.get("date") or ""
            st = d.get("start_time") or ""
            et = d.get("end_time") or ""
            if day:
                parts.append(f"{day} {st}-{et}".strip())
        hours = "; ".join(parts)

    return {
        "address": address,
        "dates": f"{start} – {end}",
        "date_from": start,
        "date_to": end,
        "end_date": end,
        "hours": hours or None,
        "title": title[:160],
        "details": details,
        "source": "EstateSales.org",
        "url": url,
        "photos": 0,
        "type": sale_type,
        "categories": ["estate-sale"] + (["in-person"] if inperson else ["online-auction"]),
        "confidence": confidence,
        "status": "verified",
        "lat": lat,
        "lon": lon,
        "geocode": geocode,
        "company": company or None,
        "in_person": inperson,
        "external_id": f"eso-{raw.get('id')}",
    }


def merge(slug: str, sales: list[dict], today: date) -> tuple[int, int]:
    # Middleware: never crashes on PLACEHOLDER / corrupt JSON
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
                "dates", "date_from", "date_to", "end_date", "hours", "title",
                "url", "source", "details", "company", "in_person", "external_id",
                "lat", "lon", "geocode",
            ):
                if s.get(f) is not None:
                    existing[f] = s[f]
            existing["type"] = "estate"
            existing["categories"] = list(
                set((existing.get("categories") or []) + (s.get("categories") or ["estate-sale"]))
            )
            existing["status"] = "verified"
            existing["confidence"] = max(
                float(existing.get("confidence") or 0), float(s.get("confidence") or 0)
            )
        else:
            k = keys[0] if keys[0] else normalize_key(s.get("title") or "x")
            by_key[k] = s
            added += 1

    unique: list[dict] = []
    seen_obj: set[int] = set()
    for s in by_key.values():
        oid = id(s)
        if oid in seen_obj:
            continue
        seen_obj.add(oid)
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
    data["sources"] = sorted(set(data.get("sources") or []) | {"estatesales.org"})
    data["city"] = slug
    safe_write_city(slug, data)
    return added, len(unique)


def discover(slug: str) -> list[dict]:
    cfg = CITY_CFG[slug]
    url = f"https://estatesales.org/estate-sales/{cfg['path']}"
    print(f"[{slug}] EstateSales.org {url}")
    code, html = fetch(url)
    print(f"  page → HTTP {code} ({len(html)} bytes)")
    if code != 200:
        print(f"  WARN: non-200; skipping ({code})", file=sys.stderr)
        return []

    raw = parse_sale_objects(html)
    print(f"  embedded objects={len(raw)}")
    out: list[dict] = []
    seen: set[str] = set()
    for r in raw:
        s = normalize_sale(r, cfg)
        if not s:
            continue
        k = s.get("external_id") or normalize_key(s["address"])
        if k in seen:
            continue
        seen.add(k)
        out.append(s)
    in_person = sum(1 for s in out if s.get("in_person"))
    print(f"  normalized={len(out)} in_person={in_person}")
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--city", default="san-antonio")
    ap.add_argument("--cities", default="")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    cities = [c.strip() for c in (args.cities or args.city).split(",") if c.strip()]
    today = today_ct()
    print(f"fetch_estatesales_org {today.isoformat()} cities={cities}")
    for slug in cities:
        if slug not in CITY_CFG:
            print(f"unknown {slug}", file=sys.stderr)
            continue
        sales = discover(slug)
        time.sleep(0.8)
        if args.dry_run:
            print(json.dumps(sales[:5], indent=2)[:1200])
            continue
        added, live = merge(slug, sales, today)
        print(f"  merge added={added} public_live={live}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
