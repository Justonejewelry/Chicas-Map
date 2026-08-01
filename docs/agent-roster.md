# GSIN Agent Roster — Project YardBird

Approximately 40 specialized agents. Operate only the ones required for the current task. Atlas assigns; Forge coordinates; Sentinel gates.

## Executive Layer

| Name | Role | Core Duty |
|------|------|-----------|
| Atlas | Director / CEO | Assigns work, measures swarm performance, balances load, tracks KPIs, makes scheduling decisions. Never touches raw data. |
| Forge | Operations Chief | Coordinates every crawler, restarts failed agents, detects bottlenecks, optimizes throughput. |
| Sentinel | Quality Control Director | Nothing reaches the map until approved. Detects duplicates, fakes, scams, outdated sales, impossible addresses. |

## Discovery Division

| Name | Focus |
|------|-------|
| Mercury | **Lead** — Craigslist continuous scan. Now commands a dedicated sub-swarm (Mercury-RSS, Mercury-Browser, Mercury-Cache, Mercury-Aggregator, Mercury-Dedupe). See docs/agent-roster-expansion.md |
| Echo | **Lead** — Facebook Marketplace + local buy/sell groups. Now commands a dedicated sub-swarm (Echo-Marketplace, Echo-Groups, Echo-Public, Echo-Hashtag, Echo-Lens). See docs/agent-roster-expansion.md |
| Heritage | EstateSales.net, EstateSales.org, auction and liquidation sites |
| Neighbor | Nextdoor HOA announcements, community garage weekends, neighborhood-wide events |
| Parish | Church bulletins, mission sites, school newsletters |
| Permit | City garage-sale permits, municipal announcements, official feeds |
| Press | Digital classifieds, weekend newspaper announcements, local papers |
| Crow | Local subreddits |
| Festival | Church bazaars, craft fairs, swap meets, vendor events, flea markets |
| Signal | Instagram, Threads, TikTok, X, Pinterest |

## Extraction Division

| Name | Function |
|------|----------|
| Lens | OCR on flyers, photos, signs, handwritten notes |
| Scholar | NLP extraction of date, time, address, items, neighborhood, special notes |
| Compass | Resolves relative addresses (“corner of…”, “across from…”, “near Walmart”) |
| Latitude | Produces exact GPS coordinates |

## Verification Division

| Name | Function |
|------|----------|
| Mirror | Cross-site duplicate detection |
| Handshake | Phone / email / repeat-seller checks |
| Sherlock | AI fraud / scam detection + confidence scoring |
| Clockwork | Expires outdated sales |
| Focus | Image validation — does the photo actually show a garage sale? |

## Intelligence Division

| Name | Function |
|------|----------|
| Treasure | Predicts likelihood of tools, electronics, vintage, antiques, collectibles, furniture |
| Beacon | Neighborhood income, age, property values, demographics, historical sale quality |
| Pulse | Predicts attendance, parking, crowd levels |
| Archive | Long-term memory of every sale; learns yearly patterns |
| Nimbus | Weather impact (rain, heat, wind, humidity, storm delays) |
| Navigator | Optimized driving routes |
| Oracle | Seasonality, popular areas, emerging neighborhoods |

## Publishing Division

| Name | Function |
|------|----------|
| Cartographer | Updates the Google Map (or KML/GeoJSON) automatically |
| Pinmaster | Marker colors, icons, animations, priority badges |
| Town Crier | Push, email, SMS, browser alerts |
| Storyteller | Weekend previews, neighborhood spotlights, best-finds blog posts |
| Viral | Auto-posts to Facebook, Instagram, Threads, TikTok, Pinterest |
| Courier | Weekly email digest |
| Lighthouse | SEO for search rankings |
| Insight | Clicks, views, conversions, popular areas analytics |

## Infrastructure

| Name | Function |
|------|----------|
| Vault | Database integrity |
| Bridge | API connection management |
| Flash | Cache / speed optimization |
| Guardian | Account, credential, and server protection |
| Economist | API, compute, and bandwidth cost control |
| Phoenix | Failure detection, component restart, workflow repair |

## Forecast & Predictive AI Division

| Name | Function |
|------|----------|
| Selene | Virtual host — morning briefings + weekend blog (warm, expressive, original character) |
| Tomorrow | Next-day inventory forecast from posting patterns |
| Season | Annual seasonal garage-sale trend model |
| Collector | Predicts high-value category locations (antiques, tools, records, cameras…) |
| Commuter | Efficient routes from traffic, drive time, opening hours |
| Neighborhood DNA | Long-term neighborhood profiles, recurring community sales, historically productive areas |
| Event Fusion | Correlates holidays, HOA schedules, school calendars, weather, local events |

## Publishing Schedule (Default)

- Thursday: Weekend Preview
- Friday: What’s New Overnight
- Saturday: Live Morning Briefing (Selene)
- Sunday: Weekend Wrap-Up (optional)

The lower 25 % of the map interface is reserved for the permanent WEEKEND FORECAST panel (stars, predicted counts, weather impact, hot zones, best categories, confidence).
