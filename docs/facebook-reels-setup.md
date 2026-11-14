# ChicasMap Facebook Reels: authorized insights setup

## Page identity

- Official Page profile URL supplied by the owner: https://www.facebook.com/profile.php?id=61593215043603
- Page ID: `61593215043603`
- Scope: this Page's public Reels only.

## What is supported

Meta's current Graph API documentation (v27.0, checked 2026-11-14) documents Reel insights on:

```text
GET /{video-id}/video_insights
```

Relevant lifetime metrics:

- `fb_reels_total_plays`: Reel plays including replays.
- `blue_reels_play_count`: Reel plays excluding replays.
- `fb_reels_replay_count`: replays.

The endpoint requires `pages_manage_engagement`, `read_insights`, a Page access token, and a person who can perform the Page's `ANALYZE` task. The endpoint's data is available for the past two years.

## Discovery limitation

The Page Post reference says its endpoint does not return Reels and directs developers to the Page VideoReels edge. The current Page VideoReels reference says reading is not supported and documents publishing. Therefore this project must not claim automatic discovery of all newest Page Reels until Meta confirms a supported read route for this Page and app.

The homepage currently maintains 26 known Reel IDs in `webapp/js/home-reels.js`. These can be used as an initial operator-maintained inventory. Do not scrape logged-in pages, use undocumented endpoints, or expand to other Pages, Groups, Marketplace, or private content.

## GitHub Actions secret

When an authorized Meta app and Page token are ready, add a repository Actions secret named:

```text
CHICASMAP_FB_PAGE_ACCESS_TOKEN
```

Never commit the token, place it in a workflow YAML literal, or paste it into an issue/chat. The integration should read it only from `secrets.CHICASMAP_FB_PAGE_ACCESS_TOKEN`.

## Validation checklist

1. Confirm the token is a Page access token for Page ID `61593215043603`.
2. Confirm the app has `read_insights` and `pages_manage_engagement`.
3. Confirm the token's issuing person has the Page's `ANALYZE` task.
4. Test one known Reel ID from `webapp/js/home-reels.js` against `/{video-id}/video_insights` requesting `fb_reels_total_plays` with `period=lifetime`.
5. Record the returned metric name and retrieval timestamp. If the API returns a permission error or omits the metric, report **Views unavailable** with the reason; never convert missing data to zero.
6. Only implement newest-Reel discovery after a supported listing route is verified.

## Scheduling

Integrate the collector into the existing Chica Daily pipeline only. Do not create a second scheduled workflow. Keep public sale discovery independent: a Facebook API outage must not stop garage-sale ingestion.
