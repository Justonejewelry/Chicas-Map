# Estate sale data sources — YardBird / GSIN

Last updated: 2026-08-06

## Policy

**Default stack is free-only.** No paid external scrapers are required for map refresh.
Apify remains an optional upgrade if you later add `APIFY_TOKEN`; it is skipped automatically when the secret is absent.

## Summary

| Path | Script | Cost | Reliability | Notes |
|------|--------|------|-------------|-------|
| City of SA permits | `webapp/scripts/fetch_permits.py` | Free | High for location/date | Estate vs garage tagged by project-name heuristics |
| GarageSaleFinder | `webapp/scripts/discover_sales.py` | Free | Medium | Garage/yard + some estate |
| **EstateSales.org** | `webapp/scripts/fetch_estatesales_org.py` | **Free** | **High** | Embedded sale JSON (address, lat/lon, hours) |
| **YardSaleSearch** | `webapp/scripts/fetch_yardsalesearch.py` | **Free** | **High** | schema.org Place + PostalAddress + lat/lon |
| **Craigslist** | `webapp/scripts/fetch_craigslist.py` | **Free** | Medium | Static search results + detail enrichment |
| EstateSales.net lightweight | `webapp/scripts/fetch_estatesales.py` | Free | Low–medium | SPA-heavy; often thin |
| Apify EstateSales.net | `webapp/scripts/fetch_estatesales_apify.py` | Optional paid | High | Only if `APIFY_TOKEN` secret is set |

## Not used (blocked from CI)

| Site | Why skipped |
|------|-------------|
| **EstateSale.com** | Imperva/bot interstitial — returns empty shell to datacenter IPs |
| gsalr.com / yardsales.net | Often 403 from Actions runners (same Treasure Listings family as GSF/YSS) |

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

Parses schema.org `Place` / `PostalAddress` / `GeoCoordinates` plus `startDate`/`endDate` metas from city pages such as:
`https://www.yardsalesearch.com/garage-sales-san-antonio-tx.html`

Gives street-level pins with source lat/lon when present.

## Craigslist (free local layer)

```bash
python3 webapp/scripts/fetch_craigslist.py --city san-antonio
```

1. Loads `https://<area>.craigslist.org/search/gms`
2. Parses no-JS `cl-static-search-result` rows
3. Enriches up to ~18 detail pages for `mapaddress` + `data-latitude` / `data-longitude`
4. Prefers estate/moving titles; skips pure flea/retail noise

Graceful if CL returns 403/blocked — workflow continues.

## San Antonio permits (estate-tagged)

- Open Data: https://data.sanantonio.gov/dataset/building-permits
- `fetch_permits.py` sets `type: "estate"` when project/contact text matches estate/liquidator language.

## Lightweight EstateSales.net

```bash
python3 webapp/scripts/fetch_estatesales.py --city san-antonio
```

Probes internal endpoints + ld+json. Often returns zero because the site is a client SPA.

## Optional Apify (not required)

Only runs when GitHub secret `APIFY_TOKEN` is present. Safe to ignore forever for a free-only deployment.

## Map-refresh workflow order

1. GarageSaleFinder
2. SA permits (estate-tagged)
3. **EstateSales.org free**
4. **YardSaleSearch free**
5. **Craigslist free**
6. EstateSales.net lightweight free
7. Apify optional
8. Purge expired
9. Commit if dirty

Schedule: every 2 hours UTC + manual `workflow_dispatch`.

## Live example (2026-08-06)

- **Destination Commonwealth** — 4246 Roark Dr, San Antonio TX 78219  
  Fri–Sat Aug 7–8  
  Source: EstateSales.org / YardSaleSearch (free)
