# Chica Update — 2026-10-08

## Run summary
- Target date: 2026-10-08 (Thursday, America/Chicago)
- Workflow: `chica-daily.yml` run 37749745018. Input `cities=san-antonio` (`city` is not a workflow input). Trigger queued 2026-10-08 03:25 CT. Polls: in_progress x3, then completed success. Checkout commit `6112eee1`. `community-events-swarm.yml` not triggered.
- Emails scanned: 4 threads in 2 days. Parsed: GarageSaleFinder 10/08, GarageSaleFinder 10/07, EstateSales.org 10/07. EstateSales.org 10/06 seen in search only (snippet: 1 new sale near San Antonio; prior pass rejected it as New Braunfels online). Formspree: 0.
- Live feed after workflow: 19 public pins, 114 permits. Permits not touched.
- Net-new street pins: 18. Census rooftop 20/21 (95.2%). Booth Dr and Brooks Ave already on the feed from YardSaleSearch (0.88); email details filled, source kept. Oakwell Farms miss staged, not mapped.
- Already on feed: 24817 US Highway 281 S popup. Craigslist 0.82 dates 10/07–10/09 kept. GSF Saturday 10/10 8–3 noted only.
- Held: Gainesborough Dr (no house number), Newkirk / Helotes (no house number), 1807 Oakwell Farms Pkwy (Census miss).
- Rejected: online auctions, New Braunfels, Spring Branch, New Berlin, Austin, San Marcos, Comfort, Boerne, Houston PMB, national ship sales.
- schema/city.schema.json: absent. Root keys on the city file preserved. `public[]` only gained posted email pins.

## Verified sales feed — Chica picks
Posted listings, not permits. Confidence 0.75. Priority is item density, a house number, and Friday–Sunday.

| Pick | When | Where | Why |
|---|---|---|---|
| Oak Meadow neighborhood garage sale | Fri–Sat 10/9–10/10 | 2523 Hunters Green, 78231 | Up to 30 homes |
| Cross Creek fall community yard sale | Sat–Sun 10/10–10/11 | 8115 Sawyer Meadow, 78254 | About 18 households |
| Helotes Crossing | Sat 10/10, 8–2 | 9614 Wasp Creek, Helotes | Hours listed |
| Church rummage | Sat 10/10, bag sale 1pm | 2740 Hunters Green, 78231 | Jewelry, furniture, holiday |
| Moving sale, tools | Sat 10/10 | 10815 Wedgewood Dr, 78230 | Tools, furniture, holiday |
| Alpha Wolf Bay community yard sale | Fri–Sat 10/9–10/10 | 1911 Alpha Wolf Bay, 78245 | Snippet says through Sun 10/11; 10/11 not published |
| Booth Dr multi-family | Thu–Fri 10/8–10/9 | 814 Booth Dr, 78216 | Jewelry, clothes. Live today |
| North Star Mall garage sale | Fri–Sat 10/9–10/10 | 511 Stockton Dr, 78216 | Records, Fiesta medals, furniture |
| Canyon Shadow moving sale | Sat–Sun 10/10–10/11 | 16203 Canyon Shadow, 78232 | Antique furniture |
| Brushy Point | Fri 10/9, 7–1 | 9371 Brushy Point St, 78250 | Friday only |
| Schertz multi-family | Thu–Sat 10/8–10/10 | 618 Brooks Ave, Schertz | In fence. Hours not listed |
| Maiden Way moving sale | Sat 10/10 | 3830 Maiden Way, Converse | From 10/07 mail. Still not on the feed |
| Lions Field lot | Sat 10/10 | 2809 Broadway, 78209 | Jewelry, plants |
| Green Grove | Fri–Sat 10/9–10/10 | 5610 Green Grove Dr, 78223 | Clothes, kitchen |

Also mapped, not a pick: Fairpoint, Country Wood, Quail Oak 2822 and 2823 (same item text, both kept), Thornhurst Christmas items, Trinity Oaks (hours missing).

281 S popup stays on Craigslist dates. No phone on the social copy.

## Infographic concept
```
SAT 10/10  CHICA WEEKEND GRID
NW  Oak Meadow ........ 30 homes   Hunters Green
NW  Cross Creek ....... 18 homes   Sawyer Meadow
NW  Fairpoint ......... Fri-Sat    78250
NW  Brushy Point ...... Fri 7-1    78250
N   Helotes Crossing .. 8-2        Wasp Creek
N   Church rummage .... bag at 1   Hunters Green
N   Booth Dr .......... Thu-Fri    jewelry
N   Stockton .......... Fri-Sat    North Star
NE  Wedgewood ......... tools      78230
NE  Canyon Shadow ..... antiques   78232
NE  Quail Oak ......... 2822/2823  same text
E   Lions Field ....... lot sale   Broadway
E   Thornhurst ........ Christmas  78218
E   Maiden Way ........ moving     Converse
E   Brooks Ave ........ Schertz    hours ?
N   Trinity Oaks ...... hours ?    78261
SE  Green Grove ....... clothes    78223
W   Alpha Wolf Bay .... Fri-Sat    78245
S   281 popup ......... live pin   dates kept
HELD  Gainesborough / Newkirk / Oakwell Pkwy
OFF MAP  Boerne New Braunfels Austin Spring Branch San Marcos
```

## 30-second video script
| Visual cue / B-roll | Voiceover |
|---|---|
| Map open, magenta pin on Hunters Green | Hey pack. Friday and Saturday are the hunt. |
| Oak Meadow street, then Sawyer Meadow | Oak Meadow, up to 30 homes. Cross Creek, about 18 houses. |
| Helotes 1604, bag of jewelry | Helotes Crossing, Saturday 8 to 2. Church rummage, bag sale at 1. |
| Tools on a driveway, then Broadway lot | Tools on Wedgewood. Lions Field lot on Broadway. |
| Phone number blurred, Near Me button | No phone numbers. Open the free map, hit Near Me, then Google, Apple, or Waze. |
| Watermark bottom-left, map URL | List a sale if I missed your street. |

## Pass 2 — 04:26 CT EstateSales.org digest
- Trigger: new EstateSales.org daily mail, subject "Your daily estate sales on EstateSales.org", received 04:22 CT. No attachment. No flyer to OCR.
- `chica-daily.yml` retry: first dispatch rejected unexpected input `city`. Second dispatch `cities=san-antonio` queued run 37756288362. Polls at ~5s: in_progress, in_progress, in_progress. Still running at write time. `community-events-swarm.yml` not triggered.
- Emails scanned this pass: 5 threads in 2 days (GSF 10/08, GSF 10/07, ESO 10/08, ESO 10/07, one Houston PMB promo). Formspree: 0.
- Live feed reloaded from `webapp/data/cities/san-antonio.json` at SHA `86fb7af` before this write: 37 public pins, 114 permits. Edition "Oct 8 email leads — 18 street pins". Last refresh 2026-10-08T03:40:00-05:00. Permits not touched.
- ESO "2 new sales added near San Antonio": (1) Vintage Christmas Collectibles, Caring Transitions of New Braunfels, New Braunfels 78132, online bidding closes Sun Oct 11 — out of fence. (2) Rustic Charm Meets Refined Living, Caring Transitions of Bulverde & Canyon Lake, city line only San Antonio 78259, online bidding closes Wed Oct 14 — no street, online auction. Same 78259 online row is also in today's GSF featured block. Not a pin.
- GSF 10/08 rows with a house number are already on the feed (including Maiden Way). 24817 US 281 S popup already on the feed; Saturday 10/10 hours not used to overwrite Craigslist dates. Phone in that GSF row stripped from social.
- Net-new street pins this pass: 0. CITY_FILE not written. Holds stay in staging. schema/city.schema.json still absent.
