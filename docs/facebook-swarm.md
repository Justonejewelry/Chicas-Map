# Echo Swarm — Facebook Detection Playbook
Project YardBird / GSIN  •  Atlas directive 2026-08-01

## Goal
Systematically harvest public Facebook signals (Marketplace, groups, events, hashtags) without private scraping or high-block tactics. Raise the share of Facebook-sourced verified sales that survive Sentinel.

## Sub-agents

### Echo-Marketplace
- Keyword + geo searches for “garage sale”, “yard sale”, “estate sale”, “moving sale” in San Antonio metro.
- Prefer listings that expose address or clear neighborhood + hours + photos.
- Feed images to Echo-Lens → Lens → Scholar.

### Echo-Groups
- Monitor public posts in known local buy/sell and neighborhood groups (SA, Helotes, Boerne, Schertz, Alamo Ranch, Stone Oak, Terrell Hills, etc.).
- No private group access. Only public content.
- Extract structured fields; flag multi-family or HOA-wide sales for higher priority.

### Echo-Public
- Public Facebook Events and sale pages.
- Cross-check against Heritage estate sales for overlap (Mirror).

### Echo-Hashtag
- Track #SAGarageSale, #SanAntonioYardSale, #AlamoRanchSale, #HelotesSale, etc.
- Also surface posts that mention those terms without the hashtag.
- Hand off to Signal when the same post appears on Instagram/Threads/X.

### Echo-Lens
- Dedicated image/OCR path for Facebook photos and flyer screenshots.
- Prioritizes posts that contain readable addresses or sale signs.

## Operating constraints (Guardian / Economist)
- Public content only.
- Conservative request volume; treat Facebook as high-risk for blocks.
- All records start with `platform: facebook` and initial confidence 0.50–0.65.
- Require at least one of: clear address, photo of sign, or multi-source confirmation before Sentinel promotion to “active”.

## Integration
Echo records that clear Sentinel contribute to:
- source_breakdown.facebook
- forecast confidence bonus (source diversity)
- hot_zone and category signals
- verified_highlights when value_score is high

Success is measured by the number of unique, high-confidence Facebook-origin sales that appear on the live map and raise Saturday star ratings.
