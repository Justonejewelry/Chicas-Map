#!/usr/bin/env node
/**
 * Stamp GitHub Pages output: Spanish SEO shells, hreflang, sitemap, locale boot.
 */
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const root = process.argv[2] || "_site";
const origin = "https://justonejewelry.github.io/Chicas-Map";

const PAGES = [
  {
    path: "",
    title: "Chicas Map · Ventas de garage en San Antonio",
    desc: "Encuentra ventas de garage, yard sales y estate sales verificadas en San Antonio. Mapa en vivo, Cerca de mí, y rutas. Gratis.",
  },
  {
    path: "map",
    title: "El mapa · Chicas Map",
    desc: "Pines verificados para este fin en San Antonio. Cerca de mí, capas, y arma tu ruta.",
  },
  {
    path: "intel",
    title: "Sale Intel · Chicas Map",
    desc: "Notas de quien está en la venta. Se desbloquean a 200 metros. GPS, no rumores.",
  },
  {
    path: "sponsors",
    title: "Patrocinio · Chicas Map",
    desc: "Ayuda a Chica a dejar la capa puesta. Los pines no se pagan.",
  },
  {
    path: "submit",
    title: "Agregar venta · Chicas Map",
    desc: "Comparte una venta de garage. Chica la revisa antes de pincharla.",
  },
  {
    path: "facebook",
    title: "Facebook · Chicas Map",
    desc: "La manada en Facebook. Avisos del fin y fotos de la cacería.",
  },
  {
    path: "media",
    title: "Reels · Chicas Map",
    desc: "Reels y clips de la cacería en San Antonio.",
  },
  {
    path: "bulletin",
    title: "Mural · Chicas Map",
    desc: "Di hola a Chica. Apoyo, ideas, y la manada.",
  },
  {
    path: "backstory",
    title: "Historia · Chicas Map",
    desc: "Por qué existe el mapa. Veterano, Chica, y un sábado más amable.",
  },
  {
    path: "legal",
    title: "Aviso · Chicas Map",
    desc: "Aviso legal. El mapa es una guía de vecinos, no una certificación.",
  },
];

const ES_BOOT = `<script>(function(){try{var b="/Chicas-Map";var p=location.pathname;var es=b+"/es";if(p===es||p.indexOf(es+"/")===0){localStorage.setItem("chicas-map-locale","es");document.documentElement.lang="es";var rest=p.slice(es.length)||"/";history.replaceState(null,"",b+(rest.charAt(0)==="/"?rest:"/"+rest)+location.search+location.hash);}}catch(e){}})();</script>`;

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name === "preview" || name === "assets" || name === "node_modules") continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (name.endsWith(".html")) acc.push(p);
  }
  return acc;
}

function hrefLang(enPath) {
  const en = `${origin}${enPath}`;
  const es = `${origin}/es${enPath === "/" ? "/" : enPath}`;
  return `<link rel="alternate" hreflang="en" href="${en}"/><link rel="alternate" hreflang="es" href="${es}"/><link rel="alternate" hreflang="x-default" href="${en}"/>`;
}

function pathFromFile(file) {
  const rel = file.slice(root.length).replace(/\\/g, "/").replace(/\/index\.html$/, "/") || "/";
  return rel.startsWith("/") ? rel : `/${rel}`;
}

function ensureDir(file) {
  mkdirSync(dirname(file), { recursive: true });
}

const htmlFiles = walk(root);
for (const file of htmlFiles) {
  let html = readFileSync(file, "utf8");
  if (!html.includes('"/es"') && !html.includes("b+\"/es\"")) {
    html = html.replace("<head>", `<head>${ES_BOOT}`);
  }
  if (!html.includes('hreflang="es"')) {
    const sitePath = pathFromFile(file).replace(/^\/es/, "") || "/";
    html = html.replace("<head>", `<head>${hrefLang(sitePath === "/" ? "/" : sitePath.endsWith("/") ? sitePath : `${sitePath}/`)}`);
  }
  if (!html.includes('rel="apple-touch-icon"')) {
    html = html.replace("<head>", `<head><link rel="apple-touch-icon" href="/Chicas-Map/apple-touch-icon.png"/>`);
  }
  if (!html.includes('href="/Chicas-Map/humans.txt"')) {
    html = html.replace("<head>", `<head><link rel="author" href="/Chicas-Map/humans.txt"/>`);
  }
  writeFileSync(file, html);
}

const home = readFileSync(join(root, "index.html"), "utf8");
for (const page of PAGES) {
  const src = page.path
    ? join(root, page.path, "index.html")
    : join(root, "index.html");
  let html = readFileSync(src, "utf8");
  html = html.replace('lang="en"', 'lang="es"');
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${page.title}</title>`);
  html = html.replace(
    /<meta name="description" content="[^"]*"/,
    `<meta name="description" content="${page.desc}"`,
  );
  const enPath = page.path ? `/${page.path}/` : "/";
  html = html.replace(/hreflang="en" href="[^"]*"/, `hreflang="en" href="${origin}${enPath}"`);
  html = html.replace(/hreflang="es" href="[^"]*"/, `hreflang="es" href="${origin}/es${enPath}"`);
  html = html.replace(/hreflang="x-default" href="[^"]*"/, `hreflang="x-default" href="${origin}${enPath}"`);
  const dest = page.path ? join(root, "es", page.path, "index.html") : join(root, "es", "index.html");
  ensureDir(dest);
  writeFileSync(dest, html);
}

const urls = [
  ...PAGES.map((p) => `${origin}${p.path ? `/${p.path}/` : "/"}`),
  ...PAGES.map((p) => `${origin}/es${p.path ? `/${p.path}/` : "/"}`),
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${PAGES.map((p) => {
  const en = `${origin}${p.path ? `/${p.path}/` : "/"}`;
  const es = `${origin}/es${p.path ? `/${p.path}/` : "/"}`;
  return `  <url>
    <loc>${en}</loc>
    <changefreq>daily</changefreq>
    <xhtml:link rel="alternate" hreflang="en" href="${en}"/>
    <xhtml:link rel="alternate" hreflang="es" href="${es}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${en}"/>
  </url>
  <url>
    <loc>${es}</loc>
    <changefreq>daily</changefreq>
    <xhtml:link rel="alternate" hreflang="en" href="${en}"/>
    <xhtml:link rel="alternate" hreflang="es" href="${es}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${en}"/>
  </url>`;
}).join("\n")}
</urlset>
`;
writeFileSync(join(root, "sitemap.xml"), sitemap);
console.log(`stamped ${htmlFiles.length} html files, ${PAGES.length} es shells, sitemap ${urls.length} urls`);
