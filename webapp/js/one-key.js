/* One KEY. Kill the upper-right intel icon and any second legend. */
(function () {
  function wipe() {
    var a = document.getElementById("chica-intel-btn");
    if (a) a.remove();
    var keys = document.querySelectorAll('aside[aria-label="Key"], .leaflet-control-layers, [data-chica-legend]');
    for (var i = 0; i < keys.length; i++) {
      if (keys[i].id === "chica-key") continue;
      keys[i].style.setProperty("display", "none", "important");
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wipe);
  else wipe();
  setInterval(wipe, 800);
})();
