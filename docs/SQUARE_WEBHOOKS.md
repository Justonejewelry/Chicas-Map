# Square webhook verification — $5 Weekend Sale Spotlight

Chicas Map accepts a **$5 one-time payment** for a gold map pin during the sale weekend. Listing a sale remains free.

- Payment link: `https://square.link/u/qjunxHoo`
- Product: `pin_claim_5`
- Duration: `sale_weekend` (through the Sunday associated with the payment)
- Processor: Square
- Fulfillment: payment verified **and** listing approved

GitHub Pages cannot receive webhooks. Verification runs on the Cloudflare Worker in `workers/square-boost-webhook/`.

## What the webhook does

1. Square sends `payment.created` / `payment.updated` to the worker.
2. The worker verifies `x-square-hmacsha256-signature` using the exact notification URL and raw request body.
3. Only a completed **$5.00 USD** payment (within $0.50 tolerance) is accepted.
4. The worker sends a review notification and fires GitHub `repository_dispatch` with event type `boost_paid`.
5. The **Boost pass registry** workflow records the payment and calculates the weekend end date.
6. A gold pin is activated only after the seller/payment is matched and the listing is approved.

The webhook does not publish a listing or activate a pin by itself.

## Square Dashboard setup

1. Open the [Square Developer Dashboard](https://developer.squareup.com/apps) and select the production application.
2. Go to **Webhooks → Subscriptions → Add subscription**.
3. Set the notification URL to the deployed worker endpoint, ending in `/webhooks/square`. The value must match `SQUARE_NOTIFICATION_URL` byte-for-byte.
4. Subscribe to `payment.updated` and optionally `payment.created`.
5. Save and copy the subscription signature key.

## Cloudflare Worker configuration

Secrets:

- `SQUARE_SIGNATURE_KEY` — required Square webhook signature key
- `SQUARE_NOTIFICATION_URL` — exact production subscription URL
- `GITHUB_TOKEN` — required for GitHub `repository_dispatch`
- `NOTIFY_FORMSPREE_ID` — optional email notification form ID

Non-secret variables in `wrangler.toml`:

```toml
[vars]
BOOST_AMOUNT_CENTS = "500"
BOOST_CURRENCY = "USD"
GITHUB_REPO = "Justonejewelry/Chicas-Map"
NOTIFY_EMAIL_TO = "mr.jsciaraffa@gmail.com"
```

Deploy after merging worker changes:

```bash
cd workers/square-boost-webhook
wrangler deploy
```

Do not set the amount to 900. The retired $9 / six-month pass is not the current product.

## Signature verification rules

- Message: `notificationUrl + rawBody` (URL first, no separator)
- Algorithm: HMAC-SHA256, Base64 output
- Header: `x-square-hmacsha256-signature`
- Compare signatures with timing-safe equality.
- Use the raw request body; do not re-serialize parsed JSON.

Invalid signatures receive HTTP 401. Valid, irrelevant event types are acknowledged without creating a boost.

## Manual test

Use a real $5 payment only when prepared to refund it, or use Square sandbox:

1. Complete a $5 USD payment through the current payment link.
2. Confirm the webhook acknowledges the event and dispatches `boost_paid`.
3. Confirm `ops/boost-passes.json` receives a row with `amount_cents: 500` and a weekend `boost_until`.
4. If the row is `pending_contact`, match the payment to the seller's claim/submission before activation.
5. Approve the sale, then set `boost: true` and `boost_until` on that approved listing.

Fulfillment rule:

```
Boost active ⇔ verified $5 payment + matched seller + approved listing + current weekend
```

See [BOOST_PASSES.md](BOOST_PASSES.md) for the registry and approval checklist.
