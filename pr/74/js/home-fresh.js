/* Home verified sales: scrolling clickable banner with pause control, source + checked date, and an hours disclaimer. */
(function () {
  function isHome() {
    if (document.documentElement.hasAttribute("data-home-static")) return true;
    var p = (location.pathname || "/").replace(/\/+$/, "") || "/";
    return p === "/" || p === "/index.html" || p === "/Chicas-Map" || p === "/Chicas-Map/preview/74/index.html";
  }

  function dataUrl() {
    return location.pathname.indexOf("/Chicas-Map") === 0
      ? "/Chicas-Map/preview/74/data/sales-clean.json"
      : "/data/sales-clean.json";
  }

  function mapHref(sale) {
    var base = dataUrl().replace("/data/sales-clean.json", "/map/");
    var id = sale && (sale.id || sale.external_id);
    if (id) return base + "?sale=" + encodeURIComponent(String(id));
    if (sale && isFinite(Number(sale.lat)) && isFinite(Number(sale.lon))) {
      return base + "?lat=" + Number(sale.lat) + "&lon=" + Number(sale.lon);
    }
    return base;
  }

  function slug(id) { return String(id).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "sale"; }
  function saleHref(sale) {
    var id = sale && (sale.external_id || sale.id);
    if (!id) return mapHref(sale);
    return dataUrl().replace("/data/sales-clean.json", (es() ? "/es" : "") + "/sales/" + slug(id) + "/");
  }
  // "facebook-live-2026-11-05" -> "2026-11-05". Only real dates from the feed; nothing invented.
  function checkedDate(sale) {
    var m = String(sale.date_verified || "").match(/(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : "";
  }
  function shortDate(iso) {
    var p = String(iso || "").split("-").map(Number); if (p.length !== 3 || !p[0]) return "";
    try { return new Intl.DateTimeFormat(es() ? "es-US" : "en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(p[0], p[1] - 1, p[2]))); } catch (e) { return iso; }
  }
  function sourceLabel(sale) {
    var s = String(sale.source || (sale.sources || [])[0] || "");
    if (/submit|user|neighbor/i.test(s)) return es() ? "Enviada por un vecino" : "Sent in by a neighbor";
    return s;
  }

  function es() {
    return String(document.documentElement.lang || "").toLowerCase().indexOf("es") === 0;
  }

  function chicagoToday() {
    try {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Chicago",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).format(new Date());
    } catch (e) {
      var d = new Date();
      return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    }
  }

  function addDays(iso, n) {
    var p = iso.split("-").map(Number);
    var dt = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
    dt.setUTCDate(dt.getUTCDate() + n);
    return dt.toISOString().slice(0, 10);
  }

  function weekendBounds() {
    var today = chicagoToday();
    var wd = "Fri";
    try {
      wd = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", weekday: "short" }).format(new Date());
    } catch (e) {
      wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date().getDay()];
    }
    var day = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[wd];
    if (day == null) day = 5;
    var sat = addDays(today, day === 0 ? -1 : 6 - day);
    return { today: today, sat: sat, sun: addDays(sat, 1) };
  }

  function overlaps(s, sat, sun) {
    var ds = String(s.date_start || s.date_from || "");
    var de = String(s.date_end || s.date_to || "");
    return !!ds && !!de && ds <= sun && de >= sat;
  }

  function css() {
    if (document.getElementById("chica-fresh-banner-css")) return;
    var s = document.createElement("style");
    s.id = "chica-fresh-banner-css";
    s.textContent =
      "#chica-fresh-weekend{margin:22px 0 28px;padding:0;max-width:100%}" +
      "#chica-fresh-weekend .hd{display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding:0 4px 10px}" +
      "#chica-fresh-weekend .hd h2{margin:0;font:650 18px/1.1 Syne,system-ui,sans-serif;letter-spacing:-.02em}" +
      "#chica-fresh-weekend .hd p{margin:0;color:#a1a1aa;font:500 13px/1 Inter,system-ui,sans-serif;white-space:nowrap}" +
      "#chica-fresh-weekend .rail{overflow:hidden;border:1px solid rgba(255,255,255,.12);border-radius:14px;background:rgba(255,255,255,.03);-webkit-mask-image:linear-gradient(90deg,transparent,#000 28px,#000 calc(100% - 28px),transparent);mask-image:linear-gradient(90deg,transparent,#000 28px,#000 calc(100% - 28px),transparent)}" +
      "#chica-fresh-weekend .track{display:flex;width:max-content;gap:14px;padding:14px;animation:chica-fresh-scroll 42s linear infinite;will-change:transform}" +
      "#chica-fresh-weekend .rail:hover .track,#chica-fresh-weekend .rail:focus-within .track{animation-play-state:paused}" +
      "#chica-fresh-weekend a.chip{flex:0 0 auto!important;display:flex!important;flex-direction:column!important;align-items:stretch!important;justify-content:center!important;gap:6px!important;min-width:260px!important;width:260px!important;max-width:260px!important;min-height:92px!important;height:auto!important;padding:14px 16px!important;border-radius:12px!important;border:1px solid rgba(197,19,175,.35)!important;background:linear-gradient(180deg,rgba(197,19,175,.16),rgba(255,255,255,.03))!important;color:inherit!important;text-decoration:none!important;box-sizing:border-box!important;box-shadow:none!important;font:inherit!important;letter-spacing:normal!important;white-space:normal!important}" +
      "#chica-fresh-weekend a.chip:hover,#chica-fresh-weekend a.chip:focus-visible{border-color:#c513af;outline:2px solid #fffdf8;outline-offset:2px}" +
      "#chica-fresh-weekend a.chip .tag{display:block!important;margin:0 0 4px!important;font:700 10px/1.2 Inter,system-ui,sans-serif!important;letter-spacing:.08em!important;text-transform:uppercase!important;color:#e879d6!important;white-space:nowrap!important}" +
      "#chica-fresh-weekend a.chip .t{display:block!important;margin:0!important;font:650 14px/1.35 Inter,system-ui,sans-serif!important;letter-spacing:normal!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;color:inherit!important}" +
      "#chica-fresh-weekend a.chip .m{display:block!important;margin:2px 0 0!important;font:500 12px/1.4 Inter,system-ui,sans-serif!important;letter-spacing:normal!important;color:#a1a1aa!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}" +
      "#chica-fresh-weekend .why{margin:0 4px 10px;font:500 13px/1.45 Inter,system-ui,sans-serif;color:#a1a1aa}" +
      "#chica-fresh-weekend .pause{min-height:36px;min-width:44px;padding:0 12px;border-radius:999px;border:1px solid rgba(197,19,175,.5);background:transparent;color:inherit;font:600 13px/1 Inter,system-ui,sans-serif;cursor:pointer}" +
      "#chica-fresh-weekend.paused .track{animation-play-state:paused}" +
      "#chica-fresh-weekend.paused .rail{overflow-x:auto}" +
      "#chica-fresh-weekend a.chip .src{font-size:11px!important}" +
      "@keyframes chica-fresh-scroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}" +
      "@media (prefers-reduced-motion:reduce){#chica-fresh-weekend .track{animation:none;overflow-x:auto;max-width:100%;width:100%}}" +
      "/* Hide bundled Latest posted sales list */" +
      "main section:has(h2){}" ;
    document.head.appendChild(s);
  }

  function chip(sale) {
    var a = document.createElement("a");
    a.className = "chip";
    a.href = saleHref(sale);
    var kind = String(sale.type || sale.kind || "garage");
    var tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = es()
      ? (kind === "estate" ? "Estate" : kind === "permit" ? "Permiso" : "Garage")
      : (kind === "estate" ? "Estate" : kind === "permit" ? "Permit" : "Garage");
    a.appendChild(tag);
    var title = document.createElement("span");
    title.className = "t";
    title.textContent = sale.title || (es() ? "Venta" : "Sale");
    a.appendChild(title);
    var meta = document.createElement("span");
    meta.className = "m";
    var street = (sale.address || "").split(",")[0];
    var range = sale.date_start && sale.date_end && sale.date_start !== sale.date_end
      ? shortDate(sale.date_start) + "–" + shortDate(sale.date_end) : shortDate(sale.date_start);
    meta.textContent = [range, sale.hours, street].filter(Boolean).join(" · ");
    a.appendChild(meta);
    var src = document.createElement("span");
    src.className = "m src";
    var chk = checkedDate(sale), lab = sourceLabel(sale);
    src.textContent = [lab ? (es() ? "Fuente: " : "Source: ") + lab : "", chk ? (es() ? "revisada " : "checked ") + shortDate(chk) : ""].filter(Boolean).join(" · ");
    if (src.textContent) a.appendChild(src);
    return a;
  }

  function buildSection(sales, total) {
    css();
    var section = document.createElement("section");
    section.id = "chica-fresh-weekend";
    section.setAttribute("data-chica-keep", "1");
    section.setAttribute("aria-label", es() ? "Ventas verificadas" : "Verified sales");

    var hd = document.createElement("div");
    hd.className = "hd";
    var h2 = document.createElement("h2");
    h2.textContent = es() ? "Ventas verificadas" : "Verified sales";
    hd.appendChild(h2);
    var count = document.createElement("p");
    count.textContent = es()
      ? total + " este fin · toca una"
      : total + " this weekend · tap one";
    hd.appendChild(count);
    section.appendChild(hd);

    var why = document.createElement("p");
    why.className = "why";
    why.innerHTML = es()
      ? "<b>¿Qué significa “verificada”?</b> Encontré la venta en una fuente pública (grupos y eventos de Facebook, correos de GarageSaleFinder/EstateSales.org, otros sitios de ventas o un vecino que la envió) y confirmé que publica fechas claras. No es garantía: los horarios pueden cambiar, revisa la fuente antes de manejar. 🐾"
      : "<b>What does “verified” mean?</b> I found the sale in a public source (Facebook groups and events, GarageSaleFinder/EstateSales.org emails, other sale sites, or a neighbor who sent it in) and confirmed it lists clear dates. It’s not a guarantee: hours can change, so check the source before you drive. 🐾";
    section.appendChild(why);

    var rail = document.createElement("div");
    rail.className = "rail";
    rail.setAttribute("role", "region");
    rail.setAttribute("aria-roledescription", "carousel");
    var track = document.createElement("div");
    track.className = "track";

    var items = sales.slice(0, 24);
    if (!items.length) {
      var empty = document.createElement("p");
      empty.style.cssText = "margin:0;padding:16px;color:#a1a1aa;font:500 14px/1.3 Inter,system-ui,sans-serif";
      empty.textContent = es() ? "Sin ventas verificadas este fin todavía." : "No verified sales for this weekend yet.";
      rail.appendChild(empty);
      section.appendChild(rail);
      return section;
    }

    // Two copies for a seamless loop
    function fill() {
      items.forEach(function (s) { track.appendChild(chip(s)); });
    }
    fill();
    fill();
    rail.appendChild(track);
    var pause = document.createElement("button");
    pause.type = "button";
    pause.className = "pause";
    pause.setAttribute("aria-pressed", "false");
    function label(paused) { pause.textContent = paused ? (es() ? "▶ Reanudar" : "▶ Play") : (es() ? "⏸ Pausar" : "⏸ Pause"); }
    label(false);
    pause.onclick = function () {
      var paused = pause.getAttribute("aria-pressed") !== "true";
      pause.setAttribute("aria-pressed", String(paused));
      section.classList.toggle("paused", paused);
      label(paused);
    };
    hd.appendChild(pause);
    section.appendChild(rail);

    // Scale animation duration with item count
    var secs = Math.max(28, Math.min(70, items.length * 3.2));
    track.style.animationDuration = secs + "s";
    return section;
  }

  function patchHero(n) {
    var root = document.querySelector("main");
    if (!root) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var node;
    while ((node = walker.nextNode())) {
      var parent = node.parentElement;
      if (parent && parent.closest && parent.closest("#chica-fresh-weekend")) continue;
      var v = node.nodeValue || "";
      if (!v || v.length > 500) continue;
      var next = v
        .replace(/I found \d+ verified sales/, "I found " + n + " verified sales")
        .replace(/Encontré \d+ ventas verificadas/, "Encontré " + n + " ventas verificadas");
      if (next !== v) node.nodeValue = next;
    }
  }

  function hideLists(main) {
    Array.from(main.querySelectorAll("h2, p, div")).forEach(function (el) {
      if (el.closest && el.closest("#chica-fresh-weekend, #chica-home-mini-map")) return;
      var t = (el.innerText || "").toLowerCase();
      if (!t || t.length > 180) return;
      var stale =
        t.indexOf("where the pack is active") !== -1 ||
        t.indexOf("three i’d start") !== -1 ||
        t.indexOf("three i'd start") !== -1 ||
        t.indexOf("tres con las que") !== -1 ||
        t.indexOf("latest posted sales") !== -1 ||
        t.indexOf("últimas ventas") !== -1 ||
        t.indexOf("ultimas ventas") !== -1 ||
        t === "this weekend" ||
        t === "este fin de semana" ||
        (t.indexOf("all ") !== -1 && t.indexOf("this weekend") !== -1) ||
        (t.indexOf("las ") !== -1 && t.indexOf("este fin") !== -1);
      if (!stale) return;
      var sec = el.closest("section") || el.parentElement;
      if (sec && sec !== main && !(sec.closest && sec.closest("#chica-fresh-weekend"))) sec.style.display = "none";
    });
    // Hide sale list cards that are only "Browse all sales" sections
    Array.from(main.querySelectorAll("section")).forEach(function (sec) {
      if (sec.id === "chica-fresh-weekend" || (sec.closest && sec.closest("#chica-fresh-weekend"))) return;
      var h = sec.querySelector("h2");
      if (!h) return;
      var ht = (h.innerText || "").toLowerCase();
      if (ht.indexOf("latest posted sales") !== -1 || ht.indexOf("this weekend") !== -1 || ht.indexOf("este fin") !== -1) {
        sec.style.display = "none";
      }
    });
  }

  var cached = null;

  function paint() {
    if (!isHome() || !cached) return;
    var main = document.querySelector("main");
    if (!main) return;
    if (!document.documentElement.hasAttribute("data-home-static")) {
      patchHero(cached.total);
      hideLists(main);
    }
    if (document.getElementById("chica-fresh-weekend")) return;
    var section = buildSection(cached.sales, cached.total);
    var slot = document.getElementById("chica-fresh-slot");
    if (slot) { slot.appendChild(section); return; }
    var mini = document.getElementById("chica-home-mini-map");
    if (mini && mini.parentNode) mini.parentNode.insertBefore(section, mini.nextSibling);
    else {
      var keep = main.querySelector("a[data-chica-keep='1']");
      if (keep && keep.parentNode) keep.parentNode.insertBefore(section, keep.nextSibling);
      else main.appendChild(section);
    }
  }

  function normalize(list) {
    return (list || []).filter(function (s) {
      return (s.confidence == null || s.confidence >= 0.7);
    });
  }

  function run() {
    if (!isHome()) return;
    var bounds = weekendBounds();
    fetch(dataUrl() + "?v=" + Date.now(), { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error("sale feed"); return r.json();
    }).then(function (main) {
      var pool = normalize(main.public || []);
      var weekend = pool.filter(function (s) { return overlaps(s, bounds.sat, bounds.sun); });
      // Canonical data already deduplicates sources without collapsing units/homes.
      weekend.sort(function (a, b) { return (b.confidence || 0) - (a.confidence || 0); });
      cached = { sales: weekend, total: weekend.length };
      paint();
    }).catch(function () {});
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
  setTimeout(run, 400);
  var ticks = 0;
  var timer = setInterval(function () {
    ticks += 1;
    paint();
    if (ticks > 40) clearInterval(timer);
  }, 500);
})();
