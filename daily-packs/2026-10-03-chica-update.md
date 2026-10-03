# Chica update pack — 2026-10-03

## Run summary

- Target date: 2026-10-03 (Saturday, America/Chicago)
- City: san-antonio
- Actions: `chica-daily.yml` has no `city` input. Dispatched with `cities=san-antonio`, `target_date=2026-10-03`, `permit_days=14`, `dry_run=false`. Run `37115653128` queued 10:12:43 UTC, `in_progress` on polls 2 and 3, then `completed` / `success` at 10:15:00 UTC. Not `ACTIONS_TRIGGER_MISSING`. https://github.com/Justonejewelry/Chicas-Map/actions/runs/37115653128
- Populate commit on `main`: `6af6452332d80123c9f187e0cf68d71136e5c093` (`Chica master populate — 2026-10-03`). It wrote `webapp/data/cities/san-antonio.json`, `webapp/data/community-events.json`, and `daily-packs/2026-10-03-chica-update-pack.md`. This file is the operator pack. It does not replace that workflow pack.
- `community-events-swarm.yml` not triggered. Community file write came from the daily workflow, not a second swarm.
- Inbox: Gmail token permanently revoked (`oauth-reauth-required`). Emails scanned: 0. OCR not run. Formspree not read. Email net-new: 0. This pass did not write `webapp/data/cities/san-antonio.json`. Staging file not rewritten.
- Live feed after populate: edition `Date window 2026-10-01`, file `date` 2026-10-03, `last_refresh` 2026-10-03T05:13:19-05:00, `public[]` 48, all with lat/lon. Sources: Craigslist 18, YardSaleSearch 15, GarageSaleFinder 14, EstateSales.net 1. Six rows are city-center at 0.65. Nine GSF rows are zip centroids.
- Permits on the same file: 106 total, 1 estate. Permits are not verified sales. `hot_zones` is empty. `date_window.today` is 2026-10-03.
- Schema: `schema/city.schema.json` is not in the repo.
- Confidence floor held at 0.70.

## Verified sales feed (public[], Saturday)

Posted, Greater SA, confidence >= 0.70, street-level pin, date covers today. File windows through 2026-10-05 are not a confirmed open-every-day claim.

| When (as listed) | Where | What | Pin |
|---|---|---|---|
| Sat-Sun 9am-3pm | 138 Shannon Lee St, 78216 | 1970s time capsule. Street is now on the feed. | source |
| Saturday only (title) | 17611 Diamond Canyon | Gold Canyon. Washer, housewares, clothes. | source |
| Today | 7927 Avellano, 78250 | Multi-family. Tools, collectibles. | source |
| Through Mon 10/5 | 8811 Braun Mesa | Moving sale. Appliances, sectional. CL street pin. GSF zip dupe also on file. | source |
| Through Mon 10/5 | 11319 Par One | Airbnb closeout. Furniture. | source |
| Fri-Sat 8am-2pm | 13202 Hunters Spring St | Clothes, housewares, some jewelry. | source |
| Through Mon 10/5 | Jonas Dr, Schertz | Estate with Jonas Woods subdivision. Street only. | source |
| Tue-Sat 10AM-6PM | 6151 NW Loop 410 #302 | Alamo Craft Co. Vintage shop, not a driveway. | source |
| Sat-Sun | 503 Antler Dr, 78213 | Castle Hills garage sale. | source |
| Today 9am-1pm | 2823 Quail Oak St, 78232 | Yard sale. Hours in the title. | source |
| Today | 1923 Parhaven Dr, 78232 | Collectibles, wall art. YSS and CL both have the street. | source |
| Today | 24603 Maple Crst, 78261 | Framed art, mostly $20–$200. | source |
| Today | 419 E Magnolia Ave, 78212 | Tall Oaks / The Acorn rummage. | source |
| Today | Larchmont Dr, 78209 | Terrell Heights neighborhood. No house number. | street |

## Held / do not post

| Item | Why |
|---|---|
| 1005 Haynes St, San Marcos | Still on `public[]` at 0.65, downtown SA geocode. Out of fence. |
| Barndominium, no street, Somerset URL | 0.65, city-center. Below floor. |
| 420 Pierce Ave | GSF row is 0.65 city-center. Not a pick. |
| 1025 PR 1501, Bandera / Mico | Outside Greater SA fence. |
| 5717 FM 3175, Lytle | Outside fence. |
| Boerne Napa Oaks, Bulverde Lariat, New Braunfels Oak Brook / Wasser Ranch / River Chase | Outside fence. New Braunfels and Bulverde rows are city-center or out of area. |
| Bulverde Green / TPC Parkway CL row | Labeled San Antonio, sale is Bulverde Village. Not a SA pick. |
| The Collective Boutiques | Retail, not a sale. |
| Zip-centroid GSF rows (Mardell, Encino Pt, Green Grv, Tampke, Hollimon, Braun Mesa dupe) | Address may be real. Pin is not a driveway. Do not lead with them. |
| Schertz Hometown Harvest | Community file hit is 2026-11-07. Not today. |

## Chica picks

1. Vintage / estate — 138 Shannon Lee, 9-3 today and Sunday. The 78216 hold now has a street on the public feed. Confidence 0.90.
2. Saturday-only community — 17611 Diamond Canyon, Gold Canyon.
3. Tools — 7927 Avellano, multi-family.
4. Appliances — 8811 Braun Mesa. Use the Craigslist street pin.
5. Furniture — 11319 Par One, Airbnb closeout.
6. Jewelry mention — 13202 Hunters Spring, 8-2. Keyword only.
7. Art — 24603 Maple Crst, and 1923 Parhaven for collectibles.

## Infographic concept

```
SAT  OCT 3   SAN ANTONIO
---------------------------------
78216 9-3     138 Shannon Lee        time capsule
TODAY only    17611 Diamond Canyon   Gold Canyon
NW tools      7927 Avellano          multi-family
NW moving     8811 Braun Mesa        appliances
SOUTH close   11319 Par One          Airbnb furniture
NC 8-2        13202 Hunters Spring   clothes + jewelry*
ART           24603 Maple Crst       framed
1604/281      1923 Parhaven          collectibles
HOLD          San Marcos / NB / Bandera / Lytle
Map: https://justonejewelry.github.io/Chicas-Map/
```

## 30-second video

| Visual cue / B-roll | Voiceover |
|---|---|
| Map open on San Antonio, magenta pins | Hey pack. Saturday sniff. Inbox is locked. This is the live feed. |
| Pin drop on Shannon Lee | 78216 time capsule is on Shannon Lee. Nine to three. |
| Diamond Canyon pin | Gold Canyon is Saturday only. |
| Tools on a driveway, Avellano pin | Avellano is multi-family. Tools. |
| Braun Mesa furniture, then Par One | Braun Mesa is the moving sale. Par One is the Airbnb closeout. |
| Chica nose on the map, Near Me button | Free map. Near Me. List it if we missed your street. |

Watermark: bottom-left, ~22% width, `brand/chica-video-watermark-overlay.png`.

## Sentinel

- Email ingest did not add pins. New rows are from the daily populate, not from a parsed inbox.
- Shannon Lee is on `public[]` with a source geocode. Staging hold was not cleared by this pass.
- San Marcos, New Braunfels, Bulverde, Boerne, Bandera, and Lytle stay off the picks.
- Zip-centroid rows stay off the lead list.
- Community events swarm not run.
- Reconnect Gmail before the next lead pass.