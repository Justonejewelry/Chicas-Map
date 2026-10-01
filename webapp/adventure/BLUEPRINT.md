# Adventure dimension — blueprint note

Status: BUILD · P1
Date: 2026-10-01
Owner: Blueprint Director, via Clowie

## Decision

Adventure is a second **edition** of the same map, not a second city and not a forked pin file.

```
CORE PLATFORM
  sale feed (one)
  pin id (address + lat + lon)
  edition renderer: standard | adventure
  200 ft sniff gate (same radius as pack notes)

CITY CONFIG
  san-antonio bounds, hot zones, feed URL

LOCAL DATA
  bones, sniffed caches, edition choice
  localStorage only until a shared host exists
```

## Mirror rule

A garage sale and its adventure cache are the same object.

- Same `lat` / `lon`
- Same address, dates, hours, source, type
- Adventure may rename the *quest label*. It may not move the pin, invent a sale, or raise confidence.

## Skins

| Edition | Tiles | Pin | Copy |
|---|---|---|---|
| Standard | Voyager | Magenta pin | Sale card, navigate |
| Adventure | Voyager + parchment grade | X mark | Cache, scent trail, bones |

Art source for this build: project parchment map, Chica-on-the-map still, sniff-trail video.

## Pack board

Profile is a pack name plus a recovery code that stays on the phone.
Shared board is `board.json`: name, trail, bones, sniffed. No driveway, no GPS.
A score joins the shared file when a `pack-score` issue is opened. The action rejects addresses.
This is an honor board until a server can check the 200 ft sniff.

## Asset pack (wired 2026-10-01)

- Adventure markers: `x-live.png` · `x-cold.png` · `x-sniffed.png`
- Standard type pins: `pin-garage` … `pin-community`
- Ranks: `rank-pup` … `rank-cape` (Pup/Nose/Trail/Pack/Cape)
- Sniff reward: gold coin overlay plays `coin-ching-from-house.mp4` once on first sniff; `chica-gold-coin.jpg` badge
- HUD: rank badge + bones counter in topbar
- Honor board: rank icons + bones icon per row
- Mirror rule unchanged — art only, same lat/lon

## Hop mechanic (2026-10-01)

Sale Hopper is not a second app. Scoring lives in `chica-hopper.js`. Rules in `HOPPER.md`.

- A hop is a first sniff of a sale id inside 200 feet, accuracy within 65 meters.
- Weekend window: Friday 16:00 CT through Sunday 20:00 CT. Key is that Saturday.
- Trail polyline is the player's own hops, not every pin.
- Public post adds hops and tier only. No address, no GPS.
- Intro no longer autoplays `sniff-trail.mp4`. Parchment PNG is off the map path.
