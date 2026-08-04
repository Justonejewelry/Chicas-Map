# Video watermark (mandatory)

**From 2026-08-04 onward, every YardBird / Chica video includes this watermark.**

## Lockup
- QR code + text: **Chica · Garage Sale Map**
- Official asset: place files in this folder as:
  - `chica-video-watermark.png`
  - `chica-video-watermark.jpg`
  - `chica-video-watermark-overlay.png` (transparent background preferred for ffmpeg)

## Placement
- **Bottom-left** of the frame
- ~18–28% of frame width
- ~24px (or 3–5%) margin from left and bottom edges
- Full opacity on the lockup

## Link target
QR should open the public map:
https://justonejewelry.github.io/Project-YardBird/

## ffmpeg example
```bash
ffmpeg -i input.mp4 -i brand/chica-video-watermark-overlay.png \
  -filter_complex "[1:v]scale=iw*0.22:-1[wm];[0:v][wm]overlay=24:H-h-24" \
  -c:a copy output.mp4
```

Applies to weekly Chica updates, Meet Cheeks / Backyard videos, and promo clips.
