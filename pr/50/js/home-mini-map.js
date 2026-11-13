/* Home: small live map preview. Click opens the full-screen map. */
(function () {
  var BASE = "/Chicas-Map";
  var MAP_HREF = BASE + "/map/";
  var DATA = BASE + "/data/sales-clean.json";
  var SA = [29.4241, -98.4936];
  // Core San Antonio metro — keeps New Braunfels / San Marcos from yanking the view out
  var SA_BOX = { south: 29.22, north: 29.68, west: -98.78, east: -98.22 };
  var mounted = false;

  function home() {
    if (document.documentElement.hasAttribute("data-home-static")) return true;
    var p = (location.pathname || "/").replace(/\/+$/, "") || "/";
    return p === "/" || p === "/index.html" || p === BASE || p === BASE + "/index.html";
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

  function inSaBox(lat, lon) {
    return lat >= SA_BOX.south && lat <= SA_BOX.north && lon >= SA_BOX.west && lon <= SA_BOX.east;
  }

  function overlapsWeekend(s, sat, sun) {
    var ds = String(s.date_start || s.date_from || "");
    var de = String(s.date_end || s.date_to || ds);
    if (!ds) return true; // undated pins still count as live feed
    return ds <= sun && de >= sat;
  }

  function ensureLeaflet(done) {
    if (window.L && window.L.map) {
      done();
      return;
    }
    if (!document.querySelector('link[data-chica-leaflet]')) {
      var c = document.createElement("link");
      c.rel = "stylesheet";
      c.href = "/Chicas-Map/preview/50/vendor/leaflet-1.9.4/leaflet.css";
      c.setAttribute("data-chica-leaflet", "1");
      document.head.appendChild(c);
    }
    if (!document.querySelector('script[data-chica-leaflet]')) {
      var s = document.createElement("script");
      s.src = "/Chicas-Map/preview/50/vendor/leaflet-1.9.4/leaflet.js";
      s.async = true;
      s.setAttribute("data-chica-leaflet", "1");
      s.onload = done;
      document.head.appendChild(s);
      return;
    }
    var tries = 0;
    var t = setInterval(function () {
      tries += 1;
      if (window.L && window.L.map) {
        clearInterval(t);
        done();
      } else if (tries > 40) clearInterval(t);
    }, 150);
  }

  function css() {
    // Static home.css reserves the final dimensions before the first paint.
    if (document.documentElement.hasAttribute("data-home-static")) return;
    if (document.getElementById("chica-home-mini-css")) return;
    var s = document.createElement("style");
    s.id = "chica-home-mini-css";
    s.textContent =
      "#chica-home-mini-map{display:block!important;margin:24px auto 32px!important;width:calc(100% - 32px)!important;max-width:560px!important;padding:0!important;text-decoration:none!important;color:inherit!important;background:transparent!important;border:0!important;box-shadow:none!important;border-radius:18px!important;min-height:0!important}" +
      "#chica-home-mini-map .frame{position:relative;overflow:hidden;border-radius:18px;border:1px solid rgba(255,255,255,.16);background:#1a1714;box-shadow:0 12px 28px rgba(0,0,0,.28);aspect-ratio:16/10;min-height:200px;max-height:280px}" +
      "#chica-home-mini-map .map{position:absolute;inset:0;z-index:0}" +
      "#chica-home-mini-map .veil{position:absolute;inset:0;z-index:2;background:linear-gradient(180deg,rgba(18,18,18,.08),rgba(18,18,18,.55));pointer-events:none}" +
      "#chica-home-mini-map .cap{position:absolute;left:12px;right:12px;bottom:12px;z-index:3;display:flex;align-items:center;justify-content:space-between;gap:10px;pointer-events:none}" +
      "#chica-home-mini-map .cap b{font:700 13px/1.2 Inter,system-ui,sans-serif;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.7)}" +
      "#chica-home-mini-map .pill{display:inline-flex;align-items:center;min-height:32px;padding:0 12px;border-radius:999px;background:#c513af;color:#fff;font:650 12px/1 Inter,system-ui,sans-serif;border:1px solid rgba(255,255,255,.35);box-shadow:inset 0 1px 0 rgba(255,255,255,.4)}" +
      "#chica-home-mini-map .leaflet-control-attribution{font-size:9px!important;background:rgba(0,0,0,.35)!important;color:#ddd!important}" +
      "#chica-home-mini-map .leaflet-control-zoom{display:none!important}" +
      "#chica-home-mini-map .chica-home-mini-pin{background:transparent!important;border:0!important}" +
      "@media (max-width:720px){#chica-home-mini-map{max-width:none}.frame{max-height:240px}}";
    document.head.appendChild(s);
  }

  function pinHtml(type) {
    var fill = type === "estate" ? "#f4f4f4" : type === "permit" ? "#8a8a8a" : "#c513af";
    var stroke = type === "estate" ? "#121212" : "#f3eee4";
    return (
      '<div style="width:12px;height:12px;border-radius:999px;background:' +
      fill +
      ";border:1.5px solid " +
      stroke +
      ';box-shadow:0 1px 3px rgba(0,0,0,.35)"></div>'
    );
  }

  function collect(data, bounds) {
    var out = [];
    var lists = [];
    if (data) {
      if (Array.isArray(data.public)) lists.push(data.public);
      if (Array.isArray(data.permits)) lists.push(data.permits);
      if (Array.isArray(data.sales)) lists.push(data.sales);
      if (Array.isArray(data)) lists.push(data);
    }
    lists.forEach(function (arr) {
      arr.forEach(function (s) {
        if (s.confidence != null && Number(s.confidence) < 0.7) return;
        var lat = Number(s.lat), lon = Number(s.lon);
        if (!isFinite(lat) || !isFinite(lon)) return;
        if (!inSaBox(lat, lon)) return;
        if (!overlapsWeekend(s, bounds.sat, bounds.sun)) return;
        out.push({ lat: lat, lon: lon, type: s.type || s.kind || "garage", confidence: Number(s.confidence) || 0 });
      });
    });
    return out;
  }

  function buildShell() {
    var a = document.createElement("a");
    a.id = "chica-home-mini-map";
    a.href = MAP_HREF;
    a.setAttribute("data-chica-keep", "1");
    a.setAttribute("aria-label", es() ? "Abrir el mapa a pantalla completa" : "Open the map full screen");
    a.innerHTML =
      '<div class="frame">' +
      '<div class="map" id="chica-home-mini-leaflet" role="img" aria-hidden="true"></div>' +
      '<div class="veil"></div>' +
      '<div class="cap"><b>' +
      (es() ? "Mapa en vivo · San Antonio" : "Live map · San Antonio") +
      '</b><span class="pill">' +
      (es() ? "Pantalla completa" : "Full screen") +
      "</span></div></div>";
    return a;
  }

  function ensureFrame(a) {
    if (!a.querySelector("#chica-home-mini-leaflet")) {
      a.innerHTML =
        '<div class="frame">' +
        '<div class="map" id="chica-home-mini-leaflet" role="img" aria-hidden="true"></div>' +
        '<div class="veil"></div>' +
        '<div class="cap"><b>' +
        (es() ? "Mapa en vivo · San Antonio" : "Live map · San Antonio") +
        '</b><span class="pill">' +
        (es() ? "Pantalla completa" : "Full screen") +
        "</span></div></div>";
    } else if (!a.querySelector(".frame")) {
      // React placeholder: wrap existing leaflet host
      var host = a.querySelector("#chica-home-mini-leaflet");
      a.innerHTML = "";
      var frame = document.createElement("div");
      frame.className = "frame";
      if (!host) {
        host = document.createElement("div");
        host.id = "chica-home-mini-leaflet";
        host.className = "map";
      } else {
        host.classList.add("map");
      }
      host.setAttribute("role", "img");
      host.setAttribute("aria-hidden", "true");
      frame.appendChild(host);
      var veil = document.createElement("div");
      veil.className = "veil";
      frame.appendChild(veil);
      var cap = document.createElement("div");
      cap.className = "cap";
      cap.innerHTML = "<b>" + (es() ? "Mapa en vivo · San Antonio" : "Live map · San Antonio") + '</b><span class="pill">' + (es() ? "Pantalla completa" : "Full screen") + "</span>";
      frame.appendChild(cap);
      a.appendChild(frame);
    }
    a.href = MAP_HREF;
    a.setAttribute("data-chica-keep", "1");
  }

  function placeShell() {
    var main = document.querySelector("main");
    if (!main) return null;
    var a = document.getElementById("chica-home-mini-map");
    if (!a) a = buildShell();
    ensureFrame(a);
    // Static home owns its first-paint order: intro, map, then actions.
    if (document.documentElement.hasAttribute("data-home-static") && a.parentNode) return a;

    // Park it centered under the hero section (not inside the left column)
    var hero = main.querySelector("section");
    if (hero && hero.parentNode) {
      if (a.parentNode !== hero.parentNode || a.previousElementSibling !== hero) {
        if (hero.nextSibling) hero.parentNode.insertBefore(a, hero.nextSibling);
        else hero.parentNode.appendChild(a);
      }
    } else if (!a.parentNode) {
      main.insertBefore(a, main.firstChild);
    }
    return a;
  }

  function paintMap(pins) {
    var host = document.getElementById("chica-home-mini-leaflet");
    if (!host || !window.L || host.getAttribute("data-ready") === "1") return;
    host.setAttribute("data-ready", "1");
    host.setAttribute("data-chica-home-mini", "1");
    var map = L.map(host, {
      zoomControl: false,
      attributionControl: true,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      touchZoom: false
    }).setView(SA, 11);
    // Esri — no API key (MapTiler key is restricted and paints "API KEY REQUIRED")
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", {
      attribution: "Tiles \u00a9 Esri",
      maxZoom: 18,
      referrerPolicy: "origin"
    }).addTo(map);

    pins.sort(function (a, b) { return (b.confidence || 0) - (a.confidence || 0); });
    var bounds = [];
    var max = Math.min(pins.length, 140);
    for (var i = 0; i < max; i++) {
      var p = pins[i];
      L.marker([p.lat, p.lon], {
        interactive: false,
        keyboard: false,
        icon: L.divIcon({
          className: "chica-home-mini-pin",
          html: pinHtml(p.type),
          iconSize: [12, 12],
          iconAnchor: [6, 6]
        })
      }).addTo(map);
      bounds.push([p.lat, p.lon]);
    }

    function lockSaView() {
      try { map.invalidateSize(false); } catch (e) {}
      if (bounds.length >= 3) {
        try {
          map.fitBounds(bounds, { padding: [22, 22], maxZoom: 12 });
          // Never let outliers pull us wider than a city view
          if (map.getZoom() < 10) map.setView(SA, 11);
          else {
            var c = map.getCenter();
            if (!inSaBox(c.lat, c.lng)) map.setView(SA, Math.max(map.getZoom(), 11));
          }
        } catch (e) {
          map.setView(SA, 11);
        }
      } else {
        map.setView(SA, 11);
      }
    }

    lockSaView();
    setTimeout(lockSaView, 80);
    setTimeout(lockSaView, 280);
    // The whole card is one link; keep Leaflet's inner links/controls out of the tab order (aria-hidden subtree).
    function untab() { try { host.removeAttribute("tabindex"); host.querySelectorAll("a,[tabindex],button").forEach(function (n) { n.setAttribute("tabindex", "-1"); }); } catch (e) {} }
    untab(); setTimeout(untab, 300);
    window.__chicaHomeMiniMap = map;
    try { map.getContainer().setAttribute("data-chica-home-mini", "1"); } catch (e) {}
  }

  function loadPins(done) {
    var bounds = weekendBounds();
    var pins = [];
    var left = 1;
    function one(url) {
      fetch(url + "?v=" + Date.now(), { cache: "no-store" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) {
          pins = pins.concat(collect(data, bounds));
        })
        .catch(function () {})
        .then(function () {
          left -= 1;
          if (left <= 0) done(pins);
        });
    }
    one(DATA);
  }

  function run() {
    if (!home()) return;
    css();
    var shell = placeShell();
    if (!shell || mounted) return;
    mounted = true;
    function go() {
      ensureLeaflet(function () {
        loadPins(function (pins) {
          paintMap(pins);
        });
      });
    }
    // Leaflet (~150 KB) loads only when the mini-map nears the viewport. The frame's size is reserved in CSS, so no shift.
    if (!("IntersectionObserver" in window)) { go(); return; }
    var io = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) if (entries[i].isIntersecting) { io.disconnect(); go(); return; }
    }, { rootMargin: "400px 0px" });
    io.observe(shell);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
  setTimeout(run, 400);
  setTimeout(run, 1200);
})();
