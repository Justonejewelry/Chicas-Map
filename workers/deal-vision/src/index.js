/**
 * Chicas Map — Deal Vision worker
 *
 *   POST /  {"image":"<base64 JPEG, ~768px, <300KB>","lang":"en|es"}
 *   -> {ok:true,item:{name,brand,model,category,query,condition,confidence,alternatives[]},prices:{basis:"asking",...}|null,provider,v:1}
 *
 * 1) Vision model (default Google Gemini Flash-Lite) names the item, reads brand/model text, guesses condition.
 * 2) eBay Browse API (client-credentials) returns ACTIVE (asking) comps. Marketplace Insights (sold data) is restricted by eBay, so prices are labelled "asking".
 * Images are never stored or logged. See wrangler.toml for vars/secrets.
 */
import {
  buildPrompt, geminiRequest, geminiText, openaiRequest, openaiText, normalizeVision, summarizeListings, ebaySearchParams,
  originAllowed, decodeB64Header, MAX_IMAGE_B64, MAX_BODY_BYTES
} from "./lib.js";

const PROVIDERS = {
  async gemini(env, b64, prompt, signal) {
    if (!env.GEMINI_API_KEY) throw new HttpError(503, "vision_not_configured");
    const r = geminiRequest(env.GEMINI_MODEL || "gemini-3.1-flash-lite", b64, prompt);
    const res = await fetch(r.url, { method: "POST", signal, headers: { "content-type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY }, body: JSON.stringify(r.body) });
    if (!res.ok) throw new HttpError(502, "vision_upstream_" + res.status);
    return geminiText(await res.json());
  },
  // Any OpenAI-compatible vision endpoint (OPENAI_API_KEY, OPENAI_MODEL, optional OPENAI_BASE_URL).
  async openai(env, b64, prompt, signal) {
    if (!env.OPENAI_API_KEY) throw new HttpError(503, "vision_not_configured");
    const r = openaiRequest(env.OPENAI_BASE_URL, env.OPENAI_MODEL || "gpt-4o-mini", b64, prompt);
    const res = await fetch(r.url, { method: "POST", signal, headers: { "content-type": "application/json", authorization: "Bearer " + env.OPENAI_API_KEY }, body: JSON.stringify(r.body) });
    if (!res.ok) throw new HttpError(502, "vision_upstream_" + res.status);
    return openaiText(await res.json());
  }
};

class HttpError extends Error { constructor(status, code) { super(code); this.status = status; this.code = code; } }

function cors(origin, env) {
  const h = { "vary": "origin" };
  if (originAllowed(origin, env.ALLOWED_ORIGINS)) {
    h["access-control-allow-origin"] = origin;
    h["access-control-allow-methods"] = "POST, OPTIONS";
    h["access-control-allow-headers"] = "content-type";
    h["access-control-max-age"] = "86400";
  }
  return h;
}
function json(obj, status, extra) {
  return new Response(JSON.stringify(obj), { status: status || 200, headers: Object.assign({ "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }, extra || {}) });
}

/* ---- abuse protection: every layer is optional so the Worker runs with zero extra resources ---- */
const mem = new Map(); // per-isolate fallback: ip -> [timestamps]
function memLimit(ip, perMin) {
  const now = Date.now(), arr = (mem.get(ip) || []).filter((t) => now - t < 60000);
  if (arr.length >= perMin) { mem.set(ip, arr); return false; }
  arr.push(now); mem.set(ip, arr);
  if (mem.size > 5000) mem.clear();
  return true;
}
async function cacheCounter(key, limit) {
  // Approximate counter in the colo's Cache API (not atomic; fine as a cost guard).
  try {
    const cache = caches.default, req = new Request("https://counter.invalid/" + key);
    const hit = await cache.match(req);
    const n = hit ? parseInt(await hit.text(), 10) || 0 : 0;
    if (n >= limit) return false;
    await cache.put(req, new Response(String(n + 1), { headers: { "cache-control": "max-age=90000" } }));
  } catch (e) { /* no cache available: allow */ }
  return true;
}
async function kvCounter(kv, key, limit) {
  const n = parseInt((await kv.get(key)) || "0", 10) || 0;
  if (n >= limit) return false;
  await kv.put(key, String(n + 1), { expirationTtl: 90000 });
  return true;
}
async function guard(env, ip) {
  const perMin = parseInt(env.PER_IP_PER_MIN || "6", 10), perDay = parseInt(env.PER_IP_PER_DAY || "40", 10), cap = parseInt(env.DAILY_CAP || "1500", 10);
  if (env.RATE_LIMITER && typeof env.RATE_LIMITER.limit === "function") {
    const r = await env.RATE_LIMITER.limit({ key: ip });
    if (!r.success) return "rate_limited";
  } else if (!memLimit(ip, perMin)) return "rate_limited";
  const day = new Date().toISOString().slice(0, 10);
  if (env.DAILY_KV) {
    if (!(await kvCounter(env.DAILY_KV, "ip:" + day + ":" + ip, perDay))) return "rate_limited";
    if (!(await kvCounter(env.DAILY_KV, "all:" + day, cap))) return "daily_cap";
  } else {
    if (!(await cacheCounter("ip-" + day + "-" + ip.replace(/[^0-9a-f.:]/gi, "_"), perDay))) return "rate_limited";
    if (!(await cacheCounter("all-" + day, cap))) return "daily_cap";
  }
  return null;
}

/* ---- eBay (Browse API, application token, ACTIVE listings only) ---- */
let tokenCache = { token: "", exp: 0 };
async function ebayToken(env) {
  if (tokenCache.token && Date.now() < tokenCache.exp - 60000) return tokenCache.token;
  const basic = btoa(env.EBAY_CLIENT_ID + ":" + env.EBAY_CLIENT_SECRET);
  const res = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", authorization: "Basic " + basic },
    body: "grant_type=client_credentials&scope=" + encodeURIComponent("https://api.ebay.com/oauth/api_scope")
  });
  if (!res.ok) throw new Error("ebay_token_" + res.status);
  const j = await res.json();
  tokenCache = { token: j.access_token, exp: Date.now() + (Number(j.expires_in) || 7200) * 1000 };
  return tokenCache.token;
}
async function ebayPrices(env, query, signal) {
  if (!env.EBAY_CLIENT_ID || !env.EBAY_CLIENT_SECRET || !query) return null;
  const campid = String(env.EBAY_CAMPAIGN_ID || "").replace(/\D/g, "");
  const cache = typeof caches !== "undefined" ? caches.default : null;
  const ckey = new Request("https://ebay-comps.invalid/" + encodeURIComponent(query.toLowerCase()) + "/" + campid);
  try { if (cache) { const hit = await cache.match(ckey); if (hit) return await hit.json(); } } catch (e) {}
  const token = await ebayToken(env);
  const headers = { authorization: "Bearer " + token, "x-ebay-c-marketplace-id": env.EBAY_MARKETPLACE || "EBAY_US" };
  if (campid) headers["x-ebay-c-enduserctx"] = "affiliateCampaignId=" + campid + ",affiliateReferenceId=dealfinder";
  const res = await fetch("https://api.ebay.com/buy/browse/v1/item_summary/search?" + ebaySearchParams(query), { headers, signal });
  if (res.status === 401) tokenCache = { token: "", exp: 0 };
  if (!res.ok) throw new Error("ebay_search_" + res.status);
  const j = await res.json();
  const out = summarizeListings(j.itemSummaries, { campid });
  try { if (cache && out) await cache.put(ckey, new Response(JSON.stringify(out), { headers: { "cache-control": "max-age=21600" } })); } catch (e) {}
  return out;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("origin") || "";
    const ch = cors(origin, env);
    if (request.method === "OPTIONS") return new Response(null, { status: originAllowed(origin, env.ALLOWED_ORIGINS) ? 204 : 403, headers: ch });
    if (request.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405, ch);
    if (!originAllowed(origin, env.ALLOWED_ORIGINS)) return json({ ok: false, error: "origin_not_allowed" }, 403, ch);
    try {
      const len = parseInt(request.headers.get("content-length") || "0", 10);
      if (len > MAX_BODY_BYTES) throw new HttpError(413, "too_large");
      const text = await request.text();
      if (text.length > MAX_BODY_BYTES) throw new HttpError(413, "too_large");
      let body; try { body = JSON.parse(text); } catch (e) { throw new HttpError(400, "bad_json"); }
      const b64 = body && body.image;
      if (typeof b64 !== "string" || b64.length > MAX_IMAGE_B64) throw new HttpError(413, "too_large");
      if (!decodeB64Header(b64)) throw new HttpError(400, "not_a_jpeg");
      const ip = request.headers.get("cf-connecting-ip") || "unknown";
      const blocked = await guard(env, ip);
      if (blocked) throw new HttpError(429, blocked);

      const provider = PROVIDERS[env.VISION_PROVIDER || "gemini"];
      if (!provider) throw new HttpError(500, "bad_provider");
      const ac = new AbortController(), timer = setTimeout(() => ac.abort(), 18000);
      let item;
      try { item = normalizeVision(await provider(env, b64, buildPrompt(), ac.signal)); }
      catch (e) { if (e instanceof HttpError) throw e; throw new HttpError(502, "vision_failed"); }
      finally { clearTimeout(timer); }
      if (!item) throw new HttpError(502, "vision_unparseable");

      let prices = null;
      try {
        const ac2 = new AbortController(), t2 = setTimeout(() => ac2.abort(), 3500);
        try { prices = await ebayPrices(env, item.query, ac2.signal); } finally { clearTimeout(t2); }
      } catch (e) { prices = null; } // prices are a bonus; never fail the ID because of eBay
      return json({ ok: true, v: 1, provider: env.VISION_PROVIDER || "gemini", item, prices }, 200, ch);
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500, code = e instanceof HttpError ? e.code : "error";
      return json({ ok: false, error: code }, status, ch);
    }
  }
};
