# Chicas Map — Garage Sale Intelligence Network (GSIN)

Continuous discovery, verification, scoring, prediction, and mapping of garage, yard, and estate sales.

**Codename:** Chicas Map  
**Primary output:** Living custom map + weekend forecast intelligence  
**Launch city:** San Antonio, TX (unified multi-city rules ready)

## Current Status (2026-08-01 01:05 CDT)

- San Antonio city config + live KML + forecast live
- **Mercury Swarm** (Craigslist) and **Echo Swarm** (Facebook) defined with specialized sub-agents for resilient detection
- Forecast skeleton + `scripts/populate_forecast.py` for automatic population from verified sales
- EstateSales.net remains strongest verified backbone; Craigslist still constrained but multi-path ready
- Sentinel gate active for all map publishes
- **Sale Intel** — GPS-gated driveway notes (200 m). Live page: https://justonejewelry.github.io/Chicas-Map/intel/

## Structure

```
maps/
  san-antonio/              # KML / GeoJSON layers
city-configs/               # Per-city rules (YAML authoritative)
forecast/                   # Weekend forecast panel data (auto-populated)
templates/
  forecast-skeleton.json    # Starting template for populate_forecast.py
scripts/
  populate_forecast.py      # Turns verified sales → full forecast JSON
  geocode.py
docs/
  agent-roster.md
  agent-roster-expansion.md # Mercury & Echo sub-swarms
  craigslist-swarm.md
  facebook-swarm.md
  improvements-backlog.md
  preventing-crashes.md     # Webapp outage prevention + deploy checklist
```

## Quick Start for Map

1. Download the latest `.kml` from `maps/san-antonio/`
2. Import into [Google My Maps](https://www.google.com/maps/d/)
3. Or load the GeoJSON into any modern map library

Public map: https://justonejewelry.github.io/Chicas-Map/  
Sale Intel: https://justonejewelry.github.io/Chicas-Map/intel/

## Preventing Future Crashes

Operational rules for the GitHub Pages webapp (loader/`</script>` traps, JS syntax gates, MapLibre timing, service worker, deploy checklist):

→ **[docs/preventing-crashes.md](docs/preventing-crashes.md)**

## Swarm Overview

Executive: Atlas (Director) • Forge (Ops) • Sentinel (QC)  
Discovery Leads: **Mercury** (Craigslist multi-path) • **Echo** (Facebook public) • Heritage  
Full roster and operating rules live in the companion `gsin-yardbird` skill and `docs/`.

## License / Notes

Data is derived from public listings. Always verify addresses and hours on the source before traveling. Project is in active build.
