/**
 * Per-sale detail pages: /sales/<slug>/ and /es/sales/<slug>/.
 * Built from data/sales-clean.json on every deploy by build_seo_pages.mjs, so new sales get a page automatically.
 * Facts shown come only from the feed: title, address, dates, hours, details, source + checked date.
 */
// Same analytics + Follow Chica row as stamp-pages.mjs (sale pages are built after stamping).
const SOCIALS = '<script src="/Chicas-Map/js/chica-socials.js?v=2" defer></script>';
const GOATCOUNTER = '<script>(function(){window.goatcounter=window.goatcounter||{};window.goatcounter.path=function(p){var path=(p||location.pathname||"/").replace(/^\\/Chicas-Map(?=\\/|$)/, "")||"/";if(path.indexOf("/admin")===0||path.indexOf("/__grok")===0||path.indexOf("/google")===0)return;return path;};})();</script><script data-goatcounter="https://chicasmap.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>';
const DAY_EN = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const DAY_ES = new Intl.DateTimeFormat("es-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
function fmt(iso, es) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ""))) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return (es ? DAY_ES : DAY_EN).format(new Date(Date.UTC(y, m - 1, d)));
}
export function saleDates(s, es) {
  const a = String(s.date_start || s.date_from || "").slice(0, 10), b = String(s.date_end || s.end_date || s.date_to || a).slice(0, 10);
  if (!fmt(a, es)) return s.dates || "";
  return a === b || !fmt(b, es) ? fmt(a, es) : fmt(a, es) + " – " + fmt(b, es);
}
export function checkedDate(s) { const m = String(s.date_verified || "").match(/(\d{4}-\d{2}-\d{2})/); return m ? m[1] : ""; }
function sourceName(s, es) {
  const src = String(s.source || (s.sources || [])[0] || "");
  if (/submit|user|neighbor/i.test(src)) return es ? "Enviada por un vecino" : "Sent in by a neighbor";
  return src + (s.source_group ? " · " + s.source_group : "");
}
function sourceUrl(s) { const u = (s.source_urls && s.source_urls[0]) || s.url || ""; return /^https:\/\//.test(u) ? u : ""; }
function directions(s) {
  const lat = Number(s.lat), lon = Number(s.lon != null ? s.lon : s.lng);
  const dest = s.address ? encodeURIComponent(s.address) : lat + "," + lon;
  return "https://www.google.com/maps/dir/?api=1&destination=" + dest;
}
function titleCase(t) { return /[a-z]/.test(t) ? t : t.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()); }

export function buildSalePages({ root, origin, BASE, sales, ended, today, esc, eventLd, CSS, write }) {
  const indexable = [];
  let built = 0;
  const all = sales.map((s) => [s, false]).concat(ended.map((s) => [s, true]));
  for (const [s, isEnded] of all) {
    for (const es of [false, true]) {
      const path = (es ? "/es" : "") + "/sales/" + s._slug + "/";
      const altEn = origin + "/sales/" + s._slug + "/", altEs = origin + "/es/sales/" + s._slug + "/";
      const name = titleCase(String(s.title || (es ? "Venta de garage" : "Garage sale")));
      const street = String(s.address || "").split(",")[0];
      const when = saleDates(s, es);
      const title = name + (street ? " · " + titleCase(street) : "") + (when ? " · " + when : "") + " · Chicas Map";
      const desc = (es
        ? "Venta en San Antonio: " + name + (when ? ", " + when : "") + (s.hours ? ", " + s.hours : "") + (s.address ? ". " + s.address : "") + ". Indicaciones y fuente en Chicas Map."
        : "San Antonio sale: " + name + (when ? ", " + when : "") + (s.hours ? ", " + s.hours : "") + (s.address ? ". " + s.address : "") + ". Directions and source on Chicas Map.").slice(0, 300);
      const ev = eventLd(s);
      const ld = ev ? Object.assign({ "@context": "https://schema.org" }, ev, { url: origin + path, description: String(s.details || desc).slice(0, 500),
        organizer: { "@type": "Organization", name: s.seller || s.poster || "Local seller" } }) : null;
      if (ld && isEnded) ld.eventStatus = "https://schema.org/EventScheduled";
      const chk = checkedDate(s), src = sourceName(s, es), srcUrl = sourceUrl(s);
      const L = es ? {
        crumbs: "Vecindarios", ended: "Esta venta ya terminó. La dejamos aquí para que el enlace no se rompa. Busca ventas nuevas en el mapa. 🐾",
        when: "Fechas", hours: "Horario", where: "Dirección", details: "Detalles", source: "Fuente", checked: "Revisada por Chica", dirs: "Cómo llegar (Google Maps)",
        map: "Ver en el mapa", list: "Publica tu venta gratis", seeSource: "Ver publicación original",
        verified: "“Verificada” significa que Chica encontró esta venta en una fuente pública o la envió un vecino, con fechas claras. No es garantía: <b>los horarios pueden cambiar, revisa la fuente antes de manejar.</b>",
        wrong: "¿Algo está mal? Avísanos", hi: "¡Hola, vecino! Chica aquí. 🐾"
      } : {
        crumbs: "Neighborhoods", ended: "This sale has ended. I'm keeping the page so the link still works. Find fresh sales on the map. 🐾",
        when: "Dates", hours: "Hours", where: "Address", details: "Details", source: "Source", checked: "Checked by Chica", dirs: "Get directions (Google Maps)",
        map: "See it on the map", list: "List your sale free", seeSource: "See the original post",
        verified: "“Verified” means Chica found this sale in a public source or a neighbor sent it in, with clear dates. It's not a guarantee: <b>hours can change, so check the source before you drive.</b>",
        wrong: "Something wrong? Tell us", hi: "Hi neighbor! Chica here. 🐾"
      };
      const rows = [
        when ? "<dt>" + L.when + "</dt><dd>" + esc(when) + "</dd>" : "",
        s.hours ? "<dt>" + L.hours + "</dt><dd>" + esc(s.hours) + " (CT)</dd>" : "",
        s.address ? "<dt>" + L.where + "</dt><dd>" + esc(s.address) + "</dd>" : "",
        src ? "<dt>" + L.source + "</dt><dd>" + esc(src) + (srcUrl ? ' · <a href="' + esc(srcUrl) + '" rel="nofollow noopener" target="_blank">' + L.seeSource + "</a>" : "") + "</dd>" : "",
        chk ? "<dt>" + L.checked + "</dt><dd>" + esc(fmt(chk, es)) + "</dd>" : ""
      ].join("");
      const indexOk = !isEnded;
      const page = '<!doctype html><html lang="' + (es ? "es" : "en") + '"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>' +
        "<title>" + esc(title) + "</title>" +
        '<meta name="description" content="' + esc(desc) + '"/>' +
        '<meta name="robots" content="' + (indexOk ? "index,follow,max-image-preview:large" : "noindex,follow") + '"/>' +
        '<link rel="canonical" href="' + origin + path + '"/>' +
        '<link rel="alternate" hreflang="en" href="' + altEn + '"/><link rel="alternate" hreflang="es" href="' + altEs + '"/><link rel="alternate" hreflang="x-default" href="' + altEn + '"/>' +
        '<meta property="og:type" content="website"/><meta property="og:site_name" content="Chicas Map"/><meta property="og:locale" content="' + (es ? "es_US" : "en_US") + '"/>' +
        '<meta property="og:title" content="' + esc(title) + '"/><meta property="og:description" content="' + esc(desc) + '"/>' +
        '<meta property="og:url" content="' + origin + path + '"/><meta property="og:image" content="' + origin + '/og.jpg"/>' +
        '<meta name="twitter:card" content="summary_large_image"/><meta name="twitter:title" content="' + esc(title) + '"/>' +
        '<meta name="twitter:description" content="' + esc(desc) + '"/><meta name="twitter:image" content="' + origin + '/og.jpg"/>' +
        '<link rel="icon" href="' + BASE + '/favicon.svg"/>' +
        (ld ? '<script type="application/ld+json">' + JSON.stringify(ld).replace(/</g, "\\u003c") + "</script>" : "") +
        "<style>" + CSS + "dl{display:grid;grid-template-columns:max-content 1fr;gap:6px 14px;margin:18px 0}dt{font-weight:700}dd{margin:0}.note{font-size:14px;color:#5b5249;background:#fff;border-left:4px solid #c513af;padding:10px 14px;border-radius:8px}.ended{background:#fff3cd;padding:10px 14px;border-radius:8px}.lang{float:right;font-size:14px}</style></head><body>" +
        "<main>" + '<nav class="crumbs"><a href="' + BASE + (es ? "/es/" : "/") + '">Chicas Map</a> › <a href="' + BASE + '/garage-sales/">' + L.crumbs + "</a>" +
        '<span class="lang"><a href="' + BASE + "/sales/" + s._slug + '/" lang="en">EN</a> · <a href="' + BASE + "/es/sales/" + s._slug + '/" lang="es">ES</a></span></nav>' +
        "<h1>" + esc(name) + "</h1>" +
        (isEnded ? '<p class="ended">' + L.ended + "</p>" : '<p class="lede">' + L.hi + "</p>") +
        "<dl>" + rows + "</dl>" +
        (s.details ? "<h2>" + L.details + "</h2><p>" + esc(s.details) + "</p>" : "") +
        (isEnded ? "" : '<a class="cta" href="' + esc(directions(s)) + '" target="_blank" rel="noopener" data-goatcounter-click="evt-sale-directions">' + L.dirs + "</a>") +
        '<a class="cta alt" href="' + BASE + "/map/?sale=" + encodeURIComponent(s._id) + '">' + L.map + "</a>" +
        '<p class="note">' + L.verified + "</p>" +
        '<p><a href="' + BASE + (es ? "/es" : "") + '/bulletin/">' + L.wrong + "</a> · " + '<a href="' + BASE + (es ? "/es" : "") + '/submit/">' + L.list + "</a></p>" +
        "</main>" + '<script src="' + BASE + '/js/chica-menu.js?v=8" defer></script>' + SOCIALS + GOATCOUNTER + "</body></html>";
      write(path, page);
      built++;
      if (indexOk) indexable.push(path);
    }
  }
  return { built, indexable };
}
