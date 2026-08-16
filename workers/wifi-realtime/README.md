# Chicas Map — WiFi realtime Worker

Cloudflare Worker + Durable Object that fans out Public WiFi status reports (`Still working` / `Not working`) to all connected map clients.

## Protocol

**Client → server**

```json
{ "type": "join", "city": "san-antonio" }
{ "type": "report", "name": "Central Library", "kind": "ok" | "down", "ts": 1234567890, "city": "san-antonio" }
{ "type": "ping" }
```

**Server → client**

```json
{ "type": "hello", "ok": true, "clients": 3, "recent": [ ... ] }
{ "type": "joined", "city": "san-antonio", "clients": 3, "recent": [ ... ] }
{ "type": "report", "name": "Central Library", "kind": "ok", "ts": 1234567890, "city": "san-antonio" }
{ "type": "pong", "t": 1234567890 }
```

Reports older than 48 hours are dropped from the recent buffer.

## Deploy

```bash
cd workers/wifi-realtime
npm install
npx wrangler login   # once
npx wrangler deploy
```

Note the assigned hostname, e.g. `chicas-wifi-realtime.<account>.workers.dev`.

## Wire the map

In `webapp/js/chica-config.js`:

```js
WIFI_WS_URL: "wss://chicas-wifi-realtime.<account>.workers.dev/ws?city=san-antonio",
```

The Public WiFi layer already connects when the layer is toggled on, queues reports offline, and flushes when the socket opens.

## CORS

`ALLOWED_ORIGINS` in `wrangler.toml` should include your GitHub Pages origin:

`https://justonejewelry.github.io`

## Cost notes

Durable Objects + WebSockets sit on Cloudflare’s paid or free DO quotas depending on account. Hibernation keeps idle sockets cheap. No secrets required for this service.
