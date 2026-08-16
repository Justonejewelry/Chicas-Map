/**
 * Chicas Map — Public WiFi realtime Worker
 *
 * Routes:
 *   GET  /health
 *   GET|WS /ws?city=san-antonio   → Durable Object room
 *   POST /report?city=san-antonio → HTTP report (no WS)
 *
 * Deploy:
 *   cd workers/wifi-realtime && npm i && npx wrangler deploy
 *
 * Then set in webapp/js/chica-config.js:
 *   WIFI_WS_URL: "wss://chicas-wifi-realtime.<your-subdomain>.workers.dev/ws?city=san-antonio"
 */

import { WifiRoom } from "./room.js";

export { WifiRoom };

function corsHeaders(origin, allowed) {
  const list = String(allowed || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const ok =
    !origin ||
    list.length === 0 ||
    list.includes("*") ||
    list.includes(origin);
  return {
    "Access-Control-Allow-Origin": ok ? origin || "*" : list[0] || "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function roomId(env, city) {
  const slug = String(city || "san-antonio")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .slice(0, 40) || "san-antonio";
  return env.WIFI_ROOM.idFromName(slug);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin, env.ALLOWED_ORIGINS);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/health")) {
      return new Response(
        JSON.stringify({ ok: true, service: "chicas-wifi-realtime" }),
        { headers: { "Content-Type": "application/json", ...cors } }
      );
    }

    const city = url.searchParams.get("city") || "san-antonio";
    const id = roomId(env, city);
    const stub = env.WIFI_ROOM.get(id);

    // WebSocket path
    if (url.pathname === "/ws" || url.pathname === "/ws/") {
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("Expected WebSocket", { status: 426, headers: cors });
      }
      return stub.fetch(request);
    }

    // HTTP report path
    if (url.pathname === "/report" || url.pathname === "/report/") {
      const res = await stub.fetch(
        new Request(new URL("/report", url).toString(), {
          method: request.method,
          headers: request.headers,
          body: request.method !== "GET" ? await request.text() : undefined,
        })
      );
      const body = await res.text();
      return new Response(body, {
        status: res.status,
        headers: { "Content-Type": "application/json", ...cors },
      });
    }

    return new Response("Not found", { status: 404, headers: cors });
  },
};
