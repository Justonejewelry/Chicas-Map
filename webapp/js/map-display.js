/* Chicas Map — live display boot.
   Replace CARTO (API KEY REQUIRED) with Esri. Zoom to the hunter 1s after the map is up.
*/
(function () {
  var SA = { lat: 29.4241, lon: -98.4936 };
  var BOX = { minLat: 29.05, maxLat: 29.85, minLon: -99.05, maxLon: -97.95 };
  var ESRI_DARK =
    "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}";
  var ESRI_STREET =
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}";
  var ESRI_SAT =
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
  var ESRI_LABELS =
    "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Reference_Overlay/MapServer/tile/{z}/{y}/{x}";
  var didLocate = false;
  var mapSeenAt = 0;
  var watching = false;

  function onMapPath() {
    var p = location.pathname || "";
    return /\/map\/?$/.test(p) || p.indexOf("/map/") !== -1;
  }

  function themeIsLight() {
    return document.documentElement.getAttribute("data-theme") === "light";
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
      /api[_\s-]?key[_\s-]?required/i.test(s)
    );
  }

  function esriBase() {
    if (satOn()) return ESRI_SAT;
    return themeIsLight() ? ESRI_STREET : ESRI_DARK;
  }

  function esriUrl(z, x, y) {
    return esriBase().replace("{z}", z).replace("{y}", y).replace("{x}", x);
  }

  function rewriteCartoSrc(src) {
    if (!dirtyUrl(src)) return src;
    var m = String(src).match(/\/(\d{1,2})\/(\d+)\/(\d+)/);
    if (!m) return esriBase();
    return esriUrl(m[1], m[2], m[3]);
  }

  function rewriteTileImages() {
    var imgs = document.querySelectorAll(".leaflet-tile-pane img, img.leaflet-tile, .leaflet-tile-container img");
    for (var i = 0; i < imgs.length; i++) {
      var img = imgs[i];
      var src = img.getAttribute("src") || img.src || "";
      var next = rewriteCartoSrc(src);
      if (next && next !== src) {
        img.src = next;
        try {
          img.setAttribute("src", next);
        } catch (e) {}
      }
    }
  }

  function findMap() {
    var nodes = document.querySelectorAll(".leaflet-container");
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      for (var k in el) {
        try {
          var v = el[k];
          if (v && typeof v.flyTo === "function" && typeof v.invalidateSize === "function") return v;
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
      if (!dirtyUrl(url) && url.indexOf("arcgisonline.com") === -1) return;
      if (dirtyUrl(url) || (satOn() && url.indexOf("World_Imagery") === -1) || (!satOn() && url.indexOf("World_Imagery") !== -1)) {
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
    new MutationObserver(function () {
      rewriteTileImages();
    }).observe(pane, { childList: true, subtree: true, attributes: true, attributeFilter: ["src"] });
  }

  function forceViewport() {
    if (!onMapPath()) return;
    document.documentElement.classList.add("chica-fs-on");
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.height = "100dvh";
    var mapEl = document.querySelector(".leaflet-container") || document.querySelector(".chica-map");
    if (!mapEl) return;
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
    var map = findMap();
    if (map) {
      try {
        map.invalidateSize();
      } catch (e) {}
    }
  }

  function locateIfPossible() {
    if (didLocate || !navigator.geolocation) return;
    var map = findMap();
    if (!map) return;
    if (!mapSeenAt) mapSeenAt = Date.now();
    if (Date.now() - mapSeenAt < 1000) return;
    didLocate = true;
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        var lat = pos.coords.latitude;
        var lon = pos.coords.longitude;
        if (!insideBox(lat, lon)) {
          map.setView([SA.lat, SA.lon], 12, { animate: true });
          return;
        }
        map.flyTo([lat, lon], 15, { duration: 0.8 });
      },
      function () {
        map.setView([SA.lat, SA.lon], 12, { animate: true });
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  }

  function tick() {
    if (!onMapPath()) return;
    swapCartoTiles();
    watchTiles();
    forceViewport();
    locateIfPossible();
  }

  var n = 0;
  var id = setInterval(function () {
    n += 1;
    tick();
    if (n > 80) clearInterval(id);
  }, 200);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", tick);
  else tick();
  window.addEventListener("resize", forceViewport);
  window.addEventListener("chica-sat", function () {
    watching = false;
    swapCartoTiles();
  });
})();
