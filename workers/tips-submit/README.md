# Tips submit Worker (moderated)

Scaffold for the moderated tip endpoint referenced from `app/src/routes/submit.tsx`.

## Goal

- Accept POST JSON `{ title, address, lat, lon, type, hours, details, ... }`
- Rate-limit by IP (e.g. 5 / hour)
- Validate coords against city bounding box
- Write to a moderated queue (KV list, D1, or open a GitHub issue via the existing tip workflows)
- Never auto-publish to the public map

## Suggested `wrangler.toml` fragment

```toml
name = "chicas-tips-submit"
main = "src/index.ts"
compatibility_date = "2026-01-01"

[[kv_namespaces]]
binding = "TIPS"
id = "<kv-id>"

[vars]
ALLOWED_ORIGINS = "https://justonejewelry.github.io"
CITY_BBOX = "28.8,-99.3,30.2,-97.8"
```

## Wire-up (client)

In `submit.tsx`, after local `saveSubmission(sale)`:

```ts
await fetch("https://chicas-tips-submit.<account>.workers.dev/submit", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(sale),
});
```

Keep the local pin for immediate UX; public visibility stays behind Sentinel / tip-approval Actions.
