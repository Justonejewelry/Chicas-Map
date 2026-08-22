# Estate sale data sources — YardBird / GSIN

Last updated: 2026-08-22

## Policy

**Default stack is free-only.** No paid external scrapers.
Apify was removed 2026-08-22. Do not add `APIFY_TOKEN` or `fetch_estatesales_apify.py`.

## Summary

| Path | Script | Cost | Reliability | Notes |
|------|--------|------|-------------|-------|
| City of SA permits | `webapp/scripts/fetch_permits.py` | Free | High for location/date | Estate vs garage tagged by project-name heuristics |
| GarageSaleFinder | `webapp/scripts/discover_sales.py` | Free | Medium | Garage/yard + some estate |
| **EstateSales.org** | `webapp/scripts/fetch_estatesales_org.py` | **Free** | **High** | Embedded sale JSON (address, lat/lon, hours) |
| **YardSaleSearch** | `webapp/scripts/fetch_yardsalesearch.py` | **Free** | **High** | schema.org Place + PostalAddress + lat/lon |
| **Craigslist** | `webapp/scripts/fetch_craigslist.py` | **Free** | Medium | Static search results + detail enrichment |
| EstateSales.net lightweight | `webapp/scripts/fetch_estatesales.py` | Free | Low–medium | SPA-heavy; often thin |

## Not used (blocked from CI)

| Site | Why skipped |
|------|-------------|
| **EstateSale.com** | Imperva/bot interstitial — returns empty shell to datacenter IPs |
| **Apify / EstateSales.net paid actor** | Removed. Cost, ToS risk, unused actor, free org source already covers estate pins |
| gsalr.com / yardsales.net | Often 403 from Actions runners (same Treasure Listings family as GSF/YSS) — gsalr still attempted with fallback |

## EstateSales.org (primary free estate layer)

```bash
python3 webapp/scripts/fetch_estatesales_org.py --city san-antonio
python3 webapp/scripts/fetch_estatesales_org.py --cities san-antonio,austin --dry-run
```

Fetches `https://estatesales.org/estate-sales/tx/<city>`, parses embedded JSON, merges into `public[]` with `external_id: eso-<id>`.

## YardSaleSearch (free multi-sale layer)

```bash
python3 webapp/scripts/fetch_yardsalesearch.py --city san-antonio
```

Parses schema.org `Place` / `PostalAddress` / `GeoCoordinates` plus `startDate`/`endDate` metas.

## Craigslist (free local layer)

```bash
python3 webapp/scripts/fetch_craigslist.py --city san-antonio
```

Graceful if CL returns 403/blocked — workflow continues.

## San Antonio permits (estate-tagged)

- Open Data: https://data.sanantonio.gov/dataset/building-permits
- `fetch_permits.py` sets `type: "estate"` when project/contact text matches estate/liquidator language.

## Lightweight EstateSales.net

```bash
python3 webapp/scripts/fetch_estatesales.py --city san-antonio
```

Probes internal endpoints + ld+json. Often returns zero because the site is a client SPA.
Primary estate coverage is EstateSales.org, not this file.

## Populate workflow order (5 AM CT master)

1. GarageSaleFinder
2. SA permits (estate-tagged)
3. **EstateSales.org free**
4. **YardSaleSearch free**
5. gsalr.com
6. **Craigslist free**
7. EstateSales.net lightweight free
8. Purge expired
9. **Scraper health check** → writes `webapp/data/scraper-health.json`
10. Orchestrator + events + forecast
11. Commit if dirty

## Scraper health monitoring

- Script: `webapp/scripts/check_scraper_health.py`
- Primary (critical) sources: EstateSales.org, YardSaleSearch, Craigslist
- Secondary: GSF, permits, EstateSales.net lightweight, gsalr
