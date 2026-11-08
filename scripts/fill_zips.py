#!/usr/bin/env python3
"""Fill missing sale ZIPs from coordinates via the free U.S. Census geocoder (2020 ZCTA layer).
Writes a small cache: <root>/data/zcta-cache.json  {"lat,lon": "78209"} (5-decimal keys).
Never fails the build: network errors just leave entries missing.
Usage: python3 scripts/fill_zips.py <site-root>
"""
import json, re, sys, time, urllib.parse, urllib.request
from pathlib import Path

root = Path(sys.argv[1] if len(sys.argv) > 1 else "_site")
cache_path = root / "data" / "zcta-cache.json"
repo_cache = Path(__file__).resolve().parents[1] / "webapp" / "data" / "zcta-cache.json"
cache = {}
for p in (repo_cache, cache_path):
    try: cache.update(json.loads(p.read_text()))
    except Exception: pass
URL = "https://geocoding.geo.census.gov/geocoder/geographies/coordinates?"
def key(lat, lon): return f"{float(lat):.5f},{float(lon):.5f}"
def lookup(lat, lon):
    q = urllib.parse.urlencode({"x": lon, "y": lat, "benchmark": "Public_AR_Current", "vintage": "Current_Current",
                                "layers": "2020 Census ZIP Code Tabulation Areas", "format": "json"})
    with urllib.request.urlopen(URL + q, timeout=15) as r:
        g = json.load(r)["result"]["geographies"].get("2020 Census ZIP Code Tabulation Areas") or []
    return g[0]["ZCTA5"] if g else None
try:
    feed = json.loads((root / "data" / "sales-clean.json").read_text())
except Exception:
    sys.exit(0)
added = 0
for s in feed.get("public", []):
    if s.get("zip") or re.search(r"\b7\d{4}\b", str(s.get("address", ""))): continue
    try: k = key(s["lat"], s["lon"])
    except Exception: continue
    if k in cache: continue
    try:
        z = lookup(s["lat"], s["lon"])
        if z: cache[k] = z; added += 1
        time.sleep(0.3)
    except Exception as e:
        print("zip lookup failed", k, e)
cache_path.parent.mkdir(parents=True, exist_ok=True)
cache_path.write_text(json.dumps(cache, indent=0, sort_keys=True) + "\n")
print(f"zcta: {added} new, {len(cache)} cached")
