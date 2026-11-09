#!/usr/bin/env node
/**
 * Encrypt the Mission Control dashboard into webapp/mission-control/index.html.
 *   node scripts/mission-control/build.mjs <srcDir> <passwordFile>
 * srcDir holds app.html, app.css, app.js (kept OUTSIDE the repo). The password file is
 * never committed; only a random-salt, random-IV AES-256-GCM blob (PBKDF2-SHA256, 600k
 * iterations) is written into the page. Client-side gating only: it keeps casual visitors
 * and crawlers out, so never put private data on the page.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { randomBytes, pbkdf2Sync, createCipheriv } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const [srcDir, pwFile] = process.argv.slice(2);
if (!srcDir || !pwFile) { console.error("usage: build.mjs <srcDir> <passwordFile>"); process.exit(2); }
const password = readFileSync(pwFile, "utf8").trim();
if (password.length < 8) { console.error("password too short"); process.exit(2); }
const payload = JSON.stringify({
  html: readFileSync(join(srcDir, "app.html"), "utf8"),
  css: readFileSync(join(srcDir, "app.css"), "utf8"),
  js: readFileSync(join(srcDir, "app.js"), "utf8"),
});
const ITER = 600000;
const salt = randomBytes(16), iv = randomBytes(12);
const key = pbkdf2Sync(password, salt, ITER, 32, "sha256");
const c = createCipheriv("aes-256-gcm", key, iv);
const enc = Buffer.concat([c.update(payload, "utf8"), c.final()]);
const ct = Buffer.concat([enc, c.getAuthTag()]); // Web Crypto expects tag appended
const blob = JSON.stringify({ v: 1, iter: ITER, salt: salt.toString("base64"), iv: iv.toString("base64"), ct: ct.toString("base64") });
const shell = readFileSync(join(here, "shell.html"), "utf8");
const root = join(here, "..", "..");
const out = join(root, "webapp", "mission-control", "index.html");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, shell.replace("@@BLOB@@", () => blob));
console.log("wrote", out, "(" + blob.length + " blob bytes)");
