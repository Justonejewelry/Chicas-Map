# Chica update pack — 2026-10-02

## Run summary

- Target date: 2026-10-02 (Friday, America/Chicago)
- City: san-antonio
- Actions: first `run_workflow` with input `city` failed (`Unexpected inputs provided: ["city"]`). Retried with real inputs `cities=san-antonio`, `target_date=2026-10-02`, `permit_days=14`, `dry_run=false`, `reason=weekend master email+pack`. Run `36994336434` queued 10:14 UTC, still `in_progress` after 3 polls at 5s. Not `ACTIONS_TRIGGER_MISSING`.
- `community-events-swarm.yml` not triggered (manual-only). Existing `webapp/data/community-events.json` left untouched. Updated 2026-10-01T12:19:30-05:00, 310 events, version 2.7. No lat/lng on the sampled rows.
- Inbox: Gmail token permanently revoked (`oauth-reauth-required`). Emails scanned: 0. OCR not run. Formspree not read. Net-new this pass: 0. `webapp/data/cities/san-antonio.json` not written. Staging holds unchanged.
- Live feed at read (`main` SHA `d311b6f52e8ac16a410ea6510a7de7ce4b325bd5`): edition `Date window 2026-10-01`, `last_refresh` 2026-10-01T12:18:34-05:00, `public[]` 15, all with lat/lon. Sources: Craigslist 13, GarageSaleFinder 1, EstateSales.net 1. Two rows below the 0.70 floor (0.65, city-center geocode).
- Permits on the same file: 145 total, 2 estate. Permits are not verified sales. `hot_zones` array is empty.
- Schema: `schema/city.schema.json` is not in the repo. `public[]` root keys not modified.
- Confidence floor held at 0.70. No email rows added.

## Verified sales feed (public[], weekend window)

Posted, in Greater SA, confidence >= 0.70. Dates on the file are a window through 2026-10-03, not a confirmed open-every-day claim.

| When (as listed) | Where | What | Pin |
|---|---|---|---|
| Through Sat 10/3, 10AM-6PM Tue-Sat | 6151 NW Loop 410 #302, 78238 | Alamo Craft Co. antiques / vintage shop. Not a driveway. `address_status` hidden_until_sale, but street is in the post. | source |
| Through Sat 10/3 | Jonas Dr, Schertz | Estate with Jonas Woods subdivision sale. Furniture. Street only. | source |
| Through Sat 10/3 | 11319 Par One | Bachelor-pad estate. Tools, car, clothes, furniture. | source |
| Through Sat 10/3 | 8811 Braun Mesa | Moving sale. Furniture, appliances, decor. | source |
| Sat 10/3 only (title) | 17611 Diamond Canyon | Gold Canyon community. Washer, housewares, clothes. | source |
| Through Sat 10/3 | Redhorse Pass near Crimson Stable | Redland Ranch / Elm Creek HOA community. No house number. | street |
| Through Sat 10/3 | S. Flores | Trinity Lutheran rummage. No house number. | street |
| Through Sat 10/3 | 3527 Green Spring | Priced furniture post. Treat as listing, not a confirmed driveway. | source |
| Fri 10/2 and Sat 10/3, 8am-2pm | 13202 Hunters Spring St | Clothes, housewares, some jewelry. | source |
| Through Sat 10/3 | Paloma Wood near Paloma Pass | Media and car-detailing stock. No house number. | street |

## Held / do not post

| Item | Why |
|---|---|
| 1970s Time Capsule, Caring Transitions North, 78216, Sat-Sun 10/3-4, 9-3 | Still in `webapp/data/staging/email-leads.json`. Address hidden until 2026-10-02. Today is the drop day. Street still unknown. Zip centroid only. Not pinned. |
| 1005 Haynes St, San Marcos | Still on `public[]` at confidence 0.65, geocode downtown SA. Out of fence. Do not feature. |
| 3-day barndominium, no street, Somerset URL | Still on `public[]` at 0.65, city-center. Below floor. Do not feature. |
| 1025 PR 1501, Bandera / Mico Holiday Village | Craigslist area is Mico. Outside Greater SA fence. On the feed. Not a pick. |
| 5717 FM 3175 | Craigslist area is Lytle. Outside fence. On the feed. Not a pick. |
| NOW OPEN! The Collective Boutiques, NW Loop 410 / Blanco | Retail, not a sale. |

## Chica picks

1. Tools / estate — 11319 Par One. Item-density hit (tools, furniture, car). Confidence 0.82.
2. Moving furniture — 8811 Braun Mesa. Appliances and decor.
3. Jewelry mention — 13202 Hunters Spring, Friday and Saturday 8-2. Keyword only, not a jewelry sale.
4. Schertz cluster — Jonas Dr estate plus Jonas Woods subdivision. Street pin.
5. Saturday community — 17611 Diamond Canyon, Gold Canyon. Title says Saturday only.
6. Vintage shop, not a driveway — Alamo Craft Co., 6151 NW Loop 410 #302, Friday and Saturday 10-6.
7. Community events (existing file, swarm not re-run) — Schertz Hometown Harvest, Sat 10/3, 9-1, 703 Oak Street. No coordinates on that row.

## Infographic concept

```
FRI-SAT  OCT 2-3   SAN ANTONIO
---------------------------------
SOUTH tools   11319 Par One         Fri-Sat
NW moving     8811 Braun Mesa       Fri-Sat
NC jewelry*   13202 Hunters Spring  Fri-Sat  8-2
SCHERTZ       Jonas Dr estate       street
STONE OAK     17611 Diamond Canyon  Sat only
NW shop       Alamo Craft #302      10-6 vintage
NE community  Redhorse Pass         no number
HARVEST       703 Oak, Schertz      Sat 9-1
HOLD          78216 time capsule    address still hidden
Map: https://justonejewelry.github.io/Chicas-Map/
```

## 30-second video

| Visual cue / B-roll | Voiceover |
|---|---|
| Map open on San Antonio, magenta pins | Hey pack. Friday sniff. Weekend trail is the live feed, not a new inbox. |
| Pin drop on Par One, tools in a driveway | South side estate on Par One. Tools, furniture, a car. |
| Furniture on a truck, Braun Mesa pin | Moving sale on Braun Mesa. Appliances and decor. |
| Hunters Spring street, small jewelry tray | Hunters Spring, Friday and Saturday, 8 to 2. Clothes, and some jewelry. |
| Schertz pin, then Oak Street market | Schertz estate on Jonas. Saturday harvest at 703 Oak, 9 to 1. |
| Chica nose on the map, Near Me button | 78216 estate address still not public. Free map. Near Me. List it if we missed you. |

Watermark: bottom-left, ~22% width, `brand/chica-video-watermark-overlay.png`.

## Sentinel

- No zip-centroid pin for the hidden 78216 estate.
- San Marcos Haynes and the no-street barndominium stay off the pack even though they are still in `public[]`.
- Bandera PR 1501 and Lytle FM 3175 stay off the picks.
- Community events swarm not run. No double-write of `webapp/data/community-events.json`.
- Email ingest blocked on revoked Gmail token. Reconnect before the next lead pass.
