# Estate sale data sources — YardBird / GSIN

Last updated: 2026-08-06

## Summary

There is **no free public read API** for EstateSales.net listings. The site is a client-rendered Angular SPA. The old 2017 Vintage Software “Public API (Beta)” is effectively dead for third-party consumers. Company API keys still exist only for *authenticated estate-sale companies* to *publish* their own sales (Wavebid-style marketing integration).

YardBird therefore uses three complementary paths:

| Path | Script | Cost | Reliability | Notes |
|------|--------|------|-------------|-------|
| City of SA permits | `webapp/scripts/fetch_permits.py` | Free | High for location/date | Estate vs garage tagged by project-name / contact heuristics |
| Lightweight HTTP | `webapp/scripts/fetch_estatesales.py` | Free | Low–medium | Probes internal endpoints + embedded JSON; often thin |
| Apify actor | `webapp/scripts/fetch_estatesales_apify.py` | Paid (~$4/1k) | High | Requires `APIFY_TOKEN` secret |

## 1. San Antonio permits (estate-tagged)

- Open Data: https://data.sanantonio.gov/dataset/building-permits
- Estate sales inside city limits require the **same Garage Sale Permit**.
- `fetch_permits.py` and `scripts/permit_extractor.py` now set:
  - `type: "estate"` when PROJECT NAME / PRIMARY CONTACT match estate/liquidator language
  - `categories: ["estate-sale", "permit"]`
  - higher confidence (0.92–0.94)
- Map legend can color estate pins purple independently of blue permit pins.

## 2. Lightweight EstateSales.net scraper

```bash
python3 webapp/scripts/fetch_estatesales.py --city san-antonio
python3 webapp/scripts/fetch_estatesales.py --cities san-antonio,austin --dry-run
```

Tries a few `/api/sales…` shapes and parses any SSR / ld+json blobs. Because the site is SPA-heavy, expect frequent zero-result runs. Merges into `webapp/data/cities/<slug>.json` `public[]` with `type: "estate"`.

## 3. Apify integration (recommended for production estate coverage)

1. Create an Apify account and generate a token.
2. Add GitHub secret **`APIFY_TOKEN`** on `Justonejewelry/Project-YardBird`.
3. Optional local test:
   ```bash
   export APIFY_TOKEN=apify_api_...
   python3 webapp/scripts/fetch_estatesales_apify.py --city san-antonio --radius 30
   ```
4. Default actor: `scrapersdelight~estatesales-net-scraper`  
   Override with `--actor` if you prefer another community actor.

When the secret is absent the step exits 0 and the rest of map-refresh continues (GSF + permits + purge).

## Map-refresh workflow

`.github/workflows/map-refresh.yml` now runs, in order:

1. GarageSaleFinder discover
2. SA permits (with estate tagging)
3. EstateSales.net lightweight
4. EstateSales.net Apify (optional)
5. Purge expired
6. Commit if dirty

## Future options

- Partner inquiry to ATG / EstateSales.NET for a read feed (unlikely free).
- Secondary scrape of EstateSales.org via a second Apify actor.
- Probate / distressed open-data feeds for *predicted* future estate sales (not live inventory).
