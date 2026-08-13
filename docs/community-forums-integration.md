# Community Forums Integration
Chicas Map / GSIN  •  2026-08-13

## Goal
Turn local community forums (especially Nextdoor and public San Antonio Facebook groups) into a high-quality **signal layer** that feeds verified pins — without becoming a noisy scraper or violating platform terms.

## Core Principles
- Public content and user-consented tips only.
- Forums are **leads**, not automatic final listings.
- Everything still passes Scholar → Compass → Latitude → Sentinel before map promotion.
- Clear source attribution on every pin that originated from a community post.
- Prefer quality and trust over volume.

## Integration Layers

### 1. Discovery + Verification Pipeline (priority)
- Detect sale-related public posts / user-submitted tips from:
  - Public Nextdoor shares or screenshots provided by users
  - Public Facebook group posts and hashtags (#SAGarageSale, neighborhood groups)
  - r/sanantonio and similar public Reddit threads
- Extract address, dates, hours, and categories when possible.
- Run through existing verification / Sentinel gate.
- Publish only after confidence threshold is met.
- Tag source as `nextdoor`, `facebook_public`, `reddit`, or `community_tip`.

### 2. One-Tap “Bring It to the Map” (user-powered)
- On the submit form, provide an optional field:
  - “Saw this on Nextdoor / Facebook / Reddit? Paste the link or key details.”
- Pre-fill what can be parsed; user confirms address and hours.
- Moderated before going live.
- Contributor can earn a lightweight “Scout” recognition over time.

### 3. Seller Cross-Post Helper
- “Already posted on Nextdoor or Facebook? Paste the link and we’ll help you create a verified pin in under a minute.”
- Explicit consent only. No automatic posting *back* into the forums.

### 4. Weekend Community Signals (forecast)
- Curated “Community Signals” section in Friday briefings / forecast panels:
  - Notable multi-family or high-interest posts from local groups
  - Last-minute sales that appeared on Nextdoor
  - Neighborhood threads showing strong interest
- Keep curated and high-signal.

## Operating Constraints
- No private Nextdoor scraping or login-walled bulk access.
- No Facebook Groups API (deprecated) or Marketplace Graph API harvesting.
- Echo Swarm remains the Facebook public-content path (see `docs/facebook-swarm.md`).
- Neighbor agent handles limited public Nextdoor signals + user tips.
- Crow agent continues Reddit public monitoring.

## Success Metrics
- Number of unique, high-confidence community-origin sales that reach the live map.
- Reduction in “I saw it on Nextdoor but it wasn’t on the map” feedback.
- Clean source attribution and maintained “Verified first” brand trust.

## Implementation Order
1. Design + backlog (this doc) — **done**
2. Submit form “community origin” field + payload support
3. Source tagging in schema / Sentinel for `community_tip` / `nextdoor` / `facebook_public`
4. Forecast “Community Signals” section
5. Lightweight Scout recognition (later)

See also: `docs/facebook-swarm.md`, `docs/information-sources.md`, `city-configs/san-antonio.yaml`.
