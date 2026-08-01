# GSIN Agent Roster Expansion — Detection Focus
# Project YardBird / Atlas directive 2026-08-01 (v2)

Mercury (Craigslist) and Echo (Facebook) remain lead agents with sub-swarms.
New high-ROI agents added for municipal permits and public aggregators.

## Mercury Swarm — Craigslist Detection (Lead: Mercury)

| Sub-Agent | Role | Primary Method | Fallback |
|-----------|------|----------------|----------|
| **Mercury-RSS** | Continuous RSS poller | sanantonio.craigslist.org/search/gms?format=rss | Cache last good feed; alert Phoenix on empty/403 |
| **Mercury-Browser** | Headless / human-seed browser | Realistic fingerprint, slow cadence, Thu–Sat AM only | Manual seed queue |
| **Mercury-Cache** | Search-engine cache hunter | Google/Bing site: + date filters | Archive.org snapshots |
| **Mercury-Aggregator** | Secondary aggregator cross-check | Public CL mirrors / aggregators | Low confidence until Mirror |
| **Mercury-Dedupe** | Intra-CL duplicate + spam filter | Title/address/hash matching (48 h) | Feed into Mirror |

## Echo Swarm — Facebook Detection (Lead: Echo) — Public only

| Sub-Agent | Role | Primary Method | Fallback |
|-----------|------|----------------|----------|
| **Echo-Marketplace** | Public Marketplace keyword scan | garage/yard/estate + SA geo | Operator seed |
| **Echo-Groups** | Local buy/sell & neighborhood groups | Public posts only | Future admin relationships |
| **Echo-Public** | Public page & event scanner | Facebook Events + public sale pages | Signal cross-post |
| **Echo-Hashtag** | Hashtag & mention monitor | #SAGarageSale etc. | Cross-platform via Signal |
| **Echo-Lens** | Photo / flyer OCR on FB posts | Lens → Scholar | Manual review queue |

## Permit Swarm (NEW — highest trust)

| Sub-Agent | Role | Primary Method |
|-----------|------|----------------|
| **Permit** | Lead — municipal strategy | Open Data SA + Accela public records |
| **Permit-Extractor** | CSV / public search parser | Bulk permits → canonical GSIN records (see scripts/permit_extractor_stub.py) |
| **Permit-Matcher** | Confidence booster | Links permit address/date to other public listings |

## Aggregator Swarm (NEW — volume)

| Sub-Agent | Role | Primary Method |
|-----------|------|----------------|
| **Aggregator-Yard** | YardSaleSearch.com SA parser | Public HTML listings |
| **Aggregator-Finder** | GarageSaleFinder.com SA parser | Public HTML listings |

## Cross-Source Layer (NEW)

| Sub-Agent | Role |
|-----------|------|
| **Scout** | Targeted public-web discovery (search queries for weekend sales) |
| **CrossChecker** | Multi-source identity resolution before Mirror |

## Operating Rules (Forge / Guardian)

- Public content only. No private Facebook groups. No Graph API Marketplace.
- RSS / bulk public data first; browser paths only when necessary and rate-limited.
- Every candidate still requires Scholar → Compass → Latitude → Mirror → Sentinel.
- Permit-backed records receive automatic confidence uplift (0.85+).
- Aggressive local caching (Flash). Never hammer source sites.

See also: docs/detection-swarm-v2.md, docs/information-sources.md, city-configs/san-antonio.yaml
