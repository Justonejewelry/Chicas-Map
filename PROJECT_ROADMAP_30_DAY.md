# Chica's Map — 30-Day Improvement Project

**Project window:** November 16–December 13, 2026  
**Primary market:** San Antonio, Texas  
**North-star outcome:** Make Chica's Map the most dependable, easiest-to-use place for San Antonio shoppers to find garage, yard, and estate sales—then prove repeat usage and a viable local revenue model.

## Strategy

For the next 30 days, prioritize reliability and customer outcomes over adding features. Keep San Antonio as the proving ground. Do not expand to another city or start parked feature work until the core experience is dependable.

### Success measures

Establish a baseline in Week 1, then report weekly:

- Listing freshness: share of published listings with a valid date, usable location, and recent source check.
- Data pipeline: successful runs by source, last successful retrieval, alert coverage, and number of stale/duplicate listings published.
- Shopper experience: mobile search success, map load success, directions clicks, and incorrect-listing reports.
- Acquisition: unique visitors, organic search impressions/clicks, and traffic by channel.
- Engagement: map opens, searches, return visitors, and sale-detail views.
- Supply: seller submissions and percentage accepted/published.
- Revenue validation: boosted-listing purchases, sponsor leads, paid conversions, and repeat sponsors.

Do not invent targets before baselines exist. Set realistic targets after the first seven days of measurement.

## Work plan

### Phase 1 — Trust the listings (Nov 16–22)

**Goal:** Know where every published listing came from, when it was last checked, and whether it is still useful.

- Repair source-health reporting so missing logs are distinguished from actual source failures.
- Record per-source last successful retrieval, run status, records found, and error details.
- Audit the public feed and all consumers for legacy/stale data files.
- Add or verify expiry rules for past-dated sales and validation for date, address, and coordinates.
- Review duplicate merging and ensure canonical listings retain source provenance.
- Add deployment-blocking checks for critical feed/schema/data-quality failures.
- Publish clear listing confidence labels: source-confirmed, community-submitted, date/location unconfirmed, or potentially outdated.

**Exit criteria:** Every active source has an observable health state; stale/invalid records are prevented or clearly flagged; the public feed's freshness can be verified; critical data checks run before publishing.

### Phase 2 — Make the core experience obvious (Nov 23–29)

**Goal:** A first-time visitor can find a sale quickly on a phone.

- Organize the main experience around three actions: **Find a Sale**, **List a Sale**, and **Plan Your Hunt**.
- Keep secondary tools available without letting them compete with the primary actions.
- Test search against real queries, partial addresses, ZIP codes, neighborhoods, and categories.
- Test map loading, pins, sale details, filters, and one-tap directions on iOS and Android.
- Improve expired/upcoming/today status and add a simple way to report an incorrect listing.
- Make seller submission instructions and confirmation clear.

**Exit criteria:** A mobile smoke-test checklist passes; core search/map/directions paths work; a new visitor can identify the primary actions without explanation.

### Phase 3 — Be discoverable on Google (Nov 30–Dec 6)

**Goal:** Verify indexing and make useful local pages easier to find.

- Verify Google Search Console ownership and inspect indexing, sitemap processing, and coverage.
- Fix crawl/indexing issues found; verify canonical URLs and robots directives.
- Review neighborhood landing pages for unique, useful local content.
- Improve individual sale pages with accurate dates, location, details, categories, source/confidence, and directions.
- Review expired-sale handling so old pages do not mislead searchers.
- Validate structured data and Spanish-language page quality.

**Exit criteria:** Search Console baseline recorded; sitemap and key page indexing status understood; priority technical SEO issues have owners and fixes.

### Phase 4 — Measure demand and test revenue (Dec 7–13)

**Goal:** Learn whether people use the product repeatedly and whether sellers/businesses will pay.

- Instrument the funnel: visit → search/map open → sale detail → directions; seller visit → submission → published listing.
- Build a simple weekly dashboard for acquisition, engagement, listing supply, and conversion.
- Run a small, clearly measured boosted-listing test at the proposed $5 one-time price.
- Conduct targeted outreach to local businesses to test the proposed $25/month sponsorship.
- Capture feedback from shoppers and sellers; prioritize fixes based on observed friction.
- Decide what to continue, change, or stop based on actual results.

**Exit criteria:** A baseline dashboard exists; at least one pricing/offer test has been run or explicitly marked blocked; next-month priorities are based on observed behavior rather than assumptions.

## Operating rules

1. San Antonio first. Do not expand geography until listing quality and repeat use are demonstrated.
2. Reliability before feature count. No new major feature work during this project unless it directly removes a blocker.
3. No invented metrics, listings, source status, or verification claims.
4. Preserve existing product decisions and parked work. Do not revive QR/share leaderboard or other parked work without explicit approval.
5. Ship in small changes with tests and a production smoke check.
6. Keep Alamo Atlas and other secondary experiences from distracting the primary garage-sale discovery journey.

## Risks to watch

- Source monitoring may report missing logs even when source-attributed listings exist; diagnose before declaring a source broken.
- Legacy feed files may still be referenced by public pages or scripts; audit actual consumers before changing/removing files.
- Search improvements must be regression-tested against the homepage and map search separately.
- SEO groundwork is not proof of Google visibility; use Search Console data.
- Revenue ideas are hypotheses until conversion and retention are measured.

## Weekly review

At the end of each week, record: completed work, failed checks, current listing freshness, visitor/search funnel baseline, seller submissions, revenue tests, customer feedback, and the three highest-priority next actions.
