/**
 * Chica Map — Layer timing force
 * Ensures overlay layers (WiFi, Pantries, Zone, Parking, etc.) only add
 * sources/layers after MapLibre style is ready, and re-apply after style swaps.
 *
 * Fixes: buttons that appear to do nothing when clicked before style load.
 */
(function () {
  "use strict";

  function getMap() {
    if (window.__YB_MAP && window.__YB_MAP.getSource) return window.__YB_MAP;
    if (window.map && window.map.getSource) return window.map;
    var el = document.getElementById("map");
    if (el && el._map && el._map.getSource) return el._map;
    return null;
  }

  function whenStyleReady(map, fn) {
    if (!map || typeof fn !== "function") return;
    try {
      if (map.isStyleLoaded && map.isStyleLoaded()) {
        fn(map);
        return;
      }
    } catch (_) {}
    var done = false;
    function run() {
      if (done) return;
      done = true;
      try { fn(map); } catch (e) { console.warn("[layer-timing]", e); }
    }
    try {
      map.once("load", run);
      map.once("idle", run);
      map.once("styledata", function () {
        if (map.isStyleLoaded && map.isStyleLoaded()) run();
      });
    } catch (_) {}
    // Hard fallback
    setTimeout(function () {
      try {
        if (map.isStyleLoaded && map.isStyleLoaded()) run();
      } catch (_) { run(); }
    }, 2500);
  }

  function rebindOverlays(map) {
    if (!map) return;
    // Re-fire readiness so layers that waited can attach
    try {
      window.dispatchEvent(new CustomEvent("yb-map-ready", { detail: { map: map } }));
    } catch (_) {}
    // Soft nudge known modules if they expose a refresh/ensure
    ["ChicaPublicWifi", "ChicaFoodPantry", "ChicaZoneAware", "ChicaDowntownParking", "ChicaEmergencyInfo"].forEach(function (name) {
      try {
        var mod = window[name];
        if (!mod) return;
        if (typeof mod.ensureLayer === "function") mod.ensureLayer(map);
        else if (typeof mod.refresh === "function") mod.refresh();
      } catch (_) {}
    });
  }

  function attach(map) {
    if (!map || map.__ybTimingBound) return;
    map.__ybTimingBound = true;
    whenStyleReady(map, function (m) {
      rebindOverlays(m);
    });
    try {
      map.on("styledata", function () {
        // After basemap/style change, wait briefly then re-apply visible overlays
        setTimeout(function () {
          whenStyleReady(map, rebindOverlays);
        }, 120);
      });
    } catch (_) {}
  }

  function boot() {
    var map = getMap();
    if (map) attach(map);
    window.addEventListener("yb-map-ready", function (e) {
      var m = (e && e.detail && e.detail.map) || getMap();
      if (m) attach(m);
    });
    var n = 0;
    var iv = setInterval(function () {
      n++;
      var m = getMap();
      if (m) {
        attach(m);
        clearInterval(iv);
      } else if (n > 60) clearInterval(iv);
    }, 150);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  setTimeout(boot, 600);
  setTimeout(boot, 1800);

  window.ChicaLayerTiming = { whenStyleReady: whenStyleReady, rebindOverlays: rebindOverlays, getMap: getMap };
})();
