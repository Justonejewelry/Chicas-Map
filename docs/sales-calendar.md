# Unified sales calendar

- `/calendar/` and `/es/calendar/`: static, crawlable bilingual agendas plus a progressively enhanced month grid, per-day counts, and sale-type filter.
- `/calendar.ics`: subscribable iCalendar feed. Google and Apple/Outlook subscription links are on both pages.
- `/data/calendar.json`: generated data used by the month grid. Its `saleCount` counts unique dated listings; `eventCount` counts sale-days (one VEVENT per sale per date).

`pages.yml` runs `python3 scripts/build_calendar.py _site` **before** the SEO stamping and root-domain rewrite. Every deploy, including city/email/user data updates from the daily population workflow, rebuilds the pages and feed together. Nothing has to write generated calendar files back to git. Edits to the generator/template also trigger Pages. A successful `Chica Daily (Master Workflow)` also explicitly triggers Pages via `workflow_run`, because commits made with `GITHUB_TOKEN` do not themselves launch push workflows; this also rolls off expired dates on no-change daily runs.

Sources match the San Antonio map/list: `san-antonio.json`, `san-antonio-email.json`, and `san-antonio-user.json`, including all public source providers and dated permits. `data/feed.json` is an older discovery snapshot and is deliberately not used. Identity deduplication and map deep links use `external_id`, `id`, `sale_id`, or the map's coordinate/title fallback. Entries without coordinates can still appear in the calendar.

## Date policy

Only explicit ISO date fields (`date_start`/`date_from`/`start_date` and `date_end`/`date_to`/`end_date`) are scheduled. Expired listings are omitted, and an ongoing multi-day sale contributes only today and later dates, in America/Chicago. Undated listings and permit validity windows appear separately on the page but are not put into the subscription. The calendar does not independently verify or correct source dates; estimated-date notes are retained.

An explicit AM/PM start/end pair becomes a timed UTC event converted from America/Chicago (including DST). Missing/partial hours become DATE-valued all-day entries with exclusive next-day DTEND; the original hours and verification warning remain in the description. There are no invented opening/closing times. Stable per-sale-day UIDs survive title/hour edits for ID-bearing records. Fallback identities have the same limitations as the existing map: title/coordinate edits can change them.

The feed uses CRLF, UTF-8-safe 75-octet folding, escaped text fields, GEO when available, map URL, location and details. Calendar apps choose their own refresh interval (a six-hour interval is suggested, not guaranteed). GitHub Pages normally caches responses for ten minutes. This is a subscription, not a one-time import, and does not automatically add anything to a visitor's calendar until they subscribe.

## Checks

```sh
python3 -m venv /tmp/calendar-check
/tmp/calendar-check/bin/pip install icalendar
/tmp/calendar-check/bin/python -m unittest discover -s tests -v
mkdir -p /tmp/calendar-site
cp -R webapp/. /tmp/calendar-site/
node scripts/build_home.mjs /tmp/calendar-site
python3 scripts/build_calendar.py /tmp/calendar-site
node scripts/stamp-pages.mjs /tmp/calendar-site
node scripts/build_seo_pages.mjs /tmp/calendar-site
node scripts/root-domain.mjs /tmp/calendar-site
```

The Pages build itself uses Python's standard library and does not need `icalendar` installed. The independent parser is a validation-only dependency.
