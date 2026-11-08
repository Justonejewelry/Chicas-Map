#!/usr/bin/env node
/* Local check of /sales/<id>/ Event JSON-LD against Google's Event rich-result fields.
 * Usage: node scripts/validate_event_ld.mjs <site-root>   (exit 1 on errors) */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
const root = process.argv[2] || "_site";
const ISO = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:\d{2}))?$/;
export function checkEvent(ev, today) {
  const errors = [], warnings = [];
  if (!ev || ev["@type"] !== "Event") return { errors: ["not an Event"], warnings };
  if (!ev.name) errors.push("name missing");
  if (!ev.startDate || !ISO.test(ev.startDate)) errors.push("startDate missing/invalid");
  else if (ev.startDate.includes("T") && !/(Z|[+-]\d{2}:\d{2})$/.test(ev.startDate)) errors.push("startDate time without timezone offset");
  if (ev.endDate && !ISO.test(ev.endDate)) errors.push("endDate invalid");
  if (ev.endDate && ev.startDate && ev.endDate.slice(0, 10) < ev.startDate.slice(0, 10)) errors.push("endDate before startDate");
  const loc = ev.location;
  if (!loc || loc["@type"] !== "Place") errors.push("location Place missing");
  else {
    if (!loc.address || loc.address["@type"] !== "PostalAddress") errors.push("location.address PostalAddress missing");
    else for (const k of ["streetAddress", "addressLocality", "addressRegion", "postalCode", "addressCountry"]) if (!loc.address[k]) warnings.push("address." + k + " missing");
    if (!loc.geo) warnings.push("location.geo missing");
  }
  for (const k of ["eventStatus", "eventAttendanceMode", "description", "image", "endDate"]) if (!ev[k]) warnings.push(k + " missing");
  if (!ev.organizer) warnings.push("organizer missing (not in source data)");
  if (today && ev.endDate && ev.endDate.slice(0, 10) < today) errors.push("past sale marked as scheduled event");
  return { errors, warnings };
}
if (import.meta.url === "file://" + process.argv[1]) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(new Date());
  let pages = 0, bad = 0; const warn = {};
  for (const base of [join(root, "sales"), join(root, "es", "sales")]) {
    if (!existsSync(base)) continue;
    for (const id of readdirSync(base)) {
      const html = readFileSync(join(base, id, "index.html"), "utf8");
      const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
      pages++;
      if (!m) { if (!/class="ended"/.test(html)) { bad++; console.log("NO LD (not ended): " + id); } continue; }
      const r = checkEvent(JSON.parse(m[1]), today);
      if (r.errors.length) { bad++; console.log("ERROR " + id + ": " + r.errors.join("; ")); }
      r.warnings.forEach((w) => (warn[w] = (warn[w] || 0) + 1));
    }
  }
  console.log("event-ld: " + pages + " pages, " + bad + " with errors; warnings " + JSON.stringify(warn));
  process.exit(bad ? 1 : 0);
}
