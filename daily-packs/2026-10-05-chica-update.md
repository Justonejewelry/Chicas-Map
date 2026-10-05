# Chica Update — 2026-10-05

Email pass after master populate. Workflow pack already exists at `daily-packs/2026-10-05-chica-update-pack.md`. This file is the email-lead pack. Community swarm was not triggered.

## Run summary

| Item | Value |
|---|---|
| Target date | 2026-10-05 (Monday, America/Chicago) |
| Workflow | `chica-daily.yml` run `37281813606` — success |
| First dispatch | Rejected. Workflow has no `city` input. Retry used `cities=san-antonio`. |
| Polls | in_progress, in_progress, completed success |
| Community swarm | Not triggered. Do not double-write `webapp/data/community-events.json`. |
| Emails scanned | 7 threads (3 GSF, 2 ESO daily, 2 ESO ship/PMB). Formspree 0. |
| OCR | Not needed. Bodies had addresses and dates. No flyer attachments. |
| In-fence street rows | 6 |
| Net-new pins | 5 |
| Address fill | 1 (281 S popup already on Craigslist) |
| Held | 1 (Gainesborough Dr, no house number) |
| Rejected | Boerne, New Braunfels, San Marcos, Spring Branch, Austin, national online auctions, PMBs |
| Geocoding | 5/6 new in-fence rows street-matched (83.3%). Gainesborough unresolved. |
| Schema | `schema/city.schema.json` absent. `public[]` root keys preserved. |
| Confidence floor | 0.70. New pins at 0.75. |

## Verified sales feed — email adds

Next weekend, not this morning.

| Sale | When | Address | Why it made the cut |
|---|---|---|---|
| Cross Creek fall community yard sale | Sat–Sun 10/10–10/11 | 8115 Sawyer Meadow, 78254 | ~18 households. Census street match. |
| Helotes Crossing neighborhood garage sale | Sat 10/10, 8–2 | 9614 Wasp Creek, Helotes 78023 | Hours listed. Census match. |
| Church rummage — Hunters Green | Sat 10/10, bag sale from 1 pm | 2740 Hunters Green, 78231 | Jewelry and household. Church pin. |
| Oak Meadow neighborhood garage sale | Fri–Sat 10/9–10/10 | 2523 Hunters Green, 78231 | Up to 30 homes. House match. |
| Garage sale — Green Grove | Fri–Sat 10/9–10/10 | 5610 Green Grove Dr, 78223 | Clothes, shoes, kitchen, decor. Census match. |

Address fill, not a new pin: popup at 24817 US Highway 281 S, 78264, Saturday 10/10, 8–3. Craigslist already had it as "South 281 near South 281" with a scraper window of 10/5–10/7. Email date is 10/10. Phone stripped from public copy.

Held: Downsizing garage sale, Gainesborough Dr, 78230, 10/9–10/10. No house number. Not a pin.

## Chica picks

1. Oak Meadow, up to 30 homes — 2523 Hunters Green. https://chicasmap.com/sa?id=gsf-2523huntersgreen-2026-10-09
2. Cross Creek, ~18 households — 8115 Sawyer Meadow. https://chicasmap.com/sa?id=gsf-8115sawyermeadow-2026-10-10
3. Helotes Crossing, 8–2 — 9614 Wasp Creek. https://chicasmap.com/sa?id=gsf-9614waspcreek-2026-10-10
4. Church rummage, jewelry, bag sale at 1 — 2740 Hunters Green. https://chicasmap.com/sa?id=gsf-2740huntersgreen-2026-10-10
5. Still open today from the populate feed: Alamo Craft Co., 6151 NW Loop 410, 10–6. Tools and furniture estate at 11319 Par One through 10/6. Moving sale at 8811 Braun Mesa through 10/6.

Not sending the pack to Bandera, Lytle, Bulverde, Spring Branch, New Braunfels, Boerne, San Marcos, Austin, or Buda. Haynes St stays off the social list. Downtown coordinates on that pin are wrong.

## Infographic concept

```
MONDAY SNIFF · 2026-10-05
next weekend, not this morning

  NW 78254          HELOTES 78023         NORTH 78231
  Cross Creek       Helotes Crossing      Oak Meadow ~30 homes
  Sawyer Meadow     Wasp Creek · 8–2      Hunters Green Fri–Sat
  Sat–Sun                                 + church rummage Sat 1pm

  SOUTH 78223       SOUTH 281 78264
  Green Grove       popup · Sat 10/10 · 8–3
  Fri–Sat           street filled, phone stripped

  held: Gainesborough Dr (no number)
  map: chicasmap.com
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
