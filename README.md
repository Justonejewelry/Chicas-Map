# Project YardBird — Garage Sale Intelligence Network (GSIN)

Continuous discovery, verification, scoring, prediction, and mapping of garage, yard, and estate sales.

**Codename:** Project YardBird  
**Primary output:** Living custom Google Map + weekend forecast intelligence  
**Launch city:** San Antonio, TX (unified multi-city rules ready)

## Current Status (2026-08-01 00:30 CDT)

- Repository initialized
- San Antonio city config seeded
- Sample + seed KML available under `maps/san-antonio/`
- Forecast panel skeleton ready
- Discovery: EstateSales.net yielding strong weekend inventory; Craigslist access currently constrained
- Sentinel gate: active for all map publishes

## Structure

```
maps/
  san-antonio/          # KML / GeoJSON layers
data/
  sales/                # Canonical JSON records
city-configs/           # Per-city rules (San Antonio is reference)
forecast/               # Weekend forecast panel data
docs/                   # Architecture notes
```

## Quick Start for Map

1. Download the latest `.kml` from `maps/san-antonio/`
2. Import into [Google My Maps](https://www.google.com/maps/d/)
3. Or load the GeoJSON into any modern map library

## Swarm Overview

Executive: Atlas (Director) • Forge (Ops) • Sentinel (QC)  
Full roster and operating rules live in the companion `gsin-yardbird` skill.

## License / Notes

Data is derived from public listings. Always verify addresses and hours on the source before traveling. Project is in active build.
