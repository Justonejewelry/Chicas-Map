# Permit-holder tips — legal posture (not legal advice)

## Goal
City of San Antonio open data publishes **permit issue date + address**, not sale hours or inventory. YardBird lets a person who **attests** they are the permit holder (or agent) submit schedule + summary for **moderated** publication.

## Why this is the safer pattern
1. **No silent public write** from the browser. Static GitHub Pages cannot safely accept anonymous overwrites of map data.
2. **Attestation checkboxes** (permit holder/agent, accuracy, public terms) before submit.
3. **Moderation gate**: tips email to the operator and only appear after someone adds them to `webapp/data/permit-tips.json`.
4. **Clear labeling**: “Seller tip · unverified” — not City-verified, not YardBird-verified.
5. **No collection of government ID** or sensitive credentials.
6. **Contact optional**; public display of contact only if the submitter opts in.

## What we do *not* claim
- Official City of San Antonio endorsement
- Verified identity of the tip author
- Guaranteed accuracy of hours or inventory
- That a permit pin means a sale is happening *today*

## Operator checklist before publishing a tip
- [ ] Address matches a permit or public listing on the map
- [ ] Schedule is plausible (within permit window / weekend norms)
- [ ] No harassment, spam, or third-party personal data
- [ ] Publish under `tips[]` with `status: "published"`

## User-facing copy (already in UI)
Tips are not official city records. YardBird may edit or remove tips. Treat as a lead only.

*This document is operational guidance, not attorney advice. Laws vary; consult counsel for commercial scale.*
