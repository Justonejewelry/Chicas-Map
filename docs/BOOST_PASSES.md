# Boost pass tracking (6 months)

## Product rules

- **Price:** $9 one-time
- **Duration:** 6 calendar months from **payment** date
- **Scope:** All **approved** listings from the same seller (`contact_key`) while the pass is active
- **Activation:** Payment completed **and** listing approved (never payment alone)
- **Live source today:** Square Payment Link + `workers/square-boost-webhook/`
- **Stripe:** same registry, not a second product. Connector is not the publish path.

## Source of truth

[`ops/boost-passes.json`](../ops/boost-passes.json)

This is **not** the public map feed. Public listings only expose:

```json
{
  "boost": true,
  "boost_until": "2027-02-13"
}
```

## How a pass is recorded

### A) Automatic (preferred)

1. Deploy Square webhook worker (`docs/SQUARE_WEBHOOKS.md`).
2. Worker verifies signature → on ~$9 COMPLETED payment fires GitHub `repository_dispatch`:
   - `event_type`: `boost_paid`
   - `client_payload`: payment summary (payment_id, amount, optional buyer_email)
3. Workflow **Boost pass registry** upserts `ops/boost-passes.json`.

If Square does not send buyer email, the row is created with `status: pending_contact`. You edit the row (or re-run the workflow) with the email/phone from the review form.

A `boost_paid` dispatch whose amount is not within 50 cents of $9 is rejected. Missing amount on a dispatch is rejected. Manual `add` can still record a pass.

### A2) Stripe, same event

Do not add a second registry. When a verified Stripe webhook exists, it fires the same `boost_paid` dispatch. Accepted payload fields:

| Stripe field | Registry field |
|--------------|----------------|
| `payment_intent` or `id` | `payment_id` |
| `customer_email`, `receipt_email`, or `customer_details.email` | `contact_key` |
| `amount_total` or `amount_cents` | `amount_cents` (must be ~900) |
| `created` (unix) or `paid_at` | `paid_at` |
| `source: stripe` | `source` |

Gold pin still waits on listing approval. Sentinel floor stays 70.

### B) Manual

GitHub → Actions → **Boost pass registry** → Run workflow:

| Input | Example |
|-------|---------|
| action | `add` |
| contact_key | `seller@email.com` or phone |
| payment_id | Square or Stripe payment id |
| paid_at | `2026-08-13` (optional; defaults to today) |
| display_name | optional |

`boost_until` is computed as paid_at + 6 months.

### C) Mark refunded / expired

Run workflow with action `set_status`, pass `payment_id` + status `refunded` or `expired`.

## Approve checklist

When publishing a sale from a Boost buyer:

1. Open `ops/boost-passes.json`.
2. Find pass where `contact_key` matches submitter email/phone (normalized).
3. Confirm `status` is `active` and today’s date ≤ `boost_until`.
4. On the **published** sale record set:
   - `boost: true`
   - `boost_until: "<from registry>"`
5. If no match → free listing only (or ask them to pay / fix contact).

Normalization used by the workflow:

- email: lowercase, trim
- phone: digits only (optional leading country code kept as digits)

## Expiry

No cron required for correctness: map logic should treat boost as active only if:

```text
boost === true && boost_until >= today
```

Optionally run workflow action `expire_stale` to flip old rows to `status: expired` for cleaner ops views.

## Related

- Payment Link: `webapp/js/chica-config.js` → `BOOST_PAYMENT_URL`
- Webhook worker: `workers/square-boost-webhook/`
- Square setup: `docs/SQUARE_WEBHOOKS.md`
