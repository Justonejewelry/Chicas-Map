# Chica Content Packs

Daily content packs for Facebook, Instagram, TikTok + Firefly motion prompts.

## What this system does

1. **Generates** a full Markdown pack from the latest `forecast/*.json`
2. **Commits** the pack into `packs/YYYY-MM-DD-Dayname/pack.md` (via GitHub Action)
3. **Notifies** you with a GitHub Issue containing the full pack
4. **Helps you post** locally with one command per platform (copies text + opens the site)

## Files

| File | Purpose |
|------|---------|
| `generate-pack.py` | Builds the pack from forecast data |
| `post-social.sh` | Extracts a platform section, copies to clipboard, opens the site |
| `README.md` | This file |

## Local usage

```bash
# Generate a pack (defaults to next Saturday)
python scripts/content-packs/generate-pack.py

# Force a specific date
python scripts/content-packs/generate-pack.py --date 2026-08-09

# Post helpers (run after pack exists)
./scripts/content-packs/post-social.sh facebook
./scripts/content-packs/post-social.sh instagram
./scripts/content-packs/post-social.sh tiktok
```

## GitHub Action

`.github/workflows/chica-daily.yml` (Chica Daily Master Workflow)

- Runs automatically **5:00 AM America/Chicago**
- Can also be triggered manually from the Actions tab
- Writes packs, feeds, and city data
- Discovery and social are owned by Chica Daily

## Pack format (required sections)

```markdown
# Chica Daily Pack — Friday 2026-08-08

## Header
...

## Facebook
...

## Instagram
...

## TikTok
...

## Video Scripts
...

## Adobe Firefly Motion Pack
...

## Visual Checklist
...

## Posting Commands
...

## Human Touch
...
```

## Hybrid model (recommended)

- **GitHub Actions** → generate + version + notify
- **Your Mac** → review, run Firefly, post to social (human final click)

This keeps intelligence automated while social publishing stays high-quality and safe.
