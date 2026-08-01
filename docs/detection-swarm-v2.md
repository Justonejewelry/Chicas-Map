# Detection Swarm v2 — Maximum Public Yield
Project YardBird / Atlas  •  2026-08-01

Goal: Raise verified garage + estate sale detections for San Antonio with the highest ROI public sources while remaining fully compliant (public content only, robots.txt respectful, no private FB groups, no Graph API Marketplace).

## Priority Order (ROI × Reliability)

| Rank | Source Cluster | Lead Agent | Expected Lift | Trust |
|------|----------------|------------|---------------|-------|
| 1 | City of SA Garage Sale Permits (Open Data + Accela) | Permit + Permit-Extractor | High volume + highest trust | ★★★★★ |
| 2 | EstateSales.net / .org | Heritage | Steady high-quality backbone | ★★★★★ |
| 3 | YardSaleSearch.com + GarageSaleFinder.com | Press + Aggregator-Yard / Aggregator-Finder | Fast volume fill | ★★★★ |
| 4 | SA Express-News / Hearst Marketplace classifieds | Press | Local weekend signal | ★★★★ |
| 5 | Craigslist (multi-path) | Mercury Swarm | Classic but constrained | ★★★ |
| 6 | Public Facebook (pages, events, hashtags only) | Echo Swarm | Opportunistic | ★★★ |
| 7 | Reddit + secondary social | Crow + Signal | Low volume, high local flavor | ★★ |

## New / Elevated Agents

### Permit Swarm (upgraded)
- **Permit** (lead) — owns municipal strategy
- **Permit-Extractor** — parses Open Data SA CSVs and Accela public search results into canonical sale records
- **Permit-Matcher** — links permit records to public listings for confidence boost

### Aggregator Swarm
- **Aggregator-Yard** — dedicated YardSaleSearch.com San Antonio parser
- **Aggregator-Finder** — dedicated GarageSaleFinder.com parser
- Both feed Press → Scholar → Compass → Latitude → Mirror → Sentinel

### Cross-Source Layer
- **Scout** — lightweight public-web discovery agent (targeted Google/Bing queries for “garage sale San Antonio this weekend”, estate sales, etc.)
- **CrossChecker** — multi-source identity resolution (same address / same weekend / similar title) before Mirror

## Operating Cadence (Saturday Morning Focus)

| Window | Agents Active | Purpose |
|--------|---------------|---------|
| Thu 18:00–22:00 | Permit-Extractor, Heritage, Aggregator-* | Weekend inventory build |
| Fri 06:00–10:00 | Mercury-RSS, Press, Scout | Overnight + morning surge |
| Fri 18:00–21:00 | Echo-Public, Echo-Hashtag, Crow | Social confirmation |
| Sat 05:30–08:00 | Full Discovery + Sentinel surge | Live map + forecast lock |

## Detection Pipeline (per candidate)

1. Discovery agent emits raw signal  
2. Scholar extracts structured fields  
3. Compass + Latitude resolve location  
4. CrossChecker + Mirror deduplicate  
5. Sherlock scores risk  
6. Permit-Matcher adds trust boost if municipal record exists  
7. Sentinel final gate → Vault → Cartographer / forecast population

## Success Metrics (Atlas tracks)

- Verified active sales per weekend (target ↑ 30–50% vs prior baseline)
- % of map pins with ≥2 independent sources
- % of pins backed by municipal permit or EstateSales record
- False-positive rate after Sentinel < 5%
- Time from first public post → map appearance (median)

## Immediate Implementation Notes

- City config already lists all Tier 1–3 sources (see city-configs/san-antonio.yaml and docs/information-sources.md)
- populate_forecast.py already filters confidence ≥ 0.55
- Next code priorities: Permit-Extractor stub, Aggregator parsers, CrossChecker logic
