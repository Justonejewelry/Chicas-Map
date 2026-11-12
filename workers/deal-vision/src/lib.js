/* Pure helpers for the Deal Vision worker (no network, no Workers globals) so they can be unit-tested with plain node. */

// Must match the ids in webapp/js/deals-finder.js ITEMS (tests enforce this).
export const CATEGORIES = [
  ["castiron", "Cast iron skillet"], ["pyrex", "Vintage Pyrex"], ["lego", "LEGO (bulk, per lb)"], ["videogame", "Retro video games"],
  ["console", "Game console"], ["dewalt", "Power tools"], ["handtools", "Vintage hand tools"], ["dresser", "Solid wood dresser"],
  ["mcm", "Mid-century furniture"], ["chair", "Office/accent chair"], ["vinyl", "Vinyl records"], ["books", "Books (first ed./sets)"],
  ["comics", "Comic books"], ["cards", "Sports/Pokemon cards"], ["jewelry", "Costume & silver jewelry"], ["watch", "Watches"],
  ["camera", "Film camera"], ["audio", "Vintage stereo/receiver"], ["guitar", "Guitar"], ["designer", "Designer purse"],
  ["jeans", "Vintage jeans/denim"], ["boots", "Cowboy boots"], ["sneakers", "Name-brand sneakers"], ["kitchenaid", "Stand mixer"],
  ["corningware", "CorningWare/Fiesta"], ["lamp", "Vintage lamp"], ["art", "Original art/prints"], ["toys", "Vintage toys/action figures"],
  ["bike", "Bicycle"], ["yeti", "YETI cooler/tumbler"], ["mower", "Lawn mower"], ["electronics", "Laptop/tablet"],
  ["babygear", "Baby gear (stroller etc.)"], ["holiday", "Vintage holiday decor"], ["mexican", "Talavera & Mexican folk art"],
  ["sewing", "Sewing machine"], ["typewriter", "Typewriter"], ["golf", "Golf clubs"], ["fishing", "Fishing reels & lures"],
  ["dvd", "DVDs/Blu-rays (bulk)"], ["perfume", "Designer perfume"], ["dolls", "Vintage dolls/Barbie"], ["smallappl", "Instant Pot/Vitamix/Ninja"],
  ["hotwheels", "Hot Wheels/die-cast"], ["coins", "Coins & silver"], ["saw", "Table/miter saw"], ["exercise", "Exercise equipment"],
  ["washer", "Pressure washer/generator"], ["patio", "Patio furniture"], ["other", "Something else"]
];
export const CATEGORY_IDS = CATEGORIES.map(function (c) { return c[0]; });
export const CONDITIONS = ["like_new", "good", "rough", "unknown"];

export const MAX_IMAGE_B64 = 420000;   // ~315 KB of JPEG; client targets < 300 KB
export const MAX_BODY_BYTES = 450000;

export function buildPrompt() {
  return [
    "You are Chica, an expert thrift-store and garage-sale appraiser in San Antonio. Look at the photo of ONE item a shopper found.",
    "Identify the most specific item you can: read any visible brand, maker, model or part number, and say what it is (e.g. 'Lodge 10.25 inch cast iron skillet', 'Pioneer SX-780 receiver').",
    "Rules: only state a brand or model if you can actually see or confidently recognise it; otherwise leave it empty. Never invent model numbers.",
    "Pick the single best 'category' id from this list (use 'other' if nothing fits): " + CATEGORIES.map(function (c) { return c[0] + " = " + c[1]; }).join("; ") + ".",
    "'query' is a short eBay search string (3 to 8 words: brand + model + item type, no condition words, no punctuation).",
    "'condition' is one of like_new, good, rough, unknown, judged from the photo.",
    "'confidence' is 0 to 1 for the main identification.",
    "'alternatives' has up to 3 other plausible guesses, each with a name, a category id and a confidence.",
    "Return JSON only."
  ].join("\n");
}

// Gemini response schema (OpenAPI subset). Providers that don't take a schema just get the prompt.
export function responseSchema() {
  var alt = { type: "OBJECT", properties: { name: { type: "STRING" }, category: { type: "STRING", enum: CATEGORY_IDS }, confidence: { type: "NUMBER" } }, required: ["name", "category"] };
  return {
    type: "OBJECT",
    properties: {
      name: { type: "STRING" }, brand: { type: "STRING" }, model: { type: "STRING" },
      category: { type: "STRING", enum: CATEGORY_IDS }, query: { type: "STRING" },
      condition: { type: "STRING", enum: CONDITIONS }, confidence: { type: "NUMBER" },
      alternatives: { type: "ARRAY", items: alt }
    },
    required: ["name", "category", "query", "condition", "confidence"]
  };
}

function cleanStr(v, max) {
  if (typeof v !== "string") return "";
  // strip control chars and angle brackets; the page only ever uses textContent but keep the data tidy.
  return v.replace(/[\u0000-\u001f\u007f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}
function clamp01(n, dflt) { n = Number(n); if (!isFinite(n)) return dflt; return Math.max(0, Math.min(1, n)); }
export function mapCategory(c) {
  var s = cleanStr(c, 40).toLowerCase();
  return CATEGORY_IDS.indexOf(s) >= 0 ? s : "other";
}

// Pull the first JSON object out of model text (handles ```json fences and chatter).
export function extractJson(text) {
  if (text && typeof text === "object") return text;
  if (typeof text !== "string") return null;
  var t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try { return JSON.parse(t); } catch (e) {}
  var a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch (e) {} }
  return null;
}

// Validate + normalise whatever the model returned into the strict shape the page relies on. Returns null when unusable.
export function normalizeVision(raw) {
  var o = extractJson(raw);
  if (!o || typeof o !== "object" || Array.isArray(o)) return null;
  var name = cleanStr(o.name || o.item || "", 90), brand = cleanStr(o.brand, 40), model = cleanStr(o.model, 40);
  if (!name) return null;
  var cond = cleanStr(o.condition, 20).toLowerCase().replace(/[\s-]+/g, "_");
  if (CONDITIONS.indexOf(cond) < 0) cond = "unknown";
  var query = cleanStr(o.query, 80).replace(/[^\p{L}\p{N}\s.\-/'"]/gu, " ").replace(/\s+/g, " ").trim();
  if (!query) query = cleanStr([brand, model, name].filter(Boolean).join(" "), 80);
  var alts = [];
  if (Array.isArray(o.alternatives)) {
    o.alternatives.slice(0, 6).forEach(function (a) {
      if (!a || typeof a !== "object") return;
      var n = cleanStr(a.name, 90); if (!n) return;
      if (alts.length < 3) alts.push({ name: n, category: mapCategory(a.category), confidence: clamp01(a.confidence, 0) });
    });
  }
  return { name: name, brand: brand, model: model, category: mapCategory(o.category), query: query, condition: cond, confidence: clamp01(o.confidence, 0.5), alternatives: alts };
}

/* ---------- provider request/response shapes (pure, so they can be tested) ---------- */
export function geminiRequest(model, b64, prompt) {
  return {
    url: "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent",
    body: {
      contents: [{ role: "user", parts: [{ text: prompt }, { inline_data: { mime_type: "image/jpeg", data: b64 } }] }],
      generationConfig: { responseMimeType: "application/json", responseSchema: responseSchema(), temperature: 0.2, maxOutputTokens: 1024 }
    }
  };
}
export function geminiText(json) {
  try {
    var parts = json.candidates[0].content.parts, s = "";
    for (var i = 0; i < parts.length; i++) if (typeof parts[i].text === "string" && !parts[i].thought) s += parts[i].text;
    return s;
  } catch (e) { return ""; }
}
export function openaiRequest(baseUrl, model, b64, prompt) {
  return {
    url: String(baseUrl || "https://api.openai.com/v1").replace(/\/+$/, "") + "/chat/completions",
    body: {
      model: model, temperature: 0.2, max_tokens: 700, response_format: { type: "json_object" },
      messages: [{ role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: "data:image/jpeg;base64," + b64, detail: "low" } }] }]
    }
  };
}
export function openaiText(json) { try { return json.choices[0].message.content || ""; } catch (e) { return ""; } }

/* ---------- eBay price stats ---------- */
var JUNK = /\b(lot of|lots?|parts?|for parts|repair|broken|not working|untested|as[- ]is|empty box|box only|case only|manual only|replacement|read desc|wholesale|bundle of|set of \d{2,})\b/i;
export function percentile(sorted, p) {
  if (!sorted.length) return 0;
  var i = (sorted.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}
export function round2(n) { return Math.round(n * 100) / 100; }

// items = eBay Browse itemSummaries. Returns null when there are too few comparable listings.
export function summarizeListings(items, opts) {
  opts = opts || {};
  var minN = opts.minN || 3, seen = {}, rows = [];
  (Array.isArray(items) ? items : []).forEach(function (it) {
    if (!it || !it.price) return;
    var v = Number(it.price.value), cur = it.price.currency, title = String(it.title || "");
    if (!isFinite(v) || v <= 0 || cur !== "USD") return;
    if (JUNK.test(title)) return;
    var key = it.itemId || title; if (seen[key]) return; seen[key] = 1;
    rows.push({ v: v, it: it });
  });
  if (rows.length < minN) return null;
  var vals = rows.map(function (r) { return r.v; }).sort(function (a, b) { return a - b; });
  // Outlier trim: IQR fences once there is enough data.
  var kept = rows;
  if (vals.length >= 5) {
    var q1 = percentile(vals, 0.25), q3 = percentile(vals, 0.75), iqr = q3 - q1, lo = q1 - 1.5 * iqr, hi = q3 + 1.5 * iqr;
    kept = rows.filter(function (r) { return r.v >= lo && r.v <= hi; });
  }
  if (kept.length < minN) return null;
  var kv = kept.map(function (r) { return r.v; }).sort(function (a, b) { return a - b; });
  var med = percentile(kv, 0.5);
  // examples: the listings closest to the median, de-duplicated by title.
  var ex = kept.slice().sort(function (a, b) { return Math.abs(a.v - med) - Math.abs(b.v - med); }).slice(0, 3);
  return {
    basis: "asking", currency: "USD", n: kept.length,
    low: round2(percentile(kv, 0.1)), median: round2(med), high: round2(percentile(kv, 0.9)),
    examples: ex.map(function (r) { return exampleOf(r.it, opts.campid); })
  };
}
export function exampleOf(it, campid) {
  var url = String(it.itemAffiliateWebUrl || "");
  if (!isEbayUrl(url)) {
    url = String(it.itemWebUrl || "");
    if (!isEbayUrl(url)) url = "";
    else if (campid) url += (url.indexOf("?") < 0 ? "?" : "&") + "mkevt=1&mkcid=1&mkrid=711-53200-19255-0&campid=" + encodeURIComponent(campid) + "&toolid=10001&customid=dealfinder";
  }
  var img = ""; try { img = String((it.image && it.image.imageUrl) || ""); } catch (e) {}
  return { title: cleanStr(it.title, 90), price: round2(Number(it.price.value)), condition: cleanStr(it.condition, 30), url: url, image: /^https:\/\//i.test(img) ? img : "" };
}
export function isEbayUrl(u) {
  try { var x = new URL(u); return x.protocol === "https:" && /(^|\.)ebay\.com$/i.test(x.hostname); } catch (e) { return false; }
}
export function ebaySearchParams(query) {
  var q = String(query || "").slice(0, 80).trim();
  var p = new URLSearchParams();
  p.set("q", q);
  p.set("limit", "50");
  p.set("filter", "conditions:{USED},buyingOptions:{FIXED_PRICE},deliveryCountry:US");
  return p.toString();
}

/* ---------- misc ---------- */
export function originAllowed(origin, list) {
  if (!origin) return false;
  return String(list || "").split(",").map(function (s) { return s.trim(); }).filter(Boolean).indexOf(origin) >= 0;
}
export function decodeB64Header(b64) {
  // JPEG magic bytes "FF D8 FF" encode to "/9j/" in base64.
  return typeof b64 === "string" && b64.length > 200 && b64.slice(0, 4) === "/9j/" && /^[A-Za-z0-9+/]+={0,2}$/.test(b64);
}
