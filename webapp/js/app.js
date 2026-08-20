/**
 * Chicas Map app bootstrap.
 *
 * Keeps the full map core in this repository so its behavior and markup ship
 * together, while preserving the map instance bridge used by enhancement layers.
 */
(function () {
  function patchMap() {
    if (!window.maplibregl || !window.maplibregl.Map) return false;
    if (window.maplibregl.Map.__ybBootPatched) return true;
    var OriginalMap = window.maplibregl.Map;
    function WrappedMap(options) {
      var map = new OriginalMap(options);
      try {
        window.__YB_MAP = map;
        window.map = map;
        window.dispatchEvent(new CustomEvent("yb-map-ready", { detail: { map: map } }));
      } catch (_) {}
      return map;
    }
    WrappedMap.prototype = OriginalMap.prototype;
    try {
      Object.keys(OriginalMap).forEach(function (key) {
        try { WrappedMap[key] = OriginalMap[key]; } catch (_) {}
      });
    } catch (_) {}
    WrappedMap.__ybBootPatched = true;
    window.maplibregl.Map = WrappedMap;
    return true;
  }

  if (!patchMap()) {
    var attempts = 0;
    var timer = setInterval(function () {
      attempts++;
      if (patchMap() || attempts > 40) clearInterval(timer);
    }, 25);
  }

  var script = document.createElement("script");
  script.src = "js/app-core.js?v=20260820";
  script.async = false;
  script.onerror = function () {
    var message = document.createElement("div");
    message.setAttribute("style", "position:fixed;bottom:12px;left:12px;right:12px;z-index:99999;background:#7f1d1d;color:#fff;padding:12px 14px;border-radius:12px;font:600 14px/1.4 system-ui,sans-serif");
    message.textContent = "Map script failed to load. Hard-refresh, or check your connection.";
    document.body.appendChild(message);
  };
  document.head.appendChild(script);
})();
