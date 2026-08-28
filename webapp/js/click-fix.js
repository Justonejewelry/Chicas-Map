/* HUD clicks only. Do not disable pointer-events on the map parent. */
(function () {
  var p = location.pathname || "";
  if (!(/\/map\/?$/.test(p) || p.indexOf("/map/") !== -1)) return;
  var css = document.getElementById("chica-click-fix");
  if (!css) {
    css = document.createElement("style");
    css.id = "chica-click-fix";
    css.textContent =
      "#chica-force-key,#chica-hunt-bar,#chica-map-chrome,#chica-listit-btn,#chica-fs-btn," +
      "#chica-intel-card,#chica-home-chip{" +
      "pointer-events:auto!important;z-index:2147483647!important}" +
      ".leaflet-container,.leaflet-pane,.leaflet-overlay-pane,.leaflet-marker-pane," +
      ".leaflet-marker-icon,.chica-pin{pointer-events:auto!important}" +
      "html,body,#chica-live-map,.leaflet-container{" +
      "width:100vw!important;height:100dvh!important;max-width:100vw!important}";
    (document.head || document.documentElement).appendChild(css);
  }
  function findMap() {
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
    if (t.closest("#chica-listit-btn") || t.closest("[data-chica-layer=listit]")) {
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
