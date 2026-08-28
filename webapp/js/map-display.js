/* Chicas Map — live display boot.
   Esri only. CARTO tiles get rewritten. Street = World_Street_Map (z19).
   Exposes window.__chicaLeaflet so the KEY can toggle layers.
*/
(function () {
  var SA = { lat: 29.4241, lon: -98.4936 };
  var BOX = { minLat: 29.05, maxLat: 29.85, minLon: -99.05, maxLon: -97.95 };
  var ESRI_STREET =
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}";
  var ESRI_SAT =
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
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

  function insideBox(lat, lon) {
    return lat >= BOX.minLat && lat <= BOX.maxLat && lon >= BOX.minLon && lon <= BOX.maxLon;
  }

  function dirtyUrl(src) {
    if (!src) return false;
    var s = String(src);
    return (
      /carto(cdn)?\.com/i.test(s) ||
      /basemap-apikey/i.test(s) ||
      /api[_\s-]?key[_\s-]?required/i.test(s) ||
      /World_Dark_Gray/i.test(s)
    );
  }

  function esriBase() {
    return satOn() ? ESRI_SAT : ESRI_STREET;
  }

  function parseTile(src) {
    var s = String(src || "");
    var esri = s.match(/\/tile\/(\d{1,2})\/(\d+)\/(\d+)/i);
    if (esri) return { z: esri[1], y: esri[2], x: esri[3] };
    var carto = s.match(/\/(\d{1,2})\/(\d+)\/(\d+)(@\d+x)?\.(png|jpg|jpeg|webp)/i);
    if (carto) return { z: carto[1], x: carto[2], y: carto[3] };
    var bare = s.match(/\/(\d{1,2})\/(\d+)\/(\d+)(?:\/)?(?:\?|$)/);
    if (bare) return { z: bare[1], x: bare[2], y: bare[3] };
    return null;
  }

  function esriUrl(z, x, y) {
    return esriBase().replace("{z}", z).replace("{y}", y).replace("{x}", x);
  }

  function rewriteCartoSrc(src) {
    var s = String(src || "");
    if (!s) return s;
    var wantHost = satOn() ? "World_Imagery" : "World_Street_Map";
    if (s.indexOf(wantHost) !== -1 && s.indexOf("arcgisonline.com") !== -1) return s;
    if (!dirtyUrl(s) && s.indexOf("arcgisonline.com") === -1) return s;
    var t = parseTile(s);
    if (!t) return esriBase();
    return esriUrl(t.z, t.x, t.y);
  }

  function rewriteTileImages() {
    var imgs = document.querySelectorAll(".leaflet-tile-pane img, img.leaflet-tile, .leaflet-tile-container img");
    for (var i = 0; i < imgs.length; i++) {
      var img = imgs[i];
      var src = img.getAttribute("src") || img.src || "";
      var next = rewriteCartoSrc(src);
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

  function swapCartoTiles() {
    rewriteTileImages();
    var map = findMap();
    if (!map || !map.eachLayer) return;
    var want = esriBase();
    map.eachLayer(function (layer) {
      if (!layer || !layer.setUrl || !layer._url) return;
      var url = String(layer._url);
      var isEsri = url.indexOf("arcgisonline.com") !== -1;
      var isWanted = url.indexOf(satOn() ? "World_Imagery" : "World_Street_Map") !== -1;
      if (isEsri && isWanted) return;
      if (dirtyUrl(url) || isEsri || /carto/i.test(url)) {
        try {
          layer.setUrl(want);
          if (layer.options) layer.options.attribution = "Tiles \u00a9 Esri";
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
    swapCartoTiles();
    watchTiles();
    forceViewport();
    locateIfPossible();
  }

  var n = 0;
  var id = setInterval(function () { n += 1; tick(); if (n > 40) clearInterval(id); }, 250);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", tick);
  else tick();
  window.addEventListener("resize", function () { sized = false; forceViewport(); });
  window.addEventListener("chica-sat", function () { watching = false; swapCartoTiles(); });
})();
