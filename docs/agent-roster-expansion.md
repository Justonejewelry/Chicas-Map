# GSIN Agent Roster Expansion — Craigslist & Facebook Detection Swarms
# Project YardBird / Atlas directive 2026-08-01

Mercury (Craigslist) and Echo (Facebook) are elevated from single agents to **lead agents** with dedicated sub-swarms. Goal: raise Craigslist and Facebook signal yield and resilience without increasing block risk.

## Mercury Swarm — Craigslist Detection (Lead: Mercury)

| Sub-Agent | Role | Primary Method | Fallback |
|-----------|------|----------------|----------|
| **Mercury-RSS** | Continuous RSS poller | `https://sanantonio.craigslist.org/search/gms?format=rss` (and city variants) | Cache last good feed; alert Phoenix on empty/403 |
| **Mercury-Browser** | Headless / human-seed browser | Realistic fingerprint, slow cadence, only high-value windows (Thu–Sat AM) | Manual seed queue by operator |
| **Mercury-Cache** | Search-engine cache hunter | Google/Bing `site:sanantonio.craigslist.org (garage OR yard OR estate) sale` + date filters | Archive.org snapshots |
| **Mercury-Aggregator** | Secondary aggregator cross-check | Public pages from known CL mirrors / aggregators | Score as low-confidence until Mirror confirms |
| **Mercury-Dedupe** | Intra-Craigslist duplicate + spam filter | Title/address/hash matching within 48 h window | Feed into Mirror (Verification) |

**Operating rules (Forge / Guardian enforced)**  
- RSS first, always. Escalate only on empty or blocked.  
- Aggressive local cache (Flash). Never hammer.  
- Every block logged → Phoenix pattern detection.  
- Confidence starts lower (0.55–0.70) until multi-path confirmation.

## Echo Swarm — Facebook Detection (Lead: Echo)

| Sub-Agent | Role | Primary Method | Fallback |
|-----------|------|----------------|----------|
| **Echo-Marketplace** | Public Marketplace-style signals | Manual seed + public observation + user tips (no Graph API) | See facebook-graph-api-status.md |
| **Echo-Groups** | Local buy/sell & neighborhood groups | Public posts only; operator seed (Groups API deprecated) | See facebook-graph-api-status.md |
| **Echo-Public** | Public page & event scanner | Facebook Events + public sale pages | Cross-post detection via Signal |
| **Echo-Hashtag** | Hashtag & mention monitor | #SAGarageSale #SanAntonioYardSale #AlamoRanchSale etc. | Cross-platform via Signal |
| **Echo-Lens** | Photo / flyer OCR on FB posts | Feed images to Lens → Scholar | Manual review queue |

**Operating rules**  
- Prefer public content only. No private group scraping.  
- Rate-limit aggressively; treat Facebook as high-block-risk.  
- All Echo records start with platform tag `facebook` and lower initial confidence until Handshake / Sherlock clear.  
- Strong preference for posts that include address + hours + photos.

## Integration into Forecast Auto-Population

Verified sales from Mercury* and Echo* feed the shared intelligence layer.  
`scripts/populate_forecast.py` (or future agent “Nimbus + Tomorrow”) then auto-fills:

- `days.*.predicted_sales` ← count of active + high-confidence records by day
- `days.*.stars` ← quality-weighted score (value_score + attendance_score + source diversity)
- `hot_zones` ← geo-cluster of high-confidence points against city config hot_zones
- `best_categories` ← top categories by Treasure score
- `verified_highlights` ← top-N by value_score + confidence
- `weather_impact` ← Nimbus live pull (stubbed until live weather connector)
- `confidence` ← mean confidence of contributing records + source diversity bonus
- `selene_briefing_draft` ← template filled by Storyteller / Selene from the above fields

Craigslist and Facebook records that survive Sentinel raise the overall forecast confidence and can push a day from 3★ → 4★ when volume + quality thresholds are met.
