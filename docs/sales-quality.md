# Canonical San Antonio sales

All map pins, list/neighborhood pages, homepage previews, calendar JSON and iCalendar events use `data/sales-clean.json`, never independently concatenate raw inputs. Map **Today** equals the calendar day's count; **All upcoming** equals the total number of locations. The ICS deliberately has one event **per sale-day**, so a multiday sale creates multiple VEVENTs, not multiple locations.

`scripts/sales_quality.py` reads the main, email and user/Facebook city inputs, without rewriting them. It rejects ended CT dates, uncertain dates, non-sale businesses/auctions/appointment listings, clear non-SA cities and coordinates outside 60 miles of downtown SA. Unknown dates are **excluded**, not guessed. Craigslist discovery saves the actual post timestamp and parses absolute or post-relative sale dates; legacy synthetic three-day ranges are ignored. Undated permits remain separate notices, never dated sale pins/events.

Dedupe uses overlapping dates plus normalized numbered addresses/units, source identity/URLs, named community sales, or compatible accurate coordinates within 50 m. Different explicit house numbers/units are preserved, even in a community sharing one post or a coarse city-center geocode. Hand-verified user-overlay values win; richer descriptions/photos and every source URL are retained. Canonical address/date IDs prevent accidental collapse of distinct homes sharing coordinates and a generic title. Old IDs remain aliases for existing map links.

## Required pipeline gates

* `master_populate.py` cleans before daily-pack generation, regenerates after all source actions and requires `clean_sales.py --check` to succeed.
* `chica-daily.yml` runs regressions and requires the final invariant check before committing raw and canonical outputs.
* `pages.yml` regenerates and validates from raw inputs on **every deployment**, including an overlay-only Facebook ingest; calendar/ICS generation uses the same policy. Tests also gate Pages builds.
* `python3 scripts/clean_sales.py webapp` regenerates; `python3 scripts/clean_sales.py webapp --check` fails loudly on duplicate IDs/events, expired/invalid dates, bad geo/types/counts **or stale output versus current inputs**. Both log counts. Detailed decisions live in `data/sales-quality.json`.
* `python3 -m unittest discover -s tests -v` exercises parser, dedupe, neighbor/unit preservation, overlay priority, source provenance, bounds/types, raw overlay preservation, stale/tampered output rejection, Craigslist HTML ingestion and the actual map normalizer/filter in a Node VM. Optional `icalendar` installation enables the existing RFC parser test too.

The 9 AM routine continues writing `webapp/data/cities/san-antonio-user.json` exactly as before. The literal `san-antonio-user.json?v=46` marker in `chica-live-map.js` is retained for that ingest's cache-bump regex; it does **not** cause a raw-overlay browser request. The map fetches the canonical feed and resolves old pin IDs through aliases. Browser data requests bypass stale CDN variants. Missing canonical data fails closed; it never falls back to uncleaned pins.
