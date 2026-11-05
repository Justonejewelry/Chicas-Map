/* Home: small live map preview. Click opens the full-screen map. */
(function () {
  var BASE = "/Chicas-Map";
  var MAP_HREF = BASE + "/map/";
  var DATA = BASE + "/data/cities/san-antonio.json";
  var USER = BASE + "/data/cities/san-antonio-user.json";
  var SA = [29.4241, -98.4936];
  var mounted = false;

  function home() {
    var p = (location.pathname || "/").replace(/\/+$/, "") || "/";
    return p === "/" || p === "/index.html" || p === BASE || p === BASE + "/index.html";
  }

  function es() {
    return String(document.documentElement.lang || "").toLowerCase().indexOf("es") === 0;
  }

  function ensureLeaflet(done) {
    if (window.L && window.L.map) {
      done();
      return;
    }
    if (!document.querySelector('link[data-chica-leaflet]')) {
      var c = document.createElement("link");
      c.rel = "stylesheet";
      c.href = "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css";
      c.setAttribute("data-chica-leaflet", "1");
      document.head.appendChild(c);
    }
    if (!document.querySelector('script[data-chica-leaflet]')) {
      var s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js";
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
    if (document.getElementById("chica-home-mini-css")) return;
    var s = document.createElement("style");
    s.id = "chica-home-mini-css";
    s.textContent =
      "#chica-home-mini-map{display:block;margin:20px 0 28px;max-width:560px;text-decoration:none;color:inherit}" +
      "#chica-home-mini-map .frame{position:relative;overflow:hidden;border-radius:18px;border:1px solid rgba(255,255,255,.16);background:#1a1714;box-shadow:0 12px 28px rgba(0,0,0,.28);aspect-ratio:16/10;min-height:200px;max-height:280px}" +
      "#chica-home-mini-map .map{position:absolute;inset:0;z-index:0}" +
      "#chica-home-mini-map .veil{position:absolute;inset:0;z-index:2;background:linear-gradient(180deg,rgba(18,18,18,.08),rgba(18,18,18,.55));pointer-events:none}" +
      "#chica-home-mini-map .cap{position:absolute;left:12px;right:12px;bottom:12px;z-index:3;display:flex;align-items:center;justify-content:space-between;gap:10px;pointer-events:none}" +
      "#chica-home-mini-map .cap b{font:700 13px/1.2 Inter,system-ui,sans-serif;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.7)}" +
      "#chica-home-mini-map .pill{display:inline-flex;align-items:center;min-height:32px;padding:0 12px;border-radius:999px;background:#c513af;color:#fff;font:650 12px/1 Inter,system-ui,sans-serif;border:1px solid rgba(255,255,255,.35);box-shadow:inset 0 1px 0 rgba(255,255,255,.4)}" +
      "#chica-home-mini-map .leaflet-control-attribution{font-size:9px!important;background:rgba(0,0,0,.35)!important;color:#ddd!important}" +
      "#chica-home-mini-map .leaflet-control-zoom{display:none!important}" +
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

  function collect(data) {
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
        var lat = Number(s.lat), lon = Number(s.lon);
        if (!isFinite(lat) || !isFinite(lon)) return;
        out.push({ lat: lat, lon: lon, type: s.type || s.kind || "garage" });
      });
    });
    return out;
  }

  function placeShell() {
    if (document.getElementById("chica-home-mini-map")) return document.getElementById("chica-home-mini-map");
    var main = document.querySelector("main");
    if (!main) return null;
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

    var heroBtn = main.querySelector("a[href*='/map']");
    var h1 = main.querySelector("h1");
    var anchor = null;
    if (heroBtn && heroBtn.parentNode) anchor = heroBtn.parentNode;
    else if (h1 && h1.parentNode) anchor = h1.parentNode;
    if (anchor && anchor.parentNode) {
      if (anchor.nextSibling) anchor.parentNode.insertBefore(a, anchor.nextSibling);
      else anchor.parentNode.appendChild(a);
    } else {
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
    var bounds = [];
    var max = Math.min(pins.length, 120);
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
    if (bounds.length > 2) {
      try {
        map.fitBounds(bounds, { padding: [18, 18], maxZoom: 12 });
      } catch (e) {}
    }
    setTimeout(function () {
      try { map.invalidateSize(); } catch (e) {}
    }, 120);
    window.__chicaHomeMiniMap = map;
    try { map.getContainer().setAttribute("data-chica-home-mini", "1"); } catch (e) {}
  }

  function loadPins(done) {
    var pins = [];
    var left = 2;
    function one(url) {
      fetch(url + "?v=" + Date.now(), { cache: "no-store" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) {
          pins = pins.concat(collect(data));
        })
        .catch(function () {})
        .then(function () {
          left -= 1;
          if (left <= 0) done(pins);
        });
    }
    one(DATA);
    one(USER);
  }

  function run() {
    if (!home()) return;
    css();
    var shell = placeShell();
    if (!shell || mounted) return;
    mounted = true;
    ensureLeaflet(function () {
      loadPins(function (pins) {
        paintMap(pins);
      });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
  setTimeout(run, 400);
  setTimeout(run, 1200);
})();
