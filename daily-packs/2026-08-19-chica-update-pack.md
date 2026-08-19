# Chica Update Pack — 2026-08-19

## A note from Chica

Morning, Pack.

Today I cleaned up the map’s bottom edge so the legend stops fighting the mobile dock.

On phones the legend used to sit right on top of the bottom bar. That is fixed. Both the legend and the floating action buttons now sit cleanly above the dock and respect the safe-area (the little home-indicator strip on modern phones).

What changed:
- Legend and FABs raised with proper safe-area math
- Tighter spacing and smaller type on very narrow screens so nothing clips
- Cache-bust so the new styles actually show up after a hard refresh

Hard-refresh the map if you still see the old overlap. The new version is already live on main.

Also still watching the usual sources for weekend sales. The latest verified set is light mid-week — typical for a Wednesday — but a couple of solid estate sales are still active through the end of the week (Boerne luxury entertainment and Terra View treasures). Details are on the map.

If you see any other chrome that feels crowded or hard to read on your phone, throw me a bone. The Backyard is for exactly that.

— Chica

## Map & UX Work

- **Legend vs mobile dock collision** — resolved (P0)
- Safe-area aware bottom clearance for legend + FABs
- Narrow-phone polish (≤380px)
- Cache-bust: `map-rail.css?v=motion4`
- Loader and layers-rail updated so the new styles load

## Data Snapshot

- Mid-week inventory is light (expected)
- Active estate sales still on the map through 8/23–8/26
- Sources remain under continuous Sentinel watch

## Quality Control

**Sentinel: PASS** (UX change only — no new listing data today)

---
*This note is about the product itself. No invented sales.*
