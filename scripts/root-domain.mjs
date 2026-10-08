#!/usr/bin/env node
/** Publish-time rewrite so www.chicasmap.com is served at /. Source stays /Chicas-Map. */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";

const root = process.argv[2] || "_site";
const origin = process.env.SITE_ORIGIN || "https://www.chicasmap.com";
const OLD_ORIGIN = "https://justonejewelry.github.io/Chicas-Map";
const REPO_URL = "https://github.com/Justonejewelry/Chicas-Map";
const REPO_HOLD = "https://github.com/Justonejewelry/__CHICAS_REPO__";
const TEXT = new Set([".html", ".js", ".css", ".json", ".webmanifest", ".xml", ".txt", ".svg", ".map", ".mjs"]);

function walk(dir, acc) {
  acc = acc || [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    let st;
    try { st = statSync(p); } catch (e) { continue; }
    if (st.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

function rewrite(s) {
  s = s.split(REPO_URL).join(REPO_HOLD);
  s = s.split(OLD_ORIGIN).join(origin);
  s = s.split("basepath:`/Chicas-Map`").join('basepath:""');
  s = s.split("/Chicas-Map/").join("/");
  s = s.split("/Chicas-Map`").join("/`");
  s = s.split('"/Chicas-Map"').join('""');
  s = s.split("'/Chicas-Map'").join("''");
  s = s.replace(
    'return p === BASE || p === BASE + "/index.html";',
    'return p === (BASE || "/") || p === (BASE || "/") + "/index.html";'
  );
  s = s.split(REPO_HOLD).join(REPO_URL);
  return s;
}

let n = 0;
let leftover = 0;
for (const file of walk(root)) {
  if (file.endsWith("/CNAME")) continue;
  if (!TEXT.has(extname(file).toLowerCase())) continue;
  let raw;
  try { raw = readFileSync(file, "utf8"); } catch (e) { continue; }
  const next = rewrite(raw);
  if (next !== raw) {
    writeFileSync(file, next);
    n++;
  }
  if (next.includes("/Chicas-Map") && !next.includes(REPO_URL)) leftover++;
}
console.log("root-domain rewrote " + n + " files; non-repo leftovers " + leftover + "; origin " + origin);
