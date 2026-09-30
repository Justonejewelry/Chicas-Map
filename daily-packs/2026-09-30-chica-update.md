# Chica Update Pack — 2026-09-30

## Run summary
- **Target date:** 2026-09-30 (Wednesday, America/Chicago)
- **City:** san-antonio
- **Actions:** `chica-daily.yml` dispatched on `main` with `cities=san-antonio`, `target_date=2026-09-30`
- **Run:** [36745181695](https://github.com/Justonejewelry/Chicas-Map/actions/runs/36745181695) — **failed** at `actions/setup-python@v5` (`cache: pip` needs `requirements.txt` / `webapp/scripts/requirements.txt`; neither is on main)
- **Community events swarm:** not triggered (manual-only; avoids double-write of `webapp/data/community-events.json`)
- **Inbox scanned:** 6 threads (2 GSF daily, 2 ESO daily, 1 ESO promo Georgetown, 1 ESO PMB/online ships)
- **Formspree:** 0 in `newer_than:2d`
- **Candidates parsed:** 26 unique GSF/ESO rows
- **In-area in-person:** 18
- **Rejected (geo / online-only / PMB):** 8
- **Net-new vs live `webapp/data/cities/san-antonio.json`:** **0** (address or title+date already on the feed)
- **CITY_FILE write:** none
- **STAGING_FILE:** not used (no overflow; staging path does not exist on main)
- **Live feed:** edition "Email lead merge", `date` 2026-09-30, `last_refresh` 2026-09-30T05:45:00-05:00, `total_locations` 50
- **Geocoding this pass:** 0 new pins attempted. Live feed has 22 / 50 pins with `lat: null` (mostly prior Email:GSF/ESO rows)
- **Sentinel:** PASS — no unverified pin added
- **Confidence floor:** 0.70 held

## Inbox decisions
See pack table in repo. All in-area rows were already on the live feed. Rejected: Buda, Blanco online, Boerne online, New Braunfels online, Georgetown, Houston PMB.

## Chica picks (weekend Oct 2–4, from live feed)
1. **Tools + collectibles** — 7927 Avellano, 78250 — Sat Oct 3 — `email-gsf-7927-avellano-san-antonio-tx-78250-20261003`
2. **1970s Time Capsule estate** — 78216 (Caring Transitions North, zip-only) — Sat–Sun Oct 3–4 — `email-eso-1970s-time-capsule-san-antonio-tx-78216-20261003`
3. **Terrell Heights 25+ households** — Larchmont Dr / Greenwich, 78209 — Sat Oct 3 — `email-gsf-larchmont-dr-san-antonio-tx-78209-20261003`
4. **Castle Hills** — 503 Antler Dr, 78213 — Sat–Sun Oct 3–4 — `email-gsf-503-antler-dr-san-antonio-tx-78213-20261003`
5. **Tall Oaks School rummage** — 419 E Magnolia Ave, 78212 — Sat Oct 3, listing copy 9am–1pm — `email-gsf-419-e-magnolia-ave-san-antonio-tx-78212-20261003`
6. **Storage downsizing** — 14315 Indian Woods, 78249 — Sat–Sun Oct 3–4, listing copy 8:00–2:30 — `email-gsf-14315-indian-woods-san-antonio-tx-78249-20261003`

Midweek today (Wed 9/30) on the live feed is thin: Teton Ridge moving/downsizing and Evans Ranch community rows run through 9/30. Do not treat last weekend’s YardSaleSearch cluster as still open.

## Infographic concept (Canva)
```
  CHICA WEEKEND  |  SAT-SUN OCT 3-4
  TOOLS Avellano 78250 | 1970s Time Cap 78216 | 25+ HOMES Terrell Heights
  CASTLE HILLS Antler Dr | RUMMAGE Magnolia 9-1 | STORAGE Indian Woods 78249
  magenta #c513af   map: chicasmap.com/sa
```

## 30-second video script
| Visual Cue / B-Roll | Voiceover Audio |
|---|---|
| Chica magenta cape, porch, SATX morning | Hey pack. Wednesday sniff. Weekend is the hunt. |
| Map slam — Avellano pin | Saturday tools and collectibles on Avellano. |
| Photo still / 70s furniture vibe | Caring Transitions North, 1970s time capsule, Sat and Sun. |
| Neighborhood street / sale signs | Terrell Heights — twenty-five plus households off Larchmont. |
| Castle Hills / Antler, then Magnolia school | Castle Hills both days. Tall Oaks rummage Saturday. |
| Map Near Me + watermark bottom-left ~22% | Free map. Near Me. Routes. List yours if the pin is missing. Let's go. |

Watermark: `brand/chica-video-watermark-overlay.png` per `brand/VIDEO_WATERMARK.md`.

## Map / deploy
- CITY_FILE unchanged
- Pack + social + health-log only
- Pages deploy not triggered by these paths
- Daily master populate did **not** refresh the feed this dispatch

## Next
1. Fix `chica-daily.yml` pip cache paths or add a stub `requirements.txt` (P1).
2. Backfill lat/lon on the 22 null email pins (P1).
3. Do not run `community-events-swarm.yml` from this workflow.
