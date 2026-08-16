/**
 * Chica Map — Layer timing fix
 * Ensures WiFi / Pantries layers attach after map style is ready,
 * survive style switches, and respond to Layer button clicks.
 */
(function () {
  var WIFI_LAYER = "yb-public-wifi-layer";
  var PANTRY_LAYER = "yb-food-pantries-layer";

  function toast(msg, ms) {
    var el = document.getElementById("toast");
    if (!el) {
      console.log("[layer-timing]", msg);
      return;
    }
    el.textContent = msg;
    el.classList.remove("hidden");
    el.style.display = "block";
    setTimeout(function () {
      el.classList.add("hidden");
      el.style.display = "";
    }, ms || 3200);
  }

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

  function bindStyleSurvive(map) {
    if (!map || map.__chicaLayerStyleBound) return;
    map.__chicaLayerStyleBound = true;
    map.on("styledata", function () {
      setTimeout(function () {
        try {
          var wifiBtn = document.getElementById("btnPublicWifi");
          if (wifiBtn && wifiBtn.classList.contains("active") && window.ChicaPublicWifi) {
            if (map.getLayer && !map.getLayer(WIFI_LAYER) && typeof window.ChicaPublicWifi.toggle === "function") {
              window.ChicaPublicWifi.toggle().then(function () {
                return window.ChicaPublicWifi.toggle();
              });
            }
          }
          var pantryBtn = document.getElementById("btnFoodPantry");
          if (pantryBtn && pantryBtn.classList.contains("active") && window.ChicaFoodPantry) {
            if (map.getLayer && !map.getLayer(PANTRY_LAYER) && typeof window.ChicaFoodPantry.toggle === "function") {
              window.ChicaFoodPantry.toggle().then(function () {
                return window.ChicaFoodPantry.toggle();
              });
            }
          }
        } catch (err) {
          console.warn("[layer-timing] style survive", err);
        }
      }, 400);
    });
  }

  function waitForMap(ms) {
    return new Promise(function (resolve) {
      var existing = findMap();
      if (existing) return resolve(existing);
      var n = 0;
      var iv = setInterval(function () {
        n++;
        var m = findMap();
        if (m) {
          clearInterval(iv);
          resolve(m);
        } else if (n > Math.ceil((ms || 8000) / 100)) {
          clearInterval(iv);
          resolve(null);
        }
      }, 100);
      window.addEventListener(
        "yb-map-ready",
        function onReady(e) {
          var m = (e && e.detail && e.detail.map) || findMap();
          if (m) {
            window.removeEventListener("yb-map-ready", onReady);
            clearInterval(iv);
            resolve(m);
          }
        },
        { once: true }
      );
    });
  }

  function wrapToggle(apiName, btnId, label) {
    var api = window[apiName];
    if (!api || typeof api.toggle !== "function" || api.__chicaTimingWrapped) return;
    var orig = api.toggle.bind(api);
    api.toggle = async function () {
      var btn = document.getElementById(btnId);
      var map = findMap();
      if (!map) {
        toast("Loading map…");
        map = await waitForMap(8000);
      }
      if (!map) {
        toast("Map still loading — try " + label + " again in a second");
        return;
      }
      window.__YB_MAP = map;
      window.map = map;
      bindStyleSurvive(map);

      await new Promise(function (resolve) {
        whenStyleReady(map, function () {
          resolve();
        });
      });

      try {
        await orig();
      } catch (err) {
        console.warn("[layer-timing] " + label + " toggle", err);
        toast(label + " failed — try again");
        return;
      }

      setTimeout(function () {
        try {
          if (!btn || !btn.classList.contains("active")) return;
          var layerId = label === "WiFi" ? WIFI_LAYER : PANTRY_LAYER;
          if (map.getLayer && !map.getLayer(layerId)) {
            whenStyleReady(map, function () {
              orig();
            });
          }
        } catch (_) {}
      }, 700);
    };
    api.__chicaTimingWrapped = true;
  }

  function rebindButtons() {
    wrapToggle("ChicaPublicWifi", "btnPublicWifi", "WiFi");
    wrapToggle("ChicaFoodPantry", "btnFoodPantry", "Pantries");

    function bind(id, apiName, label) {
      var btn = document.getElementById(id);
      if (!btn) return;
      if (btn.__chicaTimingClick) {
        btn.removeEventListener("click", btn.__chicaTimingClick, true);
      }
      btn.__chicaTimingClick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        var api = window[apiName];
        if (api && typeof api.toggle === "function") {
          api.toggle();
        } else {
          toast(label + " module still loading…");
          setTimeout(function () {
            if (window[apiName] && window[apiName].toggle) window[apiName].toggle();
          }, 500);
        }
      };
      btn.addEventListener("click", btn.__chicaTimingClick, true);
    }
    bind("btnPublicWifi", "ChicaPublicWifi", "WiFi");
    bind("btnFoodPantry", "ChicaFoodPantry", "Pantries");
  }

  function boot() {
    rebindButtons();
    var m = findMap();
    if (m) bindStyleSurvive(m);
    window.addEventListener("yb-map-ready", function (e) {
      var map = (e && e.detail && e.detail.map) || findMap();
      if (map) {
        window.__YB_MAP = map;
        bindStyleSurvive(map);
      }
      rebindButtons();
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
  setTimeout(boot, 6000);

  window.ChicaLayerTiming = {
    findMap: findMap,
    whenStyleReady: whenStyleReady,
    rebindButtons: rebindButtons,
    waitForMap: waitForMap,
  };
})();
