/* Fullscreen overlay was eating every tap. Open holes for HUD. */
(function () {
  var p = location.pathname || "";
  if (!(/\/map\/?$/.test(p) || p.indexOf("/map/") !== -1)) return;
  var css = document.getElementById("chica-click-fix");
  if (!css) {
    css = document.createElement("style");
    css.id = "chica-click-fix";
    css.textContent =
      "#chica-force-key,#chica-hunt-bar,#chica-map-chrome,#chica-listit-btn,#chica-fs-btn," +
      "#chica-key,aside[aria-label=Key],aside[aria-label=key]{" +
      "pointer-events:auto!important;z-index:2147483647!important;position:fixed!important}" +
      "#chica-key,aside[aria-label=Key],aside[aria-label=key]{" +
      "left:10px!important;bottom:calc(12px + env(safe-area-inset-bottom,0px))!important}" +
      "html.chica-fs-on .leaflet-container{pointer-events:auto!important}" +
      "html.chica-fs-on :has(> .leaflet-container){pointer-events:none!important}" +
      "html.chica-fs-on :has(> .leaflet-container) .leaflet-container," +
      "html.chica-fs-on :has(> .leaflet-container) .leaflet-pane," +
      "html.chica-fs-on :has(> .leaflet-container) .leaflet-control-container{" +
      "pointer-events:auto!important}";
    (document.head || document.documentElement).appendChild(css);
  }
  function findMap() {
    if (typeof window.__chicaFindMap === "function") {
      var live = window.__chicaFindMap();
      if (live) return live;
    }
    if (window.__chicaLeaflet && window.__chicaLeaflet.flyTo) return window.__chicaLeaflet;
    return null;
  }
  function goClaim() { location.href = "/Chicas-Map/claim/"; }
  function nearMe() {
    var map = findMap();
    if (!map) return;
    if (!navigator.geolocation) { map.setView([29.4241, -98.4936], 12); return; }
    navigator.geolocation.getCurrentPosition(
      function (pos) { map.flyTo([pos.coords.latitude, pos.coords.longitude], 15, { duration: 1 }); },
      function () { map.setView([29.4241, -98.4936], 12); },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 20000 }
    );
  }
  window.addEventListener("click", function (ev) {
    var t = ev.target;
    if (!t || !t.closest) return;
    if (t.closest("#chica-listit-btn") || t.closest("#chica-force-key [data-chica-layer=listit]") || t.closest("#chica-key [data-chica-layer=listit]")) {
      ev.preventDefault();
      goClaim();
      return;
    }
    if (t.closest("#chica-near-btn")) {
      ev.preventDefault();
      nearMe();
    }
  }, true);
})();
