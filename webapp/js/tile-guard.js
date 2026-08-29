/* Strip MapTiler only after the live map marks the key dead.
   Healthy outdoor-v2 tiles must stay. */
(function () {
  var p = location.pathname || "";
  if (!(/\/map\/?$/.test(p) || p.indexOf("/map/") !== -1 || /map\.html$/.test(p))) return;
  window.__chicaMapErrors = window.__chicaMapErrors || [];
  function findMap() {
    if (window.__chicaLeaflet && window.__chicaLeaflet.eachLayer) return window.__chicaLeaflet;
    if (typeof window.__chicaFindMap === "function") return window.__chicaFindMap();
    return null;
  }
  function stripBad() {
    if (!window.__chicaMtDead) return;
    var map = findMap();
    if (!map || !map.eachLayer) return;
    map.eachLayer(function (ly) {
      var url = (ly && ly._url) || "";
      if (url.indexOf("maptiler.com") !== -1) {
        try {
          map.removeLayer(ly);
          window.__chicaMapErrors.push({ kind: "removed-maptiler", t: Date.now() });
        } catch (e) {}
      }
    });
    try { map.invalidateSize({ animate: false, pan: false }); } catch (e) {}
  }
  var n = 0;
  var id = setInterval(function () {
    stripBad();
    n += 1;
    if (n > 40) clearInterval(id);
  }, 200);
})();
