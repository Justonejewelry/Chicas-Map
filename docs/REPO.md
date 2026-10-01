# Repo map

Updated 2026-10-01. Paths are the contract. Do not relocate a folder a workflow already calls.

## Public site

| Path | Job |
|---|---|
| `webapp/` | What GitHub Pages publishes |
| `webapp/map/` | Live sale map. Keep `map.html` script versions in lockstep |
| `webapp/adventure/` | Same pins, hop edition. Not a second feed |
| `webapp/atlas/` | Alamo Atlas. Separate product. Do not merge pins |
| `webapp/js/` | Map boot, KEY, pin card, 200 ft notes |
| `webapp/data/cities/` | Public feed the map reads |
| `webapp/css/finish.css` | Phone layout for map chrome and the home header |

## Core platform vs city

| Layer | Path |
|---|---|
| Core | `webapp/`, `app/`, `scripts/schema.py` |
| City config | `city-configs/<slug>.yaml` |
| Local data | `data/sales/`, dated packs, `localStorage` on the phone |

## Pipeline (do not move)

| Path | Job |
|---|---|
| `.github/workflows/chica-daily.yml` | 1 AM CT Thu/Fri/Sat |
| `.github/workflows/pages.yml` | Deploys `webapp/` |
| `scripts/chica_daily.py` | Local orchestrator |
| `scripts/schema.py` | Sale record. Confidence at least 70 to publish |

## Desk

`docs/` operating notes. `social/` posts. `daily-packs/` updates. `brand/` watermark rules.

## Not the product

Root demo videos under `webapp/` are linked from the Atlas card. Leave them until that card points somewhere else. Do not commit a second app named Sale Hopper.
