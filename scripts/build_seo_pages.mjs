#!/usr/bin/env node
/**
 * Build static neighborhood landing pages ("Garage sales in Stone Oak this weekend")
 * from the live feed, and add them to sitemap.xml.
 * Run AFTER stamp-pages.mjs and BEFORE root-domain.mjs (pages.yml does this).
 *   node scripts/build_seo_pages.mjs _site
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { richEventLd } from "./sale_pages.mjs";

const root = process.argv[2] || "_site";
const origin = (process.env.SITE_ORIGIN || "https://www.chicasmap.com").replace(/\/$/, "");
const BASE = "/Chicas-Map"; // root-domain.mjs rewrites this to "/"

const AREAS = [
  { slug: "stone-oak", name: "Stone Oak", zips: ["78258", "78259", "78260", "78261"] },
  { slug: "alamo-heights-midtown", name: "Alamo Heights & Midtown", zips: ["78209", "78212", "78201", "78213", "78216"] },
  { slug: "north-central", name: "North Central & Shavano Park", zips: ["78230", "78231", "78232", "78248", "78217", "78247"] },
  { slug: "medical-center", name: "the Medical Center", zips: ["78229", "78240", "78249", "78238"] },
  { slug: "alamo-ranch-westover-hills", name: "Alamo Ranch & Westover Hills", zips: ["78245", "78251", "78250", "78252", "78253", "78254"] },
  { slug: "helotes", name: "Helotes & Leon Valley", zips: ["78023"] },
  { slug: "downtown-southtown", name: "Downtown & Southtown", zips: ["78202", "78203", "78204", "78205", "78208", "78210", "78215"] },
  { slug: "west-side", name: "the West Side", zips: ["78207", "78237", "78227", "78228"] },
  { slug: "southwest-lackland", name: "Southwest San Antonio & Lackland", zips: ["78236", "78242"] },
  { slug: "south-side", name: "the South Side", zips: ["78211", "78214", "78221", "78223", "78224", "78225", "78226", "78264", "78112", "78073"] },
  { slug: "east-side", name: "the East Side", zips: ["78218", "78219", "78220", "78222", "78244", "78263"] },
  { slug: "northeast-live-oak-converse", name: "Live Oak, Converse & Universal City", zips: ["78233", "78239", "78109", "78148", "78150", "78234", "78133"] },
  { slug: "schertz-new-braunfels", name: "Schertz, Cibolo & New Braunfels", zips: ["78154", "78108", "78124", "78130", "78132", "78666", "78623", "78070"] },
  { slug: "boerne-hill-country", name: "Boerne & the Hill Country", zips: ["78006", "78015", "78009", "78255", "78256", "78257"] }
];

function readJson(p) { try { return JSON.parse(readFileSync(p, "utf8")); } catch (e) { return null; } }
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]); }
function todayCT() { return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(new Date()); }
function zipOf(s) { const z = String(s.zip || "").match(/\b7\d{4}\b/) || String(s.address || "").match(/\b7\d{4}\b/); return z ? z[0] : ""; }
function saleId(s) {
  const lat = Number(s.lat != null ? s.lat : s.latitude), lon = Number(s.lon != null ? s.lon : s.lng != null ? s.lng : s.longitude);
  return s.external_id || s.id || s.sale_id || (lat.toFixed(5) + "," + lon.toFixed(5) + "|" + (s.title || s.address || ""));
}

function slug(id) { return String(id).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "sale"; }

// Missing ZIPs filled from the Census 2020 ZCTA layer by scripts/fill_zips.py (cache file).
const ZCTA = readJson(join(root, "data", "zcta-cache.json")) || {};
const today = todayCT();
const sales = [];
const ended = [];
const seen = new Set();
for (const f of ["sales-clean.json"]) {
  const d = readJson(join(root, "data", f));
  if (!d || !Array.isArray(d.public)) continue;
  for (const s of d.public) {
    if (!isFinite(Number(s.lat)) || !isFinite(Number(s.lon != null ? s.lon : s.lng))) continue;
    const end = String(s.date_end || s.end_date || s.date_to || "").slice(0, 10);
    const id = saleId(s);
    if (seen.has(id)) continue;
    seen.add(id);
    const zk = Number(s.lat).toFixed(5) + "," + Number(s.lon != null ? s.lon : s.lng).toFixed(5);
    const zip = zipOf(s) || ZCTA[zk] || "";
    const rec = Object.assign({}, s, { _id: id, _zip: zip, _slug: slug(id) }, !s.zip && zip ? { zip } : {});
    if (/^\d{4}-\d{2}-\d{2}$/.test(end) && end < today) { ended.push(rec); continue; } // ended: keep a notice page, not listed
    sales.push(rec);
  }
}

const NAV = '<nav class="crumbs"><a href="' + BASE + '/">Chicas Map</a> › <a href="' + BASE + '/garage-sales/">Neighborhoods</a></nav>';
const CSS = "body{margin:0;background:#fffdf8;color:#1a1714;font:16px/1.5 Inter,system-ui,-apple-system,Segoe UI,sans-serif}main{max-width:760px;margin:0 auto;padding:72px 18px 48px}h1{font-size:30px;line-height:1.15;margin:8px 0 10px}.lede{font-size:17px;color:#3b342d}.crumbs{font-size:14px}.crumbs a,.areas a{color:#7a0f6c}.cta{display:inline-block;margin:12px 8px 4px 0;padding:12px 18px;border-radius:12px;background:#c513af;color:#fff;font-weight:800;text-decoration:none}.cta.alt{background:#fff;color:#7a0f6c;border:2px solid #c513af}.sale{display:block;margin:12px 0;padding:14px 16px;border-radius:14px;background:#fff;box-shadow:0 2px 10px rgba(0,0,0,.08);color:inherit;text-decoration:none}.sale strong{display:block;font-size:17px}.sale .m{color:#5b5249;font-size:14px}.areas{columns:2;padding-left:18px}@media(max-width:480px){h1{font-size:25px}.areas{columns:1}}";

function head(title, desc, path, indexable, ld, lang) {
  const url = origin + path;
  const enPath = path.replace(/^\/es\//, "/"), esPath = "/es" + enPath;
  return '<!doctype html><html lang="' + (lang || "en") + '"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>' +
    "<title>" + esc(title) + "</title>" +
    '<meta name="description" content="' + esc(desc) + '"/>' +
    '<meta name="robots" content="' + (indexable ? "index,follow,max-image-preview:large" : "noindex,follow") + '"/>' +
    '<link rel="canonical" href="' + url + '"/>' +
    '<link rel="alternate" hreflang="en" href="' + origin + enPath + '"/><link rel="alternate" hreflang="es" href="' + origin + esPath + '"/><link rel="alternate" hreflang="x-default" href="' + origin + enPath + '"/>' +
    '<meta property="og:type" content="website"/><meta property="og:site_name" content="Chicas Map"/><meta property="og:locale" content="' + (lang === "es" ? "es_US" : "en_US") + '"/>' +
    '<meta property="og:title" content="' + esc(title) + '"/><meta property="og:description" content="' + esc(desc) + '"/>' +
    '<meta property="og:url" content="' + url + '"/><meta property="og:image" content="' + origin + '/og.jpg"/>' +
    '<meta name="twitter:card" content="summary_large_image"/><meta name="twitter:title" content="' + esc(title) + '"/>' +
    '<meta name="twitter:description" content="' + esc(desc) + '"/><meta name="twitter:image" content="' + origin + '/og.jpg"/>' +
    '<link rel="icon" href="' + BASE + '/favicon.svg"/>' +
    (ld ? '<script type="application/ld+json">' + JSON.stringify(ld).replace(/</g, "\\u003c") + "</script>" : "") +
    "<style>" + CSS + "</style></head><body>";
}
const FOOT = '<script src="' + BASE + '/js/chica-menu.js?v=8" defer></script></body></html>';

function saleCard(s, es) {
  const when = [s.dates, s.hours].filter(Boolean).join(" · ");
  return '<a class="sale" href="' + BASE + (es ? "/es" : "") + "/sales/" + s._slug + '/"><strong>' + esc(s.title || "Garage sale") + "</strong>" +
    '<span class="m">' + esc(s.address || "") + (when ? "<br>" + esc(when) : "") + "</span></a>";
}
function eventLd(s) {
  const start = String(s.date_start || s.date_from || "").slice(0, 10);
  const end = String(s.date_end || s.end_date || s.date_to || start).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return null;
  return { "@type": "Event", name: s.title || "Garage sale", startDate: start, endDate: end || start,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode", eventStatus: "https://schema.org/EventScheduled",
    location: { "@type": "Place", name: s.address || "San Antonio, TX", address: s.address || "San Antonio, TX" },
    url: origin + "/sales/" + s._slug + "/", isAccessibleForFree: true };
}
function write(path, html) {
  const file = join(root, path.replace(/^\//, ""), "index.html");
  mkdirSync(join(file, ".."), { recursive: true });
  writeFileSync(file, html);
}

const ES_NAMES = {
  "stone-oak": "Stone Oak", "alamo-heights-midtown": "Alamo Heights y Midtown", "north-central": "Centro Norte y Shavano Park",
  "medical-center": "el Centro Médico", "alamo-ranch-westover-hills": "Alamo Ranch y Westover Hills", "helotes": "Helotes y Leon Valley",
  "downtown-southtown": "el Centro y Southtown", "west-side": "el Lado Oeste", "southwest-lackland": "el Suroeste de San Antonio y Lackland",
  "south-side": "el Lado Sur", "east-side": "el Lado Este", "northeast-live-oak-converse": "Live Oak, Converse y Universal City",
  "schertz-new-braunfels": "Schertz, Cibolo y New Braunfels", "boerne-hill-country": "Boerne y el Hill Country"
};
const cap = (t) => t.replace(/^(the|el) /, "").replace(/^./, (ch) => ch.toUpperCase());
const built = [];
const builtEs = [];
for (const es of [false, true]) {
  const pre = es ? "/es" : "";
  const nm = (a) => (es ? ES_NAMES[a.slug] || a.name : a.name);
  const areaLinks = (skip) => '<ul class="areas">' + AREAS.filter((a) => a.slug !== skip).map((a) => '<li><a href="' + BASE + pre + "/garage-sales/" + a.slug + '/">' + esc(cap(nm(a))) + "</a></li>").join("") + "</ul>";
  const nav = '<nav class="crumbs"><a href="' + BASE + pre + '/">Chicas Map</a> › <a href="' + BASE + pre + '/garage-sales/">' + (es ? "Vecindarios" : "Neighborhoods") + "</a>" +
    '<span style="float:right"><a href="' + BASE + '/garage-sales/" lang="en">EN</a> · <a href="' + BASE + '/es/garage-sales/" lang="es">ES</a></span></nav>';
  for (const a of AREAS) {
    const list = sales.filter((s) => a.zips.includes(s._zip));
    const n = list.length, name = nm(a);
    const path = pre + "/garage-sales/" + a.slug + "/";
    const title = es ? "Ventas de garaje en " + name + " este fin de semana · Chicas Map" : "Garage sales in " + a.name.replace(/^the /, "") + " this weekend · Chicas Map";
    const desc = es
      ? (n ? n + " venta" + (n === 1 ? "" : "s") + " de garaje, patio y bienes en " + name + ", San Antonio. Mapa gratis, Cerca de mí y rutas con un toque."
           : "Ventas de garaje, patio y bienes en " + name + ", San Antonio. Chica revisa esta página todos los días.")
      : (n ? n + " garage, yard and estate sale" + (n === 1 ? "" : "s") + " in " + a.name + ", San Antonio. Free map, Near Me, and one-tap routes from Chica."
           : "Garage, yard and estate sales in " + a.name + ", San Antonio. Chica updates this page every day.");
    const events = list.map((s) => richEventLd(s, { origin, path: pre + "/sales/" + s._slug + "/", isEnded: false })).filter(Boolean).map((e) => { const { ["@context"]: _c, ...rest } = e; return rest; });
    const ld = { "@context": "https://schema.org", "@type": "CollectionPage", name: title, url: origin + path, inLanguage: es ? "es" : "en",
      ...(events.length ? { mainEntity: { "@type": "ItemList", itemListElement: events.map((e, i) => ({ "@type": "ListItem", position: i + 1, item: e })) } } : {}) };
    const lede = es
      ? "¡Hola, vecino! Aquí Chica. 🐾 " + (n ? "Olfateé " + n + " venta" + (n === 1 ? "" : "s") + " por " + esc(name) + ". Toca una para ver los detalles y cómo llegar."
                                              : "Todavía no hay ventas por " + esc(name) + ". Reviso todos los días, así que vuelve pronto o mira el mapa completo.")
      : "Hi neighbor! Chica here. 🐾 " + (n ? "I sniffed out " + n + " sale" + (n === 1 ? "" : "s") + " around " + esc(a.name) + ". Tap one to see it on the map and get directions."
                                           : "No sales posted around " + esc(a.name) + " yet. I check every day, so peek back soon or browse the whole map.");
    const body = "<main>" + nav + "<h1>" + (es ? "Ventas de garaje en " + esc(name) + " este fin de semana" : "Garage sales in " + esc(a.name) + " this weekend") + "</h1>" +
      '<p class="lede">' + lede + "</p>" +
      '<a class="cta" href="' + BASE + '/map/">' + (es ? "Abrir el mapa en vivo" : "Open the live map") + '</a><a class="cta alt" href="' + BASE + pre + '/submit/">' + (es ? "Publica tu venta gratis" : "List your sale free") + "</a>" +
      list.map((s) => saleCard(s, es)).join("") +
      "<h2>" + (es ? "Más vecindarios de San Antonio" : "More San Antonio neighborhoods") + "</h2>" + areaLinks(a.slug) + "</main>";
    write(path, head(title, desc, path, n > 0, ld, es ? "es" : "en") + body + FOOT);
    (es ? builtEs : built).push({ path, indexable: n > 0, n, slug: a.slug, name });
  }
  const hubPath = pre + "/garage-sales/";
  const hubTitle = es ? "Ventas de garaje en San Antonio por vecindario · Chicas Map" : "San Antonio garage sales by neighborhood · Chicas Map";
  const hubDesc = es ? "Encuentra ventas de garaje, patio y bienes cerca de ti en San Antonio, por vecindario. Chica actualiza todos los días." : "Find garage, yard and estate sales near you in San Antonio, by neighborhood. Updated daily by Chica.";
  write(hubPath, head(hubTitle, hubDesc, hubPath, true, { "@context": "https://schema.org", "@type": "CollectionPage", name: hubTitle, url: origin + hubPath, inLanguage: es ? "es" : "en" }, es ? "es" : "en") +
    '<main><nav class="crumbs"><a href="' + BASE + pre + '/">Chicas Map</a></nav><h1>' + (es ? "Ventas de garaje en San Antonio por vecindario" : "San Antonio garage sales by neighborhood") + "</h1>" +
    '<p class="lede">' + (es ? "Elige tu zona y Chica te enseña qué hay este fin de semana. 🐾" : "Pick your part of town and Chica will show you what's on this weekend. 🐾") + '</p><ul class="areas">' +
    (es ? builtEs : built).map((b) => '<li><a href="' + BASE + b.path + '">' + esc(cap(b.name)) + "</a> (" + b.n + ")</li>").join("") +
    '</ul><a class="cta" href="' + BASE + '/map/">' + (es ? "Abrir el mapa en vivo" : "Open the live map") + "</a></main>" + FOOT);
}
const hubPath = "/garage-sales/";

// Per-sale detail pages (EN + ES), linked from neighborhood pages, home search and the banner.
const salePages = (await import("./sale_pages.mjs")).buildSalePages({ root, origin, BASE, sales, ended, today, esc, eventLd, CSS, write });
console.log("sale pages: " + salePages.built + " (" + salePages.indexable.length + " indexable)");
// Sitemap: append indexable pages
const smPath = join(root, "sitemap.xml");
if (existsSync(smPath)) {
  let sm = readFileSync(smPath, "utf8");
  const day = today;
  const urls = [hubPath, "/es/garage-sales/"].concat(built.filter((b) => b.indexable).map((b) => b.path), builtEs.filter((b) => b.indexable).map((b) => b.path), salePages.indexable);
  const add = urls.filter((u) => sm.indexOf("<loc>" + origin + u + "</loc>") === -1)
    .map((u) => "  <url>\n    <loc>" + origin + u + "</loc>\n    <lastmod>" + day + "</lastmod>\n    <changefreq>daily</changefreq>\n  </url>\n").join("");
  sm = sm.replace("</urlset>", add + "</urlset>");
  writeFileSync(smPath, sm);
}
console.log("seo pages: " + built.length + " areas (" + built.filter((b) => b.indexable).length + " with sales), " + sales.length + " active sales, today=" + today);
