// Plain-node tests for workers/deal-vision (no deps). Run: node tests/deal_vision_worker.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import * as lib from "../workers/deal-vision/src/lib.js";
import worker from "../workers/deal-vision/src/index.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let n = 0;
async function t(name, fn) { await fn(); n++; console.log("ok -", name); }

await t("category ids match Deal Finder ITEMS exactly", () => {
  const src = readFileSync(path.join(root, "webapp/js/deals-finder.js"), "utf8");
  const ids = [...src.matchAll(/^\s+\["([a-z0-9]+)","/gm)].map((m) => m[1]);
  assert.deepEqual(lib.CATEGORY_IDS, ids);
});

await t("normalizeVision: clean JSON, fences, chatter", () => {
  const good = { name: "Lodge 10.25 inch cast iron skillet", brand: "Lodge", model: "", category: "castiron", query: "lodge 10.25 cast iron skillet", condition: "good", confidence: 0.91, alternatives: [{ name: "Griswold skillet", category: "castiron", confidence: 0.4 }] };
  const a = lib.normalizeVision(JSON.stringify(good));
  assert.equal(a.category, "castiron"); assert.equal(a.brand, "Lodge"); assert.equal(a.alternatives.length, 1); assert.equal(a.confidence, 0.91);
  assert.equal(lib.normalizeVision("```json\n" + JSON.stringify(good) + "\n```").name, good.name);
  assert.equal(lib.normalizeVision("Sure! Here you go: " + JSON.stringify(good) + " hope that helps").name, good.name);
  assert.equal(lib.normalizeVision(good).query, good.query);
});
await t("normalizeVision: clamps, maps unknown category to other, caps alternatives, strips markup", () => {
  const r = lib.normalizeVision({ name: "<img src=x onerror=alert(1)>Thing", brand: "B".repeat(200), category: "weapons", query: "", condition: "Like New", confidence: 7,
    alternatives: [1, null, { name: "a", category: "nope" }, { name: "b", category: "lego", confidence: -3 }, { name: "c", category: "dvd" }, { name: "d", category: "vinyl" }, { name: "e" }] });
  assert.ok(!/[<>]/.test(r.name)); assert.equal(r.brand.length, 40); assert.equal(r.category, "other"); assert.equal(r.condition, "like_new");
  assert.equal(r.confidence, 1); assert.equal(r.alternatives.length, 3); assert.equal(r.alternatives[0].category, "other"); assert.equal(r.alternatives[1].confidence, 0);
  assert.ok(r.query.length > 0);
});
await t("normalizeVision: rejects junk", () => {
  for (const bad of [null, "", "not json", "[]", "{}", { name: "" }, 42, { name: 5 }]) assert.equal(lib.normalizeVision(bad), null);
});

const listing = (id, v, extra) => Object.assign({ itemId: "v1|" + id + "|0", title: "Lodge skillet " + id, price: { value: String(v), currency: "USD" }, condition: "Used", itemWebUrl: "https://www.ebay.com/itm/" + id, itemAffiliateWebUrl: "https://www.ebay.com/itm/" + id + "?campid=5339243224&mkevt=1", image: { imageUrl: "https://i.ebayimg.com/x.jpg" } }, extra || {});
await t("summarizeListings: median/range, junk + outlier + dup removal, asking basis, affiliate links", () => {
  const items = [20, 25, 28, 30, 32, 35, 40, 400].map((v, i) => listing(i, v));
  items.push(listing(90, 5, { title: "Lodge skillet for parts or repair" }), listing(91, 12, { title: "Lot of 6 skillets" }), listing(3, 30), listing(92, 33, { price: { value: "30", currency: "EUR" } }));
  const s = lib.summarizeListings(items, { campid: "5339243224" });
  assert.equal(s.basis, "asking"); assert.equal(s.n, 7); assert.equal(s.median, 30); assert.ok(s.high < 100 && s.low >= 20);
  assert.equal(s.examples.length, 3); assert.ok(s.examples.every((e) => e.url.includes("campid=5339243224")));
});
await t("summarizeListings: too few comps -> null; builds affiliate URL when only itemWebUrl; drops non-ebay urls", () => {
  assert.equal(lib.summarizeListings([listing(1, 10), listing(2, 12)]), null);
  assert.equal(lib.summarizeListings(undefined), null);
  const e = lib.exampleOf({ title: "x", price: { value: "9" }, itemWebUrl: "https://www.ebay.com/itm/1" }, "5339243224");
  assert.ok(e.url.includes("campid=5339243224"));
  assert.equal(lib.exampleOf({ title: "x", price: { value: "9" }, itemWebUrl: "https://evil.example/itm/1", itemAffiliateWebUrl: "javascript:alert(1)" }, "1").url, "");
  assert.equal(lib.isEbayUrl("https://ebay.com.evil.io/x"), false);
});
await t("eBay search params: used + fixed price, US", () => {
  const p = new URLSearchParams(lib.ebaySearchParams("lodge 10 skillet"));
  assert.equal(p.get("q"), "lodge 10 skillet"); assert.match(p.get("filter"), /conditions:\{USED\}/); assert.match(p.get("filter"), /FIXED_PRICE/);
});
await t("provider request/response shapes", () => {
  const g = lib.geminiRequest("m1", "AAAA", "p");
  assert.match(g.url, /models\/m1:generateContent$/); assert.equal(g.body.generationConfig.responseMimeType, "application/json");
  assert.equal(g.body.contents[0].parts[1].inline_data.mime_type, "image/jpeg");
  assert.deepEqual(g.body.generationConfig.responseSchema.properties.category.enum, lib.CATEGORY_IDS);
  assert.equal(lib.geminiText({ candidates: [{ content: { parts: [{ text: "a" }, { text: "b" }] } }] }), "ab");
  assert.equal(lib.geminiText({}), "");
  assert.equal(lib.openaiText({ choices: [{ message: { content: "z" } }] }), "z");
  assert.match(lib.openaiRequest("https://x/v1/", "m", "AAAA", "p").url, /^https:\/\/x\/v1\/chat\/completions$/);
});
await t("origin allow-list and jpeg check", () => {
  const L = "https://www.chicasmap.com,https://chicasmap.com,http://localhost:8000";
  assert.ok(lib.originAllowed("https://chicasmap.com", L)); assert.ok(!lib.originAllowed("https://chicasmap.com.evil.io", L)); assert.ok(!lib.originAllowed("", L));
  assert.ok(lib.decodeB64Header("/9j/" + "A".repeat(300))); assert.ok(!lib.decodeB64Header("iVBO" + "A".repeat(300))); assert.ok(!lib.decodeB64Header("/9j/ <script>" + "A".repeat(300)));
});

/* ---------- full handler with fetch mocked ---------- */
const JPEG = "/9j/" + "A".repeat(400);
const env = () => ({ GEMINI_API_KEY: "gk", EBAY_CLIENT_ID: "id", EBAY_CLIENT_SECRET: "sec", EBAY_CAMPAIGN_ID: "5339243224", ALLOWED_ORIGINS: "https://www.chicasmap.com,https://chicasmap.com", PER_IP_PER_MIN: "100", PER_IP_PER_DAY: "1000", DAILY_CAP: "100000" });
const req = (body, o) => new Request("https://w.example/", { method: "POST", headers: Object.assign({ origin: "https://www.chicasmap.com", "content-type": "application/json", "cf-connecting-ip": "1.2.3." + Math.floor(Math.random() * 250) }, (o || {}).headers), body: typeof body === "string" ? body : JSON.stringify(body) });
const calls = [];
function mockFetch({ gemini, ebay, token } = {}) {
  calls.length = 0;
  globalThis.fetch = async (url, init) => {
    url = String(url); calls.push({ url, init });
    if (url.includes("generativelanguage")) return gemini ? gemini() : new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ name: "Lodge 10 inch skillet", brand: "Lodge", model: "", category: "castiron", query: "lodge 10 inch cast iron skillet", condition: "good", confidence: 0.9, alternatives: [{ name: "Griswold", category: "castiron", confidence: 0.3 }] }) }] } }] }), { status: 200 });
    if (url.includes("oauth2/token")) return token ? token() : new Response(JSON.stringify({ access_token: "T", expires_in: 7200 }), { status: 200 });
    if (url.includes("item_summary/search")) return ebay ? ebay() : new Response(JSON.stringify({ itemSummaries: [20, 25, 28, 30, 32, 35, 40].map((v, i) => listing(i, v)) }), { status: 200 });
    throw new Error("unexpected fetch " + url);
  };
}
globalThis.caches = { default: { match: async () => undefined, put: async () => {} } };

await t("handler: success returns strict JSON, CORS header, asking prices, never echoes image, key header", async () => {
  mockFetch(); const r = await worker.fetch(req({ image: JPEG }), env()); const j = await r.json();
  assert.equal(r.status, 200); assert.equal(r.headers.get("access-control-allow-origin"), "https://www.chicasmap.com");
  assert.equal(j.ok, true); assert.equal(j.item.category, "castiron"); assert.equal(j.prices.basis, "asking"); assert.equal(j.prices.median, 30); assert.equal(j.prices.n, 7);
  assert.ok(!JSON.stringify(j).includes(JPEG.slice(0, 40)));
  const gc = calls.find((c) => c.url.includes("generativelanguage")); assert.equal(gc.init.headers["x-goog-api-key"], "gk");
  const ec = calls.find((c) => c.url.includes("item_summary")); assert.equal(ec.init.headers["x-ebay-c-enduserctx"].split(",")[0], "affiliateCampaignId=5339243224");
});
await t("handler: eBay failure or missing keys still returns the ID with prices:null", async () => {
  mockFetch({ ebay: () => new Response("no", { status: 500 }) }); let j = await (await worker.fetch(req({ image: JPEG }), env())).json();
  assert.equal(j.ok, true); assert.equal(j.prices, null);
  mockFetch(); const e = env(); delete e.EBAY_CLIENT_ID; j = await (await worker.fetch(req({ image: JPEG }), e)).json(); assert.equal(j.prices, null); assert.ok(!calls.some((c) => c.url.includes("ebay")));
});
await t("handler: vision failure -> 502 JSON so the page can fall back", async () => {
  mockFetch({ gemini: () => new Response("x", { status: 500 }) }); let r = await worker.fetch(req({ image: JPEG }), env()); assert.equal(r.status, 502);
  mockFetch({ gemini: () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "lol no json" }] } }] }), { status: 200 }) }); r = await worker.fetch(req({ image: JPEG }), env()); assert.equal(r.status, 502);
  mockFetch(); const e = env(); delete e.GEMINI_API_KEY; r = await worker.fetch(req({ image: JPEG }), e); assert.equal(r.status, 503);
});
await t("handler: origin, method, size, format, JSON guards", async () => {
  mockFetch();
  let r = await worker.fetch(req({ image: JPEG }, { headers: { origin: "https://evil.example" } }), env()); assert.equal(r.status, 403); assert.equal(r.headers.get("access-control-allow-origin"), null);
  r = await worker.fetch(new Request("https://w.example/", { method: "POST", body: "{}" }), env()); assert.equal(r.status, 403);
  r = await worker.fetch(new Request("https://w.example/", { method: "GET", headers: { origin: "https://www.chicasmap.com" } }), env()); assert.equal(r.status, 405);
  r = await worker.fetch(new Request("https://w.example/", { method: "OPTIONS", headers: { origin: "https://chicasmap.com" } }), env()); assert.equal(r.status, 204); assert.equal(r.headers.get("access-control-allow-origin"), "https://chicasmap.com");
  r = await worker.fetch(new Request("https://w.example/", { method: "OPTIONS", headers: { origin: "https://evil.example" } }), env()); assert.equal(r.status, 403);
  r = await worker.fetch(req({ image: "/9j/" + "A".repeat(lib.MAX_IMAGE_B64) }), env()); assert.equal(r.status, 413);
  r = await worker.fetch(req({ image: "iVBOR" + "A".repeat(400) }), env()); assert.equal(r.status, 400);
  r = await worker.fetch(req("{nope"), env()); assert.equal(r.status, 400);
  assert.equal(calls.length, 0, "no upstream calls for rejected requests");
});
await t("handler: per-IP rate limit and daily cap (in-memory/Cache fallbacks)", async () => {
  mockFetch(); const e = env(); e.PER_IP_PER_MIN = "2"; const h = { "cf-connecting-ip": "9.9.9.9" };
  const s = []; for (let i = 0; i < 4; i++) s.push((await worker.fetch(req({ image: JPEG }, { headers: h }), e)).status);
  assert.deepEqual(s, [200, 200, 429, 429]);
  // daily cap via a KV-like binding
  const store = new Map(); const kv = { get: async (k) => store.get(k) || null, put: async (k, v) => { store.set(k, v); } };
  const e2 = env(); e2.DAILY_KV = kv; e2.DAILY_CAP = "2";
  const s2 = []; for (let i = 0; i < 3; i++) s2.push((await worker.fetch(req({ image: JPEG }), e2)).status);
  assert.deepEqual(s2, [200, 200, 429]);
  // Workers rate-limit binding takes precedence
  const e3 = env(); e3.RATE_LIMITER = { limit: async () => ({ success: false }) };
  assert.equal((await worker.fetch(req({ image: JPEG }), e3)).status, 429);
});
console.log("\n" + n + " worker tests passed");
