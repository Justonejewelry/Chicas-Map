#!/usr/bin/env node
/**
 * Stamp GitHub Pages output: unique titles, canonicals, Open Graph,
 * JSON-LD, noscript crawl text, Spanish shells, hreflang, sitemap.
 */
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

const root = process.argv[2] || "_site";
const origin = "https://justonejewelry.github.io/Chicas-Map";
const ogImage = `${origin}/og.jpg`;
const MARK = "data-chica-seo=\"1\"";

const PAGES = [
  {
    path: "",
    title: "Chicas Map · San Antonio garage sales",
    desc: "Free San Antonio map of garage sales, yard sales, and estate sales. Near Me, multi-stop routes, and weekend intel.",
    titleEs: "Chicas Map · Ventas de garage en San Antonio",
    descEs: "Mapa gratis de ventas de garage, yard sales y estate sales en San Antonio. Cerca de mí, rutas, e intel del fin.",
  },
  {
    path: "map",
    title: "Live garage sale map · Chicas Map San Antonio",
    desc: "Open the live San Antonio garage sale map. Verified pins, Near Me, KEY layers, and one-tap Google, Apple, or Waze routes.",
    titleEs: "Mapa en vivo · Chicas Map San Antonio",
    descEs: "Mapa en vivo de ventas de garage en San Antonio. Pines, Cerca de mí, capas KEY, y rutas en Google, Apple o Waze.",
  },
  {
    path: "intel",
    title: "Sale Intel · Chicas Map",
    desc: "Driveway notes from people standing at the sale. Unlock within 200 feet. GPS, not rumors.",
    titleEs: "Sale Intel · Chicas Map",
    descEs: "Notas de quien está en la venta. Se desbloquean a 200 pies. GPS, no rumores.",
  },
  {
    path: "sponsors",
    title: "Sponsor Chicas Map · San Antonio",
    desc: "Help keep Chica’s cape on. The public garage sale map stays free for San Antonio neighbors.",
    titleEs: "Patrocinio · Chicas Map",
    descEs: "Ayuda a Chica a dejar la capa puesta. El mapa público sigue gratis.",
  },
  {
    path: "submit",
    title: "List a garage sale free · Chicas Map",
    desc: "Put your San Antonio garage, yard, or estate sale on Chicas Map. Free to list. Reviewed before it goes live.",
    titleEs: "Agregar venta · Chicas Map",
    descEs: "Publica tu venta de garage en San Antonio. Gratis. Chica la revisa antes de pincharla.",
  },
  {
    path: "facebook",
    title: "Facebook pack · Chicas Map",
    desc: "Follow Chica on Facebook for San Antonio weekend sale alerts and hunt photos.",
    titleEs: "Facebook · Chicas Map",
    descEs: "La manada en Facebook. Avisos del fin y fotos de la cacería.",
  },
  {
    path: "media",
    title: "Reels and videos · Chicas Map",
    desc: "San Antonio garage-sale reels and hunt clips from Chicas Map.",
    titleEs: "Reels · Chicas Map",
    descEs: "Reels y clips de la cacería en San Antonio.",
  },
  {
    path: "bulletin",
    title: "Bulletin · Chicas Map",
    desc: "Say hi to Chica. Tips, support, and pack notes for the San Antonio map.",
    titleEs: "Mural · Chicas Map",
    descEs: "Di hola a Chica. Apoyo, ideas, y la manada.",
  },
  {
    path: "backstory",
    title: "Why Chicas Map exists · Veteran-built San Antonio map",
    desc: "The story behind Chicas Map: a veteran-built, free San Antonio garage sale map for neighbors.",
    titleEs: "Historia · Chicas Map",
    descEs: "Por qué existe el mapa. Veterano, Chica, y un sábado más amable.",
  },
  {
    path: "legal",
    title: "Legal · Chicas Map",
    desc: "Legal notice for Chicas Map. Neighbor guide, not a certification. Verify hours on site.",
    titleEs: "Aviso · Chicas Map",
    descEs: "Aviso legal. El mapa es una guía de vecinos, no una certificación.",
  },
  {
    path: "claim",
    title: "Pin it · $5 · Chicas Map",
    desc: "Listing is free. $5 lights your San Antonio sale pin this weekend so the pack can find your driveway.",
    titleEs: "Destaca tu pin · $5 · Chicas Map",
    descEs: "Publicar es gratis. $5 ilumina tu pin este fin para que la manada encuentre tu entrada.",
  },
  {
    path: "list",
    title: "This weekend’s sales · Chicas Map",
    desc: "Text list of San Antonio garage, yard, and estate sales for this weekend. Open any stop on the map.",
    titleEs: "Ventas de este fin · Chicas Map",
    descEs: "Lista de ventas de garage, yard y estate en San Antonio este fin. Ábrela en el mapa.",
  },
];

const PAGE_BY_PATH = Object.fromEntries(PAGES.map((p) => [p.path || "/", p]));

const ES_BOOT = `<script>(function(){try{var b="/Chicas-Map";var p=location.pathname;var es=b+"/es";if(p===es||p.indexOf(es+"/")===0){localStorage.setItem("chicas-map-locale","es");document.documentElement.lang="es";var rest=p.slice(es.length)||"/";history.replaceState(null,"",b+(rest.charAt(0)==="/"?rest:"/"+rest)+location.search+location.hash);}}catch(e){}})();</script>`;
const GOATCOUNTER = `<script data-goatcounter="https://chicasmap.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>`;

const NOSCRIPT_EN = `<noscript><main id="chica-crawl"><h1>Chicas Map — San Antonio garage sales</h1><p>Free map of garage sales, yard sales, and estate sales in San Antonio. Near Me, routes, and weekend intel.</p><ul><li><a href="/Chicas-Map/map/">Open the live map</a></li><li><a href="/Chicas-Map/list/">This weekend’s sales</a></li><li><a href="/Chicas-Map/submit/">List a sale free</a></li><li><a href="/Chicas-Map/intel/">Sale Intel (200 feet)</a></li><li><a href="/Chicas-Map/claim/">Pin it · $5</a></li></ul></main></noscript>`;
const NOSCRIPT_ES = `<noscript><main id="chica-crawl"><h1>Chicas Map — Ventas de garage en San Antonio</h1><p>Mapa gratis de ventas de garage, yard sales y estate sales en San Antonio.</p><ul><li><a href="/Chicas-Map/map/">Abrir el mapa</a></li><li><a href="/Chicas-Map/list/">Ventas de este fin</a></li><li><a href="/Chicas-Map/submit/">Publicar una venta</a></li><li><a href="/Chicas-Map/intel/">Sale Intel (200 pies)</a></li></ul></main></noscript>`;

function walk(dir, acc = []) {
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
  if (!rel.startsWith("/")) rel = `/${rel}`;
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
  const en = `${origin}${enPath}`;
  const es = `${origin}/es${enPath === "/" ? "/" : enPath}`;
  return `<link rel="alternate" hreflang="en" href="${en}"/><link rel="alternate" hreflang="es" href="${es}"/><link rel="alternate" hreflang="x-default" href="${en}"/>`;
}

function jsonLd(page, canonical) {
  const isHome = page.path === "";
  const graph = [
    {
      "@type": "WebSite",
      "@id": `${origin}/#website`,
      name: "Chicas Map",
      url: `${origin}/`,
      inLanguage: ["en", "es"],
      description: page.desc,
      publisher: { "@id": `${origin}/#org" },
    },
    {
      "@type": "Organization",
      "@id": `${origin}/#org`,
      name: "Chicas Map",
      url: `${origin}/`,
      logo: `${origin}/images/chica-logo.png`,
    },
  ];
  if (isHome || page.path === "map") {
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
  return `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@graph": graph,
  })}</script>`;
}

function seoHead({ title, desc, canonical, indexable, lang }) {
  const robots = indexable ? "index,follow,max-image-preview:large" : "noindex,follow";
  const ogType = canonical.endsWith("/map/") || canonical.endsWith("/Chicas-Map/") ? "website" : "website";
  return [
    `<meta ${MARK} name="robots" content="${robots}"/>`,
    `<link rel="canonical" href="${canonical}"/>`,
    `<meta property="og:type" content="${ogType}"/>`,
    `<meta property="og:site_name" content="Chicas Map"/>`,
    `<meta property="og:locale" content="${lang === "es" ? "es_US" : "en_US"}"/>`,
    `<meta property="og:title" content="${title}"/>`,
    `<meta property="og:description" content="${desc}"/>`,
    `<meta property="og:url" content="${canonical}"/>`,
    `<meta property="og:image" content="${ogImage}"/>`,
    `<meta name="twitter:card" content="summary_large_image"/>`,
    `<meta name="twitter:title" content="${title}"/>`,
    `<meta name="twitter:description" content="${desc}"/>`,
    `<meta name="twitter:image" content="${ogImage}"/>`,
  ].join("");
}

function upsertMeta(html, name, content, attr = "name") {
  const re = new RegExp(`<meta ${attr}=["']${name}["'][^>]*>`, "i");
  const tag = `<meta ${attr}="${name}" content="${content}"/>`;
  if (re.test(html)) return html.replace(re, tag);
  return html.replace("<head>", `<head>${tag}`);
}

function stampFile(file, { forceLang } = {}) {
  let html = readFileSync(file, "utf8");
  const name = basename(file);
  const sitePath = sitePathFromFile(file);
  const isEs = forceLang === "es" || sitePath.startsWith("/es/") || sitePath === "/es/";
  const key = pageKey(sitePath);
  const page = PAGE_BY_PATH[key] || PAGE_BY_PATH["/"];
  const title = isEs ? page.titleEs : page.title;
  const desc = isEs ? page.descEs : page.desc;
  const enPath = key === "/" ? "/" : `/${page.path}/`;
  const canonical = `${origin}${isEs ? `/es${enPath}` : enPath}`;
  const isAlias =
    name !== "index.html" &&
    name !== "404.html" &&
    name !== "_shell.html" &&
    name.endsWith(".html");
  const isUtility = name === "404.html" || name === "_shell.html";
  const indexable = !isAlias && !isUtility;

  html = html.replace(/<meta[^>]*data-chica-seo="1"[^>]*>/g, "");
  html = html.replace(/<link rel="canonical"[^>]*>/g, "");
  html = html.replace(/<meta property="og:[^"]+"[^>]*>/g, "");
  html = html.replace(/<meta name="twitter:[^"]+"[^>]*>/g, "");
  html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, "");

  if (!html.includes('"/es"') && !html.includes("b+\"/es\"")) {
    html = html.replace("<head>", `<head>${ES_BOOT}`);
  }
  if (!html.includes('hreflang="es"')) {
    html = html.replace("<head>", `<head>${hrefLang(enPath)}`);
  }
  if (!html.includes('rel="apple-touch-icon"')) {
    html = html.replace("<head>", `<head><link rel="apple-touch-icon" href="/Chicas-Map/apple-touch-icon.png"/>`);
  }
  if (!html.includes('href="/Chicas-Map/humans.txt"') && !html.includes('href="/humans.txt"')) {
    html = html.replace("<head>", `<head><link rel="author" href="/Chicas-Map/humans.txt"/>`);
  }

  html = html.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
  if (!/<title>/.test(html)) html = html.replace("<head>", `<head><title>${title}</title>`);
  html = upsertMeta(html, "description", desc);

  html = html.replace("<head>", `<head>${seoHead({ title, desc, canonical, indexable, lang: isEs ? "es" : "en" })}`);
  if (indexable && !html.includes("application/ld+json")) {
    html = html.replace("</head>", `${jsonLd(page, canonical)}</head>`);
  }

  if (!html.includes("id=\"chica-crawl\"") && !html.includes("id='chica-crawl'")) {
    const block = isEs ? NOSCRIPT_ES : NOSCRIPT_EN;
    html = html.includes("<body")
      ? html.replace(/<body([^>]*)>/, `<body$1>${block}`)
      : block + html;
  }

  if (!html.includes("data-goatcounter")) {
    html = html.includes("</body>") ? html.replace("</body>", `${GOATCOUNTER}</body>`) : html + GOATCOUNTER;
  }

  writeFileSync(file, html);
  return { title, canonical, indexable };
}

const htmlFiles = walk(root);
for (const file of htmlFiles) stampFile(file);

for (const page of PAGES) {
  const src = page.path ? join(root, page.path, "index.html") : join(root, "index.html");
  try {
    readFileSync(src, "utf8");
  } catch {
    continue;
  }
  const dest = page.path ? join(root, "es", page.path, "index.html") : join(root, "es", "index.html");
  ensureDir(dest);
  writeFileSync(dest, readFileSync(src, "utf8"));
  stampFile(dest, { forceLang: "es" });
}

const today = new Date().toISOString().slice(0, 10);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${PAGES.map((p) => {
  const en = `${origin}${p.path ? `/${p.path}/` : "/"}`;
  const es = `${origin}/es${p.path ? `/${p.path}/` : "/"}`;
  return `  <url>
    <loc>${en}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <xhtml:link rel="alternate" hreflang="en" href="${en}"/>
    <xhtml:link rel="alternate" hreflang="es" href="${es}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${en}"/>
  </url>
  <url>
    <loc>${es}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <xhtml:link rel="alternate" hreflang="en" href="${en}"/>
    <xhtml:link rel="alternate" hreflang="es" href="${es}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${en}"/>
  </url>`;
}).join("\n")}
</urlset>
`;
writeFileSync(join(root, "sitemap.xml"), sitemap);
console.log(`stamped ${htmlFiles.length} html files, ${PAGES.length} es shells, sitemap ${PAGES.length * 2} urls`);
