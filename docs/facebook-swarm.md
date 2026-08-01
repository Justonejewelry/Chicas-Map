# Echo Swarm — Facebook Detection Playbook
Project YardBird / GSIN  •  Atlas directive 2026-08-01 (updated for Graph API reality)

## Goal
Systematically harvest **public** Facebook signals without private scraping, without ToS violations, and without relying on non-existent Marketplace endpoints.

## Graph API Status (critical)

As of 2026 there is **no official Graph API access to Facebook Marketplace listings**.  
The Groups API was fully deprecated.  

See `docs/facebook-graph-api-status.md` for the full matrix.

**Echo does not use Graph API for Marketplace or Groups monitoring.**  
Any future Graph API work is limited to approved public Page content or Events after successful App Review.

## Sub-agents (current operating model)

| Sub-Agent          | Role                                      | Method                                      | Notes |
|--------------------|-------------------------------------------|---------------------------------------------|-------|
| **Echo-Marketplace** | Surface public Marketplace-style signals | Manual seed + public observation + user tips | No Graph API |
| **Echo-Groups**      | Local buy/sell & neighborhood groups     | Public posts only; operator seed queue       | Groups API gone |
| **Echo-Public**      | Public Pages & Events                    | Limited Graph API (Pages/Events) **if** App Review succeeds; otherwise manual | Future path only |
| **Echo-Hashtag**     | Hashtag & mention monitor                | Cross-platform (Signal + public search)     | #SAGarageSale etc. |
| **Echo-Lens**        | Photo / flyer OCR                        | Images from public posts → Lens → Scholar   | High value when address is visible |

## Operating constraints (Guardian / Economist / Sentinel)

- Public content only. No private group access, no login-required scraping.
- No long-lived user access tokens for bulk harvesting.
- All records start with `platform: facebook` and initial confidence 0.50–0.65.
- Require at least one of: clear address, photo of sign, or multi-source confirmation before Sentinel promotion to “active”.
- Rate limits and block risk treated as high; prefer quality over volume.

## Integration with forecast

Echo records that clear Sentinel contribute to:
- `source_breakdown.facebook`
- forecast confidence (source diversity bonus)
- hot_zone and category signals
- verified_highlights when value_score is high

## Future Graph API path (if Meta opens a compliant window)

1. Create Meta App under Guardian control.
2. Request only the minimum permissions (Page Public Content Access / Events) with a truthful use-case description.
3. App Review. Expect rejection for pure sale-harvesting; only proceed if approved.
4. Tokens live in Bridge / Guardian secret store only. Never committed.
5. Echo-Public becomes the sole consumer of any approved endpoints.
6. All output still passes Scholar → Compass → Latitude → Sentinel.

Until then, Echo stays non-API for its primary targets.

Success metric remains the number of unique, high-confidence, publicly-sourced Facebook-origin sales that appear on the live map and raise Saturday star ratings — without ToS risk.
