# Image optimization (upload these over existing files)

Download `optimized-images.zip` from the agent artifacts, unzip, and upload into `webapp/` (and cape into `webapp/assets/`).

| File | Before | After | Notes |
|------|--------|-------|-------|
| chicarar.png | ~1.2 MB | ~336 KB | Max 512px, transparency kept |
| chicarar.webp | — | ~60 KB | Prefer via `<picture>` |
| chicarar.jpg | ~951 KB | ~35 KB | Fallback |
| sponsorsign.png | ~2.7 MB | ~160 KB | Max 480px |
| sponsorsign.webp | — | ~33 KB | Prefer via `<picture>` |
| nearme.png | ~40 KB | ~11 KB | 128px |
| grass.jpg | ~428 KB | ~151 KB | Tile; CSS now points here |
| assets/cape.jpg | ~2.3 MB PNG | ~96 KB | Gallery |
| favicon-32/48 + apple-touch | broken (14 B) | real PNGs | From Chica |

HTML already uses `loading="lazy"`, `decoding="async"`, `fetchpriority="high"` on LCP, and WebP `<picture>` where supported.

Upload path: https://github.com/Justonejewelry/Chicas-Map/upload/main/webapp
