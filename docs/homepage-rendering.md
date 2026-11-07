# Stable homepage rendering

The homepage now serves the actual headline, CTA, calendar link and all 13 neighborhood cards as ordinary HTML. It does not mount the bundled React router, run the delayed copy/fold patches, or inject essential navigation after a timer. Other pages still use their existing app and bundles.

`webapp/index.html` is the English source. `scripts/build_home.mjs` builds the Spanish copy using the `data-home-i18n` keys before SEO stamping. The stamp script preserves both generated languages and their URLs, without the app's old Spanish history rewrite. `home.css` is loaded in the head and reserves the mini-map dimensions, so Leaflet's later tile loading does not shift the layout. Explicit EN/ES links reload the matching static language; the theme preference is applied before paint.

Existing live mini-map/pins, scrolling sale highlights and reels remain progressively enhanced. Their homepage guards recognize both static language variants; highlights go into a reserved slot rather than moving the neighborhood cards. Core navigation continues to work with JavaScript disabled. The static order is eyebrow, headline, introduction, mini-map, CTA buttons, quick links, then neighborhood cards. The map initializer respects this order instead of re-parking the map after the entire hero. Map, calendar and all other page bundles are unchanged.

## Root causes fixed

1. The root-domain publish rewrite removed `/Chicas-Map/` from inside an escaped regular expression in `home-hoods.js`, producing invalid JavaScript. The entire neighborhood section and its calendar link therefore never executed. Path handling now uses string slicing; regression tests syntax-check the **published** assets.
2. The hydrated homepage first displayed the old “Come hunt with me” hero, stale sales and buttons. Delayed `chica-copy`, `home-fold`, `home-fresh`, map placement and React's hydration recovery then rewrote/removed/moved content. Live traces showed React #418 and layout shifts of about 0.28 desktop / 0.75 mobile during the first second. Essential home content is now static and receives no post-paint text replacements.

## Checks

Python tests: `python3 -m unittest discover -s tests -v` (install `icalendar` for the separate calendar parser test).

Headless browser regression (isolated, no saved browser profile):

```sh
npm install --prefix /tmp/home-test playwright
PLAYWRIGHT_PATH=/tmp/home-test/node_modules/playwright \
HOME_TEST_ORIGIN=https://www.chicasmap.com \
HOME_TEST_OUTPUT=/workspace/chica-home-live \
node tests/homepage.cjs
```

Uses `/usr/bin/google-chrome` by default (`CHROME_PATH` overrides). Tests English and Spanish at 1280×800 and 390×844, captures 0/300/1000/3000ms frames, records essential-content mutations/layout shifts, checks no horizontal overflow, the above-fold CTA, all neighborhood links, map initialization, theme, and no-JavaScript navigation.

## Shared theme, footer and support card

The home now loads the same `styles-D8YtPAwk.css` used by the pre-static homepage, with the site's exact `--chica-*` dark/cream-light tokens, Syne display headings, Inter body text, pink pill buttons, glossy language/theme controls, 72rem container and rounded paper cards. Header branding opens a native-details version of the same site menu (no late menu injection). Theme preference uses the same `chicas-map-theme` storage key, is applied before paint, and persists across pages/reloads.

Syne/Inter Latin variable fonts are locally embedded in render-blocking `home-fonts.css`, with matching preload hints generated before the CSS links. This avoids an external Google Fonts round-trip and the one-line-to-two-line heading shift. Font licenses are preserved in `webapp/assets/fonts/{syne,inter}/LICENSE`.

`templates/site-footer.html` reuses the rendered shared SiteFooter from the live Backstory/Sponsors pages: Hunt/Pack/Fine print columns, all seven original badge image assets/links (Grok, GitHub, ChatGPT, Leaflet, OpenStreetMap, Veteran owned and WCAG AA), and the original accessibility-claim disclaimer. Build-time text keys translate the footer for Spanish; badge artwork is unchanged. The disclosure also mentions the new third-party GitHub embed.

The bottom support section contains the user-provided `https://github.com/sponsors/Justonejewelry/card` iframe, lazy loaded into a reserved 225px-high, 600px-max-width responsive frame. The site has no CSP header/meta restricting `frame-src`, so no policy weakening was needed. The existing `X-Frame-Options: SAMEORIGIN` entry in `_headers` controls who can frame this site, not its ability to embed GitHub, and was left unchanged. GitHub controls the card's own content/language.

Browser tests additionally verify the seven badges load, the actual Sponsors card returns HTTP 200 and renders Justin's public display name, no 390px overflow, correct loaded fonts, native menu behavior, and persisted light/cream mode. They save full-page screenshots (with the lazy frame painted) plus an above-fold desktop shot.
