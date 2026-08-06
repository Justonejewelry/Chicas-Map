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
| **EstateSales.org** | `webapp/scripts/fetch_estatesales_org.py` | **Free** | **High** | Parses embedded sale JSON from HTML (address, lat/lon, hours) |
| EstateSales.net lightweight | `webapp/scripts/fetch_estatesales.py` | Free | Low–medium | SPA-heavy; often thin |
| Apify EstateSales.net | `webapp/scripts/fetch_estatesales_apify.py` | Optional paid | High | Only if `APIFY_TOKEN` secret is set |

## EstateSales.org (primary free estate layer)

```bash
python3 webapp/scripts/fetch_estatesales_org.py --city san-antonio
python3 webapp/scripts/fetch_estatesales_org.py --cities san-antonio,austin --dry-run
```

How it works:

1. Fetches `https://estatesales.org/estate-sales/tx/<city>` with a normal browser User-Agent.
2. Parses embedded JSON sale objects in the HTML (id, title, address, lat/lon, company, in-person vs online, dateTimes).
3. Merges into `webapp/data/cities/<slug>.json` `public[]` with `type: "estate"`, `source: "EstateSales.org"`, and `external_id: eso-<id>`.
4. Prefer in-person sales for map pins (confidence ~0.9). Online auctions kept at lower confidence when geocoded.

No API key. No Apify. No paid site.

## San Antonio permits (estate-tagged)

- Open Data: https://data.sanantonio.gov/dataset/building-permits
- Same garage-sale permit covers estate events inside city limits.
- `fetch_permits.py` sets `type: "estate"` when project/contact text matches estate/liquidator language.

## Lightweight EstateSales.net

```bash
python3 webapp/scripts/fetch_estatesales.py --city san-antonio
```

Probes internal endpoints + ld+json. Often returns zero because the site is a client SPA. Kept as a free secondary probe.

## Optional Apify (not required)

Only runs when GitHub secret `APIFY_TOKEN` is present. Safe to ignore forever for a free-only deployment.

## Map-refresh workflow order

1. GarageSaleFinder
2. SA permits (estate-tagged)
3. **EstateSales.org free**
4. EstateSales.net lightweight free
5. Apify optional
6. Purge expired
7. Commit if dirty

## Live example (2026-08-06 dry-run)

- **Destination Commonwealth** — 4246 Roark Dr, San Antonio TX 78219  
  Fri–Sat Aug 7–8, 10:00 am–3:00 pm  
  Caring Transitions of San Antonio Central  
  Source: EstateSales.org (free)
