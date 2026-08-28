/* Chicas Map — live display boot.
   MapTiler streets-v2 + hybrid when a key is present.
   Esri World_Street_Map / World_Imagery fallback.
   Exposes window.__chicaLeaflet so the KEY can toggle layers.
*/
(function () {
  var SA = { lat: 29.4241, lon: -98.4936 };
  var BOX = { minLat: 29.05, maxLat: 29.85, minLon: -99.05, maxLon: -97.95 };
  var ESRI_STREET =
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}";
  var ESRI_SAT =
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
  var MT_STREET = "https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=";
  var MT_SAT = "https://api.maptiler.com/maps/hybrid/256/{z}/{x}/{y}.jpg?key=";
  var ATTR_MT = "\u00a9 MapTiler \u00a9 OpenStreetMap contributors";
  var ATTR_ESRI = "Tiles \u00a9 Esri";
  var didLocate = false;
  var askedGeo = false;
  var pendingFix = null;
  var mapSeenAt = 0;
  var watching = false;
  var sized = false;
  var viewported = false;

  function onMapPath() {
    var p = location.pathname || "";
    return /\/map\/?$/.test(p) || p.indexOf("/map/") !== -1;
  }

  function satOn() {
    return document.documentElement.classList.contains("chica-sat-on");
  }

  function mtKey() {
    try {
      var q = new URLSearchParams(location.search).get("mtk");
      if (q) return q.trim();
    } catch (e) {}
    try {
      var ls = localStorage.getItem("chica-maptiler-key");
      if (ls) return ls.trim();
    } catch (e) {}
    var cfg = (window.CHICA_CONFIG && window.CHICA_CONFIG.MAPTILER_KEY) || "";
    return String(cfg).trim();
  }

  function useMt() {
    return mtKey().length > 8;
  }

  function insideBox(lat, lon) {
    return lat >= BOX.minLat && lat <= BOX.maxLat && lon >= BOX.minLon && lon <= BOX.maxLon;
  }

  function wantUrl() {
    if (useMt()) return (satOn() ? MT_SAT : MT_STREET) + encodeURIComponent(mtKey());
    return satOn() ? ESRI_SAT : ESRI_STREET;
  }

  function wantHostHint() {
    if (useMt()) return satOn() ? "/maps/hybrid/" : "/maps/streets-v2/";
    return satOn() ? "World_Imagery" : "World_Street_Map";
  }

  function dirtyUrl(src) {
    if (!src) return false;
    var s = String(src);
    if (useMt()) {
      return (
        /carto(cdn)?\.com/i.test(s) ||
        /arcgisonline\.com/i.test(s) ||
        /basemap-apikey/i.test(s) ||
        /World_Dark_Gray/i.test(s) ||
        (/maptiler\.com/i.test(s) && s.indexOf(wantHostHint()) === -1)
      );
    }
    return (
      /carto(cdn)?\.com/i.test(s) ||
      /basemap-apikey/i.test(s) ||
      /api[_\s-]?key[_\s-]?required/i.test(s) ||
      /World_Dark_Gray/i.test(s) ||
      /maptiler\.com/i.test(s)
    );
  }

  function parseTile(src) {
    var s = String(src || "");
    var esri = s.match(/\/tile\/(\d{1,2})\/(\d+)\/(\d+)/i);
    if (esri) return { z: esri[1], y: esri[2], x: esri[3] };
    var xyz = s.match(/\/(\d{1,2})\/(\d+)\/(\d+)(@\d+x)?\.(png|jpg|jpeg|webp)/i);
    if (xyz) return { z: xyz[1], x: xyz[2], y: xyz[3] };
    var bare = s.match(/\/(\d{1,2})\/(\d+)\/(\d+)(?:\/)?(?:\?|$)/);
    if (bare) return { z: bare[1], x: bare[2], y: bare[3] };
    return null;
  }

  function fillUrl(tpl, z, x, y) {
    return tpl.replace("{z}", z).replace("{x}", x).replace("{y}", y);
  }

  function rewriteSrc(src) {
    var s = String(src || "");
    if (!s) return s;
    var want = wantUrl();
    var hint = wantHostHint();
    if (s.indexOf(hint) !== -1) return s;
    if (!dirtyUrl(s) && (useMt() ? s.indexOf("maptiler.com") !== -1 : s.indexOf("arcgisonline.com") !== -1)) return s;
    var t = parseTile(s);
    if (!t) return want;
    return fillUrl(want, t.z, t.x, t.y);
  }

  function rewriteTileImages() {
    var imgs = document.querySelectorAll(".leaflet-tile-pane img, img.leaflet-tile, .leaflet-tile-container img");
    for (var i = 0; i < imgs.length; i++) {
      var img = imgs[i];
      var src = img.getAttribute("src") || img.src || "";
      var next = rewriteSrc(src);
      if (next && next !== src) {
        img.src = next;
        try { img.setAttribute("src", next); } catch (e) {}
      }
    }
  }

  function findMap() {
    if (window.__chicaLeaflet && typeof window.__chicaLeaflet.flyTo === "function") return window.__chicaLeaflet;
    var nodes = document.querySelectorAll(".leaflet-container");
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      for (var k in el) {
        try {
          var v = el[k];
          if (v && typeof v.flyTo === "function" && typeof v.invalidateSize === "function") {
            window.__chicaLeaflet = v;
            return v;
          }
        } catch (e) {}
      }
    }
    return null;
  }

  function swapTiles() {
    rewriteTileImages();
    var map = findMap();
    if (!map || !map.eachLayer) return;
    var want = wantUrl();
    var hint = wantHostHint();
    map.eachLayer(function (layer) {
      if (!layer || !layer.setUrl || !layer._url) return;
      var url = String(layer._url);
      if (url.indexOf(hint) !== -1) return;
      if (dirtyUrl(url) || /arcgisonline|carto|maptiler/i.test(url)) {
        try {
          layer.setUrl(want);
          if (layer.options) layer.options.attribution = useMt() ? ATTR_MT : ATTR_ESRI;
        } catch (e) {}
      }
    });
  }

  function watchTiles() {
    if (watching || !window.MutationObserver) return;
    var pane = document.querySelector(".leaflet-tile-pane");
    if (!pane) return;
    watching = true;
    new MutationObserver(function () { rewriteTileImages(); }).observe(pane, {
      childList: true, subtree: true, attributes: true, attributeFilter: ["src"]
    });
  }

  function forceViewport() {
    if (!onMapPath()) return;
    document.documentElement.classList.add("chica-fs-on");
    if (!viewported) {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
      document.body.style.height = "100dvh";
      viewported = true;
    }
    var mapEl = document.querySelector(".leaflet-container") || document.querySelector(".chica-map");
    if (!mapEl) return;
    if (!mapEl.getAttribute("data-chica-fs")) {
      var n = mapEl;
      while (n && n !== document.body) {
        n.style.setProperty("max-width", "none", "important");
        n.style.setProperty("width", "100%", "important");
        n.style.setProperty("max-height", "none", "important");
        n = n.parentElement;
      }
      mapEl.style.setProperty("position", "fixed", "important");
      mapEl.style.setProperty("inset", "0px", "important");
      mapEl.style.setProperty("width", "100vw", "important");
      mapEl.style.setProperty("height", "100dvh", "important");
      mapEl.style.setProperty("z-index", "40", "important");
      mapEl.setAttribute("data-chica-fs", "1");
    }
    if (sized) return;
    var map = findMap();
    if (!map) return;
    sized = true;
    try { map.invalidateSize({ animate: false, pan: false }); } catch (e) {}
  }

  function easeTo(map, lat, lon, zoom) {
    try { map.flyTo([lat, lon], zoom, { duration: 1.25, easeLinearity: 0.18, noMoveStart: false }); }
    catch (e) { map.setView([lat, lon], zoom, { animate: true }); }
  }

  function askGeo() {
    if (askedGeo || !navigator.geolocation) return;
    askedGeo = true;
    navigator.geolocation.getCurrentPosition(
      function (pos) { pendingFix = { lat: pos.coords.latitude, lon: pos.coords.longitude }; },
      function () { pendingFix = { lat: SA.lat, lon: SA.lon, fallback: true }; },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  }

  function locateIfPossible() {
    if (didLocate) return;
    var map = findMap();
    if (!map) return;
    if (!mapSeenAt) mapSeenAt = Date.now();
    askGeo();
    if (Date.now() - mapSeenAt < 1000) return;
    if (!pendingFix && Date.now() - mapSeenAt < 4000) return;
    didLocate = true;
    var fix = pendingFix || { lat: SA.lat, lon: SA.lon, fallback: true };
    if (fix.fallback || !insideBox(fix.lat, fix.lon)) { easeTo(map, SA.lat, SA.lon, 12); return; }
    easeTo(map, fix.lat, fix.lon, 15);
  }

  function tick() {
    if (!onMapPath()) return;
    findMap();
    swapTiles();
    watchTiles();
    forceViewport();
    locateIfPossible();
  }

  var n = 0;
  var id = setInterval(function () { n += 1; tick(); if (n > 40) clearInterval(id); }, 250);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", tick);
  else tick();
  window.addEventListener("resize", function () { sized = false; forceViewport(); });
  window.addEventListener("chica-sat", function () { watching = false; swapTiles(); });
})();
