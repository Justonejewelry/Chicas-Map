# Mercury Swarm — Craigslist Detection Playbook
Project YardBird / GSIN  •  Atlas directive 2026-08-01

## Goal
Raise Craigslist yield and survive blocks by distributing the work across five specialized sub-agents under Mercury.

## Sub-agents

### Mercury-RSS (primary path)
- Poll `https://sanantonio.craigslist.org/search/gms?format=rss` (and city clones).
- Cadence: every 45–90 min during Thu–Sun window; slower otherwise.
- On 200 + items → parse into pending sale records, hand to Scholar + Compass.
- On empty / 403 / timeout → signal Phoenix + escalate to Mercury-Browser / Mercury-Cache.

### Mercury-Browser
- Headless browser (or human operator seed) with realistic fingerprint, slow scroll, random delays.
- Used only when RSS is blocked and only for high-value windows (Fri evening, Sat 05:00–09:00).
- Extract listing cards → Lens/Scholar pipeline.
- Strict rate limit enforced by Guardian / Economist.

### Mercury-Cache
- Query Google / Bing with `site:sanantonio.craigslist.org (garage OR yard OR estate OR moving) sale` + date range.
- Pull cached snapshots and recent index hits.
- Low confidence until address + hours validated.

### Mercury-Aggregator
- Cross-check public third-party sites that already surface CL data.
- Never treat as primary; only as confirmatory signal for Mirror.

### Mercury-Dedupe
- Hash title + approximate address + date window.
- Suppress near-duplicates within 48 h before they reach Sentinel.

## Confidence & tagging
- Pure RSS hit: confidence start 0.60–0.70
- Browser or cache only: 0.50–0.60
- Multi-path agreement: +0.10–0.15
- All records tagged `platform: craigslist` and `agent: mercury-*`

## Success metrics (Forge tracks)
- % of days with ≥1 verified CL record
- Block rate trend
- Contribution to forecast confidence and Saturday star rating
