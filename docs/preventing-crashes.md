# Preventing Future Crashes — Chicas Map Webapp

This note captures hard-won failure modes from the live San Antonio map so we do not repeat them. Apply these rules to every change that touches `webapp/map.html`, loaders, overlays, or GitHub Pages deploys.

## 1. Never put a raw `</script>` inside a `<script>` block

**What happened (2026-08-16):** The thin `map.html` loader built HTML patches with string literals that contained the characters `</script>`. The browser closed the outer script early → `SyntaxError: Invalid or unexpected token` → blank “Could not load map” page for all users.

**Rules**

- Prefer building the close tag at runtime:
  ```js
  var close = "<" + "/script>";
  // use: '<script src="js/foo.js">' + close
  ```
- Or escape in source: `<\\/script>` (not always enough if tooling HTML-decodes).
- Never leave `</script>` in comments inside a script tag either — comments still sit in the HTML stream.
- Prefer `split` / `join` over `replace` when injecting script tags so the pattern is explicit.

**Pre-push check**

```bash
# Fail if any raw script closer appears inside the first <script>…</script> of map.html
python3 - <<'PY'
from pathlib import Path
text = Path("webapp/map.html").read_text()
start = text.find("<script>")
if start < 0:
    raise SystemExit(0)
start += len("<script>")
end = text.find("</script>", start)
body = text[start:end]
if "</script>" in body:
    raise SystemExit("FAIL: raw </script> inside map.html loader script body")
print("OK: map.html loader script body is clean")
PY
```

## 2. Prefer a full `map.html` over a fragile document.write loader

The CDN-fetch + `document.write` shell was useful for hotfixes, but it is a single point of failure:

- One syntax error kills the entire product.
- GitHub Pages + service worker lag can leave users on a broken shell for minutes.
- Relative asset paths and injection order are easy to get wrong.

**Preferred path**

- Keep the **complete** map page in `webapp/map.html` (MapLibre markup, CSS links, script tags).
- Ship overlays and fixes as **separate files** (`js/*.js`, `css/*.css`) referenced by normal `<script src>` / `<link href>` tags.
- Use the thin loader only as a temporary emergency bridge, then delete it once the full page is restored.

## 3. Syntax-check JavaScript before every push

Broken string quotes (e.g. WiFi popup HTML) caused `Unexpected identifier 'font'` and cascading “invalid regular expression flags” noise for a large share of sessions.

```bash
# From repo root — adjust paths as needed
find webapp/js -name '*.js' -print0 | xargs -0 -n1 node --check
```

Any non-zero exit **blocks** the merge. Do not rely on the browser console alone.

## 4. Guard MapLibre timing (layers vs style load)

WiFi / Pantries buttons did nothing when layers were added before the style finished loading.

**Rules**

- Wait for `map.isStyleLoaded()` (or `load` / `idle` / `styledata`) before `addSource` / `addLayer`.
- Re-bind layer toggles after the map instance exists (`yb-map-ready` / `window.__YB_MAP`).
- After basemap style switches, re-apply visible overlay layers (see `layer-timing-fix.js`).

## 5. Service worker must not pin a broken HTML forever

`sw.js` precaches `./map.html`. A broken deploy + aggressive cache = prolonged outage even after git is fixed.

**Rules**

- HTML: **network-first** (already the intent in `sw.js`) — never cache-first for `map.html`.
- Bump the `CACHE` name (e.g. `chica-v4`) whenever the HTML shell or critical boot scripts change in a breaking way.
- After a bad HTML deploy, instruct users once: unregister SW or hard-refresh; do not rely on soft reload alone.

## 6. Quote and entity hygiene in pushed source

Some push/tooling paths HTML-decode entities. Strings like `"&quot;"` can become `"""` in the committed file and break parse.

**Rules**

- Prefer `String.fromCharCode(34)` / `String.fromCharCode(38) + "quot;"` when building HTML attribute escapes in JS.
- After any remote edit of a large JS file, re-fetch the blob and run `node --check` on the **live** raw URL, not only the local buffer.

## 7. Layout and CLS stability (soft crash / “jank”)

High CLS does not white-screen the app, but it feels broken and tanks Web Vitals.

- Reserve viewport height for `#map` / `.map-stage` before tiles paint (`cls-fix.css`).
- Give logo / icon images explicit `width` and `height`.
- Keep toasts and install prompts `position: fixed` so they do not shove the map.

## 8. Deploy checklist (copy into PR description)

- [ ] `node --check` on every touched `webapp/js/**/*.js`
- [ ] Loader / `map.html` has **no** raw `</script>` inside script bodies
- [ ] Live smoke: open `/map.html`, wait for pins, click **WiFi** and **Pantries** once
- [ ] DevTools console clean of `SyntaxError` / `Unexpected identifier`
- [ ] If HTML boot path changed: bump SW `CACHE` version
- [ ] Optional: `?cwv_debug=1` and confirm `ChicaWebVitals.getLatest()` returns metrics

## 9. Recovery playbook (if the map goes blank again)

1. Open DevTools → Console. Note the first `SyntaxError` or failed fetch.
2. Compare live Pages HTML vs `main`:
   - https://justonejewelry.github.io/Chicas-Map/map.html
   - https://raw.githubusercontent.com/Justonejewelry/Chicas-Map/main/webapp/map.html
3. If the shell is the problem, restore from the last known-good full page (pinned jsDelivr commit or prior git SHA) **as a complete file**, not a half-patched loader.
4. Bump SW cache name; ask affected users to hard-refresh once.
5. File a short postmortem under `docs/` with root cause + checklist item that would have caught it.

---

**Owner:** Frontend + DevOps  
**Related files:** `webapp/map.html`, `webapp/sw.js`, `webapp/js/public-wifi-layer.js`, `webapp/js/layer-timing-fix.js`, `webapp/css/cls-fix.css`
