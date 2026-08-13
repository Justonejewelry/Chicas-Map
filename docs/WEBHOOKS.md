# YardBird tip webhooks

Automate permit-tip intake and approval without hand-editing JSON.

## Events (GitHub `repository_dispatch`)

| event_type    | What it does |
|---------------|--------------|
| `tip_submit`  | Writes `webapp/data/permit-tips-pending.json` + opens a GitHub issue labeled `tip-pending` |
| `tip_approve` | Publishes tip to `webapp/data/permit-tips.json` (map reads this) |
| `boost_paid`  | Fired by Square webhook worker when a verified ~$9 Boost payment completes (see `docs/SQUARE_WEBHOOKS.md`) |

**Endpoint**
```http
POST https://api.github.com/repos/Justonejewelry/Chicas-Map/dispatches
Authorization: Bearer YOUR_GITHUB_TOKEN
Accept: application/vnd.github+json
Content-Type: application/json
```

**Approve example**
```bash
curl -X POST \
  -H "Authorization: Bearer $GH_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/Justonejewelry/Chicas-Map/dispatches \
  -d '{
    "event_type": "tip_approve",
    "client_payload": {
      "address": "123 Example St, San Antonio, TX",
      "permit_number": "BLDG-GS-PMT-1",
      "schedule": "Sat 9am–2pm",
      "summary": "Tools and furniture",
      "public_contact": false,
      "status": "pending_review"
    }
  }'
```

Token needs: **Contents: write**, **Issues: write** (for submit).

## Square Boost payments

Payment Link: configured in `webapp/js/chica-config.js` (`BOOST_PAYMENT_URL`).

Webhook verification + Boost alerts: **`docs/SQUARE_WEBHOOKS.md`** and `workers/square-boost-webhook/`.

## Recommended automation setups

### A) Make.com / Zapier / n8n (easiest)

**Intake**
1. Create a **Catch webhook** (ungessable URL).
2. Put that URL in `webapp/data/webhook-config.json` → `inbound_url`.
3. Map form fields → email you + optional GitHub `tip_submit` dispatch.

**Approve**
1. Scenario: “Button / mailhook / issue label”.
2. Call GitHub module → `repository_dispatch` / `tip_approve` with the tip JSON.
3. Map updates after the Action commits (usually under a minute).

### B) Gmail → automation
1. Filter subject `YardBird permit tip — review`.
2. Parse JSON from body.
3. On label **Approve** (or star), fire `tip_approve` dispatch.

### C) Admin page (no Make)
https://justonejewelry.github.io/Chicas-Map/admin/approve.html  
Email **Approve** link pre-fills the tip; you push with a PAT.

### D) GitHub Actions UI
[Tip webhooks workflow](https://github.com/Justonejewelry/Chicas-Map/actions/workflows/tip-webhook.yml)  
Run workflow → `approve` → paste `tip_json`.

## Form behavior

`permit-tips.js` loads `webhook-config.json`:

- If `inbound_url` is set → `POST` JSON tip there (and still mailto if `also_mailto: true`).
- If empty → mailto only (current default).

## Security

- Never put a GitHub PAT in the static site or in email links.
- Keep automation tokens only in Make/Zapier/n8n/GitHub Secrets / Cloudflare secrets.
- Inbound catch-hook URLs are secrets — treat like passwords.
- Never put Square signature keys or access tokens in the public repo.
- Published tips remain labeled **Seller tip · unverified** on the map.
