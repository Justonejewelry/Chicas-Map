# Square webhook verification — Boost payments

Chicas Map takes the **$9 / 6-month Boost** via Square Payment Link:

`https://square.link/u/xiJuZ66C`

GitHub Pages cannot receive webhooks. Verification runs on a small **Cloudflare Worker** (or any HTTPS endpoint you control).

## What this does

1. Square POSTs `payment.created` / `payment.updated` to your worker.
2. Worker verifies `x-square-hmacsha256-signature` (HMAC-SHA256 over **notification URL + raw body**).
3. On **COMPLETED** payment of about **$9.00 USD**, worker:
   - Dedupes by `event_id`
   - Emails review inbox (Formspree or mailto-compatible POST)
   - Optionally fires GitHub `repository_dispatch` → `boost_paid`
4. You activate the gold pin **only after** listing approval **and** this paid signal.

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
| `BOOST_AMOUNT_CENTS` | No | Default `900` ($9.00) |
| `BOOST_CURRENCY` | No | Default `USD` |
| `NOTIFY_FORMSPREE_ID` | Recommended | e.g. existing Formspree id for email alerts |
| `NOTIFY_EMAIL_TO` | Optional | Shown in alert body |
| `GITHUB_TOKEN` | Optional | PAT for `repository_dispatch` |
| `GITHUB_REPO` | Optional | `Justonejewelry/Chicas-Map` |

```bash
cd workers/square-boost-webhook
npm i -g wrangler   # if needed
wrangler secret put SQUARE_SIGNATURE_KEY
wrangler secret put SQUARE_NOTIFICATION_URL
wrangler secret put NOTIFY_FORMSPREE_ID
# optional:
wrangler secret put GITHUB_TOKEN
```

Set vars in `wrangler.toml` or dashboard:

```toml
[vars]
BOOST_AMOUNT_CENTS = "900"
BOOST_CURRENCY = "USD"
GITHUB_REPO = "Justonejewelry/Chicas-Map"
NOTIFY_EMAIL_TO = "mr.jsciaraffa@gmail.com"
```

Deploy:

```bash
wrangler deploy
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
Boost active  ⇔  Square payment COMPLETED (~$9)  AND  listing approved
```

Do not publish a gold pin from webhook alone.

## Manual test

1. Deploy worker; paste URL into Square webhook subscription.
2. In Square, send a test notification (if available) or pay **$9 in sandbox / a real $9 you refund**.
3. Worker logs should show `signature ok` and `boost_paid`.
4. You receive an email / GitHub dispatch with payment id, amount, status, buyer email if present.

## Local reference implementation

See `workers/square-boost-webhook/src/index.js`.

## Related

- Payment Link wired in `webapp/js/chica-config.js` → `BOOST_PAYMENT_URL`
- Submit flow: `webapp/submit.html`
- Tip webhooks (separate): `docs/WEBHOOKS.md`
