# Chica Update Pack — 2026-08-31

This pack is a readable snapshot of the Aug 31 run.
Canonical machine data (when published) lives in `data/sales/`, not here.

Pipeline: Sources → Research → Verification → Canonical JSON/GeoJSON → Sentinel → Map  
Then: Canonical verified data → this Update Pack

---

## 1. Run summary

| Field | Value |
| --- | --- |
| Target date | Monday, August 31, 2026 |
| Run timestamp (San Antonio) | 2026-08-31T06:17:36-05:00 |
| Geographic area | 100 miles from downtown San Antonio (29.4241, -98.4936) |
| Sources checked | 9 |
| Candidates found | 24 |
| Verified (in-person, street + hours, confidence ≥ 70, live today) | 0 |
| Rejected | 24 |
| Duplicates merged | 6 |
| Successfully geocoded (new today pins) | 0 |
| Street View links generated | 0 |
| Sentinel | PASS — no unverified pin published |

Monday after a weekend is a dead driveway day. Sentinel kept yesterday’s pins off rather than leave Sunday addresses on the map.

---

## 2. Verified sales

**None.**

No listing cleared the gate for target date 2026-08-31:

- real street address
- in-person garage / yard / estate / moving / community sale
- hours or a stated open window today
- inside 100 miles of downtown
- confidence ≥ 70
- not expired, not a shop, not an online-only ZIP auction

If a neighbor is holding a Monday sale that never hit a public source, it is not on this pack. List it free: https://justonejewelry.github.io/Chicas-Map/

---

## 3. Rejected / removed listings

These were looked at so the pack does not pretend they were missed.

### Expired (weekend closed Sunday 8/30)

| Listing | Address | Why |
| --- | --- |
| A Lifetime of Treasures in NW Sunshine Estates | 115 Epler Dr, 78228 | Fri–Sun 8/28–8/30, 9–4. Last-day copy was Sunday. |
| Massive 4-day warehouse estate | 314 Spencer Ln, 78201 | Thu–Sun 8/27–8/30. Sunday was final clearance 12–3:30. |
| Moving sale | 3638 Hunters Cir, 78230 | Sat–Sun 8/29–8/30 only. |
| Large garage sale | 7335 Granite Creek Dr, 78238 | Sat–Sun 8/29–8/30. |
| Yard / estate items | 115 Rolling Green Dr, 78228 | Sat–Sun 8/29–8/30. |
| Garage sale | 107 W Ridgewood Ct, 78212 | Sunday 8/30, 8–2 only. |
| Yard sale | 7919 Saddle Run, Schertz 78154 | Sat–Sun 8/29–8/30. |
| Big Yard Sale #9 ½ rain delay | 5006 Pine Lake Dr | Poster: Saturday and Sunday only. |
| Universal City garage | 129 Scott Ave N | Poster: 8/29 & 8/30, 8–4. |
| Green Spring Valley estate / moving | 3537 Green Spring Dr | Poster: “selling only 29th and 30th.” |
| St. Mark Treasures and Trash | 1602 Thousand Oaks Dr | Ended Sunday 8/30. |
| Chicago Style Meets San Antonio | 78203 ZIP | Online auction. Bidding ended Sun 8/30 8:00 PM CDT. |
| Craftsman workshop estate (Caring Transitions) | 78210 ZIP | In-person window was Aug 21–23. Already expired. |

### Duplicate

Same sale seen on EstateSales.org + GarageSaleFinder + YardSaleSearch + GSALR:

- 314 Spencer Ln warehouse
- 115 Epler Dr Sunshine Estates
- 409 E Langley Blvd Universal City (Sep 11–12 listing syndicated twice)

### Insufficient information

| Listing | Problem |
| --- | --- |
| 7267 Wurzbach Rd, 78240 — “Garage Sale” Wed–Thu Sep 2–3 | Posted June 8. No hours. No items. Not today’s date. Below publish quality even for Sep 2 until hours exist. |
| 160 Wildflower Trl, New Braunfels 78130 — Tue Sep 1 | Street + item words (antiques, tools, vintage toys, dressers). No start/end time. Not today. Hold for Sep 1 re-check. |

### Keep estate sales (watched, not pinned today)

Estate inventory is kept on the watch list. None of these are pin-ready for Aug 31.

| Listing | Status |
| --- | --- |
| Design Warehouse Liquidation, Boerne 78006 | Estate / warehouse. Online auction. Bidding ends today 6:30 PM CDT. Pickup Wed 9/2. **No street until invoice.** |
| Charter Oaks Charms, 78230 | Estate online auction. Bidding ends Sun Sep 6 7:00 PM CDT. No street. |
| Fairway Finds, Fair Oaks Ranch / Boerne 78015 | Estate online auction. Bidding ends Wed Sep 9. No street. |
| Forest Waters MCM, 78266 | In-person estate Thu–Sat Sep 10–12. Address hidden until Wed Sep 9. |
| Wimberley estate (art / décor / garage) | In-person Fri–Sun Sep 4–6. Address hidden until Thu Sep 3. Inside 100 miles. Watch for Labor Day weekend. |
| Wimberley second weekend | Starts Sat Sep 12. Hidden address. |

### Outside 100-mile radius from downtown San Antonio

| Listing | Note |
| --- | --- |
| Vintage Finds, Johnson City (CTBids, bidding ends Sep 1) | Online + Johnson City. Outside the working pin radius. |
| Heritage Assoc. of San Marcos Treasure Sale | Sep 19. Date + distance watch, not today. |
| CAIT’S “San Antonio Estate Sale” | Florida 33576, not Texas. Name collision. |

### Unverifiable

| Listing | Note |
| --- | --- |
| Alamo Craft Co. Antiques & More, 6151 NW Loop 410 #302 | Standing antique shop, Tue–Sat 10–6. Not a garage / yard / estate event. Prior packs should not have treated this as a sale pin. |
| Bussey’s Flea Market booth liquidation (IH-35 / Cibolo Valley) | Weekend booth dump, Sat–Sun 29–30. Not a residential sale. Monday market is closed. |
| City of San Antonio garage-sale permits | No fresh Monday permit dump confirmed on this run. Permits stay highest-trust when present; they are not auto-verified sales. |

### Malformed / inaccessible

| Source | Note |
| --- | --- |
| estatesales.net San Antonio index | JS wall / insufficient extract this morning. |
| YardSaleSearch location query | Returned empty / insufficient. |
| GarageSaleFinder `/yard-sales/san-antonio-tx` | 404. ZIP pages still load. |
| Craigslist `gms` search | Search page did not yield a usable list (flagged posts / thin extract). Individual weekend URLs still resolve as expired. |
| Yard Sale Treasure Map | Config-registered. New Braunfels index was stale (July/August community sales), no Aug 31 pins. |
| Live map feed `webapp/data/cities/san-antonio.json` | File on main is the literal string `PLACEHOLDER`. Not a sale feed. |

---

## 4. Source report

| Source | Result |
| --- | --- |
| Yard Sale Treasure Map | Checked. No live Aug 31 San Antonio pins. Nearby pages stale. |
| GarageSaleFinder | ZIP pages loaded. Weekend sales expired. Date filter 8/31–9/6 showed the thin Wurzbach listing only. City URL 404. |
| YardSales.net | Checked. Featured weekend warehouse still listed after close. Next fat listings are Sep 11–12. |
| estatesales.net | Index not usable this run (JS). Company pages exist; no confirmed in-person Aug 31 San Antonio street sale. |
| EstateSales.org | Checked. 8 listings near SA. Only live *today* item is Boerne online auction (no street). |
| Craigslist San Antonio `gms` | Search extract failed / flagged. Known weekend posts confirmed expired by date text. |
| GSALR (gsalr.com) | Best upcoming-street list this morning. No Aug 31 rows. |
| YardSaleSearch | Location query insufficient. |
| City of San Antonio permits | Not confirmed fresh this morning. |
| Live Chicas Map feed | `san-antonio.json` = `PLACEHOLDER`. Map cannot be treated as an authoritative pin count. |

---

## 5. Chica Picks

No 🔥 / ⭐ / 🐾 / 🦴 labels today.

Picks are earned from verified listing data. Zero verified streets = zero picks.

**Watch list (not picks, not pins):**

- Wimberley in-person estate Fri–Sun Sep 4–6 — address drops Thu Sep 3
- 160 Wildflower Trl, New Braunfels — Tue Sep 1 if hours appear
- Forest Waters MCM, 78266 — Sep 10–12, address Sep 9

---

## 6. Map / deployment status

| Artifact | Status |
| --- | --- |
| JSON generated | Snapshot only (`data/sales/2026-08-31.json` = empty verified set). Not a live-map overwrite. |
| GeoJSON generated | Same. Empty FeatureCollection. |
| KML generated | No. Empty set is not worth a KML push. |
| Map updated | **No.** Do not publish Sunday leftovers. Do not publish online ZIP auctions. |
| Street View links generated | 0 |
| GitHub commit | Pack + social files only. `webapp/` untouched. |
| GitHub Pages deployment | Not triggered by this pack. |
| Sentinel | **PASS** |
| Live feed health | **FAIL / stale** — `webapp/data/cities/san-antonio.json` is `PLACEHOLDER` |

Blueprint check: CORE PLATFORM stays untouched. This is local-data + pack output only.

---

## 7. Social package

Channel copy is in:

- `social/2026-08-31-facebook.md`
- `social/2026-08-31-nextdoor.md`
- `social/2026-08-31-tiktok.md`
- `social/2026-08-31-infographic.md`
- `social/2026-08-31-video-30s.md`

All three public posts are written from today’s verified set (zero pins) and end with a share ask.

---

## Council notes (short)

- **Sentinel / QA:** Correct outcome is an empty Monday map, not a recycled Sunday map.
- **GIS:** 100-mile gate held. Johnson City auction stayed out. Wimberley is inside the radius once the street publishes.
- **Blueprint Director:** Pack ≠ database. Do not treat this markdown as a pin source.
- **Product:** Labor Day weekend (Fri Sep 4 – Mon Sep 7) is the next real hunt. Start the Thursday preview from streets, not from this empty Monday file.
- **Growth:** Ask the pack to list Monday/holiday sales. Public sources go quiet on weekdays.

**BUILD / REDESIGN / DEFER / DELETE:** DEFER any Monday pin. P1 for Thursday Labor Day preview. P0 to replace `san-antonio.json` PLACEHOLDER with a real empty-or-live feed so the site does not lie.

---

*Generated from the final verified dataset after Sentinel validation. No unverified claims.*
