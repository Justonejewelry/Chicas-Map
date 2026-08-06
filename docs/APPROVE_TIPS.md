# Approve user-submitted permit tips

Tips never go live until you approve them.

## Fastest path (email → one page)

1. Open the review email (`YardBird permit tip — review`).
2. Click **Approve this tip** (opens the admin page with the tip pre-filled).
3. First time only: paste a **fine-grained GitHub PAT** with **Contents: Read and write** on `Project-YardBird`.
4. Click **Approve & push to map**.
5. Hard-refresh the map — the pin shows **Seller tip · unverified**.

Admin page (bookmark this):
https://justonejewelry.github.io/Project-YardBird/admin/approve.html

## Alternate: GitHub Actions

1. Open [Publish permit tip workflow](https://github.com/Justonejewelry/Project-YardBird/actions/workflows/publish-tip.yml)
2. **Run workflow** → paste the tip JSON into `tip_json` → Run
3. Wait for the green check, then refresh the map

## Reject

Do nothing. Or reply to the sender.

## Security notes

- The admin page is unlinked from the public nav (`noindex`).
- Token is stored only in `sessionStorage` for that browser tab.
- Tips stay labeled **unverified** on the map — not City-official.
