#!/usr/bin/env node
/**
 * Build static neighborhood landing pages ("Stone Oak Garage Sales, San Antonio")
 * from the live feed, plus a server-rendered /list/ and /facebook/, and add them to sitemap.xml.
 * Run AFTER stamp-pages.mjs and BEFORE root-domain.mjs (pages.yml does this).
 *   node scripts/build_seo_pages.mjs _site
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { richEventLd } from "./sale_pages.mjs";
import { GOATCOUNTER } from "./goatcounter.mjs";

const root = process.argv[2] || "_site";
const origin = (process.env.SITE_ORIGIN || "https://www.chicasmap.com").replace(/\/$/, "");
const BASE = "/Chicas-Map"; // root-domain.mjs rewrites this to "/"
const SOCIALS = '<script src="' + BASE + '/js/chica-socials.js?v=2" defer></script>';
const FB_URL = "https://www.facebook.com/61593215043603/";

const AREAS = [
  { slug: "stone-oak", name: "Stone Oak", zips: ["78258", "78259", "78260", "78261"],
    nameEs: "Stone Oak",
    places: "Stone Oak, Canyon Springs, TPC San Antonio, and the U.S. 281 and Loop 1604 corridor",
    placesEs: "Stone Oak, Canyon Springs, TPC San Antonio y el corredor de la U.S. 281 y Loop 1604",
    typical: "Friday through Sunday, with most driveway sales starting Saturday morning",
    typicalEs: "de viernes a domingo, y la mayoría de las ventas de cochera empiezan el sábado por la mañana",
    about: "Far-north San Antonio's Stone Oak area is packed with HOA neighborhoods where weekend garage sales pop up along Stone Oak Parkway, Huebner Road, and the 281 corridor. Estate sales show up here too, especially in the 78258 and 78259 ZIP codes, as households clear out before a move.",
    aboutEs: "El área de Stone Oak, en el extremo norte de San Antonio, está llena de vecindarios con asociaciones donde aparecen ventas de garaje el fin de semana por Stone Oak Parkway, Huebner y el corredor de la 281. También hay liquidaciones, sobre todo en los códigos postales 78258 y 78259." },
  { slug: "alamo-heights-midtown", name: "Alamo Heights & Midtown", zips: ["78209", "78212", "78201", "78213", "78216"],
    nameEs: "Alamo Heights y Midtown",
    places: "Alamo Heights, Terrell Hills, Olmos Park, Midtown, Monte Vista, and the Broadway corridor",
    placesEs: "Alamo Heights, Terrell Hills, Olmos Park, Midtown, Monte Vista y el corredor de Broadway",
    typical: "Saturday and Sunday, with estate sales often running Thursday through Saturday",
    typicalEs: "sábado y domingo, y las liquidaciones suelen ir de jueves a sábado",
    about: "Closer-in neighborhoods around Alamo Heights and Midtown are known for Saturday yard sales and estate sales in older homes near Broadway, McCullough, and Olmos Park. Shoppers come for furniture, antiques, and housewares in ZIP codes 78209, 78212, 78201, 78213, and 78216.",
    aboutEs: "Los vecindarios más céntricos de Alamo Heights y Midtown son conocidos por las ventas de patio del sábado y las liquidaciones en casas antiguas cerca de Broadway, McCullough y Olmos Park. La gente busca muebles, antigüedades y artículos para el hogar en los códigos 78209, 78212, 78201, 78213 y 78216." },
  { slug: "north-central", name: "North Central & Shavano Park", zips: ["78230", "78231", "78232", "78248", "78217", "78247"],
    nameEs: "Centro Norte y Shavano Park",
    places: "North Central, Shavano Park, Castle Hills, and the Blanco Road and Loop 1604 area",
    placesEs: "Centro Norte, Shavano Park, Castle Hills y la zona de Blanco Road y Loop 1604",
    typical: "Friday afternoon through Sunday, with Saturday the busiest day",
    typicalEs: "de la tarde del viernes al domingo, y el sábado es el día más movido",
    about: "North Central San Antonio and Shavano Park, along Blanco Road, Bitters, and Loop 1604, have a steady run of weekend garage and estate sales. Look in Castle Hills and the 78230, 78231, 78232, 78248, 78217, and 78247 ZIP codes for driveway sales worth a stop on the way up 281 or 1604.",
    aboutEs: "El Centro Norte de San Antonio y Shavano Park, por Blanco Road, Bitters y Loop 1604, tienen ventas de garaje y liquidaciones casi todos los fines de semana. Revisa Castle Hills y los códigos 78230, 78231, 78232, 78248, 78217 y 78247." },
  { slug: "medical-center", name: "the Medical Center", zips: ["78229", "78240", "78249", "78238"],
    nameEs: "el Centro Médico",
    places: "the Medical Center, the UTSA-area west side, and streets around Floyd Curl, Wurzbach, and Huebner",
    placesEs: "el Centro Médico, el oeste cerca de UTSA y las calles alrededor de Floyd Curl, Wurzbach y Huebner",
    typical: "Saturday and Sunday mornings, with some Friday preview hours",
    typicalEs: "sábados y domingos por la mañana, y a veces hay horario el viernes",
    about: "The Medical Center and nearby west-side neighborhoods around Floyd Curl, Wurzbach, and Huebner are compact and easy to hop between on a Saturday route. Garage and yard sales in ZIP codes 78229, 78240, 78249, and 78238 often sit close to I-10 and Loop 410.",
    aboutEs: "El Centro Médico y los vecindarios del oeste alrededor de Floyd Curl, Wurzbach y Huebner están cerca unos de otros, ideales para una ruta de sábado. Las ventas en los códigos 78229, 78240, 78249 y 78238 suelen quedar cerca de la I-10 y Loop 410." },
  { slug: "alamo-ranch-westover-hills", name: "Alamo Ranch & Westover Hills", zips: ["78245", "78251", "78250", "78252", "78253", "78254"],
    nameEs: "Alamo Ranch y Westover Hills",
    places: "Alamo Ranch, Westover Hills, and the far-west Loop 1604 communities",
    placesEs: "Alamo Ranch, Westover Hills y las comunidades del extremo oeste en Loop 1604",
    typical: "Friday through Sunday in newer subdivisions, with Saturday the main day",
    typicalEs: "de viernes a domingo en fraccionamientos nuevos, y el sábado es el día principal",
    about: "West San Antonio around Alamo Ranch and Westover Hills is full of newer subdivisions where weekend driveway sales line Culebra, Shaenfield, and Loop 1604. Check ZIP codes 78245, 78251, 78250, 78252, 78253, and 78254 for garage sales and the occasional estate sale.",
    aboutEs: "El oeste de San Antonio, en Alamo Ranch y Westover Hills, tiene fraccionamientos nuevos donde las ventas de cochera del fin de semana se alinean por Culebra, Shaenfield y Loop 1604. Revisa los códigos 78245, 78251, 78250, 78252, 78253 y 78254." },
  { slug: "helotes", name: "Helotes & Leon Valley", zips: ["78023"],
    nameEs: "Helotes y Leon Valley",
    places: "Helotes, Leon Valley, and the Hill Country edge along Bandera Road",
    placesEs: "Helotes, Leon Valley y el borde del Hill Country por Bandera Road",
    typical: "Saturday mornings, with some Friday and Sunday hours",
    typicalEs: "sábados por la mañana, y a veces el viernes o el domingo",
    about: "Helotes and Leon Valley sit on the Hill Country edge along Bandera Road, where Saturday garage sales and occasional estate sales draw neighbors from both the city and the small-town lots in ZIP code 78023. It is a short hop from Loop 1604 if you are already hunting on the northwest side.",
    aboutEs: "Helotes y Leon Valley están en el borde del Hill Country por Bandera Road, donde las ventas de garaje del sábado y algunas liquidaciones atraen a vecinos de la ciudad y de lotes más amplios en el código 78023. Queda cerca de Loop 1604 si ya andas cazando en el noroeste." },
  { slug: "downtown-southtown", name: "Downtown & Southtown", zips: ["78202", "78203", "78204", "78205", "78208", "78210", "78215"],
    nameEs: "el Centro y Southtown",
    places: "Downtown, Southtown, King William, Dignowity Hill, and the near-east historic districts",
    placesEs: "el Centro, Southtown, King William, Dignowity Hill y los distritos históricos del este cercano",
    typical: "Saturday and Sunday, with estate sales sometimes midweek in historic homes",
    typicalEs: "sábado y domingo, y a veces liquidaciones entre semana en casas históricas",
    about: "Downtown and Southtown, including King William and Dignowity Hill, turn up yard sales and estate sales in historic bungalows near South Alamo, St. Mary's, and the near-east side. Look in ZIP codes 78202, 78203, 78204, 78205, 78208, 78210, and 78215, then walk or drive a tight loop between stops.",
    aboutEs: "El Centro y Southtown, incluyendo King William y Dignowity Hill, tienen ventas de patio y liquidaciones en casas históricas cerca de South Alamo, St. Mary's y el este cercano. Revisa los códigos 78202, 78203, 78204, 78205, 78208, 78210 y 78215." },
  { slug: "west-side", name: "the West Side", zips: ["78207", "78237", "78227", "78228"],
    nameEs: "el Lado Oeste",
    places: "the West Side around Commerce, Castroville Road, and the Kelly area",
    placesEs: "el Lado Oeste alrededor de Commerce, Castroville Road y la zona de Kelly",
    typical: "Friday through Sunday, with plenty of Saturday morning driveway sales",
    typicalEs: "de viernes a domingo, con muchas ventas de cochera el sábado por la mañana",
    about: "San Antonio's West Side around Commerce Street, Castroville Road, and the Kelly area has neighborhood garage and yard sales most weekends. ZIP codes 78207, 78237, 78227, and 78228 are close together, so you can build a short route without crossing the whole city.",
    aboutEs: "El Lado Oeste de San Antonio, por Commerce, Castroville Road y la zona de Kelly, tiene ventas de garaje y de patio casi todos los fines de semana. Los códigos 78207, 78237, 78227 y 78228 están cerca, así que puedes armar una ruta corta." },
  { slug: "southwest-lackland", name: "Southwest San Antonio & Lackland", zips: ["78236", "78242"],
    nameEs: "el Suroeste de San Antonio y Lackland",
    places: "Southwest San Antonio, the Lackland AFB area, Valley Hi, and Military Drive",
    placesEs: "el suroeste de San Antonio, la zona de Lackland AFB, Valley Hi y Military Drive",
    typical: "Saturday and Sunday, often starting early for military families on a weekend off",
    typicalEs: "sábado y domingo, a menudo temprano para las familias militares con el fin libre",
    about: "Southwest San Antonio and the Lackland area, including Valley Hi and Military Drive, are a compact hunt for garage and yard sales in ZIP codes 78236 and 78242. Sales here are often Saturday-Sunday stops you can stack with a west-side or south-side loop.",
    aboutEs: "El suroeste de San Antonio y la zona de Lackland, incluyendo Valley Hi y Military Drive, son una cacería compacta de ventas de garaje y patio en los códigos 78236 y 78242. Suelen ser paradas de sábado y domingo que puedes unir con el Lado Oeste o el Lado Sur." },
  { slug: "south-side", name: "the South Side", zips: ["78211", "78214", "78221", "78223", "78224", "78225", "78226", "78264", "78112", "78073"],
    nameEs: "el Lado Sur",
    places: "the South Side, Pleasanton Road, Palo Alto, Somerset, and Mission Del Lago",
    placesEs: "el Lado Sur, Pleasanton Road, Palo Alto, Somerset y Mission Del Lago",
    typical: "Friday through Sunday, with Saturday the most common garage-sale day",
    typicalEs: "de viernes a domingo, y el sábado es el día más común de ventas de garaje",
    about: "The South Side stretches along Pleasanton Road, Palo Alto, Somerset, and Mission Del Lago, with garage, yard, and estate sales across ZIP codes 78211, 78214, 78221, 78223, 78224, 78225, 78226, 78264, 78112, and 78073. It is a wide area, so pick a cluster of pins and work a single loop.",
    aboutEs: "El Lado Sur se extiende por Pleasanton Road, Palo Alto, Somerset y Mission Del Lago, con ventas de garaje, patio y bienes en los códigos 78211, 78214, 78221, 78223, 78224, 78225, 78226, 78264, 78112 y 78073. Es una zona amplia, así que elige un grupo de pines y haz una sola ruta." },
  { slug: "east-side", name: "the East Side", zips: ["78218", "78219", "78220", "78222", "78244", "78263"],
    nameEs: "el Lado Este",
    places: "the East Side, East Houston Street, FM 1346, and the China Grove edge",
    placesEs: "el Lado Este, East Houston Street, FM 1346 y el borde de China Grove",
    typical: "Saturday and Sunday, with some Friday estate-sale openings",
    typicalEs: "sábado y domingo, y a veces liquidaciones que abren el viernes",
    about: "East Side San Antonio along East Houston Street, FM 1346, and the China Grove edge has weekend garage and yard sales in ZIP codes 78218, 78219, 78220, 78222, 78244, and 78263. Pins here are often a short drive from I-10 or Loop 410, so they pair well with a northeast loop.",
    aboutEs: "El Lado Este de San Antonio, por East Houston, FM 1346 y el borde de China Grove, tiene ventas de garaje y patio el fin de semana en los códigos 78218, 78219, 78220, 78222, 78244 y 78263. Los pines suelen quedar cerca de la I-10 o Loop 410." },
  { slug: "northeast-live-oak-converse", name: "Live Oak, Converse & Universal City", zips: ["78233", "78239", "78109", "78148", "78150", "78234", "78133"],
    nameEs: "Live Oak, Converse y Universal City",
    places: "Live Oak, Converse, Universal City, JBSA-Randolph, and nearby northeast suburbs",
    placesEs: "Live Oak, Converse, Universal City, JBSA-Randolph y suburbios del noreste",
    typical: "Friday through Sunday, with Saturday morning the usual start",
    typicalEs: "de viernes a domingo, y el sábado por la mañana es el arranque habitual",
    about: "Northeast of the city, Live Oak, Converse, Universal City, and the JBSA-Randolph area host regular weekend garage sales, plus occasional estate sales. Check ZIP codes 78233, 78239, 78109, 78148, 78150, 78234, and nearby 78133 if you are hunting along I-35, FM 78, or 1604 east.",
    aboutEs: "Al noreste de la ciudad, Live Oak, Converse, Universal City y la zona de JBSA-Randolph tienen ventas de garaje casi todos los fines de semana, y a veces liquidaciones. Revisa los códigos 78233, 78239, 78109, 78148, 78150, 78234 y el cercano 78133 si andas por la I-35, FM 78 o 1604 este." },
  { slug: "schertz-new-braunfels", name: "Schertz, Cibolo & New Braunfels", zips: ["78154", "78108", "78124", "78130", "78132", "78666", "78623", "78070"],
    nameEs: "Schertz, Cibolo y New Braunfels",
    places: "Schertz, Cibolo, New Braunfels, Garden Ridge, and the I-35 corridor",
    placesEs: "Schertz, Cibolo, New Braunfels, Garden Ridge y el corredor de la I-35",
    typical: "Thursday through Sunday for estate sales, and Saturday-Sunday for garage sales",
    typicalEs: "de jueves a domingo en las liquidaciones, y sábado y domingo en las ventas de garaje",
    about: "Along the I-35 corridor, Schertz, Cibolo, New Braunfels, and Garden Ridge are a separate hunt from in-town San Antonio, with weekend garage sales and frequent estate sales in ZIP codes 78154, 78108, 78124, 78130, 78132, 78666, 78623, and 78070. Plan a northbound loop so you are not doubling back down the interstate.",
    aboutEs: "Por el corredor de la I-35, Schertz, Cibolo, New Braunfels y Garden Ridge son una cacería aparte del centro de San Antonio, con ventas de garaje el fin de semana y liquidaciones frecuentes en los códigos 78154, 78108, 78124, 78130, 78132, 78666, 78623 y 78070." },
  { slug: "boerne-hill-country", name: "Boerne & the Hill Country", zips: ["78006", "78015", "78009", "78255", "78256", "78257"],
    nameEs: "Boerne y el Hill Country",
    places: "Boerne, Fair Oaks Ranch, The Dominion, and the northwest Hill Country edge",
    placesEs: "Boerne, Fair Oaks Ranch, The Dominion y el borde noroeste del Hill Country",
    typical: "Saturday, with estate sales sometimes running Friday through Sunday on larger lots",
    typicalEs: "el sábado, y las liquidaciones a veces van de viernes a domingo en lotes más grandes",
    about: "Boerne, Fair Oaks Ranch, and the northwest Hill Country edge — including The Dominion and ZIP codes 78006, 78015, 78009, 78255, 78256, and 78257 — lean toward Saturday garage sales and estate sales on larger lots. It is a scenic drive from Loop 1604, so check hours before you head up I-10 or 281.",
    aboutEs: "Boerne, Fair Oaks Ranch y el borde noroeste del Hill Country — incluyendo The Dominion y los códigos 78006, 78015, 78009, 78255, 78256 y 78257 — suelen tener ventas de garaje el sábado y liquidaciones en lotes más grandes. Es un tramo desde Loop 1604, así que confirma el horario antes de subir por la I-10 o la 281." }
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

const CSS = "body{margin:0;background:#fffdf8;color:#1a1714;font:16px/1.5 Inter,system-ui,-apple-system,Segoe UI,sans-serif}main{max-width:760px;margin:0 auto;padding:72px 18px 48px}h1{font-size:30px;line-height:1.15;margin:8px 0 10px}h2{font-size:20px;margin:28px 0 10px}.lede{font-size:17px;color:#3b342d}.about,.zips{font-size:15px;color:#3b342d}.zips{color:#5b5249}.crumbs{font-size:14px}.crumbs a,.areas a{color:#7a0f6c}.cta{display:inline-block;margin:12px 8px 4px 0;padding:12px 18px;border-radius:12px;background:#c513af;color:#fff;font-weight:800;text-decoration:none}.cta.alt{background:#fff;color:#7a0f6c;border:2px solid #c513af}.sale{display:block;margin:12px 0;padding:14px 16px;border-radius:14px;background:#fff;box-shadow:0 2px 10px rgba(0,0,0,.08);color:inherit;text-decoration:none}.sale strong{display:block;font-size:17px}.sale .m{color:#5b5249;font-size:14px}.areas{columns:2;padding-left:18px}@media(max-width:480px){h1{font-size:25px}.areas{columns:1}}";

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
const FOOT = '<script src="' + BASE + '/js/chica-menu.js?v=8" defer></script>' + SOCIALS + GOATCOUNTER + "</body></html>";

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
function shortName(name, es) { return es ? String(name || "") : String(name || "").replace(/^the /i, ""); }

const cap = (t) => t.replace(/^(the|el) /, "").replace(/^./, (ch) => ch.toUpperCase());
const built = [];
const builtEs = [];
for (const es of [false, true]) {
  const pre = es ? "/es" : "";
  const nm = (a) => (es ? a.nameEs || ES_NAMES_FALLBACK(a) : a.name);
  const areaLinks = (skip) => '<ul class="areas">' + AREAS.filter((a) => a.slug !== skip).map((a) => '<li><a href="' + BASE + pre + "/garage-sales/" + a.slug + '/">' + esc(cap(nm(a))) + "</a></li>").join("") + "</ul>";
  const nav = '<nav class="crumbs"><a href="' + BASE + pre + '/">Chicas Map</a> › <a href="' + BASE + pre + '/garage-sales/">' + (es ? "Vecindarios" : "Neighborhoods") + "</a>" +
    '<span style="float:right"><a href="' + BASE + '/garage-sales/" lang="en">EN</a> · <a href="' + BASE + '/es/garage-sales/" lang="es">ES</a></span></nav>';
  for (const a of AREAS) {
    const list = sales.filter((s) => a.zips.includes(s._zip));
    const n = list.length, name = nm(a), short = shortName(name, es);
    const path = pre + "/garage-sales/" + a.slug + "/";
    const title = es ? "Ventas de garaje en " + short + ", San Antonio | Chicas Map" : short + " Garage Sales, San Antonio | Chicas Map";
    const desc = es
      ? ("Ventas de garaje, patio y bienes en " + (a.placesEs || name) + ". Códigos " + a.zips.join(", ") + ". " + (n ? n + " venta" + (n === 1 ? "" : "s") + " ahora en el mapa gratis de Chica." : "Chica actualiza esta página todos los días."))
      : ("Garage, yard, and estate sales in " + (a.places || a.name) + ". ZIP codes " + a.zips.join(", ") + ". " + (n ? n + " sale" + (n === 1 ? "" : "s") + " on Chica's free San Antonio map now." : "Chica updates this page every day."));
    const events = list.map((s) => richEventLd(s, { origin, path: pre + "/sales/" + s._slug + "/", isEnded: false })).filter(Boolean).map((e) => { const { ["@context"]: _c, ...rest } = e; return rest; });
    const ld = { "@context": "https://schema.org", "@type": "CollectionPage", name: title, url: origin + path, inLanguage: es ? "es" : "en",
      ...(events.length ? { mainEntity: { "@type": "ItemList", itemListElement: events.map((e, i) => ({ "@type": "ListItem", position: i + 1, item: e })) } } : {}) };
    const how = es
      ? "Las ventas por aquí suelen ser " + (a.typicalEs || "el fin de semana") + ". Toca una venta abajo para ver la dirección, el horario y cómo llegar, o abre el mapa en vivo para armar una ruta. También puedes publicar tu propia venta gratis."
      : "Sales around here are typically " + (a.typical || "on the weekend") + ". Tap a sale below for the address, hours, and directions, or open the live map to build a route. You can also list your own sale free.";
    const none = es
      ? "Ahora mismo no hay ventas de garaje, patio o bienes en el mapa por " + esc(short) + ". Chica revisa los listados todos los días, así que vuelve pronto, o mira el mapa en vivo de San Antonio y los vecindarios de al lado."
      : "No garage, yard, or estate sales are on the map in " + esc(short) + " right now. Chica checks listings every day, so look back soon, or browse the live San Antonio map and nearby neighborhoods.";
    const lede = es
      ? "¡Hola, vecino! Aquí Chica. 🐾 " + (n ? "Olfateé " + n + " venta" + (n === 1 ? "" : "s") + " por " + esc(name) + "." : none)
      : "Hi neighbor! Chica here. 🐾 " + (n ? "I sniffed out " + n + " sale" + (n === 1 ? "" : "s") + " around " + esc(a.name) + "." : none);
    const body = "<main>" + nav + "<h1>" + (es ? "Ventas de garaje en " + esc(short) + ", San Antonio" : esc(short) + " Garage Sales, San Antonio") + "</h1>" +
      '<p class="lede">' + lede + "</p>" +
      '<p class="about">' + esc(es ? a.aboutEs : a.about) + "</p>" +
      '<p class="about">' + how + "</p>" +
      '<p class="zips">' + (es ? "Códigos postales: " : "ZIP codes: ") + esc(a.zips.join(", ")) + (es ? ". Zonas: " : ". Area: ") + esc(es ? a.placesEs : a.places) + ".</p>" +
      '<a class="cta" href="' + BASE + '/map/">' + (es ? "Abrir el mapa en vivo" : "Open the live map") + '</a><a class="cta alt" href="' + BASE + pre + '/submit/">' + (es ? "Publica tu venta gratis" : "List your sale free") + "</a>" +
      "<h2>" + (es ? (n ? "Ventas de esta semana en " + esc(short) : "Ventas en " + esc(short)) : (n ? "This week's sales in " + esc(short) : "Sales in " + esc(short))) + "</h2>" +
      (n ? list.map((s) => saleCard(s, es)).join("") : "<p>" + none + "</p>") +
      "<h2>" + (es ? "Más vecindarios de San Antonio" : "More San Antonio neighborhoods") + "</h2>" + areaLinks(a.slug) + "</main>";
    write(path, head(title, desc, path, true, ld, es ? "es" : "en") + body + FOOT);
    (es ? builtEs : built).push({ path, indexable: true, n, slug: a.slug, name });
  }
  const hubPath = pre + "/garage-sales/";
  const hubTitle = es ? "Ventas de garaje en San Antonio por vecindario | Chicas Map" : "San Antonio Garage Sales by Neighborhood | Chicas Map";
  const hubDesc = es ? "Encuentra ventas de garaje, patio y bienes cerca de ti en San Antonio, por vecindario. Mapa gratis, actualizado todos los días por Chica." : "Find garage, yard, and estate sales near you in San Antonio, by neighborhood. Free map, updated daily by Chica.";
  const hubIntro = es
    ? "Elige tu zona — Stone Oak, Alamo Heights, el Lado Sur, Live Oak y más — y Chica te enseña las ventas de garaje, patio y bienes de esta semana. 🐾 Cada página lista las ventas actuales en texto, con códigos postales y cómo llegar."
    : "Pick your part of town — Stone Oak, Alamo Heights, the South Side, Live Oak, and more — and Chica will show you this week's garage, yard, and estate sales. 🐾 Each page lists current sales in plain text, with ZIP codes and directions.";
  write(hubPath, head(hubTitle, hubDesc, hubPath, true, { "@context": "https://schema.org", "@type": "CollectionPage", name: hubTitle, url: origin + hubPath, inLanguage: es ? "es" : "en" }, es ? "es" : "en") +
    '<main><nav class="crumbs"><a href="' + BASE + pre + '/">Chicas Map</a></nav><h1>' + (es ? "Ventas de garaje en San Antonio por vecindario" : "San Antonio garage sales by neighborhood") + "</h1>" +
    '<p class="lede">' + hubIntro + '</p><ul class="areas">' +
    (es ? builtEs : built).map((b) => '<li><a href="' + BASE + b.path + '">' + esc(cap(b.name)) + "</a> (" + b.n + ")</li>").join("") +
    '</ul><a class="cta" href="' + BASE + '/map/">' + (es ? "Abrir el mapa en vivo" : "Open the live map") + '</a><a class="cta alt" href="' + BASE + pre + '/list/">' + (es ? "Ver la lista completa" : "See the full list") + "</a></main>" + FOOT);
}
function ES_NAMES_FALLBACK(a) { return a.name; }

function sortSales(list) {
  return list.slice().sort((a, b) => String(a.date_start || a.date_from || "").localeCompare(String(b.date_start || b.date_from || "")) || String(a.title || "").localeCompare(String(b.title || "")));
}

function writeListPages() {
  const sorted = sortSales(sales);
  for (const es of [false, true]) {
    const pre = es ? "/es" : "";
    const path = pre + "/list/";
    const title = es ? "Lista de ventas de garaje en San Antonio | Chicas Map" : "San Antonio Garage Sales List | Chicas Map";
    const desc = es
      ? "Todas las ventas de garaje, patio y bienes próximas en San Antonio, con direcciones y fechas. Abre una para indicaciones o míralas en el mapa en vivo."
      : "Every upcoming garage, yard, and estate sale in San Antonio, with addresses and dates. Open a sale for directions or see them all on the live map.";
    const h1 = es ? "Ventas de garaje, patio y bienes en San Antonio" : "San Antonio garage, yard, and estate sales";
    const lede = es
      ? (sorted.length ? "Hay " + sorted.length + " venta" + (sorted.length === 1 ? "" : "s") + " próximas en el mapa gratis de Chica. Esta lista está en la página, no hace falta JavaScript. Horarios en hora de Chicago, y pueden cambiar: revisa la fuente antes de manejar."
        : "Ahora mismo no hay ventas próximas en el mapa. Chica revisa los listados todos los días, así que vuelve pronto o publica la tuya gratis.")
      : (sorted.length ? sorted.length + " upcoming sale" + (sorted.length === 1 ? "" : "s") + " on Chica's free San Antonio map. This list is in the page itself — no JavaScript required. Hours are in Central Time and can change, so check the source before you drive."
        : "No upcoming sales are on the map right now. Chica checks listings every day, so look back soon or list your own sale free.");
    const items = sorted.map((s, i) => {
      const when = [s.dates, s.hours].filter(Boolean).join(" · ");
      return { "@type": "ListItem", position: i + 1, url: origin + pre + "/sales/" + s._slug + "/", name: s.title || (es ? "Venta de garaje" : "Garage sale") };
    });
    const ld = { "@context": "https://schema.org", "@type": "ItemList", name: title, url: origin + path, numberOfItems: sorted.length, itemListElement: items };
    const nav = '<nav class="crumbs"><a href="' + BASE + pre + '/">Chicas Map</a>' +
      '<span style="float:right"><a href="' + BASE + '/list/" lang="en">EN</a> · <a href="' + BASE + '/es/list/" lang="es">ES</a></span></nav>';
    const body = "<main>" + nav + "<h1>" + h1 + "</h1><p class=\"lede\">" + lede + "</p>" +
      '<a class="cta" href="' + BASE + '/map/">' + (es ? "Abrir el mapa en vivo" : "Open the live map") + '</a>' +
      '<a class="cta alt" href="' + BASE + pre + '/calendar/">' + (es ? "Calendario de ventas" : "Sales calendar") + "</a>" +
      '<a class="cta alt" href="' + BASE + pre + '/garage-sales/">' + (es ? "Por vecindario" : "By neighborhood") + "</a>" +
      '<a class="cta alt" href="' + BASE + pre + '/submit/">' + (es ? "Publica tu venta gratis" : "List your sale free") + "</a>" +
      (sorted.length ? "<h2>" + (es ? "Todas las ventas próximas" : "All upcoming sales") + "</h2>" + sorted.map((s) => saleCard(s, es)).join("") : "") +
      "</main>";
    write(path, head(title, desc, path, true, ld, es ? "es" : "en") + body + FOOT);
  }
}

function writeFacebookPages() {
  for (const es of [false, true]) {
    const pre = es ? "/es" : "";
    const path = pre + "/facebook/";
    const title = es ? "Alertas de ventas de garaje en Facebook | Chicas Map" : "San Antonio Garage Sale Alerts on Facebook | Chicas Map";
    const desc = es
      ? "Sigue a Chica en Facebook para alertas de ventas de garaje, patio y bienes en San Antonio, y fotos de la cacería en el mapa gratis."
      : "Follow Chica on Facebook for San Antonio garage sale, yard sale, and estate sale alerts, plus hunt photos from the free map.";
    const h1 = es ? "Sigue a Chica en Facebook" : "Follow Chica on Facebook";
    const p1 = es
      ? "Chica comparte alertas de ventas de garaje, patio y bienes en San Antonio en su página de Facebook: lo que hay este fin de semana, fotos de la cacería y avisos cuando se agregan pines nuevos al mapa gratis."
      : "Chica shares San Antonio garage sale, yard sale, and estate sale alerts on her Facebook page — what's on this weekend, hunt photos, and a heads-up when new pins land on the free map.";
    const p2 = es
      ? "El mapa, la lista y el calendario siguen en chicasmap.com, siempre gratis para ver y para publicar. Facebook es el lugar para seguir a la manada entre una visita y otra."
      : "The map, sale list, and calendar still live on chicasmap.com, always free to browse and free to list. Facebook is the place to follow the pack between visits.";
    const ld = { "@context": "https://schema.org", "@type": "WebPage", name: title, url: origin + path, inLanguage: es ? "es" : "en", isPartOf: { "@type": "WebSite", name: "Chicas Map", url: origin + "/" } };
    const nav = '<nav class="crumbs"><a href="' + BASE + pre + '/">Chicas Map</a>' +
      '<span style="float:right"><a href="' + BASE + '/facebook/" lang="en">EN</a> · <a href="' + BASE + '/es/facebook/" lang="es">ES</a></span></nav>';
    const body = "<main>" + nav + "<h1>" + h1 + "</h1><p class=\"lede\">" + p1 + "</p><p class=\"about\">" + p2 + "</p>" +
      '<a class="cta" href="' + FB_URL + '" rel="noopener" target="_blank">' + (es ? "Abrir la página de Chica en Facebook" : "Open Chica's Facebook page") + "</a>" +
      '<a class="cta alt" href="' + BASE + '/map/">' + (es ? "Abrir el mapa en vivo" : "Open the live map") + "</a>" +
      '<a class="cta alt" href="' + BASE + pre + '/list/">' + (es ? "Ver la lista de ventas" : "See the sale list") + "</a></main>";
    write(path, head(title, desc, path, true, ld, es ? "es" : "en") + body + FOOT);
  }
}

// Per-sale detail pages (EN + ES), linked from neighborhood pages, home search and the banner.
const salePages = (await import("./sale_pages.mjs")).buildSalePages({ root, origin, BASE, sales, ended, today, esc, eventLd, CSS, write });
console.log("sale pages: " + salePages.built + " (" + salePages.indexable.length + " indexable)");
writeListPages();
writeFacebookPages();

function pageIndexable(sitePath) {
  const file = join(root, sitePath.replace(/^\//, ""), "index.html");
  if (!existsSync(file)) return false;
  const html = readFileSync(file, "utf8");
  return !/name="robots"[^>]*content="noindex/i.test(html);
}

function sanitizeSitemap() {
  const smPath = join(root, "sitemap.xml");
  if (!existsSync(smPath)) return 0;
  let sm = readFileSync(smPath, "utf8");
  const seen = new Set();
  const urls = [];
  const add = (raw) => {
    let u = String(raw || "").trim();
    if (!u) return;
    u = u.replace("https://justonejewelry.github.io/Chicas-Map", origin);
    u = u.replace(/^https:\/\/chicasmap\.com(?=\/|$)/, origin);
    if (!u.startsWith(origin + "/")) return;
    if (!u.endsWith("/")) u += "/";
    if (u === origin + "/es") u = origin + "/es/";
    const path = u.slice(origin.length);
    if (path === "/sitemap.xml/" || path === "/sitemap.xml") return;
    if (/\/(mission-control|review|admin|preview|__grok|flip)(\/|$)/.test(path)) return;
    if (/\.html\/?$/.test(path) || /\/atlas\/(hoa|apartment|install)\/?$/.test(path)) return;
    if (seen.has(u)) return;
    if (!pageIndexable(path)) return;
    seen.add(u);
    urls.push(u);
  };
  for (const m of sm.matchAll(/<loc>([^<]+)<\/loc>/g)) add(m[1]);
  add(origin + "/");
  add(origin + "/es/");
  add(origin + "/garage-sales/");
  add(origin + "/es/garage-sales/");
  add(origin + "/list/");
  add(origin + "/es/list/");
  add(origin + "/facebook/");
  add(origin + "/es/facebook/");
  for (const b of built.concat(builtEs)) add(origin + b.path);
  for (const p of salePages.indexable) add(origin + p);
  const day = today;
  const body = urls.map((u) => "  <url>\n    <loc>" + u + "</loc>\n    <lastmod>" + day + "</lastmod>\n    <changefreq>daily</changefreq>\n  </url>\n").join("");
  writeFileSync(smPath, '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' + body + "</urlset>\n");
  return urls.length;
}

const sitemapCount = sanitizeSitemap();
console.log("seo pages: " + built.length + " areas (" + built.filter((b) => b.n > 0).length + " with sales), " + sales.length + " active sales, sitemap " + sitemapCount + " urls, today=" + today);
