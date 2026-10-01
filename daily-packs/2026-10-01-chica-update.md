# Chica update pack — 2026-10-01

## Run summary

- Target date: 2026-10-01 (Thursday, America/Chicago)
- City: san-antonio
- Actions: `chica-daily.yml` dispatch queued. Run `36846622305` completed success. Polled in_progress, then completed. Community swarm not triggered.
- Inbox (newer_than:2d): 5 mailer threads. Formspree: 0.
- Net-new on `webapp/data/cities/san-antonio.json`: 13 after workflow dedupe
- Held, not pinned: 1 (1970s Time Capsule, 78216, address hidden until 2026-10-02)
- Rejected: Georgetown (out of fence), Buda Summer Pointe, Blanco online (ended 9/30), Boerne Hill Country online auction, Schertz BidRush online, New Braunfels online, Sealy auction, Houston PMB / ships, national auctions, Rainbow Dr and Boerne $3 (already on feed, ended 9/30)
- Geocoding: 12/13 new pins rooftop. Whitson is street. 4 email rows already on the workflow feed (Braun Mesa, Hunters Spring, Paloma Wood, Redhorse Pass). Held: 78216 estate, San Marcos Haynes, no-street barndominium at 0.65.
- Schema: `schema/city.schema.json` is not in the repo. `public[]` root keys preserved.
- Confidence floor: 0.75 email. No Formspree rows.

## Verified sales (weekend window)

| When | Where | What | Pin |
|---|---|---|---|
| Sat 10/3 | 7927 Avellano, 78250 | Multi-family, tools, collectibles | rooftop |
| Fri–Sat 10/2–3 | 420 Pierce Ave, 78208 | House clean-out | rooftop |
| Sat–Sun 10/3–4 | 8811 Braun Mesa, 78254 | Moving sale, furniture, appliances | rooftop |
| Sat 10/3 | 3001 Whitson Rd, 78230 | Carrington Place multi-family. Weather permitting. Street pin. | street |
| Sat–Sun 10/3–4 | 14315 Indian Woods, 78249 | Storage downsizing, 8am–4pm | rooftop |
| Sat–Sun 10/3–4 | 503 Antler Dr, 78213 | Castle Hills | rooftop |
| Sat 10/3 | 419 E Magnolia Ave, 78212 | Tall Oaks rummage, 9–1 | rooftop |
| Sat 10/3 | Larchmont at Greenwich, 78209 | Terrell Heights, 25+ households. Map drop. | intersection |
| Sat 10/3 | 2823 Quail Oak St, 78232 | Yard sale, 9–1 | rooftop |
| Sat 10/3 | 18506 Paloma Wood, 78259 | New media / detailing | rooftop |
| Fri–Sat 10/2–3 | 13202 Hunters Spring St, 78230 | Clothes, some jewelry | rooftop |
| Fri–Sat 10/2–3 | 1518 Mardell St, 78201 | Yard sale, rain or shine | rooftop |
| Sat 10/3 | Redhorse Pass, 78247 | Redland Ranch community. No house number. | street |
| Fri–Sat 10/2–3 | 2302 Encino Pt, 78259 | Two-family, memorabilia | rooftop |
| Fri–Sat 10/2–3 | 15730 Lomita Creek Dr, 78247 | Longs Creek, 9–2 | rooftop |
| Sat–Sun 10/3–4 | 15823 Tampke Pl, 78247 | Clothes | rooftop |
| Fri–Sat 10/2–3 | 5610 Green Grv, 78223 | Weather permitting | rooftop |

## Chica picks

1. Tools trail — 7927 Avellano, Saturday. Highest item-density keyword hit.
2. Estate hold — 1970s Time Capsule, Caring Transitions North, 78216, Sat–Sun 9–3. Multi-source (ESO + GSF). Address not public until Oct 2. Not pinned.
3. Neighborhood cluster — Terrell Heights, Larchmont / Greenwich, 25+ households Saturday.
4. Castle Hills — 503 Antler Dr, Sat–Sun.
5. Moving furniture — 8811 Braun Mesa, Sat–Sun.
6. Jewelry mention — 13202 Hunters Spring, Fri–Sat. Keyword only, not a jewelry sale.

## Infographic concept

```
SAT–SUN  OCT 3–4   SAN ANTONIO
---------------------------------
NW tools     7927 Avellano        Sat
NW moving    8811 Braun Mesa      Sat–Sun
NC storage   14315 Indian Woods   Sat–Sun  8–4
Castle Hills 503 Antler           Sat–Sun
Terrell Hts  Larchmont/Greenwich  Sat  25+
Rummage      419 E Magnolia       Sat  9–1
78247 cluster Lomita / Tampke / Redhorse
ESTATE HOLD  78216 time capsule   address Fri
Map: chicasmap.com/sa
```

## 30-second video

| Visual cue / B-roll | Voiceover |
|---|---|
| Map open on San Antonio, magenta pins | Hey pack. Thursday sniff. The weekend trail is up. |
| Pin drop Avellano, tools in a driveway | Saturday tools and collectibles on Avellano, 78250. |
| Cluster on Larchmont | Terrell Heights. Twenty-five households. Map drop at Greenwich and Larchmont. |
| Castle Hills street, Antler pin | Castle Hills both days. Antler Drive. |
| Furniture on a truck, Braun Mesa pin | Moving sale on Braun Mesa. Furniture and appliances. |
| Chica nose on the map, Near Me button | Address for the 1970s estate drops Friday. Free map. Near Me. List it if we missed you. |

Watermark: bottom-left, ~22% width, `brand/chica-video-watermark-overlay.png`.

## Sentinel

- No centroid pin for the hidden estate address.
- Whitson and Redhorse tagged street, not rooftop.
- Online auctions and out-of-fence cities stayed off the map.
- Community events swarm not run.


## Post-workflow dedupe

Already on the live feed from the master populate, not added again: 8811 Braun Mesa, 13202 Hunters Spring, Paloma Wood, Redhorse Pass.
Pulled off public: 1005 Haynes St, San Marcos (out of fence, geocode was downtown SA). 3-day barndominium with no street at confidence 0.65.

## Clowie append — 2026-10-01T05:12-05:00

- Trigger: `chica-daily.yml` on `main`, input `cities=san-antonio` (workflow has no `city` input). Run `36847439210` queued 10:10 UTC, still `in_progress` after 3 polls at 5s. Not `ACTIONS_TRIGGER_MISSING`.
- `community-events-swarm.yml` not triggered.
- Gmail search `newer_than:2d` returned 401. Reconnect required. Emails scanned this pass: 0. OCR not run. Net-new this pass: 0. City file not written. Staging holds unchanged.
- Live feed at read: 26 public pins, all with lat/lon (100%). 13 Craigslist, 13 Email:GarageSaleFinder. Confidence floor held at 0.70. Email rows at 0.75.
- Do not post from `daily-packs/2026-10-01-chica-update-pack.md`. That generator still lists 1005 Haynes St, San Marcos, and Bandera PR 1501 / Lytle FM 3175 as SA picks. Those are outside the Greater SA fence.
- Schema check skipped: `schema/city.schema.json` is not in the repo.
