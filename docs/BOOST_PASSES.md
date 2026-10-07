# Boost pin ($5)

## Product rules

- **Price:** $5 one-time. Square link `https://square.link/u/qjunxHoo`
- **What it is:** Lights the pin for the sale weekend. Listing the sale stays free.
- **Map control:** lower right, `Boost · $5`, opens `/claim/`
- **Activation:** Square payment completed **and** listing approved. Payment alone does not publish a pin.
- **Processor:** Square only.

The old $9 / 6-month pass is retired. Do not revive it.

## Source of truth

[`ops/boost-passes.json`](../ops/boost-passes.json)

This is **not** the public map feed. Public listings only expose:

```json
{
  "boost": true,
  "boost_until": "2026-10-11"
}
```

## How a pass is recorded

1. Square webhook worker verifies the signature.
2. On a COMPLETED payment within 50 cents of $5, it fires `repository_dispatch` `boost_paid`.
3. Workflow **Boost pass registry** upserts `ops/boost-passes.json`.
4. A dispatch that is not about $5 is rejected.

If Square does not send buyer email, the row is `pending_contact`. Attach the email from the claim form before lighting the pin.

## Approve checklist

1. Open `ops/boost-passes.json`.
2. Match `contact_key` to the submitter email or phone.
3. Confirm `status` is `active` and today ≤ `boost_until`.
4. On the approved sale set `boost: true` and `boost_until`.
5. No match → free listing only.

## Related

- Claim page: `webapp/claim/`
- Config: `webapp/js/chica-config.js` → `PIN_CLAIM_PRICE_USD` / `PIN_CLAIM_PAYMENT_URL`
- Map button: `webapp/js/map-cta.js`
- Worker: `workers/square-boost-webhook/`
- Square setup: `docs/SQUARE_WEBHOOKS.md`
