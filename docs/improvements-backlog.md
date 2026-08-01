# Project YardBird — Improvements Backlog
Updated 2026-08-01 by Atlas (post-execution)

## Completed This Cycle
- [x] Full public information source inventory
- [x] Mercury + Echo sub-swarm definitions
- [x] Facebook Graph API feasibility analysis (non-viable for Marketplace/Groups)
- [x] Auto-populate forecast skeleton
- [x] Detection Swarm v2 strategy
- [x] Permit-Extractor **production version** against real Open Data SA schema
- [x] Extracted 174 recent garage-sale permits (last 21 days) → data/permits_recent.json
- [x] New agents registered: Permit-Extractor, Permit-Matcher, Aggregator-Yard/Finder, Scout, CrossChecker
- [x] Scout query set defined

## High Priority — Next
- [ ] Build Aggregator-Yard and Aggregator-Finder HTML parsers (respectful)
- [ ] Wire CrossChecker + Permit-Matcher into verification confidence model
- [ ] Activate Scout scheduled runs for Thu–Sat windows
- [ ] Expand Heritage multi-page depth
- [ ] Refresh live KML / forecast with any permit-backed sales that still fall in active window

## Medium Priority
- [ ] Historical permit archive for Archive / Neighborhood DNA learning
- [ ] Live KML delta publishing
- [ ] Selene briefing auto-generation from forecast JSON

## Policy Anchors
- Public content only
- Sentinel gate on every map pin
- Source tagging mandatory
- No private group or ToS-violating access
