# Yowl Lawnda — Friday & Saturday Yard-Bird Update Editions
Project YardBird / GSIN  •  Atlas  •  2026-08-01

Format and graphics locked to the Yowl Lawnda cartoon style:
- Brown Chihuahua host, black studded harness
- Shopping-basket logo (YOWL LAWNDA)
- Bright cartoon street scenes + San Antonio map with TOP PICK / NEW SALE / cluster pins
- Narration tone: “Howdy y’all” · playful · confident · “Be hunting, y’all!”
- Target length: 12–15 seconds per edition

All map callouts and cluster language below are driven by live intelligence
(Open Data SA permits + neighborhood density clustering, radius 1.2 km).

---

## FRIDAY YARD-BIRD UPDATE
**Title card:** FRIDAY YARD-BIRD UPDATE  
**Subtitle:** Weekend Preview — 4★ Saturday Ahead

### Narration (record in Yowl Lawnda voice)
Howdy y’all, it’s Yowl Lawnda, your garage sale forecaster.  
Tomorrow’s looking strong — a solid four-star Saturday.  
Big concentration building on the South Side, with solid pockets on the Northwest Side, Alamo Ranch, and Northeast Side.  
Heat’s gonna push near 99, so the smart money is an early start.  
Map’s loading up with top picks — check it tonight and be ready.  
Be hunting, y’all!

### Required infographics / map callouts
| Badge / Label              | Meaning                          |
|----------------------------|----------------------------------|
| SOUTH SIDE CLUSTER         | CLUSTER-HOT (largest, ~30)       |
| NW SIDE                    | Strong multi-house pockets       |
| ALAMO RANCH                | 4-sale cluster                   |
| NE SIDE                    | Active                           |
| TOP PICK / NEW SALE        | Individual high-value pins       |

### Graphic sequence (storyboard)
1. Logo open (Yowl in shopping basket) — 0:00–0:02  
2. Street scene title card “FRIDAY YARD-BIRD UPDATE” — 0:02–0:05  
3. Map with South Side / NW / Alamo Ranch / NE callouts — 0:05–0:11  
4. Host closer + “Be hunting, y’all!” — 0:11–0:14  

---

## SATURDAY YARD-BIRD UPDATE
**Title card:** SATURDAY YARD-BIRD UPDATE  
**Subtitle:** Live Morning

### Narration (record in Yowl Lawnda voice)
Howdy y’all, it’s Yowl Lawnda — live Saturday update.  
The treasures are concentrated: major cluster on the South Side, secondary action Northwest Side and Alamo Ranch, plus Northeast Side pockets.  
Early bird wins today — heat climbs fast.  
My map is up to date with the densest stops first.  
Short hops, full baskets.  
Be hunting, y’all!

### Required infographics / map callouts
| Badge / Label              | Meaning                          |
|----------------------------|----------------------------------|
| ★ SOUTH SIDE CLUSTER       | Priority live concentration      |
| NW SIDE                    | Secondary                        |
| ALAMO RANCH                | Secondary                        |
| NE SIDE                    | Active                           |
| Weather lower-third        | SA ~99° · Early Start            |

### Graphic sequence (storyboard)
1. Logo open — 0:00–0:02  
2. Street / host “SATURDAY YARD-BIRD UPDATE” — 0:02–0:05  
3. Live map with densest clusters highlighted first — 0:05–0:11  
4. Host closer + paw / “Be hunting, y’all!” — 0:11–0:14  

---

## Data backbone (do not invent)
- Neighborhood clusters: `data/neighborhood_clusters_top.json` / full local extract  
- Cluster briefing line: `data/selene_cluster_briefing.txt`  
- Heatmap: `maps/san-antonio/heatmap.html`  
- Clustered KML: `maps/san-antonio/2026-08-01-clustered.kml`  
- Confidence + badges: `scripts/apply_cluster_intelligence.py`

### Top clusters (21-day municipal permit window)
1. South Side — size 30 (CLUSTER-HOT)  
2. Northwest Side — size 7  
3. Northwest Side — size 5  
4. South Side — size 5  
5. Northeast Side — size 4  
6. Alamo Ranch — size 4  

---

## Graphics queue status
- [ ] Friday title card (street scene + “FRIDAY YARD-BIRD UPDATE”)  
- [ ] Saturday title card (street scene + “SATURDAY YARD-BIRD UPDATE”)  
- [ ] Accurate SA map frame with South Side / NW / Alamo Ranch / NE callouts  
- [ ] Logo sting (existing style — Yowl in basket)  
- [ ] Assemble Friday 12–15s video  
- [ ] Assemble Saturday 12–15s video  

**Queued for image pipeline recovery.** Scripts and data are locked and accurate for 1 Aug 2026.

When graphics land, place under `maps/san-antonio/yowl/` or `media/yowl-editions/` and update this checklist.
