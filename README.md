# Chica's Map — San Antonio Community Intelligence Network

Howdy y'all. I'm Chica — a little brown Chihuahua with a nose for useful information and a big soft spot for San Antonio.

Chica's Map is a community-built map for garage sales, yard sales, estate sales, food resources, community events, public Wi-Fi, school-zone information, parking, and other useful local points. The goal is simple: **share what you know, help your neighbors, and make the next trip a little smarter.**

**Codename:** Chica's Map  
**Primary output:** Living community map + local intelligence  
**Launch city:** San Antonio, Texas  
**Mission:** Find useful information, verify it, share it, and keep improving it together.

## The Chica Pack

One person can find a pin. A pack can build a map.

Chica's Map grows when neighbors contribute, correct, verify, and share information. A useful address, a correction, a better source, a photo, or a suggestion can help somebody else save time, money, fuel, or a wasted trip.

We believe good neighbors look out for one another. **Share the good stuff. Give credit. Respect people's time. Verify what you can. Help the next person.**

The spirit behind the pack follows the Army Values:

- **Loyalty** — stand by your community.
- **Duty** — do your part when you can.
- **Respect** — treat people and their information with dignity.
- **Selfless Service** — contribute because it helps the whole pack.
- **Honor** — do the right thing when nobody is watching.
- **Integrity** — keep information honest and clearly labeled.
- **Personal Courage** — speak up when something needs to be corrected or improved.

San Antonio has always been a place where people help people. Chica's Map is built in that spirit.

## Current Status

- San Antonio city configuration and live map are active
- Multi-city rules are prepared for expansion
- Verified public listings and local datasets feed the map
- Forecast and clustering tools help organize dense areas and useful routes
- Sentinel quality gates remain active for map publishing
- **Sale Intel** provides location-aware notes at the pin when available

## What We Map

The project can combine multiple useful layers, including:

- Garage, yard, and estate sales
- Community events
- Food pantries and emergency resources
- Public Wi-Fi
- Parking information
- School-zone and traffic-aware information
- Neighborhood clusters and other local intelligence

## Structure

```text
maps/
  san-antonio/              # KML / GeoJSON layers
city-configs/               # Per-city rules (YAML authoritative)
forecast/                   # Forecast and local intelligence data
templates/                  # Reusable data templates
scripts/                    # Collection, verification, enrichment, and publishing tools
docs/                       # Project rules, technical notes, and operating guidance
social/                     # Community-ready posts and updates
daily-packs/                # Chica updates and local intelligence packs
reports/                    # Generated community reports
webapp/                     # Published web application
```

## Use the Map

Open the public map:

https://justonejewelry.github.io/Chicas-Map/

Open **Sale Intel**:

https://justonejewelry.github.io/Chicas-Map/intel/

For map data, download the latest KML or GeoJSON from `maps/san-antonio/` and load it into Google My Maps or another compatible mapping tool.

## Community Rules

Chica's Map works best when everybody does a little.

**See something useful? Share it.**  
**See something wrong? Tell us.**  
**Know a better source? Point us there.**  
**Have an idea? Bring it to the pack.**

We welcome suggestions, corrections, and better ways to serve San Antonio. Your time matters, and every contribution helps.

Please verify addresses, schedules, prices, and availability with the original source before traveling. Public information can change.

## Preventing Future Crashes

Operational rules for the GitHub Pages webapp, deployment checks, and outage prevention live here:

→ **[docs/preventing-crashes.md](docs/preventing-crashes.md)**

## Technical Team

Chica has a whole crew behind the curtain: discovery, data processing, quality control, mapping, publishing, and community content tools. The systems are built to support a simple mission — **accurate information, useful maps, and a stronger local pack.**

## A Note From Chica

Howdy, San Antonio. Thank you for spending your time with me.

Every visit, share, correction, tip, and suggestion makes this map better. I don't expect everybody to have the same answer or the same idea. That's the point of a community. Bring what you know, listen to what others know, and let's keep improving the map together.

**Share a pin. Help a neighbor. Strengthen the pack.**

— Chica 🐾

## License / Notes

Data is derived from public listings and public sources. Always verify important details with the original source before traveling. This project is actively maintained and improved through community input.