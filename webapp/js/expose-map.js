/**
 * Capture the MapLibre map instance as soon as the pinned core creates it.
 * Must load AFTER maplibre-gl.js and BEFORE js/app.js.
 */
(function () {
  function capture(m) {
    if (!m || !m.getSource) return;
    window.__YB_MAP = m;
    window.map = m;
    try {
      window.dispatchEvent(new CustomEvent("yb-map-ready", { detail: { map: m } }));
    } catch (_) {}
  }

  // Monkey-patch Map constructor so the first map on #map is always exposed
  function patch() {
    if (!window.maplibregl || !window.maplibregl.Map) return false;
    if (window.maplibregl.Map.__ybPatched) return true;
    var Orig = window.maplibregl.Map;
    function Wrapped(options) {
      var m = new Orig(options);
      try {
        var container = options && options.container;
        var isOurs =
          container === "map" ||
          (container && container.id === "map") ||
          container === document.getElementById("map");
        if (isOurs) capture(m);
        // Also capture any map as fallback (single-map page)
        if (!window.__YB_MAP) capture(m);
      } catch (_) {
        capture(m);
      }
      return m;
    }
    Wrapped.prototype = Orig.prototype;
    Object.keys(Orig).forEach(function (k) {
      try {
        Wrapped[k] = Orig[k];
      } catch (_) {}
    });
    Wrapped.__ybPatched = true;
    window.maplibregl.Map = Wrapped;
    return true;
  }

  if (!patch()) {
    // maplibre may still be loading
    var tries = 0;
    var iv = setInterval(function () {
      tries++;
      if (patch() || tries > 40) clearInterval(iv);
    }, 50);
  }

  // Secondary: poll container internals
  var poll = 0;
  var piv = setInterval(function () {
    poll++;
    if (window.__YB_MAP && window.__YB_MAP.getSource) {
      clearInterval(piv);
      return;
    }
    var el = document.getElementById("map");
    if (el && el._map) capture(el._map);
    if (poll > 80) clearInterval(piv);
  }, 200);
})();
