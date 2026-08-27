# Square webhook verification — Boost payments

Chicas Map takes the **$9 / 6-month Boost** via Square Payment Link:

`https://square.link/u/xiJuZ66C`

GitHub Pages cannot receive webhooks. Verification runs on a small **Cloudflare Worker** (or any HTTPS endpoint you control).

## What this does

1. Square POSTs `payment.created` / `payment.updated` to your worker.
2. Worker verifies `x-square-hmacsha256-signature` (HMAC-SHA256 over **notification URL + raw body**).
3. On **COMPLETED** payment of about **$9.00 USD** (Boost) or **$5.00 USD** (weekend pin claim), worker:
   - Dedupes by `event_id`
   - Emails review inbox (Formspree or mailto-compatible POST)
   - Fires GitHub `repository_dispatch` → `boost_paid` ($9) or `pin_claimed` ($5)
4. Workflow **Boost pass registry** writes [`ops/boost-passes.json`](../ops/boost-passes.json) with `paid_at` + `boost_until` (+6 months).
5. You activate the gold pin **only after** listing approval **and** an active registry row (see `docs/BOOST_PASSES.md`).

## Square Dashboard setup

1. [Square Developer Dashboard](https://developer.squareup.com/apps) → your application.
2. **Webhooks → Subscriptions → Add subscription**
3. **Notification URL** (must match the worker URL **exactly**, including `https://` and no extra slash mismatch):
   ```
   https://YOUR-WORKER.YOUR-SUBDOMAIN.workers.dev/webhooks/square
   ```
4. Subscribe to at least:
   - `payment.updated`
   - `payment.created` (optional but useful)
5. Save → **Show signature key** → copy it. This is **not** your access token.
6. Use **Production** subscription when the Payment Link is live.

## Worker secrets (Cloudflare)

| Secret / var | Required | Purpose |
|--------------|----------|---------|
| `SQUARE_SIGNATURE_KEY` | Yes | Webhook subscription signature key |
| `SQUARE_NOTIFICATION_URL` | Yes | Exact notification URL Square calls |
| `BOOST_AMOUNT_CENTS` | No | Default `900` ($9.00 Boost) |
| `CLAIM_AMOUNT_CENTS` | No | Default `500` ($5.00 weekend pin claim) |
| `BOOST_CURRENCY` | No | Default `USD` |
| `NOTIFY_FORMSPREE_ID` | Recommended | e.g. existing Formspree id for email alerts |
| `NOTIFY_EMAIL_TO` | Optional | Shown in alert body |
| `GITHUB_TOKEN` | **Yes for registry** | PAT with `repo` scope for `repository_dispatch` |
| `GITHUB_REPO` | Optional | `Justonejewelry/Chicas-Map` |

```bash
cd workers/square-boost-webhook
npm i -g wrangler   # if needed
wrangler secret put SQUARE_SIGNATURE_KEY
wrangler secret put SQUARE_NOTIFICATION_URL
wrangler secret put NOTIFY_FORMSPREE_ID
wrangler secret put GITHUB_TOKEN
wrangler deploy
```

Set vars in `wrangler.toml` or dashboard:

```toml
[vars]
BOOST_AMOUNT_CENTS = "900"
CLAIM_AMOUNT_CENTS = "500"
BOOST_CURRENCY = "USD"
GITHUB_REPO = "Justonejewelry/Chicas-Map"
NOTIFY_EMAIL_TO = "mr.jsciaraffa@gmail.com"
```

## Signature rules (do not skip)

- Message = `notificationUrl + rawBody` (URL first, **no** separator).
- Algorithm = HMAC-SHA256, output **Base64**.
- Header = `x-square-hmacsha256-signature`.
- Compare with **timing-safe** equality.
- Use the **raw** body string; never `JSON.stringify` a parsed object for verification.
- URL must match the subscription URL **byte-for-byte**.

Invalid signature → **401**. Always return **2xx** quickly after accepting a valid event (Square retries on failure).

## Fulfillment rule

```
Boost active  ⇔  registry row active through boost_until  AND  listing approved
```

Do not publish a gold pin from webhook alone. Tracking details: **`docs/BOOST_PASSES.md`**.

## Manual test

1. Deploy worker; paste URL into Square webhook subscription.
2. Pay **$9** (refund if needed) or use sandbox.
3. Confirm `ops/boost-passes.json` gained a row (via `boost_paid` dispatch).
4. If `status: pending_contact`, attach email from the listing review form.

## Local reference implementation

See `workers/square-boost-webhook/src/index.js`.

## Related

- Payment Link: `webapp/js/chica-config.js` → `BOOST_PAYMENT_URL`
- Registry: `ops/boost-passes.json`
- Lookup helper: `scripts/boost_lookup.py`
- Tip webhooks (separate): `docs/WEBHOOKS.md`

Weekend $5 pin claim: **`docs/PIN_CLAIMS.md`**.
