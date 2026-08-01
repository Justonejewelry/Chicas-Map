# YardBird Improvement Backlog (Atlas notes 2026-08-01)

1. **Craigslist resilience** — Current access is blocked/rate-limited. Add RSS fallback, Google cache paths, or rotating lightweight proxies. Mercury needs a more robust ingestion path.
2. **Machine-readable city configs** — Convert .md configs to YAML so scripts and agents can load bounds, sources, and hot zones programmatically.
3. **Live vs Seed distinction** — Tag every KML/GeoJSON layer with `status: seed | verified | live` and confidence.
4. **Address resolution pipeline** — Formalize Compass → Latitude with a public geocoder (Nominatim or similar) and cache results in Vault.
5. **Daily automation** — Create a scheduled Atlas morning run (Thu–Sat) that refreshes Discovery → Sentinel → Cartographer → Forecast.
6. **Nimbus integration** — Pull real-time weather and bake it into the forecast panel and Selene briefings automatically.
7. **Facebook / Nextdoor depth** — These remain high-value but login-walled. Document public search patterns and manual seed processes until better access exists.
8. **Marker richness** — Expand Pinmaster with category-specific icons once we move beyond basic Google My Maps KML limits.
9. **Historical Archive** — Start logging every verified sale so Season and Neighborhood DNA can learn.
10. **Multi-city template test** — Clone San Antonio config for Austin or Houston as the first expansion proof.
