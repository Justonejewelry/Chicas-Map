# Chica Update — 2026-10-05

Email pass after master populate. Workflow pack already exists at `daily-packs/2026-10-05-chica-update-pack.md`. Community swarm was not triggered.

**Map status:** 5 street pins and 1 address fill are staged in `webapp/data/staging/email-leads.json`. They are not on `webapp/data/cities/san-antonio.json` yet. Do not post the deep links until that merge lands.

## Run summary

| Item | Value |
|---|---|
| Target date | 2026-10-05 (Monday, America/Chicago) |
| Workflow | `chica-daily.yml` run `37281813606` — success |
| First dispatch | Rejected. Workflow has no `city` input. Retry used `cities=san-antonio`. |
| Polls | in_progress, in_progress, completed success |
| Community swarm | Not triggered. |
| Emails scanned | 7 threads (3 GSF, 2 ESO daily, 2 ESO ship/PMB). Formspree 0. |
| OCR | Not needed. No flyer attachments. |
| In-fence street rows | 6 |
| Staged, not live | 5 |
| Address fill staged | 1 (281 S popup already on Craigslist) |
| Held | 1 (Gainesborough Dr, no house number) |
| Rejected | Boerne, New Braunfels, San Marcos, Spring Branch, Austin, national online auctions, PMBs |
| Geocoding | 5/6 new in-fence rows street-matched (83.3%). |
| Schema | `schema/city.schema.json` absent. |
| Confidence floor | 0.70. Staged pins at 0.75. |

## Staged sales — next weekend

| Sale | When | Address |
|---|---|---|
| Cross Creek fall community yard sale | Sat–Sun 10/10–10/11 | 8115 Sawyer Meadow, 78254 |
| Helotes Crossing neighborhood garage sale | Sat 10/10, 8–2 | 9614 Wasp Creek, Helotes 78023 |
| Church rummage — Hunters Green | Sat 10/10, bag sale from 1 pm | 2740 Hunters Green, 78231 |
| Oak Meadow neighborhood garage sale | Fri–Sat 10/9–10/10 | 2523 Hunters Green, 78231 |
| Garage sale — Green Grove | Fri–Sat 10/9–10/10 | 5610 Green Grove Dr, 78223 |

Address fill, not a new pin: 24817 US Highway 281 S, Saturday 10/10, 8–3. Craigslist already had it as "South 281 near South 281." Phone stripped.

Held: Gainesborough Dr, 78230, 10/9–10/10. No house number.

## Still open today on the live feed

Alamo Craft Co., 6151 NW Loop 410, 10–6. Par One estate through 10/6. Braun Mesa moving sale through 10/6.

Not sending the pack to Bandera, Lytle, Bulverde, Spring Branch, New Braunfels, Boerne, San Marcos, Austin, or Buda.

## Infographic concept

```
MONDAY SNIFF · 2026-10-05
next weekend, staged, not on the map yet

  NW 78254          HELOTES 78023         NORTH 78231
  Cross Creek       Helotes Crossing      Oak Meadow ~30 homes
  Sawyer Meadow     Wasp Creek · 8–2      Hunters Green Fri–Sat
  Sat–Sun                                 + church rummage Sat 1pm

  SOUTH 78223       SOUTH 281 78264
  Green Grove       popup · Sat 10/10 · 8–3
  Fri–Sat           street fill staged

  held: Gainesborough Dr (no number)
```

## 30-second video

| Visual cue / B-roll | Voiceover |
|---|---|
| Chica nose on a Monday map, magenta cape, watermark bottom-left | Hey pack. Monday sniff. This morning is leftovers. The new trails are next weekend. |
| Pin drop, 2523 Hunters Green | Oak Meadow. Up to 30 homes. Friday and Saturday. |
| Pin drop, 8115 Sawyer Meadow | Cross Creek. About 18 houses. Saturday and Sunday. |
| Pin drop, 9614 Wasp Creek, Helotes | Helotes Crossing. Saturday, 8 to 2. |
| Pin drop, 2740 Hunters Green | Church rummage. Jewelry in the mix. Bag sale starts at 1. |
| Map open, Near Me button | Free map. Near Me. Google, Apple, or Waze. If your street is missing, list it. |
