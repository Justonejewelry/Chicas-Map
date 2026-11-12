# Deal Vision worker

Photo in, item identification + eBay price comps out, for https://www.chicasmap.com/deals/.

* Vision: Google Gemini Flash-Lite by default (`VISION_PROVIDER=gemini`, model in `GEMINI_MODEL`). Swap with `VISION_PROVIDER=openai` (any OpenAI-compatible vision API) or add a function to `PROVIDERS` in `src/index.js`.
* Prices: eBay **Browse API** (application token). These are **asking** prices for active listings; eBay's sold-data API (Marketplace Insights) is restricted and cannot be requested. The page still links to eBay's sold-listings search for real sold comps.
* Images are never stored or logged.

## Secrets (`wrangler secret put NAME`)
| Name | Where |
|---|---|
| `GEMINI_API_KEY` | aistudio.google.com -> Get API key (use a billing-enabled project so prompts are not used to improve Google products) |
| `EBAY_CLIENT_ID` | developer.ebay.com -> Application Keys -> **Production** App ID |
| `EBAY_CLIENT_SECRET` | same keyset, Cert ID |

Also in the eBay developer portal: on the production keyset, either subscribe to Marketplace Account Deletion notifications or apply for the exemption, or the keyset stays disabled.

## Deploy
```
cd workers/deal-vision
npx wrangler login            # or export CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put EBAY_CLIENT_ID
npx wrangler secret put EBAY_CLIENT_SECRET
npx wrangler deploy
```
Then set `DEAL_VISION_URL` in `webapp/js/chica-config.js` to the printed `https://chicas-deal-vision.<subdomain>.workers.dev` URL, commit, push.

Optional hardening (the worker falls back to in-memory + Cache API limits without them): a `ratelimit` binding named `RATE_LIMITER` and a KV namespace bound as `DAILY_KV` (see `wrangler.toml`).

## Tests
`python3 -m unittest tests.test_deal_vision` (runs `tests/deal_vision_worker.test.mjs` with plain node).
