# Web image optimization — Project YardBird

## Critical issue found

`webapp/assets/chica/smile.jpg` is actually **HEIC** (iPhone format), not JPEG.
Most desktop browsers cannot display HEIC → broken image.

## Optimized files to upload

Replace / add these under `webapp/assets/`:

| Upload as | Purpose | Target size |
|-----------|---------|-------------|
| `chica/smile.jpg` | Gallery + avatars (real JPEG) | ~125 KB |
| `chica/smile-avatar.jpg` | Tiny nav/avatar | ~10 KB |
| `chica/cape.jpg` | Hero / Super Chica | ~140 KB |
| `chica/cape-card.jpg` | Small cards | ~35 KB |
| `chica/napping.jpg` | Gallery | ~23 KB |
| `1.jpg` | Chica & human | ~8 KB |
| `grass-tile.jpg` | Optional CSS tile | ~19 KB |

Upload folder: https://github.com/Justonejewelry/Project-YardBird/upload/main/webapp/assets/chica

## Rules of thumb

1. **Format:** JPEG for photos, WebP if you can, PNG only for graphics with transparency.
2. **Width:** Hero ≤ 1200px, gallery ≤ 800px, avatars ≤ 256px.
3. **Quality:** 75–82 for JPEG is enough on the web.
4. **Lazy load:** `loading="lazy" decoding="async"` (already in backyard.js).
5. **Never upload raw iPhone HEIC/PNG screenshots at full resolution.**

## Before → after (this project)

| Asset | Before | After |
|-------|--------|-------|
| smile | 1.9 MB HEIC | ~125 KB JPEG |
| cape | 2.3 MB PNG | ~140 KB JPEG |
| grass | 428 KB | ~19 KB tile |
| **Total** | **~4.7 MB** | **~360 KB** |
