# Neighborhood Event Clustering
Project YardBird / GSIN  •  Atlas  •  2026-08-01

## Purpose
Group nearby garage/yard/estate sales into **neighborhood event clusters** so the map, forecast, and routing layers can treat multi-house concentrations as single high-value opportunities.

## Method (current production default)
- **Algorithm**: Single-linkage density clustering
- **Radius**: 1 200 m (~0.75 mi) — tuned for typical SA residential block / multi-house sale density
- **Input**: Any verified sale records with valid lat/lon (permits, EstateSales, aggregators, etc.)
- **Output**: Ranked clusters with centroid, size, hot-zone label, date span, member permit/sale IDs

## Hot-zone labeling
Each cluster centroid is assigned the nearest city-config hot zone (within ~8 km). Unmatched clusters are labeled “Other / Unassigned”.

## Agents that consume clusters
| Agent | Use |
|-------|-----|
| **Pulse** | Attendance / parking pressure estimates rise with cluster size |
| **Beacon / Neighborhood DNA** | Long-term neighborhood productivity profiles |
| **Navigator / Commuter** | Route optimization prefers dense clusters early in the day |
| **Treasure / Collector** | High-value category probability adjusted by cluster density |
| **Cartographer / Pinmaster** | Cluster badges or heatmap layers on the map |
| **Selene** | “Multi-house concentration in [zone]” language in briefings |
| **Oracle** | Seasonality and emerging neighborhood signals |

## Pipeline position
```
Discovery → Extraction → Verification (Sentinel)
        ↓
   Neighborhood Clustering   ← new intelligence step
        ↓
Pulse / Beacon / Navigator / Cartographer / Forecast
```

## Implementation
- Script logic lives alongside permit extraction and forecast population.
- Artifact: `data/neighborhood_clusters.json`
- Re-run after each major Discovery + Sentinel pass (especially Thu–Sat).

## Tuning notes
- 1.2 km works well for SA residential fabric.
- Smaller radius (600–800 m) for dense urban cores; larger (1.5–2 km) for exurban pockets (Helotes, Boerne edge).
- Future: time-decay so only sales active on the same calendar day form live clusters.

## First live result (21-day permit window)
- 173 geocoded permits → 82 clusters
- Largest cluster: 30 sales (South Side)
- Strong secondary concentrations: Northwest Side, Alamo Ranch, Northeast Side, Alamo Heights / Terrell Hills corridor
