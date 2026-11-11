# Estate sale data sources — YardBird / GSIN

Last updated: 2026-11-11

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
| **SA Express-News Marketplace** | `webapp/scripts/fetch_express_news.py` | **Free** | Medium | Public Estate & Garage Sales classifieds; detail pages for full ad text |
| **Wilson County News** | `webapp/scripts/fetch_wilson_county.py` | **Free** | Medium | GeoDirectory garage classifieds east of SA |
| **yardsales.net** | `webapp/scripts/fetch_yardsales_net.py` | **Free** | Low–medium | SA city page; 403 from Actions fails soft; hard-deduped vs YSS/GSF/gsalr |
| **A Better Estate Sale** | `webapp/scripts/fetch_abetterestatesale.py` | **Free** | Medium | Calendar; street address posts 9 a.m. CT the day before (area pin until then) |
| **Herald-Zeitung / Seguin Gazette** | `webapp/scripts/fetch_blox_classifieds.py` | **Free** | Low | BLOX classifieds, no query strings, 429 backoff |
| **AllEvents / Eventbrite** | `webapp/scripts/fetch_event_listings.py` | **Free** | Medium | Strict sale-title filter, SA-area locations only |
| EstateSales.net lightweight | `webapp/scripts/fetch_estatesales.py` | Free | Low–medium | SPA-heavy; often thin |

## Not used (blocked from CI)

| Site | Why skipped |
|------|-------------|
| **EstateSale.com** | Imperva/bot interstitial — returns empty shell to datacenter IPs |
| **Apify / EstateSales.net paid actor** | Removed. Cost, ToS risk, unused actor, free org source already covers estate pins |
| gsalr.com | Often 403 from Actions runners (Treasure Listings family) — still attempted with fallback |

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


## SA Express-News Marketplace (free local classifieds)

```bash
python3 webapp/scripts/fetch_express_news.py --city san-antonio
python3 webapp/scripts/fetch_express_news.py --city san-antonio --dry-run
```

Fetches `https://hearst-mp.ipublishmarketplace.com/marketplace/sanantonio/category/estate-garage-sales`, follows each ad’s detail page, and merges into `public[]` with `external_id: exn-<refcode>` (for example `exn-ipcsae00229431`). Citywide and named community sales (Leon Valley, Shavano Ridge) are kept as area pins. Online-only auctions and ended ads are skipped.


## Wilson County News (free local classifieds)

```bash
python3 webapp/scripts/fetch_wilson_county.py --city san-antonio
python3 webapp/scripts/fetch_wilson_county.py --city san-antonio --dry-run
```

Fetches `https://www.wilsoncountynews.com/classifieds/category/garage-sale/` (robots allow `/classifieds/`). Merges with `external_id: wcn-<post_id>`. Craft/vendor shows are skipped.

## yardsales.net (free; Treasure Listings family)

```bash
python3 webapp/scripts/fetch_yardsales_net.py --city san-antonio
```

Fetches `https://yardsales.net/san-antonio-tx/` (the old `.../garage-sales-san-antonio-tx.html` path 404s). Same family as YardSaleSearch, GarageSaleFinder, and gsalr — address matches against those sources are skipped. HTTP 403 is a soft failure so master populate keeps going.

## A Better Estate Sale (free company calendar)

```bash
python3 webapp/scripts/fetch_abetterestatesale.py --city san-antonio
```

Fetches `https://www.abetterestatesale.com/upcoming-sales/`. The street address posts at 9 a.m. CT the day before the sale; until then the sale is stored as a clearly labeled area pin, not a driveway. `external_id: abes-<sale#>`.

## Herald-Zeitung & Seguin Gazette (free BLOX classifieds)

```bash
python3 webapp/scripts/fetch_blox_classifieds.py --city san-antonio
```

List URLs have no query strings (`Disallow: /classifieds/*?`). Requests are serial with backoff on HTTP 429.

## AllEvents & Eventbrite (free, strict sale filter)

```bash
python3 webapp/scripts/fetch_event_listings.py --city san-antonio
```

Title must mention a garage, yard, estate, rummage, or moving sale. Locations must be in the SA metro. City-only locations with no street are skipped. `external_id: ae-<id>` / `eb-<id>`.

## Populate workflow order (5 AM CT master)

1. GarageSaleFinder
2. SA permits (estate-tagged)
3. **EstateSales.org free**
4. **YardSaleSearch free**
5. gsalr.com
6. **Craigslist free**
7. **SA Express-News Marketplace free**
8. **Wilson County News free**
9. **yardsales.net free** (403 fails soft)
10. **A Better Estate Sale free**
11. **Herald-Zeitung / Seguin Gazette free**
12. **AllEvents / Eventbrite sale filter free**
13. EstateSales.net lightweight free
14. Purge expired
15. **Scraper health check** → writes `webapp/data/scraper-health.json`
16. Orchestrator + events + forecast
17. Commit if dirty

## Scraper health monitoring

- Script: `webapp/scripts/check_scraper_health.py`
- Primary (critical) sources: EstateSales.org, YardSaleSearch, Craigslist
- Secondary: GSF, permits, EstateSales.net lightweight, gsalr, SA Express-News Marketplace, Wilson County News, yardsales.net, A Better Estate Sale, BLOX classifieds, AllEvents/Eventbrite
