# Site improvements — Nov 2026 (branch `improvements`)

## Done in code
- **Map tiles**: MapTiler is probed; on 403 the map already falls back to Esri tiles. Added a last-resort
  keyless OpenStreetMap layer (with attribution) if Esri tiles also fail.
- **Missing intro video**: the two `facebook-*.js` bundles pointed two reels at `media/chica-intro.mp4`
  (which pages.yml deletes). Tiny string edits set `localSrc:null` and point the intro card at Chica's
  top reel (facebook.com/reel/1381637970779173, poster `media/reels/1381637970779173.jpg`).
- **Trip planning** (`js/trip-tools.js`, `js/hunt-bar.js`): Today / Tomorrow / This weekend filters (CT),
  "Add to route" on every sale card, a "My route" panel (up to 10 stops) that opens Google Maps directions.
- **Share**: Share button on every sale card (native share sheet, or copies the link). Links are
  `/map/?sale=<id>`; opening one zooms to the pin and opens its card. /list/ rows now use the same links.
- **Ended sales**: map and /list/ hide sales whose end date is before today (America/Chicago), and on the
  last day the map hides them 30 minutes after posted closing time. `purge_expired.py` now also drops
  ended pins from `san-antonio-user.json` (only ones with an ISO end date).
- **Submit**: optional "Photo link" field (sent with the existing FormSubmit email from chica-menu.js) and a
  "what happens next" note after sending.
- **SEO**: `scripts/build_seo_pages.mjs` (run by pages.yml after stamp-pages) builds `/garage-sales/` and 14
  neighborhood pages from the live feed, with titles, OG/Twitter cards, Event JSON-LD, and sitemap entries.
  Empty neighborhoods are `noindex` and left out of the sitemap.

## Needs the owner
- **MapTiler**: in cloud.maptiler.com → Account → API keys → the key in `js/chica-config.js` → *Allowed HTTP
  origins*, add `www.chicasmap.com` and `chicasmap.com` (or remove the restriction). Then the nicer
  MapTiler outdoor tiles come back automatically.
- **Rebuildable source**: `app/src` has only ~12 files, no package.json/vite config, and none of the
  strings used by the live submit/media/facebook pages. The live React bundles can't be rebuilt from the
  repo; the original project (package.json, vite config, all routes, i18n) is needed. Until then, edits
  to `webapp/assets/*.js` are hand-patches and must be redone if a rebuild ever happens. React error #418
  (hydration mismatch) comes from those prebuilt bundles and can't be fixed safely without the source.
- **Photo uploads**: FormSubmit's free AJAX endpoint doesn't take file uploads, so it's a link field.
  Real uploads need a storage backend (e.g. Cloudflare R2 via the existing worker) plus a secret.
- **"Your sale is live" email**: nothing in the pipeline knows a submitter's email when a sale is approved;
  that needs an approval step that sends mail (e.g. from tip-webhook.yml with an email API secret).
