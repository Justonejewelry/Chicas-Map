# Chica Map — Active Workflows

## Active

| Workflow | File | Schedule | Purpose |
|----------|------|----------|--------|
| **Chica Daily (Master)** | `chica-daily.yml` | 1 AM CT Thu/Fri/Sat | Discovery → deep follow → Sentinel → daily pack, social, Update Pack |
| **Map feed refresh** | `map-refresh.yml` | Manual only | One-shot multi-source discovery (no schedule) |
| **Deploy Pages** | `pages.yml` | On push / manual | GitHub Pages for the public map |
| **Publish tip** | `publish-tip.yml` | Manual | Merge a verified permit/user tip |
| **Tip label approve** | `tip-label-approve.yml` | On label | Approve tips via issue label |
| **Tip webhook** | `tip-webhook.yml` | Manual / webhook | Ingest tip submissions |

## Retired (do not re-enable schedules)

| Workflow | Replaced by |
|----------|-------------|
| Generate Daily Pack | Chica Daily |
| Update Chicas-Map feed | Chica Daily discovery + orchestrator |
| Continuous 2-hour map-refresh schedule | Chica Daily at 1 AM CT |

## Local test

```bash
python3 scripts/chica_daily.py --dry-run
python3 scripts/chica_daily.py --date 2026-08-15
```
