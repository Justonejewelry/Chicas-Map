# Email Leads Pipeline — Aggressive Filter Spec

**Status:** Locked 2026-08-13 after assisted Gmail scan (A2)  
**Module:** `scripts/email_leads.py`  
**Master flow:** `scripts/chica_daily.py` (optional `--email-leads` / messages JSON)

## Goal
Treat email digests (EstateSales.org, GarageSaleFinder) as a **secondary discovery channel**. Only physical, visitable San Antonio metro sales may enter the published map.

## Aggressive filter rules (zero tolerance)

1. **Street address required** — must contain a street number (`\d+` + street token). City+zip alone is rejected.
2. **Public / scheduled hours preferred** — pure “by appointment only” or “bidding starts to close” without in-person doors → reject.
3. **Reject online-only signals** — `online auction`, `online only`, `CTBids`, `ships!`, `items start closing`, PMB / PO Box addresses.
4. **San Antonio metro only** — allow list includes SA, Helotes, Boerne, Schertz, Cibolo, Fair Oaks Ranch, Converse, Live Oak, Universal City, Bulverde corridor, etc. Far Houston / Dallas / national → reject.
5. **Confidence floor** — same as master schema (`MIN_CONFIDENCE = 70`) after scoring.

## A2 validation result (2026-08-13)
Scanned ~10 days of digests. **Zero** leads passed. Dominant noise: Caring Transitions online/by-appointment auctions (Schertz, etc.) and shipping/PMB promos.

## Assisted vs automated
| Mode | How |
|------|-----|
| Assisted (current) | Grok/Gmail tools pull messages → save JSON → `python3 scripts/email_leads.py --messages-json …` |
| Automated (future) | GitHub Action + Gmail API secret; label processed threads (`YardBird/GSIN`) |

## Deep-follow
Digest bodies often lack street numbers. Passing candidates should be deep-followed (listing URL) via existing `enrich_listing.py` / EstateSales.org HTML JSON embed before publish.

## Labels
Continue applying **YardBird / GSIN** + processed marker so digests are not re-ingested blindly.
