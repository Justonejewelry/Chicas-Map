/**
 * WifiRoom — Durable Object
 * One instance per city (id = city slug, e.g. san-antonio).
 * Holds WebSocket clients and recent reports; broadcasts status updates.
 */

const MAX_RECENT = 200;
const REPORT_TTL_MS = 48 * 60 * 60 * 1000;

export class WifiRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessions = new Map(); // ws -> { city, joinedAt }
    this.recent = []; // ring of recent reports
  }

  async fetch(request) {
    const url = new URL(request.url);

    // WebSocket upgrade
    if (request.headers.get("Upgrade") === "websocket") {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      this.state.acceptWebSocket(server);
      this.sessions.set(server, { joinedAt: Date.now() });
      server.send(
        JSON.stringify({
          type: "hello",
          ok: true,
          clients: this.sessions.size,
          recent: this.recent.slice(-30),
        })
      );
      return new Response(null, { status: 101, webSocket: client });
    }

    // HTTP: post a report without WS (optional)
    if (request.method === "POST" && url.pathname.endsWith("/report")) {
      let body;
      try {
        body = await request.json();
      } catch (_) {
        return json({ ok: false, error: "bad_json" }, 400);
      }
      const applied = this.applyReport(body);
      if (!applied.ok) return json(applied, 400);
      this.broadcast(applied.msg);
      return json({ ok: true, broadcast: true });
    }

    // Health / snapshot
    if (request.method === "GET") {
      return json({
        ok: true,
        clients: this.sessions.size,
        recent: this.recent.length,
      });
    }

    return new Response("Not found", { status: 404 });
  }

  // Hibernation API handlers
  async webSocketMessage(ws, message) {
    let msg;
    try {
      msg = typeof message === "string" ? JSON.parse(message) : JSON.parse(new TextDecoder().decode(message));
    } catch (_) {
      try {
        ws.send(JSON.stringify({ type: "error", error: "bad_json" }));
      } catch (_) {}
      return;
    }

    if (msg.type === "join") {
      const meta = this.sessions.get(ws) || {};
      meta.city = String(msg.city || "san-antonio").slice(0, 40);
      this.sessions.set(ws, meta);
      try {
        ws.send(
          JSON.stringify({
            type: "joined",
            city: meta.city,
            clients: this.sessions.size,
            recent: this.recent.slice(-30),
          })
        );
      } catch (_) {}
      return;
    }

    if (msg.type === "report") {
      const applied = this.applyReport(msg);
      if (!applied.ok) {
        try {
          ws.send(JSON.stringify({ type: "error", error: applied.error }));
        } catch (_) {}
        return;
      }
      this.broadcast(applied.msg);
      return;
    }

    if (msg.type === "ping") {
      try {
        ws.send(JSON.stringify({ type: "pong", t: Date.now() }));
      } catch (_) {}
    }
  }

  async webSocketClose(ws) {
    this.sessions.delete(ws);
  }

  async webSocketError(ws) {
    this.sessions.delete(ws);
  }

  applyReport(raw) {
    const name = String(raw.name || "").trim().slice(0, 120);
    const kind = raw.kind === "down" ? "down" : raw.kind === "ok" ? "ok" : null;
    if (!name || !kind) return { ok: false, error: "invalid_report" };

    const ts = Number(raw.ts) || Date.now();
    const city = String(raw.city || "san-antonio").slice(0, 40);

    // prune old
    const now = Date.now();
    this.recent = this.recent.filter((r) => now - r.ts < REPORT_TTL_MS);

    const msg = { type: "report", name, kind, ts, city };
    this.recent.push(msg);
    if (this.recent.length > MAX_RECENT) {
      this.recent = this.recent.slice(-MAX_RECENT);
    }
    return { ok: true, msg };
  }

  broadcast(msg) {
    const data = JSON.stringify(msg);
    for (const ws of this.sessions.keys()) {
      try {
        ws.send(data);
      } catch (_) {
        this.sessions.delete(ws);
      }
    }
  }
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
