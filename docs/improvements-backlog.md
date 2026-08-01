# YardBird Improvement Backlog

Updated 2026-08-01 01:00 CDT after Mercury/Echo swarm expansion + forecast auto-populate.

## Completed this cycle

- [x] YAML city configs (San Antonio reference + Austin first clone)
- [x] Formal geocoding pipeline (scripts/geocode.py + cache, Nominatim)
- [x] Live vs Seed tagging rules added to skill and KML comments
- [x] Craigslist resilience notes documented
- [x] Archive scaffolding created
- [x] Austin multi-city clone
- [x] **Mercury Swarm** (RSS / Browser / Cache / Aggregator / Dedupe) defined and documented
- [x] **Echo Swarm** (Marketplace / Groups / Public / Hashtag / Lens) defined and documented
- [x] Forecast skeleton template (`templates/forecast-skeleton.json`)
- [x] Auto-populate script (`scripts/populate_forecast.py`) — turns verified sales → full forecast JSON
- [x] Agent roster updated to mark Mercury & Echo as Lead agents with sub-swarms

## Still open

- [ ] Wire Mercury-RSS live poller (currently intermittent / blocked)
- [ ] Wire Echo-Marketplace + Echo-Groups public scanners
- [ ] Daily automation cadence (platform-side limits still constrain)
- [ ] Nimbus live weather pull into forecast JSON (currently manual override)
- [ ] Promote seed KML fully after deeper multi-source Sentinel pass
- [ ] Populate first archive records from this weekend
- [ ] Marker icon expansion beyond basic KML limits
- [ ] Second city proof (Houston or Dallas next?)
- [ ] End-to-end test of populate_forecast.py against real verified sales dump
