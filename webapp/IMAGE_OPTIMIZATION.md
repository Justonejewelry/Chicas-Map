# Image optimization (Aug 2026)

Overwrite these files in `webapp/` (and assets) with the optimized versions from the agent artifacts folder `web-opt/`:

| File | Target path | Before → After |
|------|-------------|----------------|
| `chicarar.jpg` | `webapp/chicarar.jpg` | ~928 KB → ~73 KB |
| `sponsorcheeks.jpg` | `webapp/sponsorcheeks.jpg` | ~277 KB → ~39 KB |
| grass tile | `webapp/4267751-green-grass-texture-that-tiles-seamlessly-as-a-pattern.jpg` | ~418 KB → ~80 KB |
| cape PNG | `webapp/assets/file_000000009f8c71fda0f56075f84270f7.png` | ~2.3 MB → ~404 KB |
| `napping.jpg` | `webapp/assets/chica/napping.jpg` | ~35 KB → ~22 KB |
| `nearme.png` | `webapp/nearme.png` | ~39 KB → ~11 KB |
| `search.png` | `webapp/search.png` | ~5 KB → ~2 KB |

**Total savings: ~3.5 MB+** on first load.

HTML already uses `loading="lazy"` / `decoding="async"` where appropriate. Hero images use `fetchpriority="high"`.

Prefer JPEG for photos, PNG only when transparency is required. Keep display sizes ≤ 2× CSS size for retina.
