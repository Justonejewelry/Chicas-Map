/* Chicas Map — live display boot.
   Swap watermarked CARTO rasters to Esri, fill the phone viewport, fly to the hunter.
*/
(function () {
  var SA = { lat: 29.4241, lon: -98.4936 };
  var BOX = { minLat: 29.05, maxLat: 29.85, minLon: -99.05, maxLon: -97.95 };
  var ESRI_DARK =
    "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}";
  var ESRI_STREET =
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}";
  var didLocate = false;

  function onMapPath() {
    var p = location.pathname || "";
    return /\/map\/?$/.test(p) || p.indexOf("/map/") !== -1;
  }

  function themeIsLight() {
    return document.documentElement.getAttribute("data-theme") === "light";
  }

  function insideBox(lat, lon) {
    return lat >= BOX.minLat && lat <= BOX.maxLat && lon >= BOX.minLon && lon <= BOX.maxLon;
  }

  function esriUrl(z, x, y) {
    var tmpl = themeIsLight() ? ESRI_STREET : ESRI_DARK;
    return tmpl.replace("{z}", z).replace("{y}", y).replace("{x}", x);
  }

  function rewriteCartoSrc(src) {
    if (!src || src.indexOf("cartocdn.com") === -1) return src;
    var m = String(src).match(/\/(\d+)\/(\d+)\/(\d+)/);
    if (!m) return src;
    return esriUrl(m[1], m[2], m[3]);
  }

  function rewriteTileImages() {
    var imgs = document.querySelectorAll(".leaflet-tile-pane img, img.leaflet-tile");
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
    map.eachLayer(function (layer) {
      if (!layer || !layer.setUrl || !layer._url) return;
      var url = String(layer._url);
      if (url.indexOf("cartocdn.com") === -1 && url.indexOf("carto.com") === -1) return;
      var next = themeIsLight() ? ESRI_STREET : ESRI_DARK;
      try {
        layer.setUrl(next);
        if (layer.options) layer.options.attribution = "Tiles \u00a9 Esri";
      } catch (e) {}
    });
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
      try { map.invalidateSize(); } catch (e) {}
    }
  }

  function locateIfPossible() {
    if (didLocate || !navigator.geolocation) return;
    var map = findMap();
    if (!map) return;
    didLocate = true;
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        var lat = pos.coords.latitude;
        var lon = pos.coords.longitude;
        if (!insideBox(lat, lon)) {
          map.setView([SA.lat, SA.lon], 12, { animate: true });
          return;
        }
        map.flyTo([lat, lon], 14, { duration: 0.7 });
      },
      function () {
        map.setView([SA.lat, SA.lon], 12, { animate: true });
      },
      { enableHighAccuracy: false, timeout: 7000, maximumAge: 60000 }
    );
  }

  function tick() {
    swapCartoTiles();
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
})();
