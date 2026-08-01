# Project YardBird — Full Public Information Sources
San Antonio reference  •  Updated 2026-08-01

All sources below are public or government-published. Private Facebook Groups, login-walled Marketplace bulk access, and ToS-violating scrapers are out of scope.

## Tier 1 — Highest trust / structured

| Source | Access | Agent(s) | Notes |
|--------|--------|----------|-------|
| EstateSales.net / EstateSales.org | Public web | Heritage | Strongest current automated backbone for professional estate sales |
| City of San Antonio Garage Sale Permits | Open Data SA + Accela Citizen Access | Permit | **Public records.** Bulk CSVs include garage sale permits. Texas Public Information Act. Highest trust when matched |

## Tier 1.5 — Public aggregators

| Source | Access | Agent(s) | Notes |
|--------|--------|----------|-------|
| YardSaleSearch.com | Public HTML | Press | Large national user-posted network; SA city page exists |
| GarageSaleFinder.com | Public HTML | Press | Live SA listings with addresses/dates |

## Tier 2 — Local classifieds & constrained platforms

| Source | Access | Agent(s) | Notes |
|--------|--------|----------|-------|
| Craigslist (gms) | RSS + public pages (constrained) | Mercury Swarm | Rate-limited / blocked for heavy automation; multi-path resilience in place |
| SA Express-News / Hearst Marketplace | Public classifieds | Press | Dedicated Estate-Garage Sales category |
| Facebook (public only) | Public pages, events, hashtags, tips | Echo Swarm | No Graph API for Marketplace or Groups |

## Tier 3 — Community & supporting

| Source | Access | Agent(s) | Notes |
|--------|--------|----------|-------|
| Reddit (r/sanantonio etc.) | Public | Crow | Community posts |
| Nextdoor | Mostly account-walled | Neighbor | Limited public view; HOA focus |
| Yard Sale Treasure Map | User-submitted | Press | Voluntary posts (CL feed ended) |
| Church / school / non-profit bulletins | Public announcements | Parish | Rummage, bazaar, community sales |
| OfferUp & similar | Public item listings | Signal | Occasional multi-item yard-sale style posts |
| Search-engine indexes (Google/Bing) | Indexed public pages | Mercury-Cache, Signal | Secondary signal only |
| Social hashtags | Public | Signal, Echo-Hashtag | #SAGarageSale and variants |

## Policy reminders

- Public content only.
- Respect robots.txt and rate limits.
- All records require Scholar → Compass → Latitude → Sentinel before map promotion.
- Source tagging is mandatory.
- City permits and EstateSales remain the quality core; aggregators and classifieds fill volume/coverage gaps.

See also: `city-configs/san-antonio.yaml`, `docs/facebook-graph-api-status.md`, `docs/craigslist-swarm.md`, `docs/facebook-swarm.md`.
