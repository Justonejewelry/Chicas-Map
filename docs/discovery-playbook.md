# Discovery Playbook — Non-Email Paths (Project YardBird)

Primary principle: Prefer public, login-free, rate-limit-respecting methods. Email is secondary.

## Priority Order for Texas Cities

1. **Heritage (EstateSales.net / .org)** — Highest structured quality  
2. **Mercury (Craigslist)** — Highest volume, needs resilience  
3. **Crow (Reddit)** — Community & multi-family signals  
4. **Press + Permit** — Official / newspaper classifieds  
5. **Signal (X / public Instagram)** — Real-time hashtags  
6. **Echo / Neighbor** — Public Facebook search only (login-walled depth is out of scope for now)

---

### 1. Heritage — EstateSales.net

- Primary URL pattern: `https://www.estatesales.net/TX/{City}`  
  Examples: `/TX/San-Antonio`, `/TX/Austin`, `/TX/Houston`, `/TX/Dallas`
- Method: Browse the city page + upcoming sales list. Extract address, dates, hours, company.
- Strength: Clean structured data, photos, multi-day sales.
- Weakness: Skews toward professional estate sales (still valuable for high-value inventory).
- Frequency: Check Thursday–Saturday mornings.

### 2. Mercury — Craigslist Resilience

Current reality: Direct automated hits are frequently blocked.

**Ordered fallbacks:**
1. RSS when available: `https://{city}.craigslist.org/search/gms?format=rss`
2. Google / Bing site search with recency:
   - `site:{city}.craigslist.org (garage OR yard OR estate OR "moving sale") after:YYYY-MM-DD`
3. Manual / careful browser seed on high-value days
4. Secondary aggregators that surface Craigslist content publicly

Always record source URL + fetch time. Never hammer the domain.

### 3. Crow — Reddit

- Target subreddits (add to city YAML):
  - San Antonio: r/sanantonio, r/SanAntonio
  - Austin: r/Austin, r/AustinClassifieds
  - Houston: r/houston, r/HoustonClassifieds
  - Dallas: r/Dallas, r/dfw
- Search operators: `"garage sale" OR "yard sale" OR "estate sale" OR "community sale"` + weekend keywords
- Look for multi-family / HOA / church announcements — these often outperform single-home posts.

### 4. Press & Permit

- City official sites for garage-sale permits or temporary sales rules.
- Local digital newspapers and classified sections.
- Community calendars (HOA, libraries, churches — public pages only).

### 5. Signal — Public Social

- X / Twitter advanced search: local hashtags + “garage sale” / “yard sale” + city
  Recommended seeds: `#SAGarageSale`, `#AustinYardSale`, `#HoustonGarageSale`, `#DFWYardSale`
- Public Instagram / Threads hashtag browsing (limited depth without login).

### 6. General Search Operators (all cities)

```
"garage sale" OR "yard sale" OR "estate sale" OR "moving sale" "{City}" (Saturday OR Sunday OR "this weekend") after:YYYY-MM-DD
```

Combine with `site:` for higher precision.

---

## Operational Rules for Forge & Discovery Agents

- Always prefer primary public pages over scrapers of scrapers.
- Log every source URL and retrieval timestamp.
- Hand everything to Sentinel before any map publish.
- When a source starts blocking, document it immediately in the resilience notes and fall back.
- Expand city YAML `sources` section whenever a reliable public path is confirmed.
