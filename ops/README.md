# Ops (not public map data)

Files here support internal workflows. Prefer **not** linking them from the live PWA.

## `boost-passes.json`

Registry of **$9 / 6-month Boost** passes.

| Field | Meaning |
|-------|---------|
| `contact_key` | Normalized email or phone (lowercase, stripped) used to match future listings |
| `display_name` | Optional seller name from Square / submit form |
| `payment_id` | Square payment id (unique) |
| `paid_at` | ISO date/time payment completed |
| `boost_until` | `paid_at` + 6 calendar months (`YYYY-MM-DD`) |
| `status` | `active` \| `expired` \| `refunded` \| `pending_contact` |
| `amount_cents` | Usually `900` |
| `source` | `square` |

### Lifecycle

1. Square Payment Link paid → webhook (optional) → `repository_dispatch` `boost_paid` **or** manual workflow run.
2. Workflow upserts a row in `boost-passes.json`.
3. When you **approve** a listing, look up `contact_key`:
   - if `status === active` and `today <= boost_until` → set on the sale:
     ```json
     { "boost": true, "boost_until": "2027-02-13" }
     ```
4. After `boost_until`, leave the pass row (set `status: expired` optionally); new listings get no gold pin unless they pay again.

### Manual add

Actions → **Boost pass registry** → Run workflow → action `add` → fill contact + payment fields.

### Security note

This repo is public. Store the minimum needed to match a seller. Do not put full card data, SSNs, or long private notes here.

## `pin-claims.json`

Registry of **$5 weekend pin claims** (one listing, sale dates only). See `docs/PIN_CLAIMS.md`.

Public, PII-free copy: `webapp/data/pin-claims.json`. The stamp script copies active rows onto `boost` / `boost_until` / `claimed` on the matching San Antonio listing so the live gold-star map lights up.

