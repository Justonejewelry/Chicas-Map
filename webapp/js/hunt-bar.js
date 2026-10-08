/* Search + Near Me + filters. Operates on window.__chicaSales, not painted markers. */
(function () {
  var p = location.pathname || "";
  if (!(/\/map\/?$/.test(p) || p.indexOf("/map/") !== -1 || /map\.html$/.test(p))) return;
  var SA = { lat: 29.4241, lon: -98.4936 };
  var state = { q: "", day: "", type: "", miles: 0 };
  var COPY = {
    en: {
      search: "Search sales, streets, zip",
      near: "Near me",
      nearAria: "Find sales near me",
      filters: "Sale filters",
      today: "Today",
      sat: "Saturday",
      sun: "Sunday",
      garage: "Garage",
      yard: "Yard",
      estate: "Estate",
      empty: "No sales match. Clear a filter or expand the distance.",
      sale: " sale",
      sales: " sales"
    },
    es: {
      search: "Busca ventas, calles o código",
      near: "Cerca",
      nearAria: "Ventas cerca de mí",
      filters: "Filtros de ventas",
      today: "Hoy",
      sat: "Sábado",
      sun: "Domingo",
      garage: "Garaje",
      yard: "Patio",
      estate: "Bienes",
      empty: "Ninguna venta coincide. Quita un filtro o amplía la distancia.",
      sale: " venta",
      sales: " ventas"
    }
  };

  function locale() {
    var lang = "";
    try { lang = localStorage.getItem("chicas-map-locale") || ""; } catch (e) {}
    if (!lang) lang = document.documentElement.lang || "en";
    return String(lang).toLowerCase().indexOf("es") === 0 ? "es" : "en";
  }

  function t(key) {
    var pack = COPY[locale()] || COPY.en;
    return pack[key] || COPY.en[key] || key;
  }

  function findMap() {
    if (typeof window.__chicaFindMap === "function") {
      var live = window.__chicaFindMap();
      if (live) return live;
    }
    if (window.__chicaLeaflet && window.__chicaLeaflet.flyTo) return window.__chicaLeaflet;
    return null;
  }

  function ymd(d) {
    var m = d.getMonth() + 1;
    var day = d.getDate();
    return d.getFullYear() + "-" + (m < 10 ? "0" : "") + m + "-" + (day < 10 ? "0" : "") + day;
  }
  function weekday(name) {
    var want = name === "sat" ? 6 : name === "sun" ? 0 : -1;
    var now = new Date();
    if (want < 0) return ymd(now);
    var add = (want - now.getDay() + 7) % 7;
    var tDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + add);
    return ymd(tDate);
  }

  function apply() {
    var rows = [];
    if (typeof window.__chicaApplyFilter === "function") rows = window.__chicaApplyFilter(state) || [];
    else if (typeof window.__chicaVisibleSales === "function") rows = window.__chicaVisibleSales(state) || [];
    var map = findMap();
    if (map && rows.length === 1) {
      try { map.flyTo([rows[0].lat, rows[0].lon], Math.max(map.getZoom(), 15), { duration: 0.6 }); } catch (e) {}
    } else if (map && rows.length > 1 && state.q && window.L) {
      try { map.fitBounds(window.L.latLngBounds(rows.map(function (s) { return [s.lat, s.lon]; })).pad(0.25)); } catch (e) {}
    }
    return rows.length;
  }

  function milesLabel(s) {
    if (typeof window.__chicaMiles !== "function") return "";
    var n = window.__chicaMiles(s.lat, s.lon);
    if (n == null) return "";
    return (n < 10 ? n.toFixed(1) : String(Math.round(n))) + " mi";
  }

  function renderSheet(rows) {
    var sheet = document.getElementById("chica-sale-sheet");
    if (!sheet) return;
    var list = sheet.querySelector("#chica-sale-list");
    var count = sheet.querySelector("#chica-sale-count");
    if (count) count.textContent = rows.length + (rows.length === 1 ? t("sale") : t("sales"));
    if (!list) return;
    if (!rows.length) {
      list.innerHTML = '<p class="empty">' + escapeHtml(t("empty")) + "</p>";
      return;
    }
    var html = "";
    var cap = Math.min(rows.length, 40);
    for (var i = 0; i < cap; i++) {
      var s = rows[i];
      var mi = milesLabel(s);
      html += '<button type="button" data-id="' + String(s.id).replace(/"/g, "") + '">' +
        '<strong>' + escapeHtml(s.title) + '</strong>' +
        '<span>' + escapeHtml(s.type || "sale") + (mi ? " · " + mi : "") + '</span>' +
        '<em>' + escapeHtml(s.address || "") + '</em></button>';
    }
    list.innerHTML = html;
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      if (c === "&") return "&" + "amp;";
      if (c === "<") return "&" + "lt;";
      if (c === ">") return "&" + "gt;";
      return "&" + "quot;";
    });
  }

  function paintLabels() {
    var q = document.getElementById("chica-hunt-q");
    if (q) {
      q.placeholder = t("search");
      q.setAttribute("aria-label", t("search"));
    }
    var lab = document.querySelector("label[for='chica-hunt-q']");
    if (lab) lab.textContent = t("search");
    var near = document.getElementById("chica-near-btn");
    if (near && near.textContent !== "\u2026") {
      near.textContent = t("near");
      near.setAttribute("aria-label", t("nearAria"));
    }
    var filters = document.getElementById("chica-filters");
    if (!filters) return;
    filters.setAttribute("aria-label", t("filters"));
    filters.querySelectorAll("[data-day]").forEach(function (btn) {
      var key = btn.getAttribute("data-day");
      if (key && COPY.en[key]) btn.textContent = t(key);
    });
    filters.querySelectorAll("[data-type]").forEach(function (btn) {
      var key = btn.getAttribute("data-type");
      if (key && COPY.en[key]) btn.textContent = t(key);
    });
  }

  function nearMe() {
    var map = findMap();
    if (!map) return;
    if (!navigator.geolocation) {
      try { map.flyTo([SA.lat, SA.lon], 12, { duration: 0.9 }); } catch (e) { map.setView([SA.lat, SA.lon], 12); }
      return;
    }
    var btn = document.getElementById("chica-near-btn");
    if (btn) btn.textContent = "\u2026";
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        window.__chicaHere = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        try { map.flyTo([pos.coords.latitude, pos.coords.longitude], 14, { duration: 1 }); } catch (e) { map.setView([pos.coords.latitude, pos.coords.longitude], 14); }
        if (btn) btn.textContent = t("near");
        apply();
      },
      function () {
        try { map.flyTo([SA.lat, SA.lon], 12, { duration: 0.9 }); } catch (e) { map.setView([SA.lat, SA.lon], 12); }
        if (btn) btn.textContent = t("near");
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  }

  function mount() {
    var oldSheet = document.getElementById("chica-sale-sheet");
    if (oldSheet && oldSheet.parentNode) oldSheet.parentNode.removeChild(oldSheet);
    ["chica-guide", "chica-guide-btn"].forEach(function (id) { var n = document.getElementById(id); if (n && n.parentNode) n.parentNode.removeChild(n); });
    if (document.getElementById("chica-hunt-dock")) return;
    if (!document.getElementById("chica-hunt-css")) {
      var s = document.createElement("style");
      s.id = "chica-hunt-css";
      s.textContent =
        "#chica-hunt-dock{position:fixed!important;top:max(10px,env(safe-area-inset-top))!important;left:62px!important;right:10px!important;width:auto!important;z-index:2147483000!important;display:flex!important;flex-direction:column!important;gap:8px;pointer-events:none!important;box-sizing:border-box}" +
        "#chica-hunt-bar{position:relative!important;top:auto!important;left:auto!important;right:auto!important;width:auto!important;z-index:2!important;display:flex!important;flex-wrap:nowrap!important;gap:8px;align-items:center;pointer-events:auto!important;box-sizing:border-box}" +
        "#chica-hunt-bar input{flex:1 1 auto;width:1px;min-width:0;height:44px;border:1px solid #3a342e;border-radius:12px;background:#1a1714;color:#f3eee4;padding:0 12px;font:600 14px/1 Inter,system-ui,sans-serif}" +
        "#chica-hunt-bar button{flex:0 0 auto;height:44px;border:0;border-radius:12px;background:#c513af;color:#fff;font:800 12px/1 Inter,system-ui,sans-serif;padding:0 12px;white-space:nowrap;cursor:pointer}" +
        "#chica-filters{position:relative!important;top:auto!important;left:auto!important;right:auto!important;z-index:1!important;display:flex;gap:6px;overflow:auto;margin-left:-52px;width:calc(100% + 52px);padding:0 0 2px;pointer-events:auto;scrollbar-width:none}" +
        "#chica-filters button{height:36px;border:1px solid #3a342e;border-radius:999px;background:#1a1714;color:#f3eee4;font:700 12px/1 Inter,system-ui,sans-serif;padding:0 12px;white-space:nowrap}" +
        "#chica-filters button.on{background:#c513af;border-color:#c513af;color:#fff}" +
        "#chica-sale-sheet{position:fixed;left:10px;bottom:10px;z-index:2147481000;width:min(360px,calc(100vw - 20px));max-height:38dvh;overflow:auto;background:#1a1714f2;color:#f3eee4;border:1px solid #3a342e;border-radius:14px;padding:10px;pointer-events:auto}" +
        "#chica-sale-sheet h2{margin:0 0 6px;font:800 13px/1.2 Inter,system-ui,sans-serif}" +
        "#chica-sale-list button{display:block;width:100%;text-align:left;background:#121212;color:#f3eee4;border:1px solid #3a342e;border-radius:10px;padding:8px 10px;margin:0 0 6px}" +
        "#chica-sale-list strong{display:block;font:800 13px/1.25 Inter,system-ui,sans-serif}" +
        "#chica-sale-list span,#chica-sale-list em{display:block;font:600 11px/1.3 Inter,system-ui,sans-serif;color:#b8b0a4;font-style:normal}" +
        "#chica-sale-list .empty{margin:0;font:600 13px/1.35 Inter,system-ui,sans-serif}" +
        "#chica-force-key[data-collapsed=true]{max-height:44px!important;overflow:hidden!important;width:auto!important;min-width:88px}" +
        "#chica-force-key[data-collapsed=true] ul{display:none!important}" +
        ".chica-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}";
      (document.head || document.documentElement).appendChild(s);
    }
    var dock = document.createElement("div");
    dock.id = "chica-hunt-dock";
    var bar = document.createElement("div");
    bar.id = "chica-hunt-bar";
    bar.innerHTML = '<label class="chica-sr" for="chica-hunt-q">Search sales, streets, or zip</label><input id="chica-hunt-q" type="search" placeholder="Search sales, streets, zip" enterkeyhint="search" autocomplete="off" aria-label="Search sales, streets, or zip" /><button type="button" id="chica-near-btn" aria-label="Find sales near me">Near me</button>';
    var filters = document.createElement("div");
    filters.id = "chica-filters";
    filters.setAttribute("role", "toolbar");
    filters.setAttribute("aria-label", "Sale filters");
    filters.innerHTML =
      '<button type="button" data-day="today">Today</button>' +
      '<button type="button" data-day="sat">Saturday</button>' +
      '<button type="button" data-day="sun">Sunday</button>' +
      '<button type="button" data-type="garage">Garage</button>' +
      '<button type="button" data-type="yard">Yard</button>' +
      '<button type="button" data-type="estate">Estate</button>' +
      '<button type="button" data-miles="5">5 mi</button>' +
      '<button type="button" data-miles="10">10 mi</button>' +
      '<button type="button" data-miles="20">20 mi</button>';
    dock.appendChild(bar);
    dock.appendChild(filters);
    document.documentElement.appendChild(dock);
    var q = bar.querySelector("#chica-hunt-q");
    var timer = null;
    q.addEventListener("input", function () {
      clearTimeout(timer);
      state.q = q.value.trim();
      timer = setTimeout(apply, 160);
    });
    bar.querySelector("#chica-near-btn").addEventListener("click", function (ev) {
      ev.preventDefault();
      try { if (window.__chicaTrack) window.__chicaTrack("near_me"); } catch (e) {}
      nearMe();
    });
    filters.addEventListener("click", function (ev) {
      var btn = ev.target.closest("button");
      if (!btn) return;
      if (btn.dataset.day) {
        var next = btn.classList.contains("on") ? "" : btn.dataset.day;
        filters.querySelectorAll("[data-day]").forEach(function (b) { b.classList.remove("on"); });
        state.day = next ? weekday(next) : "";
        if (next) btn.classList.add("on");
      }
      if (btn.dataset.type) {
        var typ = btn.classList.contains("on") ? "" : btn.dataset.type;
        filters.querySelectorAll("[data-type]").forEach(function (b) { b.classList.remove("on"); });
        state.type = typ;
        if (typ) btn.classList.add("on");
      }
      if (btn.dataset.miles) {
        var mi = btn.classList.contains("on") ? 0 : Number(btn.dataset.miles);
        filters.querySelectorAll("[data-miles]").forEach(function (b) { b.classList.remove("on"); });
        state.miles = mi;
        if (mi) btn.classList.add("on");
        if (mi && !window.__chicaHere) nearMe();
      }
      apply();
    });
    window.addEventListener("chica-sales", apply);
    apply();
    paintLabels();
  }

  function tick() {
    mount();
    paintLabels();
  }
  tick();
  setInterval(tick, 1200);
  window.addEventListener("chica-locale", paintLabels);
  window.addEventListener("storage", function (ev) {
    if (!ev || ev.key === "chicas-map-locale") paintLabels();
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", tick);
})();
