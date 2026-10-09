# Chica update — 2026-10-09

## Run summary
- Target: san-antonio / 2026-10-09
- Workflow: chica-daily.yml run 37905660159, status in_progress after 3 polls. First dispatch rejected unexpected input `city`. Retry used `cities=san-antonio`.
- community-events-swarm.yml: not triggered.
- Inbox: 6 matching threads in 2 days. Formspree: 0. Flyer attachments: 0. OCR not needed.
- Live feed loaded: webapp/data/cities/san-antonio.json, 23 public pins, edition Oct 8 email leads.
- Net-new street rows staged: 22. Written to CITY_FILE: 0.
- Dupes: Booth Dr, Brooks Ave, 281 S popup.
- Incomplete holds: Gainesborough Dr, Newkirk/Helotes, Larchmont Dr.
- Rejected: out-of-fence and online-only auctions (New Braunfels, Comfort, San Marcos, Spring Branch, New Berlin, Austin, Houston PMB, Belton SC, Converse online, 78259 online).
- Geocoding: zip centroid only, not rooftop. schema/city.schema.json absent.

## Verified sales feed
Nothing new was published. These are staged GSF streets, confidence 0.75, pending rooftop or manual approve.

## Chica picks
1. 410 E Langley Boulevard, Universal City — Japanese antiques and ceramics, Oct 9-10.
2. 10815 Wedgewood Drive — moving sale, tools and furniture, Sat Oct 10.
3. 16203 Canyon Shadow — antique furniture, Oct 10-11.
4. 9614 Wasp Creek, Helotes — neighborhood sale Sat 8am-2pm.
5. 9371 Brushy Point Street — Friday only, 7am-1pm. Today.

## Infographic concept
```
SAT 10/10  CHICA TRAILS
NW 78250   Fairpoint / Hays Point / Brushy Point (Fri)
NW 78253   Littlefoot / Winding Brooke
NW 78254   Sawyer Meadow / Cross Creek
HELOTES    Wasp Creek 8-2
N 78231    Blenheim Ridge 7-12 / Hunters Green
N 78260    Timberwood Park
NE 78232   Canyon Shadow + Quail Oak
NE 78218   Oakwell Farms / Thornhurst
UC 78148   Langley antiques
MAP        justonejewelry.github.io/Chicas-Map
```

## 30-second video

| Visual cue / B-roll | Voiceover |
| --- | --- |
| Magenta cape, map opening on the SA metro frame | Hey pack. Friday nose check. |
| Pin drop, Helotes Crossing | Saturday, Helotes Crossing, 8 to 2. |
| Tools and a dining table still | Wedgewood moving sale, and Canyon Shadow has antique furniture. |
| Universal City street | Universal City, Langley, antiques and ceramics through Saturday. |
| Thumb on Near Me | Open the free map. Near Me. Google, Apple, or Waze. |
| Watermark bottom-left | List a sale if I missed your street. |

## ESO pass — 05:28 CT
- Trigger: EstateSales.org daily, "3 new sales added near San Antonio." No attachment. OCR not used.
- Workflow: chica-daily.yml run 37917466041, in_progress after 3 polls. First dispatch rejected unexpected input `city`. Retry used `cities=san-antonio`, target_date 2026-10-09. community-events-swarm.yml not triggered.
- Live feed reloaded: 41 public pins, edition "Oct 8 email leads — 18 street pins merged", last_refresh 2026-10-09T05:12:38-05:00.
- Inbox in 2 days: 6 matching threads. Formspree: 0.
- Net-new written to CITY_FILE: 0.
- Rejected this pass:
  1. Vintage Christmas Collectibles — Caring Transitions of New Braunfels — New Braunfels 78132 — bidding closes Sun Oct 11 7:00 PM CDT. Out of fence and online-only.
  2. Mission of Love, veteran's home — Caring Transitions of San Antonio Central — Converse 78109 — bidding closes Sun Oct 11 8:00 PM CDT. Online-only, no street.
  3. Rustic Charm online auction — Caring Transitions of Bulverde & Canyon Lake — San Antonio 78259 — bidding closes Wed Oct 14 7:00 PM CDT. Online-only, no street.
- GSF Friday list already on the public feed or in `webapp/data/staging/email-leads.json` (14 staged streets). Not re-staged.
- Social copy not republished. Confidence floor 0.70 stands. schema/city.schema.json still absent.
