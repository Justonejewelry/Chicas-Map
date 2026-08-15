/** Tiny helper: expose the MapLibre instance so overlay layers can attach. */
(function () {
  function tryExpose() {
    // MapLibre stores the instance on the container in some versions / after init
    var el = document.getElementById("map");
    if (!el) return false;
    // Common private / internal refs
    if (el._map) {
      window.__YB_MAP = el._map;
      window.map = el._map;
      return true;
    }
    // Walk MapLibre's internal registry if present
    if (window.maplibregl && window.maplibregl.Map) {
      // Fallback: poll for the first map that owns our container
      var maps = document.querySelectorAll(".maplibregl-canvas-container");
      // We cannot reliably get the instance without the constructor holding it,
      // so we rely on the food-pantry script's own retry + future pin update.
    }
    return false;
  }
  var tries = 0;
  var iv = setInterval(function () {
    tries++;
    if (tryExpose() || tries > 60) clearInterval(iv);
  }, 200);
  // Also listen for map load events if the core ever dispatches one
  window.addEventListener("yb-map-ready", function (e) {
    if (e.detail && e.detail.map) {
      window.__YB_MAP = e.detail.map;
      window.map = e.detail.map;
    }
  });
})();
