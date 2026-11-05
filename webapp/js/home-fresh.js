/* Home verified sales: scrolling clickable banner (no list). */
(function () {
  function isHome() {
    var p = (location.pathname || "/").replace(/\/+$/, "") || "/";
    return p === "/" || p === "/index.html" || p === "/Chicas-Map" || p === "/Chicas-Map/index.html";
  }

  function dataUrl() {
    return location.pathname.indexOf("/Chicas-Map") === 0
      ? "/Chicas-Map/data/cities/san-antonio.json"
      : "/data/cities/san-antonio.json";
  }

  function userUrl() {
    return dataUrl().replace("san-antonio.json", "san-antonio-user.json");
  }

  function mapHref(sale) {
    var base = dataUrl().replace("/data/cities/san-antonio.json", "/map/");
    var id = sale && (sale.id || sale.external_id);
    if (id) return base + "?sale=" + encodeURIComponent(String(id));
    if (sale && isFinite(Number(sale.lat)) && isFinite(Number(sale.lon))) {
      return base + "?lat=" + Number(sale.lat) + "&lon=" + Number(sale.lon);
    }
    return base;
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
      "#chica-fresh-weekend a.chip{flex:0 0 auto;display:flex;flex-direction:column;justify-content:center;gap:6px;min-width:240px;width:240px;max-width:240px;min-height:84px;padding:12px 14px;border-radius:12px;border:1px solid rgba(197,19,175,.35);background:linear-gradient(180deg,rgba(197,19,175,.16),rgba(255,255,255,.03));color:inherit;text-decoration:none;box-sizing:border-box}" +
      "#chica-fresh-weekend a.chip:hover,#chica-fresh-weekend a.chip:focus-visible{border-color:#c513af;outline:2px solid #fffdf8;outline-offset:2px}" +
      "#chica-fresh-weekend a.chip .tag{display:block;margin:0 0 2px;font:700 10px/1.2 Inter,system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#e879d6}" +
      "#chica-fresh-weekend a.chip .t{display:block;margin:0;font:650 14px/1.3 Inter,system-ui,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
      "#chica-fresh-weekend a.chip .m{display:block;margin:0;font:500 12px/1.35 Inter,system-ui,sans-serif;color:#a1a1aa;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
      "@keyframes chica-fresh-scroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}" +
      "@media (prefers-reduced-motion:reduce){#chica-fresh-weekend .track{animation:none;overflow-x:auto;max-width:100%;width:100%}}" +
      "/* Hide bundled Latest posted sales list */" +
      "main section:has(h2){}" ;
    document.head.appendChild(s);
  }

  function chip(sale) {
    var a = document.createElement("a");
    a.className = "chip";
    a.href = mapHref(sale);
    a.setAttribute("data-chica-keep", "1");
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
    meta.textContent = [street, sale.hours].filter(Boolean).join(" · ");
    a.appendChild(meta);
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
    patchHero(cached.total);
    hideLists(main);
    if (document.getElementById("chica-fresh-weekend")) return;
    var section = buildSection(cached.sales, cached.total);
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
    Promise.all([
      fetch(dataUrl(), { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
      fetch(userUrl() + "?v=" + Date.now(), { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
    ]).then(function (pair) {
      var main = pair[0] || {};
      var user = pair[1] || {};
      var pool = normalize(main.public).concat(normalize(user.public || user.sales || (Array.isArray(user) ? user : [])));
      var weekend = pool.filter(function (s) { return overlaps(s, bounds.sat, bounds.sun); });
      // de-dupe by title+street
      var seen = {};
      weekend = weekend.filter(function (s) {
        var k = String(s.title || "").toLowerCase() + "|" + String(s.address || "").split(",")[0].toLowerCase();
        if (seen[k]) return false;
        seen[k] = 1;
        return true;
      });
      weekend.sort(function (a, b) { return (b.confidence || 0) - (a.confidence || 0); });
      cached = { sales: weekend, total: weekend.length };
      paint();
    });
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
