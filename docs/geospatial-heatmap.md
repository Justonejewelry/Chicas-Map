# Geospatial Heatmap Visualization
Project YardBird / GSIN  •  Atlas  •  2026-08-01

## Purpose
Show **density of garage/yard/estate sale activity** across San Antonio so users can instantly see hot corridors and neighborhood concentrations.

## Production approach (current)
**Self-contained Leaflet + leaflet.heat HTML** — no Google API key required.

- File: `maps/san-antonio/heatmap.html`
- Data: municipal permits weighted by neighborhood cluster size
- Base map: Carto Dark Matter (readable glow)
- Overlay: cluster centroid labels (toggleable)

### Intensity model
Each point weight = `0.6 + min(1.4, cluster_size * 0.08)`  
Dense clusters therefore glow hotter than isolated single sales.

### Color scale
Cyan → Lime → Yellow → Orange → Red (low → hot)

## Alternatives considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| Google My Maps | Easy share | No real heatmap support | Pins/clusters only |
| Google Maps JS HeatmapLayer | Native, smooth | Requires API key + billing | Future if key available |
| Kepler.gl | Powerful, time filters | Heavier, less embeddable | Good for analysis |
| Static image (folium/matplotlib) | Simple | Not interactive | Secondary |
| **Leaflet.heat (chosen)** | Zero key, fast, embeddable | Slightly less polished than Google | **Current default** |

## Pipeline fit
```
Permit-Extractor / Discovery
        ↓
Neighborhood Clustering
        ↓
apply_cluster_intelligence.py  →  weighted points
        ↓
heatmap.html  (Cartographer publishes)
```

## Usage
1. Open `maps/san-antonio/heatmap.html` in any modern browser (local or hosted).
2. Or serve from GitHub Pages / any static host.
3. Toggle cluster stars with the button in the panel.

## Next enhancements
- Time-slider (day-of-week / hour decay)
- Separate layers for EstateSales vs municipal vs aggregators
- Mobile-optimized controls
- Optional Google Maps JS path when an API key is supplied
