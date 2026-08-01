# Mercury — Craigslist Resilience Notes

Current problem (2026-08-01): Direct automated requests to sanantonio.craigslist.org are frequently blocked.

## Recommended ingestion paths (priority order)

1. **RSS**  
   `https://sanantonio.craigslist.org/search/gms?format=rss`  
   Still the cleanest structured feed when it is not blocked.

2. **Browser / manual seed**  
   Human or headless browser with realistic fingerprints for high-value days.

3. **Google / Bing cache & site search**  
   `site:sanantonio.craigslist.org (garage OR yard OR estate) sale` with date filters.

4. **Third-party aggregators** (use only as secondary signal)  
   Sites that already scrape Craigslist and expose public pages.

5. **Fallback**  
   Rely more heavily on EstateSales.net, Facebook public posts, and municipal permits until Craigslist access stabilizes.

## Implementation notes for Forge / Bridge

- Always set a realistic User-Agent and respect robots.txt where possible.
- Cache aggressively. Do not hammer the site.
- Log every block so Phoenix can detect patterns.
- Prefer RSS first; only escalate to heavier methods when RSS returns empty or 403.
