# Approve tips — easiest path only

You do **not** need Make, Zapier, or webhooks for day-to-day use.

---

## Path A — Easiest (recommended)

When a review email arrives (`YardBird permit tip — review`):

1. Open this chat (or any Grok chat with GitHub connected).
2. Paste the tip JSON from the email.
3. Say: **approve this tip**

I push it to `permit-tips.json`. You hard-refresh the map. Done.

---

## Path B — One label on GitHub (no chat needed)

1. Open [New issue](https://github.com/Justonejewelry/Project-YardBird/issues/new).
2. Title: `tip` + the address.
3. Body: paste the tip JSON inside a fence:

````
```json
{ ... paste tip ... }
```
````

4. Create the issue.
5. Click **Labels** → add **`tip-approved`**.

GitHub Actions publishes it and closes the issue. Refresh the map.

---

## Path C — Email “Approve” link

1. Click **APPROVE** in the email.
2. Once per browser session: paste a fine-grained GitHub token (Contents: Read and write on this repo only).
3. Click **Approve & push to map**.

Page: https://justonejewelry.github.io/Project-YardBird/admin/approve.html

---

## Reject

Ignore the email / don’t label the issue.

## Note

Published tips show as **Seller tip · unverified** — not City-official.
