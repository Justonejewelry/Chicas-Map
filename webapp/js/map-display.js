/* Chicas Map — live display boot.
   1) Kill leftover CARTO tiles if a stale bundle reappears.
   2) Force the map canvas to the visual viewport on /map/.
   3) After Leaflet exists, fly to the hunter when they are inside the city box.
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
      var p = el.parentElement;
      if (p) {
        for (var k2 in p) {
          try {
            var v2 = p[k2];
            if (v2 && typeof v2.flyTo === "function" && typeof v2.invalidateSize === "function") return v2;
          } catch (e2) {}
        }
      }
    }
    return null;
  }

  function swapCartoTiles() {
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
    var mapEl = document.querySelector(".leaflet-container") || document.querySelector(".chica-map");
    if (!mapEl) return;
    var chain = [];
    var n = mapEl;
    while (n && n !== document.body && n !== document.documentElement) {
      chain.push(n);
      n = n.parentElement;
    }
    chain.forEach(function (el) {
      el.style.setProperty("max-width", "none", "important");
      el.style.setProperty("width", "100%", "important");
      el.style.setProperty("height", "100%", "important");
      el.style.setProperty("max-height", "none", "important");
      el.style.setProperty("margin", "0", "important");
      el.style.setProperty("border-radius", "0", "important");
    });
    mapEl.style.setProperty("position", "fixed", "important");
    mapEl.style.setProperty("inset", "0", "important");
    mapEl.style.setProperty("width", "100vw", "important");
    mapEl.style.setProperty("height", "100dvh", "important");
    mapEl.style.setProperty("z-index", "1", "important");
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
    if (n > 40) clearInterval(id);
  }, 250);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", tick);
  else tick();
  window.addEventListener("resize", forceViewport);
})();
