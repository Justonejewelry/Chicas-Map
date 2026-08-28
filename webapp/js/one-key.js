/* One KEY. Kill the upper-left mini legend and leftover intel icon. */
(function () {
  function hideEl(el) {
    if (!el || el.id === "chica-key" || el.closest && el.closest("#chica-key")) return;
    if (el.closest && (el.closest("#chica-map-chrome") || el.closest(".leaflet-control-zoom") || el.closest(".leaflet-control-attribution"))) return;
    el.style.setProperty("display", "none", "important");
    el.style.setProperty("visibility", "hidden", "important");
    el.setAttribute("data-chica-dup-key", "1");
  }
  function wipe() {
    var a = document.getElementById("chica-intel-btn");
    if (a) a.remove();
    var tops = document.querySelectorAll(".leaflet-top.leaflet-left, .leaflet-control-layers");
    for (var i = 0; i < tops.length; i++) hideEl(tops[i]);
    var keys = document.querySelectorAll('aside[aria-label="Key"], aside[aria-label="key"], [data-chica-legend]');
    for (var j = 0; j < keys.length; j++) hideEl(keys[j]);
    var nodes = document.querySelectorAll("section, aside, div");
    for (var k = 0; k < nodes.length; k++) {
      var el = nodes[k];
      if (el.id === "chica-key" || (el.closest && el.closest("#chica-key"))) continue;
      var r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) continue;
      if (r.top > 160 || r.left > 160) continue;
      var t = (el.textContent || "").replace(/\s+/g, " ").trim();
      if (/^(Key|KEY)$/.test(t) || (/Garage/.test(t) && /Estate/.test(t) && r.width < 280 && r.height < 280 && r.left < 80 && r.top < 140)) {
        hideEl(el);
      }
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wipe);
  else wipe();
  setInterval(wipe, 700);
})();
