# Chica update — 2026-10-04 (Sunday)

Target city: san-antonio. Feed read: `webapp/data/cities/san-antonio.json` on main `3eac46fe4fd45453e8691cac692571386c859d76` (edition Oct 3 pack, last_refresh 2026-10-03T10:05:35-05:00). Confidence floor 0.70. No new email rows.

## Run summary

| Item | Result |
|---|---|
| Workflow | `chica-daily.yml` run `37194581274` queued with `cities=san-antonio`, `target_date=2026-10-04`. Still `in_progress` after 3 polls at 5s. First dispatch rejected: workflow has no `city` input. |
| Community swarm | Not triggered. `community-events-swarm.yml` left alone so it cannot double-write `webapp/data/community-events.json`. |
| Existing events file | Updated 2026-10-03T10:07:11-05:00. 306 events. 24 span 2026-10-04. All 24 are San Antonio Public Library events, not sales. |
| Inbox | Gmail token permanently revoked. Scanned 0. OCR not run. |
| Net-new email leads | 0. `CITY_FILE` not written by this pass. Staging `webapp/data/staging/email-leads.json` unchanged (still the 2026-10-01 hold file). |
| Schema | `schema/city.schema.json` is not in the repo. No schema validation possible. |
| Feed size | `public[]` 173. Permits array 106. Hot zones array empty. |
| Date-window hit for 2026-10-04 | 27 pins have a start/end that includes today. Several are Saturday-only titles with a wide scraper window. |
| Geocoding on those 27 | 27/27 have lat/lon. 2 city-center (both out of fence, 0.65). 2 zip-centroid. Email geocoding rate 0.0% because no emails parsed. |
| Rejected for Sunday pack | San Marcos Haynes, New Braunfels Wasser Ranch, Bandera PR 1501, Lytle FM 3175, Bulverde Village, Zane Grey (title says 10/3 only; coords are not in-city), Diamond Canyon (title says Saturday only), Hunters Spring (title Fri–Sat), Redbird Ranch (Sat 10/3 and Sat 10/17), clothing giveaway (Sat 10/3), Alamo Craft Co. (shop hours Tues–Sat). |

## Verified Sunday feed (confidence ≥ 0.70, in fence)

These are already on the map. Not new email pins.

| Pick | Why | Hours | Address | Id |
|---|---|---|---|---|
| 1970s Time Capsule | Explicit Sunday hours. Street geocode. | 9:00 am–3:00 pm | 138 Shannon Lee St, 78216 | `yss-138shannonleestsanantoniotx78216-2026-10-03` |
| Castle Hills | Title says Sat and Sun Oct 3–4. | Not on the pin | 503 Antler Dr, 78213 | `yss-503antlerdrsanantoniotx78213-2026-10-03` |
| Indian Woods downsizing | Dates Oct 3–4, inside garage. | Not on the pin | 14315 Indian Woods, 78249 | `yss-14315indianwoodssanantoniotx78249-2026-10-03` |
| Parhaven collectibles | Craigslist text says Sat and Sun 9 am–4 pm. Same street also on YardSaleSearch. | 9 am–4 pm in CL body | 1923 Parhaven Dr, 78232 | `cl-garagesale281ntbwei1qakdhothgs5urrga` |
| Braun Mesa moving | CL weekend window plus GSF Sat–Sun. Use the CL street pin, not the 78254 zip centroid duplicate. | Not on the pin | 8811 Braun Mesa | `cl-movingsalehigh9hueatyfeupn163ktddtps` |
| Par One Airbnb closeout | Body says this weekend. Window Oct 3–5. | Not on the pin | 11319 Par One | `cl-rbnbgaragesalef8hxa3nqp25ybdtpsjqdd5` |
| Tampke | GSF says Sat–Sun. Zip centroid only. Thin title. | Not on the pin | 15823 Tampke Pl, 78247 | none on feed |
| Schertz estate | Jonas Woods subdivision sale. Street name only, no house number. | Not on the pin | Jonas Dr (listed as San Antonio; body says Schertz) | `cl-hertzestatesalew6ijmb5guswk8b1ctk3s7h` |

Held off the Sunday list on purpose: Sierra Hollow, Green Spring, Paloma Wood, Redhorse Pass, S. Flores rummage. Dates overlap today, but the copy does not say Sunday and the address is incomplete on three of them.

## Infographic (Canva)

```
SUNDAY 10/4  ·  CHICA'S MAP  ·  GREATER SA
------------------------------------------
9–3   Shannon Lee 78216     time capsule
9–4   Parhaven 78232        vintage / cars / art
AM    Antler 78213          Castle Hills, both days
AM    Indian Woods 78249    inside garage
      Braun Mesa            moving, appliances
      Par One               Airbnb closeout
------------------------------------------
NOT TODAY: Redbird (Sat 10/3 + Sat 10/17)
NOT SENT: Bandera, Lytle, Bulverde, New Braunfels, San Marcos
Map: justonejewelry.github.io/Chicas-Map
```

## 30-second video

Watermark: bottom-left, ~22% width, `brand/chica-video-watermark-overlay.png`.

| Visual cue / B-roll | Voiceover |
|---|---|
| Map open on San Antonio, magenta pin drop | Hey pack. Sunday sniff. Gmail is locked, so these are stops already on the map. |
| 138 Shannon Lee pin | Shannon Lee, 9 to 3. Time capsule. |
| Parhaven pin, 281 and 1604 | Parhaven, 9 to 4. Collectibles and wall art. Saturday and Sunday in the post. |
| Antler, then Indian Woods | Castle Hills on Antler. Indian Woods is inside the garage. |
| Braun Mesa, then Par One | Braun Mesa is the moving sale. Par One is the Airbnb closeout. |
| Redbird pin with a Saturday label | Redbird Ranch is not today. That one is Saturday the 3rd and Saturday the 17th. |
| Near Me button, then Google / Apple / Waze | Free map. Near Me. Then Google, Apple, or Waze. List it if I missed your street. |

## Community events

Swarm not run. Do not treat the 24 library events as sale pins.
