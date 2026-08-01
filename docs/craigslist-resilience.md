# Mercury — Craigslist Resilience Notes

**Superseded / expanded by** `docs/craigslist-swarm.md` and `docs/agent-roster-expansion.md` (2026-08-01).

Current problem (2026-08-01): Direct automated requests to sanantonio.craigslist.org are frequently blocked.

## Recommended ingestion paths (priority order) — now owned by Mercury Swarm

1. **Mercury-RSS**  
   `https://sanantonio.craigslist.org/search/gms?format=rss`  
   Still the cleanest structured feed when it is not blocked.

2. **Mercury-Browser**  
   Human or headless browser with realistic fingerprints for high-value days.

3. **Mercury-Cache**  
   Google / Bing cache & site search: `site:sanantonio.craigslist.org (garage OR yard OR estate) sale` with date filters.

4. **Mercury-Aggregator**  
   Third-party aggregators (use only as secondary signal).

5. **Fallback**  
   Rely more heavily on EstateSales.net (Heritage), Facebook public posts (Echo Swarm), and municipal permits until Craigslist access stabilizes.

## Implementation notes for Forge / Bridge / Guardian

- Always set a realistic User-Agent and respect robots.txt where possible.
- Cache aggressively (Flash). Do not hammer the site.
- Log every block so Phoenix can detect patterns.
- Prefer RSS first; only escalate to heavier methods when RSS returns empty or 403.
- All records tagged with the specific sub-agent that produced them.
