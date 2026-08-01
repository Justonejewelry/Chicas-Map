# Facebook Graph API Status for Project YardBird / Echo Swarm
Atlas directive — 2026-08-01

## Executive Summary

**Official Facebook Graph API cannot currently power the core Echo Swarm goals** (Marketplace listings + local buy/sell group posts).

| Target data                          | Graph API support (2026)          | Notes |
|--------------------------------------|-----------------------------------|-------|
| Facebook Marketplace listings        | ❌ None                           | Deliberately excluded. No public endpoint. |
| Public Group posts (bulk / monitoring) | ❌ Deprecated / removed         | Groups API fully deprecated (v19+). |
| Public Events                        | ⚠️ Limited                        | Possible with Page token + proper permissions; not designed for metro-wide sale discovery. |
| Public Page posts                    | ⚠️ Limited (after App Review)     | Requires Page Public Content Access (PPCA). Garage-sale harvesting is a low-probability use case for approval. |
| Meta Content Library (Marketplace)   | 🔒 Restricted research access only | Not available for general developer / commercial map projects. |

## Implications for Echo Swarm

Echo remains a **public-content-only** swarm. Detection continues via:

1. Manual / operator seed queues (high-value days)
2. Public hashtag and keyword observation (cross-platform via Signal where possible)
3. User-submitted tips and verified public posts
4. Cross-checks against Heritage (EstateSales.net) and other open sources
5. Future approved Page/Event endpoints only if Meta App Review succeeds for a narrow, compliant use case

No Graph API client will be wired for Marketplace or Groups monitoring. Any third-party service claiming a “Facebook Marketplace API” is almost certainly a scraper and is out of scope / out of policy.

## Future-proofing (if Meta ever opens a compliant path)

- App registration + App Review process documented in `docs/facebook-swarm.md`
- Token handling will go through Guardian + Bridge only (never committed)
- Scope limited to public Page content and Events that a Page admin has authorized
- All records still require Sentinel approval and address validation

## Action

- `docs/facebook-swarm.md` updated to reflect this status
- Echo sub-agents remain non-API for Marketplace and Groups
- No secrets or access tokens are stored or requested for Graph API Marketplace access

Last reviewed: 2026-08-01
