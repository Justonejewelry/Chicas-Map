# YardBird Web Application Pipeline

## Purpose
Ship the full Garage Sale Intelligence Network workflow as a web product:
discovery → verification → map → forecast → daily edition.

## Architecture (v1 — shipped)

```
[Discovery sources]          [Permit Open Data]
        \                        /
         \                      /
          v                    v
     offline OSINT / scripts (Atlas swarm)
                  |
                  v
         data/sunday_discovery_*.json
                  |
                  v
         webapp/data/feed.json   <-- normalized API-shaped feed
                  |
                  v
         webapp/ (static SPA)
           - Leaflet map
           - list + search + type filters
           - weekend forecast / hot zones
```

**Hosting:** static (GitHub Pages, Netlify, Cloudflare Pages). No server required for v1.

## Roadmap to full workflow

| Stage | Capability | Implementation path |
|-------|------------|---------------------|
| v1 | Map + list + forecast from frozen feed | **Done** — this folder |
| v2 | Auto-refresh feed on schedule | GitHub Action nightly → rebuild feed.json → commit |
| v3 | Live discovery API | Lightweight backend (Cloudflare Worker / FastAPI) proxying public sources |
| v4 | User accounts / saved routes | Optional auth + route optimizer |
| v5 | Yowl video embed + daily briefing | Media CDN + edition player page |
| v6 | Multi-city | City switcher driven by city YAML configs |

## Local run
```bash
cd webapp
python3 -m http.server 8080
# open http://localhost:8080
```

## Deploy (GitHub Pages)
1. Push `webapp/` to `docs/` or enable Pages from `/webapp`.
2. Ensure `data/feed.json` is committed.
3. Site serves map + list immediately.

## Design principles
1. **Static-first** — works offline once feed is loaded.
2. **Same intelligence layer** as KML / Selene / video (one discovery JSON → many outputs).
3. **Mobile usable** — stacked layout under 900px.
4. **No fake pins** — only feed data; confidence visible in popup.
