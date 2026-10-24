#!/usr/bin/env node
/**
 * Stamp GitHub Pages output: unique titles, canonicals, Open Graph,
 * JSON-LD, noscript crawl text, Spanish shells, hreflang, sitemap.
 */
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

const root = process.argv[2] || "_site";
const origin = "https://www.chicasmap.com";
const ogImage = origin + "/og.jpg";

const PAGES = [
  { path: "", title: "Chicas Map · San Antonio garage sales", desc: "Free San Antonio map of garage sales, yard sales, and estate sales. Near Me, multi-stop routes, and weekend intel.", titleEs: "Chicas Map · Ventas de garage en San Antonio", descEs: "Mapa gratis de ventas de garage, yard sales y estate sales en San Antonio. Cerca de mi, rutas, e intel del fin." },
  { path: "map", title: "Live garage sale map · Chicas Map San Antonio", desc: "Open the live San Antonio garage sale map. Verified pins, Near Me, KEY layers, and one-tap Google, Apple, or Waze routes.", titleEs: "Mapa en vivo · Chicas Map San Antonio", descEs: "Mapa en vivo de ventas de garage en San Antonio. Pines, Cerca de mi, capas KEY, y rutas en Google, Apple o Waze." },
  { path: "list", title: "This weekend's sales · Chicas Map", desc: "Text list of San Antonio garage, yard, and estate sales for this weekend. Open any stop on the map.", titleEs: "Ventas de este fin · Chicas Map", descEs: "Lista de ventas de garage, yard y estate en San Antonio este fin. Abrela en el mapa." },
  { path: "intel", title: "Sale Intel · Chicas Map", desc: "Driveway notes from people standing at the sale. Unlock within 200 feet. GPS, not rumors.", titleEs: "Sale Intel · Chicas Map", descEs: "Notas de quien esta en la venta. Se desbloquean a 200 pies. GPS, no rumores." },
  { path: "atlas", title: "Alamo Atlas · Chicas Map", desc: "SAPD neighborhood offense reports for San Antonio. Search by name, ZIP ranking, public Open Data SA. Grok Build civic proof of concept.", titleEs: "Alamo Atlas · Chicas Map", descEs: "Reportes de delitos por vecindario en San Antonio. Busca por nombre y ZIP. Datos publicos de la ciudad. Prueba civica de Grok Build." },
  { path: "sponsors", title: "Sponsor Chicas Map · San Antonio", desc: "Help keep Chica's cape on. The public garage sale map stays free for San Antonio neighbors.", titleEs: "Patrocinio · Chicas Map", descEs: "Ayuda a Chica a dejar la capa puesta. El mapa publico sigue gratis." },
  { path: "submit", title: "List a garage sale free · Chicas Map", desc: "Put your San Antonio garage, yard, or estate sale on Chicas Map. Free to list. Reviewed before it goes live.", titleEs: "Agregar venta · Chicas Map", descEs: "Publica tu venta de garage en San Antonio. Gratis. Chica la revisa antes de pincharla." },
  { path: "claim", title: "Boost My Sale · $5 · Chicas Map", desc: "Listing is free. Boost My Sale is $5 and lights a gold pin this weekend so the pack can find your driveway.", titleEs: "Impulsa mi venta · $5 · Chicas Map", descEs: "Publicar es gratis. Impulsa mi venta cuesta $5 y enciende un pin de oro este fin." },
  { path: "boost", title: "Boost a sale · Chicas Map", desc: "Boost a San Antonio garage sale pin so more neighbors see it this weekend.", titleEs: "Impulsa una venta · Chicas Map", descEs: "Impulsa un pin de venta en San Antonio para que mas vecinos lo vean este fin." },
  { path: "facebook", title: "Facebook pack · Chicas Map", desc: "Follow Chica on Facebook for San Antonio weekend sale alerts and hunt photos.", titleEs: "Facebook · Chicas Map", descEs: "La manada en Facebook. Avisos del fin y fotos de la caceria." },
  { path: "media", title: "Reels and videos · Chicas Map", desc: "San Antonio garage-sale reels and hunt clips from Chicas Map.", titleEs: "Reels · Chicas Map", descEs: "Reels y clips de la caceria en San Antonio." },
  { path: "showcase", title: "Showcase · Chicas Map", desc: "Featured San Antonio garage-sale hunts, clips, and pack highlights.", titleEs: "Vitrina · Chicas Map", descEs: "Cacerias destacadas, clips, y la manada en San Antonio." },
  { path: "bulletin", title: "Bulletin · Chicas Map", desc: "Say hi to Chica. Tips, support, and pack notes for the San Antonio map.", titleEs: "Mural · Chicas Map", descEs: "Di hola a Chica. Apoyo, ideas, y la manada." },
  { path: "backstory", title: "Why Chicas Map exists · Veteran-built San Antonio map", desc: "The story behind Chicas Map: a veteran-built, free San Antonio garage sale map for neighbors.", titleEs: "Historia · Chicas Map", descEs: "Por que existe el mapa. Veterano, Chica, y un sabado mas amable." },
  { path: "principle", title: "Pack principle · Chicas Map", desc: "Loyalty, duty, respect, service, honor, integrity, courage.", titleEs: "Principio de la manada · Chicas Map", descEs: "Lealtad, deber, respeto, servicio, honor, integridad, valor." },
  { path: "legal", title: "Legal · Chicas Map", desc: "Legal notice for Chicas Map. Neighbor guide, not a certification. Verify hours on site.", titleEs: "Aviso · Chicas Map", descEs: "Aviso legal. El mapa es una guia de vecinos, no una certificacion." },
  { path: "privacy", title: "Privacy · Chicas Map", desc: "How Chicas Map handles location, notes, and analytics. Privacy-first. No ad trackers.", titleEs: "Privacidad · Chicas Map", descEs: "Como Chicas Map trata ubicacion, notas y analitica. Sin trackers de anuncios." },
  { path: "terms", title: "Terms · Chicas Map", desc: "Terms for using Chicas Map. Neighbor guide. Verify hours on site.", titleEs: "Terminos · Chicas Map", descEs: "Terminos de uso. Guia de vecinos. Verifica horarios en el lugar." }
];

const PAGE_BY_PATH = Object.fromEntries(PAGES.map((p) => [p.path || "/", p]));
const ES_BOOT = '<script>(function(){try{var b="/Chicas-Map";var p=location.pathname;var es=b+"/es";if(p===es||p.indexOf(es+"/")===0){localStorage.setItem("chicas-map-locale","es");document.documentElement.lang="es";var rest=p.slice(es.length)||"/";history.replaceState(null,"",b+(rest.charAt(0)==="/"?rest:"/"+rest)+location.search+location.hash);}}catch(e){}})();</script>';
const GOATCOUNTER = '<script>(function(){window.goatcounter=window.goatcounter||{};window.goatcounter.path=function(p){var path=(p||location.pathname||"/").replace(/^\\/Chicas-Map/, "")||"/";if(path.indexOf("/admin")===0||path.indexOf("/__grok")===0||path.indexOf("/google")===0)return;return path;};})();</script><script data-goatcounter="https://chicasmap.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>';

function noscriptBlock(page, isEs) {
  const title = isEs ? page.titleEs : page.title;
  const desc = isEs ? page.descEs : page.desc;
  if (page.path === "") {
    return isEs
      ? '<noscript><main id="chica-crawl"><h1>Chicas Map — Ventas de garage en San Antonio</h1><p>Mapa gratis de ventas de garage, yard sales y estate sales en San Antonio.</p><ul><li><a href="/map/">Abrir el mapa</a></li><li><a href="/list/">Ventas de este fin</a></li><li><a href="/submit/">Publicar una venta</a></li><li><a href="/intel/">Sale Intel (200 pies)</a></li></ul></main></noscript>'
      : '<noscript><main id="chica-crawl"><h1>Chicas Map — San Antonio garage sales</h1><p><strong>Find the sales worth stopping for.</strong> Free, verified map of garage sales, yard sales, and estate sales across San Antonio. Open Near Me, build multi-stop routes, and see this weekend’s intel without driving around hoping.</p><p>Updated daily. Veteran-owned. No accounts required to browse.</p><h2>What to do next</h2><ul><li><a href="/map/">Open the live map</a> — pins, Near Me, and routes</li><li><a href="/list/">This weekend’s sales</a> — curated list</li><li><a href="/submit/">List a sale free</a> — add your garage or estate sale</li><li><a href="/intel/">Sale Intel</a> — notes at the pin</li><li><a href="/claim/">Boost My Sale</a> — promote a listing</li><li><a href="/atlas/">Alamo Atlas</a> — civic safety layer</li></ul><h2>How it works</h2><p>We pull public listings, verify addresses and times, and publish only what passes quality gates. The map stays clean so you spend time at sales instead of chasing dead pins. Share a pin. Help a neighbor. Strengthen the pack.</p></main></noscript>';
  }
  return '<noscript><main id="chica-crawl"><h1>' + title + '</h1><p>' + desc + '</p></main></noscript>';
}

function walk(dir, acc) {
  acc = acc || [];
  for (const name of readdirSync(dir)) {
    if (name === "preview" || name === "assets" || name === "node_modules" || name === "admin" || name === "__grok") continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (name.endsWith(".html")) acc.push(p);
  }
  return acc;
}
function ensureDir(file) { mkdirSync(dirname(file), { recursive: true }); }
function sitePathFromFile(file) {
  let rel = file.slice(root.length).replace(/\\/g, "/");
  if (!rel.startsWith("/")) rel = "/" + rel;
  rel = rel.replace(/\/index\.html$/, "/");
  if (rel.endsWith(".html")) rel = rel.replace(/\.html$/, "/");
  if (!rel.endsWith("/")) rel += "/";
  return rel === "//" ? "/" : rel;
}
function pageKey(sitePath) {
  const clean = sitePath.replace(/^\/es\//, "/").replace(/^\/es$/, "/");
  const key = clean.replace(/^\//, "").replace(/\/$/, "");
  return key || "/";
}
function hrefLang(enPath) {
  const en = origin + enPath;
  const es = origin + "/es" + (enPath === "/" ? "/" : enPath);
  return '<link rel="alternate" hreflang="en" href="' + en + '"/><link rel="alternate" hreflang="es" href="' + es + '"/><link rel="alternate" hreflang="x-default" href="' + en + '"/>';
}
function jsonLd(page, canonical) {
  const graph = [
    { "@type": "WebSite", "@id": origin + "/#website", name: "Chicas Map", url: origin + "/", inLanguage: ["en", "es"], description: page.desc, publisher: { "@id": origin + "/#org" } },
    { "@type": "Organization", "@id": origin + "/#org", name: "Chicas Map", url: origin + "/", logo: origin + "/images/chica-logo.png" }
  ];
  if (page.path === "" || page.path === "map") {
    graph.push({ "@type": "WebApplication", name: "Chicas Map", url: canonical, applicationCategory: "LifestyleApplication", operatingSystem: "Web", offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }, areaServed: "San Antonio, Texas" });
  }
  if (page.path === "atlas") {
    graph.push({ "@type": "Dataset", name: "Alamo Atlas — San Antonio Neighborhood Crime", description: page.desc, url: canonical, creator: { "@id": origin + "/#org" }, spatialCoverage: "San Antonio, Texas", license: "https://creativecommons.org/licenses/by/4.0/" });
  }
  if (["legal", "backstory", "intel"].includes(page.path)) {
    graph.push({ "@type": "FAQPage", mainEntity: [
      { "@type": "Question", name: "What is Chicas Map?", acceptedAnswer: { "@type": "Answer", text: page.desc } },
      { "@type": "Question", name: "Is Chicas Map free?", acceptedAnswer: { "@type": "Answer", text: "Yes. The public map is free. Optional $5 Boost My Sale exists for sellers who want a gold pin." } }
    ]});
  }
  return '<script type="application/ld+json">' + JSON.stringify({ "@context": "https://schema.org", "@graph": graph }) + "</script>";
}
function seoHead(opts) {
  const robots = opts.indexable ? "index,follow,max-image-preview:large" : "noindex,follow";
  const locale = opts.lang === "es" ? "es_US" : "en_US";
  return [
    '<meta data-chica-seo="1" name="robots" content="' + robots + '"/>',
    '<link rel="canonical" href="' + opts.canonical + '"/>',
    '<meta property="og:type" content="website"/>',
    '<meta property="og:site_name" content="Chicas Map"/>',
    '<meta property="og:locale" content="' + locale + '"/>',
    '<meta property="og:title" content="' + opts.title + '"/>',
    '<meta property="og:description" content="' + opts.desc + '"/>',
    '<meta property="og:url" content="' + opts.canonical + '"/>',
    '<meta property="og:image" content="' + ogImage + '"/>',
    '<meta name="twitter:card" content="summary_large_image"/>',
    '<meta name="twitter:title" content="' + opts.title + '"/>',
    '<meta name="twitter:description" content="' + opts.desc + '"/>',
    '<meta name="twitter:image" content="' + ogImage + '"/>'
  ].join("");
}
function stampFile(file, opts) {
  opts = opts || {};
  let html = readFileSync(file, "utf8");
  const name = basename(file);
  const sitePath = sitePathFromFile(file);
  const isEs = opts.forceLang === "es" || sitePath.startsWith("/es/") || sitePath === "/es/";
  const key = pageKey(sitePath);
  const page = PAGE_BY_PATH[key] || PAGE_BY_PATH["/"];
  const title = isEs ? page.titleEs : page.title;
  const desc = isEs ? page.descEs : page.desc;
  const enPath = key === "/" ? "/" : "/" + (PAGE_BY_PATH[key] ? page.path : key) + "/";
  const canonical = origin + (isEs ? "/es" + enPath : enPath);
  const isAlias = name !== "index.html" && name !== "404.html" && name !== "_shell.html" && name.endsWith(".html");
  const isUtility = name === "404.html" || name === "_shell.html";
  const indexable = !isAlias && !isUtility;

  html = html.replace(/<meta[^>]*data-chica-seo="1"[^>]*>/g, "");
  html = html.replace(/<link rel="canonical"[^>]*>/g, "");
  html = html.replace(/<meta property="og:[^"]+"[^>]*>/g, "");
  html = html.replace(/<meta name="twitter:[^"]+"[^>]*>/g, "");
  html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, "");
  html = html.replace(/<link rel="alternate" hreflang="[^"]+"[^>]*>/g, "");
  html = html.replace(/<title>[^<]*<\/title>/g, "");
  html = html.replace(/<meta name="description"[^>]*>/g, "");

  if (!html.includes('"/es"') && html.indexOf("b+\"/es\"") === -1) html = html.replace("<head>", "<head>" + ES_BOOT);
  html = html.replace("<head>", "<head>" + hrefLang(enPath));
  if (html.indexOf('rel="apple-touch-icon"') === -1) html = html.replace("<head>", '<head><link rel="apple-touch-icon" href="/Chicas-Map/apple-touch-icon.png"/>');
  if (html.indexOf('href="/Chicas-Map/humans.txt"') === -1 && html.indexOf('href="/humans.txt"') === -1) html = html.replace("<head>", '<head><link rel="author" href="/Chicas-Map/humans.txt"/>');
  html = html.replace("<head>", "<head><title>" + title + "</title>");
  html = html.replace("<head>", "<head><meta name=\"description\" content=\"" + desc + "\"/>");
  html = html.replace("<head>", "<head>" + seoHead({ title: title, desc: desc, canonical: canonical, indexable: indexable, lang: isEs ? "es" : "en" }));
  if (indexable) html = html.replace("</head>", jsonLd(page, canonical) + "</head>");
  if (html.indexOf('id="chica-crawl"') === -1 && html.indexOf("id='chica-crawl'") === -1) {
    const block = noscriptBlock(page, isEs);
    html = html.includes("<body") ? html.replace(/<body([^>]*)>/, "<body$1>" + block) : block + html;
  }
  if (html.indexOf("data-goatcounter") === -1) html = html.includes("</body>") ? html.replace("</body>", GOATCOUNTER + "</body>") : html + GOATCOUNTER;
  writeFileSync(file, html);
}
const htmlFiles = walk(root);
for (const file of htmlFiles) stampFile(file);
for (const page of PAGES) {
  const src = page.path ? join(root, page.path, "index.html") : join(root, "index.html");
  try { readFileSync(src, "utf8"); } catch (e) { continue; }
  const dest = page.path ? join(root, "es", page.path, "index.html") : join(root, "es", "index.html");
  ensureDir(dest);
  writeFileSync(dest, readFileSync(src, "utf8"));
  stampFile(dest, { forceLang: "es" });
}
const today = new Date().toISOString().slice(0, 10);
let body = "";
for (const p of PAGES) {
  const srcIndex = p.path ? join(root, p.path, "index.html") : join(root, "index.html");
  try { statSync(srcIndex); } catch (e) { continue; }
  const en = origin + (p.path ? "/" + p.path + "/" : "/");
  const es = origin + "/es" + (p.path ? "/" + p.path + "/" : "/");
  body += "  <url>\n    <loc>" + en + "</loc>\n    <lastmod>" + today + "</lastmod>\n    <changefreq>daily</changefreq>\n    <xhtml:link rel=\"alternate\" hreflang=\"en\" href=\"" + en + "\"/>\n    <xhtml:link rel=\"alternate\" hreflang=\"es\" href=\"" + es + "\"/>\n    <xhtml:link rel=\"alternate\" hreflang=\"x-default\" href=\"" + en + "\"/>\n  </url>\n  <url>\n    <loc>" + es + "</loc>\n    <lastmod>" + today + "</lastmod>\n    <changefreq>weekly</changefreq>\n    <xhtml:link rel=\"alternate\" hreflang=\"en\" href=\"" + en + "\"/>\n    <xhtml:link rel=\"alternate\" hreflang=\"es\" href=\"" + es + "\"/>\n    <xhtml:link rel=\"alternate\" hreflang=\"x-default\" href=\"" + en + "\"/>\n  </url>\n";
}
writeFileSync(join(root, "sitemap.xml"), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' + body + "</urlset>\n");
console.log("stamped " + htmlFiles.length + " html files, " + PAGES.length + " es shells, sitemap " + PAGES.length * 2 + " urls");
