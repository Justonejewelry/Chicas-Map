# Sale Hopper — locked into Chica Adventure

Status: REDESIGN · P1
Date: 2026-10-01
Owner: Blueprint Director, via Clowie
Product name stays **Chica's Map**. "Sale Hopper" is the mechanic, not a second app.

Live edition: `webapp/adventure/` (BUILD note dated 2026-10-01).
Mirror rule stands: a hop is a sniff of a real pin. Same lat/lon, same sale id. No invented stops.

## Verdict

| Piece | Call | Priority |
|---|---|---|
| Separate Sale Hopper app / brand | DELETE | — |
| Hop streak on the adventure edition | REDESIGN | P1 |
| 200 ft sniff as the only check-in | BUILD (already the gate) | P0 |
| Own-trail polyline | BUILD | P1 |
| Honor board: hops + bones, no GPS | REDESIGN of `board.json` | P1 |
| Badge gate on filters | DELETE | — |
| Item-find points | DEFER | P4 |
| Public route / driveway on the board | DELETE | — |

Filters stay free. A new hunter who cannot filter is a hunter who leaves.

## Weekend window

America/Chicago. `weekend_key` = the Saturday date (`2026-10-03`).

- Opens Friday 16:00 CT (estate sales do not wait for Saturday).
- Closes Sunday 20:00 CT.
- One hop per sale id per weekend.

## Tiers (map onto ranks already shipped)

Do not add a second ladder next to Pup / Nose / Trail / Pack / Cape.

| Hops this weekend | Player-facing | Rank skin |
|---|---|---|
| 1–2 | On the trail | Nose |
| 3–6 | Saturday Starter | Trail |
| 7–11 | Neighborhood Nomad | Pack |
| 12+ | Weekend Warrior | Cape |

## Chain

A chain link requires all of:

- This sniff and the previous sniff are inside the weekend window.
- Gap ≤ 25 minutes.
- Pins are at least 0.15 mi apart (kills driveway-standing).
- Implied speed ≤ 70 mph (kills teleports). A too-fast hop still counts. It does not extend the chain.

Multiplier on the bones for that hop:

- 1 link: 1.0
- 2: 1.25
- 3: 1.5
- 4+: 2.0 cap

Sunday carry: if Saturday hops ≥ 3, Sunday opens at 1.25, not at Saturday's full multiplier. Cap stays 2.0.

Base bones: 10 per verified sniff. Early Bird adds 5. Corridor adds 5 once per zone per day.

## Badges

Fire only from a verified sniff. Missing hours = Early Bird cannot fire.

- `early-bird` — sniff within 15 minutes after listed open.
- `corridor` — 4 sniffs in one `city-configs` hot zone, same local day.
- `copilot` — 5 sniffs in zones the player has already marked favorite. Icon is the existing gold coin, not a second dog.

## Public board

Projection only: `pack_name`, `city`, `weekend_key`, `hops`, `bones`, `tier`.
Never address, lat, lon, trail, or device id.
Still an honor board until a server can confirm the 200 ft sniff.

## Performance contract

- No autoplay of `sniff-trail.mp4` (5.8 MB) or `parchment.png` (1.6 MB) on the map path.
- Coin reward: still frame first. Video only after a first sniff, and only if `prefers-reduced-motion` is off.
- Trail is one Leaflet polyline, magenta `#c513af`, weight 3, no blur, no animated dash tile.
- HUD is one chip. Bottom sheet on phones. No second map instance.
- Touch targets 44px. `env(safe-area-inset-*)` on the chip and sheet.
- Cluster pins. Do not draw a DOM node per sale label at city zoom.
