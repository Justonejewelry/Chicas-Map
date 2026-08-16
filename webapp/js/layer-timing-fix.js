/**
 * Chica Map — Layer timing fix
 * Waits for map style before WiFi/Pantries attach; survives style swaps.
 * Does NOT install a second click handler (layers-rail already owns clicks).
 */
(function () {
  var WIFI_LAYER = "yb-public-wifi-layer";
  var PANTRY_LAYER = "yb-food-pantries-layer";

  function findMap() {
    if (window.__YB_MAP && window.__YB_MAP.getSource) return window.__YB_MAP;
    if (window.map && window.map.getSource) return window.map;
    var el = document.getElementById("map");
    if (el && el._map && el._map.getSource) return el._map;
    return null;
  }

  function whenStyleReady(map, fn) {
    if (!map) return;
    var done = false;
    var run = function () {
      if (done) return;
      try {
        if (map.isStyleLoaded && !map.isStyleLoaded()) return;
      } catch (_) {}
      done = true;
      try {
        fn(map);
      } catch (err) {
        console.warn("[layer-timing] callback", err);
      }
    };
    try {
      if (map.isStyleLoaded && map.isStyleLoaded()) {
        run();
        return;
      }
    } catch (_) {}
    map.once && map.once("load", run);
    map.once && map.once("idle", run);
    map.on &&
      map.on("styledata", function onStyle() {
        try {
          if (map.isStyleLoaded && map.isStyleLoaded()) {
            map.off && map.off("styledata", onStyle);
            run();
          }
        } catch (_) {
          run();
        }
      });
    setTimeout(run, 1200);
    setTimeout(run, 3000);
  }

  function setLayerVis(map, layerId, on) {
    try {
      if (map.getLayer && map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, "visibility", on ? "visible" : "none");
      }
    } catch (_) {}
  }

  function restoreIfActive(map) {
    if (!map) return;
    var wifiBtn = document.getElementById("btnPublicWifi");
    if (wifiBtn && wifiBtn.classList.contains("active")) {
      setLayerVis(map, WIFI_LAYER, true);
      setLayerVis(map, "yb-public-wifi-label", true);
    } else {
      setLayerVis(map, WIFI_LAYER, false);
      setLayerVis(map, "yb-public-wifi-label", false);
    }
    var pantryBtn = document.getElementById("btnFoodPantry");
    if (pantryBtn && pantryBtn.classList.contains("active")) {
      setLayerVis(map, PANTRY_LAYER, true);
      setLayerVis(map, "yb-food-pantries-label", true);
    } else {
      setLayerVis(map, PANTRY_LAYER, false);
      setLayerVis(map, "yb-food-pantries-label", false);
    }
  }

  function bindStyleSurvive(map) {
    if (!map || map.__chicaLayerStyleBound) return;
    map.__chicaLayerStyleBound = true;
    map.on("styledata", function () {
      setTimeout(function () {
        try {
          restoreIfActive(map);
        } catch (err) {
          console.warn("[layer-timing] style survive", err);
        }
      }, 400);
    });
  }

  function wrapToggle(apiName) {
    var api = window[apiName];
    if (!api || typeof api.toggle !== "function" || api.__chicaTimingWrapped) return;
    var orig = api.toggle.bind(api);
    api.toggle = async function () {
      var map = findMap();
      if (map) {
        window.__YB_MAP = map;
        window.map = map;
        bindStyleSurvive(map);
        await new Promise(function (resolve) {
          whenStyleReady(map, function () {
            resolve();
          });
        });
      }
      return orig();
    };
    api.__chicaTimingWrapped = true;
  }

  function boot() {
    wrapToggle("ChicaPublicWifi");
    wrapToggle("ChicaFoodPantry");
    var m = findMap();
    if (m) bindStyleSurvive(m);
    window.addEventListener("yb-map-ready", function (e) {
      var map = (e && e.detail && e.detail.map) || findMap();
      if (map) {
        window.__YB_MAP = map;
        bindStyleSurvive(map);
      }
      wrapToggle("ChicaPublicWifi");
      wrapToggle("ChicaFoodPantry");
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
  setTimeout(boot, 600);
  setTimeout(boot, 1500);
  setTimeout(boot, 3500);

  window.ChicaLayerTiming = {
    findMap: findMap,
    whenStyleReady: whenStyleReady,
    restoreIfActive: restoreIfActive,
  };
})();
