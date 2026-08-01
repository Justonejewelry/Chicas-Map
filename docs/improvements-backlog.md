# Project YardBird — Improvements Backlog
Updated 2026-08-01 by Atlas

## Completed This Cycle
- [x] Full public information source inventory (city config + docs/information-sources.md)
- [x] Mercury + Echo sub-swarm definitions
- [x] Facebook Graph API feasibility analysis (documented as non-viable for Marketplace/Groups)
- [x] Auto-populate forecast skeleton (scripts/populate_forecast.py)
- [x] Detection Swarm v2 strategy (docs/detection-swarm-v2.md)
- [x] Permit-Extractor stub (scripts/permit_extractor_stub.py)
- [x] New agents: Permit-Extractor, Permit-Matcher, Aggregator-Yard, Aggregator-Finder, Scout, CrossChecker

## High Priority — Detection Yield
- [ ] Implement real Permit-Extractor against current Open Data SA CSV schema
- [ ] Build Aggregator-Yard and Aggregator-Finder HTML parsers (respectful rate limits)
- [ ] Wire CrossChecker into verification pipeline
- [ ] Add Scout scheduled query set for Thu–Sat windows
- [ ] Expand Heritage depth (multi-page EstateSales.net + estatesales.org)

## Medium Priority
- [ ] Confidence model: multi-source boost + permit uplift formalized in Sherlock
- [ ] Historical permit archive for seasonal learning (Archive agent)
- [ ] Live KML delta publishing (Cartographer incremental)
- [ ] Selene briefing auto-generation from forecast JSON

## Lower Priority / Future
- [ ] Compliant Facebook Page/Event Graph path after proper App Review (if ever useful)
- [ ] Austin city config full activation + first map
- [ ] Neighborhood DNA long-term profiles
- [ ] Real-time weather overlay from Nimbus

## Policy Anchors (do not regress)
- Public content only
- Sentinel gate on every map pin
- Source tagging mandatory
- No private group or ToS-violating access
