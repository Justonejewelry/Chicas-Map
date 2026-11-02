# Alamo City Resources — Data Path

Sister product to Chicas Map (sales) and Alamo Atlas (civic safety).

**Job**: pantries, free Wi-Fi, parking, school-zone notes, and similar everyday utility pins only.

## Paths

- `data/resources/` — source and working data (this directory)
- `webapp/data/resources/san-antonio.json` — public feed the map reads
- `scripts/resource_schema.py` — canonical `Resource` dataclass (parallel to `Sale`)

## Rules

- Never mix resource records into sales feeds or `webapp/data/cities/san-antonio.json`.
- Every published pin needs a real address + lat/lon, type, source, and confidence ≥ 70.
- Public sources only. No private groups.
- City config (bounds, hot zones) is shared via `city-configs/san-antonio.yaml`; data stays product-specific.

## Types

`pantry` | `wifi` | `parking` | `school-zone` | `emergency` | `thrift` | `other`

## Status

Schema and path created. Public feed is empty until the first verified pins are published.
