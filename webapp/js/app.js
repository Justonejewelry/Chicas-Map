/**
 * Chicas Map app bootstrap
 * Loads the last known-good full app.js from a pinned commit via jsDelivr,
 * then local chica-go-fix.js (included from map.html) enhances Go/Near Me.
 *
 * Also patches maplibregl.Map so window.__YB_MAP is set when the core creates the map.
 */
(function () {
  // Capture the map instance the pinned core creates (it keeps `map` as a local).
  function patchMap() {
    if (!window.maplibregl || !window.maplibregl.Map) return false;
    if (window.maplibregl.Map.__ybBootPatched) return true;
    var Orig = window.maplibregl.Map;
    function Wrapped(options) {
      var m = new Orig(options);
      try {
        window.__YB_MAP = m;
        window.map = m;
        window.dispatchEvent(
          new CustomEvent("yb-map-ready", { detail: { map: m } })
        );
      } catch (e) {}
      return m;
    }
    Wrapped.prototype = Orig.prototype;
    try {
      Object.keys(Orig).forEach(function (k) {
        try {
          Wrapped[k] = Orig[k];
        } catch (e) {}
      });
    } catch (e) {}
    Wrapped.__ybBootPatched = true;
    window.maplibregl.Map = Wrapped;
    return true;
  }
  if (!patchMap()) {
    var tries = 0;
    var iv = setInterval(function () {
      tries++;
      if (patchMap() || tries > 40) clearInterval(iv);
    }, 25);
  }

  var PINNED =
    "https://cdn.jsdelivr.net/gh/Justonejewelry/Chicas-Map@bede2cc27d72df9effd1952c2f6a7bf47516646b/webapp/js/app.js";

  var s = document.createElement("script");
  s.src = PINNED;
  s.async = false;
  s.onerror = function () {
    var s2 = document.createElement("script");
    s2.src =
      "https://raw.githubusercontent.com/Justonejewelry/Chicas-Map/bede2cc27d72df9effd1952c2f6a7bf47516646b/webapp/js/app.js";
    s2.onerror = function () {
      var el = document.createElement("div");
      el.setAttribute(
        "style",
        "position:fixed;bottom:12px;left:12px;right:12px;z-index:99999;background:#7f1d1d;color:#fff;padding:12px 14px;border-radius:12px;font:600 14px/1.4 system-ui,sans-serif"
      );
      el.textContent =
        "Map script failed to load. Hard-refresh, or check your connection.";
      document.body.appendChild(el);
    };
    document.head.appendChild(s2);
  };
  document.head.appendChild(s);
})();
