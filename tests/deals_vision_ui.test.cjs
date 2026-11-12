/* jsdom check of Deal Finder's cloud-photo paths with the worker mocked. Skips (exit 0, prints SKIP) when jsdom isn't installed.
   Find jsdom via require, or JSDOM_PATH=/dir/with/node_modules. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
let JSDOM;
for (const base of [process.env.JSDOM_PATH, "/workspace/jsdom-env", process.cwd(), __dirname].filter(Boolean)) {
  try { JSDOM = require(require.resolve("jsdom", { paths: [base] })).JSDOM; break; } catch (e) {}
}
if (!JSDOM) { console.log("SKIP: jsdom not installed (npm i jsdom, or set JSDOM_PATH)"); process.exit(0); }

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "webapp/deals/index.html"), "utf8").replace(/<script[\s\S]*?<\/script>/g, "");
const code = fs.readFileSync(path.join(root, "webapp/js/deals-finder.js"), "utf8");
const cfgCode = fs.readFileSync(path.join(root, "webapp/js/chica-config.js"), "utf8");
const tick = (ms) => new Promise((r) => setTimeout(r, ms || 0));

function good(over) {
  return Object.assign({ ok: true, v: 1, provider: "gemini",
    item: { name: "Lodge 10 inch skillet", brand: "Lodge", model: "", category: "castiron", query: "lodge 10 inch cast iron skillet", condition: "like_new", confidence: 0.92,
      alternatives: [{ name: "Griswold skillet", category: "castiron", confidence: 0.3 }, { name: "Dutch oven", category: "pyrex", confidence: 0.2 }, { name: "Wok", category: "other", confidence: 0.1 }] },
    prices: { basis: "asking", currency: "USD", n: 9, low: 22, median: 40, high: 65, examples: [
      { title: "Lodge skillet #8", price: 38, url: "https://www.ebay.com/itm/1?campid=5339243224" }, { title: "bad", price: 1, url: "javascript:alert(1)" }, { title: "evil", price: 2, url: "https://ebay.com.evil.io/x" }] } }, over || {});
}

async function boot({ vision, lang, fetchImpl }) {
  const dom = new JSDOM(html, { url: "https://www.chicasmap.com/deals/", runScripts: "outside-only", pretendToBeVisual: true });
  const w = dom.window; w.document.documentElement.lang = lang || "en";
  w.URL.createObjectURL = () => "blob:mock"; w.URL.revokeObjectURL = () => {};
  w.HTMLElement.prototype.scrollIntoView = () => {};
  const fetches = [];
  w.fetch = (url, init) => { fetches.push({ url: String(url), init }); return fetchImpl(String(url), init); };
  w.ChicaDealHooks = { downscale: async () => "/9j/" + "A".repeat(300) };
  w.eval(cfgCode);
  w.CHICA_CONFIG.DEAL_VISION_URL = vision;
  w.eval(code);
  return { dom, w, d: w.document, fetches };
}
const salesOk = (url) => /sales-clean/.test(url) ? Promise.resolve({ ok: true, json: async () => ({ public: [], unconfirmed: [] }) }) : null;
async function snap(app, name) {
  const input = app.d.getElementById("ff-gal");
  Object.defineProperty(input, "files", { value: [new app.w.File([new Uint8Array([1, 2, 3])], name || "x.jpg", { type: "image/jpeg" })], configurable: true });
  input.dispatchEvent(new app.w.Event("change", { bubbles: true }));
}
let n = 0; const ok = (m) => { n++; console.log("ok -", m); };

(async () => {
  // 1. flag off -> no worker call, on-phone note stays, CLIP path is used (it fails offline in jsdom and shows the friendly message)
  { const a = await boot({ vision: "", fetchImpl: (u) => salesOk(u) || Promise.reject(new Error("no")) });
    assert.match(a.d.querySelector(".ff-hint").textContent, /stays on your phone/); assert.ok(!/sent to Chica/.test(a.d.body.textContent));
    await snap(a); await tick(300);
    assert.ok(!a.fetches.some((f) => f.url.includes("workers.dev")), "flag off must not call the worker"); ok("flag off: on-phone only, privacy line unchanged"); a.w.close(); }

  // 2. flag on, success: name/brand, 3 chips, eBay panel (asking label), verdict uses median, safe links only
  { const a = await boot({ vision: "https://chicas-deal-vision.test.workers.dev/", fetchImpl: (u, i) => salesOk(u) || Promise.resolve({ ok: true, json: async () => good() }) });
    assert.match(a.d.body.textContent, /sent to Chica's helper/); assert.ok(!/stays on your phone/.test(a.d.body.textContent));
    await snap(a); await tick(200);
    const call = a.fetches.find((f) => f.url.includes("workers.dev")); assert.equal(call.init.method, "POST"); assert.ok(JSON.parse(call.init.body).image.startsWith("/9j/")); assert.ok(call.init.signal, "AbortController signal attached");
    assert.equal(a.d.querySelector(".ff-vname").textContent, "Lodge 10 inch skillet"); assert.match(a.d.querySelector("#ff-ph-out").textContent, /Brand: Lodge/);
    const chips = a.d.querySelectorAll("#ff-ph-out [data-gi]"); assert.equal(chips.length, 3); assert.equal(chips[0].getAttribute("aria-pressed"), "true");
    const panel = a.d.getElementById("ff-ebay"); assert.ok(panel && !panel.hidden); assert.match(panel.textContent, /asking prices \(not sold\)/); assert.match(panel.textContent, /\$22/); assert.match(panel.textContent, /\$40/); assert.match(panel.textContent, /\$65/); assert.match(panel.textContent, /9 comparable/);
    const links = [...panel.querySelectorAll("a")]; assert.equal(links.length, 1, "javascript: and lookalike-host links dropped"); assert.ok(links[0].href.startsWith("https://www.ebay.com/")); assert.match(links[0].rel, /sponsored/);
    assert.equal(a.d.getElementById("ff-resale").value, "40", "verdict price uses eBay median"); assert.equal(a.d.getElementById("ff-cond").value, "0", "condition guess applied");
    assert.equal(a.d.getElementById("ff-name").value, "Lodge 10 inch skillet"); assert.match(a.d.getElementById("ff-guide").textContent, /eBay asking prices right now: \$22.\$65, median \$40/);
    assert.match(a.d.getElementById("ff-verdict").textContent, /eBay sold listings/);
    const sold = [...a.d.querySelectorAll("#ff-verdict a")].find((x) => /LH_Sold=1/.test(x.href)); assert.ok(sold && /campid=5339243224/.test(sold.href) && /lodge%2010%20inch%20cast%20iron%20skillet/.test(sold.href), "sold link uses AI query + campid");
    // tap an alternative: eBay panel hides, price resets to the category guide, chip pressed
    chips[2].click(); await tick(20);
    assert.equal(chips[2].getAttribute("aria-pressed"), "true"); assert.ok(a.d.getElementById("ff-ebay").hidden); assert.notEqual(a.d.getElementById("ff-resale").value, "40"); assert.equal(a.d.getElementById("ff-name").value, "Dutch oven");
    chips[0].click(); await tick(20); assert.ok(!a.d.getElementById("ff-ebay").hidden); assert.equal(a.d.getElementById("ff-resale").value, "40");
    ok("flag on: ID, chips, eBay asking panel, median drives verdict, safe links"); a.w.close(); }

  // 3. Spanish strings
  { const a = await boot({ vision: "https://x.workers.dev/", lang: "es", fetchImpl: (u) => salesOk(u) || Promise.resolve({ ok: true, json: async () => good() }) });
    await snap(a); await tick(200);
    assert.match(a.d.getElementById("ff-ebay").textContent, /precios que piden \(no vendidos\)/); assert.match(a.d.querySelector("#ff-ph-out").textContent, /Marca: Lodge/); assert.match(a.d.getElementById("ff-guide").textContent, /Precios que piden en eBay/); ok("Spanish copy"); a.w.close(); }

  // 4. prices null: ID still works, no panel, resale stays on the guide
  { const a = await boot({ vision: "https://x.workers.dev/", fetchImpl: (u) => salesOk(u) || Promise.resolve({ ok: true, json: async () => good({ prices: null }) }) });
    await snap(a); await tick(200); assert.equal(a.d.getElementById("ff-ebay"), null); assert.equal(a.d.querySelectorAll("#ff-ph-out [data-gi]").length, 3); assert.ok(!/eBay asking prices/.test(a.d.getElementById("ff-guide").textContent)); ok("no eBay comps: ID only"); a.w.close(); }

  // 5. hostile strings render as text only
  { const evil = good(); evil.item.name = '<img src=x onerror="window.__pwn=1">Skillet'; evil.item.brand = "<script>window.__pwn=2</script>";
    const a = await boot({ vision: "https://x.workers.dev/", fetchImpl: (u) => salesOk(u) || Promise.resolve({ ok: true, json: async () => evil }) });
    await snap(a); await tick(200); assert.equal(a.w.__pwn, undefined); assert.equal(a.d.querySelectorAll("#ff-ph-out img[onerror], #ff-verdict img[onerror]").length, 0); assert.ok(a.d.querySelector(".ff-vname").textContent.includes("<img")); ok("hostile model output stays inert"); a.w.close(); }

  // 6. failure / bad JSON / abort -> falls back to CLIP path (friendly message offline), no crash, exactly one worker attempt
  for (const [label, impl] of [["HTTP 502", () => Promise.resolve({ ok: false, status: 502, json: async () => ({}) })], ["bad payload", () => Promise.resolve({ ok: true, json: async () => ({ ok: true, item: { name: "" } }) })], ["network/abort", () => Promise.reject(Object.assign(new Error("aborted"), { name: "AbortError" }))]]) {
    const a = await boot({ vision: "https://x.workers.dev/", fetchImpl: (u) => salesOk(u) || impl() });
    await snap(a); await tick(300);
    assert.equal(a.fetches.filter((f) => f.url.includes("workers.dev")).length, 1); assert.match(a.d.getElementById("ff-ph-out").textContent, /nose is stuffy|sniffing|downloading/i, label + ": CLIP fallback took over"); assert.equal(a.d.getElementById("ff-ebay"), null); ok("fallback to on-phone CLIP on " + label); a.w.close(); }

  // 7. 20 s timeout: a worker that never answers is abandoned
  { const a = await boot({ vision: "https://x.workers.dev/", fetchImpl: (u, i) => salesOk(u) || new Promise((_, rej) => { i.signal.addEventListener("abort", () => rej(new Error("aborted"))); }) });
    const real = a.w.setTimeout; let delays = []; a.w.setTimeout = function (f, ms) { delays.push(ms); return real.call(a.w, f, ms > 1000 ? 30 : ms); };
    await snap(a); await tick(250); assert.ok(delays.includes(20000), "20s abort timer armed"); assert.match(a.d.getElementById("ff-ph-out").textContent, /nose is stuffy|sniffing|downloading/i); ok("20s timeout falls back"); a.w.close(); }

  console.log("\n" + n + " UI checks passed"); process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
