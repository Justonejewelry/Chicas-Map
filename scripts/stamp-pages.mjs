#!/usr/bin/env node
/**
 * Stamp GitHub Pages output: unique titles, canonicals, Open Graph,
 * JSON-LD, noscript crawl text, Spanish shells, hreflang, sitemap.
 */
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

const root = process.argv[2] || "_site";
const origin = "https://justonejewelry.github.io/Chicas-Map";
const ogImage = origin + "/og.jpg";

const PAGES = [
  {
    path: "",
    title: "Chicas Map \u00b7 San Antonio garage sales",
    desc: "Free San Antonio map of garage sales, yard sales, and estate sales. Near Me, multi-stop routes, and weekend intel.",
    titleEs: "Chicas Map \u00b7 Ventas de garage en San Antonio",
    descEs: "Mapa gratis de ventas de garage, yard sales y estate sales en San Antonio. Cerca de mi, rutas, e intel del fin.",
  },
  {
    path: "map",
    title: "Live garage sale map \u00b7 Chicas Map San Antonio",
    desc: "Open the live San Antonio garage sale map. Verified pins, Near Me, KEY layers, and one-tap Google, Apple, or Waze routes.",
    titleEs: "Mapa en vivo \u00b7 Chicas Map San Antonio",
    descEs: "Mapa en vivo de ventas de garage en San Antonio. Pines, Cerca de mi, capas KEY, y rutas en Google, Apple o Waze.",
  },
  {
    path: "intel",
    title: "Sale Intel \u00b7 Chicas Map",
    desc: "Driveway notes from people standing at the sale. Unlock within 200 feet. GPS, not rumors.",
    titleEs: "Sale Intel \u00b7 Chicas Map",
    descEs: "Notas de quien esta en la venta. Se desbloquean a 200 pies. GPS, no rumores.",
  },
  {
    path: "sponsors",
    title: "Sponsor Chicas Map \u00b7 San Antonio",
    desc: "Help keep Chica's cape on. The public garage sale map stays free for San Antonio neighbors.",
    titleEs: "Patrocinio \u00b7 Chicas Map",
    descEs: "Ayuda a Chica a dejar la capa puesta. El mapa publico sigue gratis.",
  },
  {
    path: "submit",
    title: "List a garage sale free \u00b7 Chicas Map",
    desc: "Put your San Antonio garage, yard, or estate sale on Chicas Map. Free to list. Reviewed before it goes live.",
    titleEs: "Agregar venta \u00b7 Chicas Map",
    descEs: "Publica tu venta de garage en San Antonio. Gratis. Chica la revisa antes de pincharla.",
  },
  {
    path: "facebook",
    title: "Facebook pack \u00b7 Chicas Map",
    desc: "Follow Chica on Facebook for San Antonio weekend sale alerts and hunt photos.",
    titleEs: "Facebook \u00b7 Chicas Map",
    descEs: "La manada en Facebook. Avisos del fin y fotos de la caceria.",
  },
  {
    path: "media",
    title: "Reels and videos \u00b7 Chicas Map",
    desc: "San Antonio garage-sale reels and hunt clips from Chicas Map.",
    titleEs: "Reels \u00b7 Chicas Map",
    descEs: "Reels y clips de la caceria en San Antonio.",
  },
  {
    path: "bulletin",
    title: "Bulletin \u00b7 Chicas Map",
    desc: "Say hi to Chica. Tips, support, and pack notes for the San Antonio map.",
    titleEs: "Mural \u00b7 Chicas Map",
    descEs: "Di hola a Chica. Apoyo, ideas, y la manada.",
  },
  {
    path: "backstory",
    title: "Why Chicas Map exists \u00b7 Veteran-built San Antonio map",
    desc: "The story behind Chicas Map: a veteran-built, free San Antonio garage sale map for neighbors.",
    titleEs: "Historia \u00b7 Chicas Map",
    descEs: "Por que existe el mapa. Veterano, Chica, y un sabado mas amable.",
  },
  {
    path: "legal",
    title: "Legal \u00b7 Chicas Map",
    desc: "Legal notice for Chicas Map. Neighbor guide, not a certification. Verify hours on site.",
    titleEs: "Aviso \u00b7 Chicas Map",
    descEs: "Aviso legal. El mapa es una guia de vecinos, no una certificacion.",
  },
  {
    path: "claim",
    title: "Pin it \u00b7 $5 \u00b7 Chicas Map",
    desc: "Listing is free. $5 lights your San Antonio sale pin this weekend so the pack can find your driveway.",
    titleEs: "Destaca tu pin \u00b7 $5 \u00b7 Chicas Map",
    descEs: "Publicar es gratis. $5 ilumina tu pin este fin para que la manada encuentre tu entrada.",
  },
  {
    path: "list",
    title: "This weekend's sales \u00b7 Chicas Map",
    desc: "Text list of San Antonio garage, yard, and estate sales for this weekend. Open any stop on the map.",
    titleEs: "Ventas de este fin \u00b7 Chicas Map",
    descEs: "Lista de ventas de garage, yard y estate en San Antonio este fin. Abrela en el mapa.",
  },
];

const PAGE_BY_PATH = Object.fromEntries(PAGES.map((p) => [p.path || "/", p]));

const ES_BOOT =
  '<script>(function(){try{var b="/Chicas-Map";var p=location.pathname;var es=b+"/es";if(p===es||p.indexOf(es+"/")===0){localStorage.setItem("chicas-map-locale","es");document.documentElement.lang="es";var rest=p.slice(es.length)||"/";history.replaceState(null,"",b+(rest.charAt(0)==="/"?rest:"/"+rest)+location.search+location.hash);}}catch(e){}})();</script>';
const GOATCOUNTER =
  '<script data-goatcounter="https://chicasmap.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>';
const NOSCRIPT_EN =
  '<noscript><main id="chica-crawl"><h1>Chicas Map \u2014 San Antonio garage sales</h1><p>Free map of garage sales, yard sales, and estate sales in San Antonio. Near Me, routes, and weekend intel.</p><ul><li><a href="/Chicas-Map/map/">Open the live map</a></li><li><a href="/Chicas-Map/list/">This weekend\u2019s sales</a></li><li><a href="/Chicas-Map/submit/">List a sale free</a></li><li><a href="/Chicas-Map/intel/">Sale Intel (200 feet)</a></li><li><a href="/Chicas-Map/claim/">Pin it \u00b7 $5</a></li></ul></main></noscript>';
const NOSCRIPT_ES =
  '<noscript><main id="chica-crawl"><h1>Chicas Map \u2014 Ventas de garage en San Antonio</h1><p>Mapa gratis de ventas de garage, yard sales y estate sales en San Antonio.</p><ul><li><a href="/Chicas-Map/map/">Abrir el mapa</a></li><li><a href="/Chicas-Map/list/">Ventas de este fin</a></li><li><a href="/Chicas-Map/submit/">Publicar una venta</a></li><li><a href="/Chicas-Map/intel/">Sale Intel (200 pies)</a></li></ul></main></noscript>';

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

function ensureDir(file) {
  mkdirSync(dirname(file), { recursive: true });
}

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
  return (
    '<link rel="alternate" hreflang="en" href="' +
    en +
    '"/><link rel="alternate" hreflang="es" href="' +
    es +
    '"/><link rel="alternate" hreflang="x-default" href="' +
    en +
    '"/>'
  );
}

function jsonLd(page, canonical) {
  const graph = [
    {
      "@type": "WebSite",
      "@id": origin + "/#website",
      name: "Chicas Map",
      url: origin + "/",
      inLanguage: ["en", "es"],
      description: page.desc,
      publisher: { "@id": origin + "/#org" },
    },
    {
      "@type": "Organization",
      "@id": origin + "/#org",
      name: "Chicas Map",
      url: origin + "/",
      logo: origin + "/images/chica-logo.png",
    },
  ];
  if (page.path === "" || page.path === "map") {
    graph.push({
      "@type": "WebApplication",
      name: "Chicas Map",
      url: canonical,
      applicationCategory: "LifestyleApplication",
      operatingSystem: "Web",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      areaServed: "San Antonio, Texas",
    });
  }
  return (
    '<script type="application/ld+json">' +
    JSON.stringify({ "@context": "https://schema.org", "@graph": graph }) +
    "</script>"
  );
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
    '<meta name="twitter:image" content="' + ogImage + '"/>',
  ].join("");
}

function upsertMeta(html, name, content, attr) {
  attr = attr || "name";
  const re = new RegExp("<meta " + attr + "=[\"']" + name + "[\"'][^>]*>", "i");
  const tag = "<meta " + attr + "=\"" + name + "\" content=\"" + content + "\"/>";
  if (re.test(html)) return html.replace(re, tag);
  return html.replace("<head>", "<head>" + tag);
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
  const enPath = key === "/" ? "/" : "/" + page.path + "/";
  const canonical = origin + (isEs ? "/es" + enPath : enPath);
  const isAlias =
    name !== "index.html" && name !== "404.html" && name !== "_shell.html" && name.endsWith(".html");
  const isUtility = name === "404.html" || name === "_shell.html";
  const indexable = !isAlias && !isUtility;

  html = html.replace(/<meta[^>]*data-chica-seo="1"[^>]*>/g, "");
  html = html.replace(/<link rel="canonical"[^>]*>/g, "");
  html = html.replace(/<meta property="og:[^"]+"[^>]*>/g, "");
  html = html.replace(/<meta name="twitter:[^"]+"[^>]*>/g, "");
  html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, "");

  if (!html.includes('"/es"') && html.indexOf("b+\"/es\"") === -1) {
    html = html.replace("<head>", "<head>" + ES_BOOT);
  }
  if (html.indexOf('hreflang="es"') === -1) {
    html = html.replace("<head>", "<head>" + hrefLang(enPath));
  }
  if (html.indexOf('rel="apple-touch-icon"') === -1) {
    html = html.replace("<head>", '<head><link rel="apple-touch-icon" href="/Chicas-Map/apple-touch-icon.png"/>');
  }
  if (html.indexOf('href="/Chicas-Map/humans.txt"') === -1 && html.indexOf('href="/humans.txt"') === -1) {
    html = html.replace("<head>", '<head><link rel="author" href="/Chicas-Map/humans.txt"/>');
  }

  html = html.replace(/<title>[^<]*<\/title>/, "<title>" + title + "</title>");
  if (!/<title>/.test(html)) html = html.replace("<head>", "<head><title>" + title + "</title>");
  html = upsertMeta(html, "description", desc);
  html = html.replace("<head>", "<head>" + seoHead({ title: title, desc: desc, canonical: canonical, indexable: indexable, lang: isEs ? "es" : "en" }));
  if (indexable && html.indexOf("application/ld+json") === -1) {
    html = html.replace("</head>", jsonLd(page, canonical) + "</head>");
  }
  if (html.indexOf('id="chica-crawl"') === -1 && html.indexOf("id='chica-crawl'") === -1) {
    const block = isEs ? NOSCRIPT_ES : NOSCRIPT_EN;
    html = html.includes("<body") ? html.replace(/<body([^>]*)>/, "<body$1>" + block) : block + html;
  }
  if (html.indexOf("data-goatcounter") === -1) {
    html = html.includes("</body>") ? html.replace("</body>", GOATCOUNTER + "</body>") : html + GOATCOUNTER;
  }
  writeFileSync(file, html);
}

const htmlFiles = walk(root);
for (const file of htmlFiles) stampFile(file);

for (const page of PAGES) {
  const src = page.path ? join(root, page.path, "index.html") : join(root, "index.html");
  try {
    readFileSync(src, "utf8");
  } catch (e) {
    continue;
  }
  const dest = page.path ? join(root, "es", page.path, "index.html") : join(root, "es", "index.html");
  ensureDir(dest);
  writeFileSync(dest, readFileSync(src, "utf8"));
  stampFile(dest, { forceLang: "es" });
}

const today = new Date().toISOString().slice(0, 10);
let body = "";
for (const p of PAGES) {
  const en = origin + (p.path ? "/" + p.path + "/" : "/");
  const es = origin + "/es" + (p.path ? "/" + p.path + "/" : "/");
  body +=
    "  <url>\n    <loc>" +
    en +
    "</loc>\n    <lastmod>" +
    today +
    "</lastmod>\n    <changefreq>daily</changefreq>\n    <xhtml:link rel=\"alternate\" hreflang=\"en\" href=\"" +
    en +
    "\"/>\n    <xhtml:link rel=\"alternate\" hreflang=\"es\" href=\"" +
    es +
    "\"/>\n    <xhtml:link rel=\"alternate\" hreflang=\"x-default\" href=\"" +
    en +
    "\"/>\n  </url>\n  <url>\n    <loc>" +
    es +
    "</loc>\n    <lastmod>" +
    today +
    "</lastmod>\n    <changefreq>weekly</changefreq>\n    <xhtml:link rel=\"alternate\" hreflang=\"en\" href=\"" +
    en +
    "\"/>\n    <xhtml:link rel=\"alternate\" hreflang=\"es\" href=\"" +
    es +
    "\"/>\n    <xhtml:link rel=\"alternate\" hreflang=\"x-default\" href=\"" +
    en +
    "\"/>\n  </url>\n";
}
writeFileSync(
  join(root, "sitemap.xml"),
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
    body +
    "</urlset>\n",
);
console.log("stamped " + htmlFiles.length + " html files, " + PAGES.length + " es shells, sitemap " + PAGES.length * 2 + " urls");
