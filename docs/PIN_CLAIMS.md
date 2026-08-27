# $5 weekend pin claim

A **weekend highlight** for one listing. This is not the $9 / 6-month Boost pass.

## Product rules

- **Price:** $5 one-time (Square Payment Link)
- **Duration:** sale dates only (through `date_to` / Sunday of that weekend)
- **Scope:** one listing (`sale_id` / `external_id`)
- **What they get**
  1. Highlighted pin (gold star on the existing map)
  2. Saturday note slot
  3. Extra photos on the listing (send after pay)
  4. What’s-here tags
  5. Still-going / packed / sold-out note
  6. Share caption for local groups
  7. View of the public listing link
- **Activation:** payment recorded **and** listing already on the map (or approved the same weekend)
- Listing itself stays **free**. Claim is extra reach, not access.

Do not promise pins are “never for sale.” Do not replace the $9 Boost.

## Source of truth

[`ops/pin-claims.json`](../ops/pin-claims.json) — ops only, may include `contact_key`.

Public map feed (no email/phone):

[`webapp/data/pin-claims.json`](../webapp/data/pin-claims.json)

The live Leaflet app already treats `boost: true` + `boost_until` as a gold star. The stamp script copies a weekend claim onto those fields so **the current map highlights the pin without a frontend rebuild**.

```json
{
  "boost": true,
  "boost_until": "2026-08-30",
  "claimed": true,
  "claimed_until": "2026-08-30"
}
```

## How a claim is recorded

### A) Automatic (preferred)

1. Host opens `/claim/?sale=<external_id>` or taps **Claim this pin — $5** on a map popup.
2. Pays the $5 Square Payment Link (`webapp/js/chica-config.js` → `PIN_CLAIM_PAYMENT_URL`).
3. Square webhook (`workers/square-boost-webhook`) sees ~$5.00 COMPLETED → `repository_dispatch` `pin_claimed`.
4. Workflow **Pin claim registry** upserts `ops/pin-claims.json` and runs `scripts/stamp_pin_claims.py`.

If Square does not send buyer email or `sale_id`, the row is `pending_sale`. Match it from the claim form email, then re-run the workflow.

### B) Manual

GitHub → Actions → **Pin claim registry** → Run workflow:

| Input | Example |
|-------|---------|
| action | `add` |
| sale_id | `cl-salemovingsaleiylkr45drf81ty7rajr8d2` |
| contact_key | host email or phone |
| payment_id | Square payment id |
| claimed_until | `2026-08-30` (optional; defaults to this Sunday) |

### C) Still-going / packed

Run workflow `set_status` with `payment_id` + `live` / `packed` / `ending` / `sold_out`, or edit the row.

## Square Payment Link

Create a **$5.00 USD** Payment Link in Square (separate from the $9 Boost link).

Paste the URL into [`webapp/js/chica-config.js`](../webapp/js/chica-config.js):

```js
PIN_CLAIM_PAYMENT_URL: "https://square.link/u/YOUR_FIVE_DOLLAR_LINK"
```

Until that URL is set, the claim page still collects the sale + email and mails the inbox so you can mark paid by hand.

## Related

- $9 Boost: `docs/BOOST_PASSES.md`
- Webhook: `docs/SQUARE_WEBHOOKS.md`
- Lookup: `python scripts/pin_claim_lookup.py --list-active`
- Stamp: `python scripts/stamp_pin_claims.py`
