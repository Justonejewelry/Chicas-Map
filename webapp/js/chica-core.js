/* Shared map handle. React never publishes the Leaflet instance. */
(function (w) {
  var BASE = "/Chicas-Map";
  function onMapPath() {
    var p = location.pathname || "";
    return /\/map\/?$/.test(p) || p.indexOf("/map/") !== -1 || /map\.html$/.test(p);
  }
  function scanNode(el) {
    if (!el) return null;
    var names;
    try { names = Object.getOwnPropertyNames(el); } catch (e) { names = []; }
    try { names = names.concat(Object.keys(el)); } catch (e) {}
    var L = w.L;
    for (var i = 0; i < names.length; i++) {
      try {
        var v = el[names[i]];
        if (!v || typeof v !== "object") continue;
        if (typeof v.flyTo === "function" && typeof v.addLayer === "function") return v;
        if (L && L.Map && v instanceof L.Map) return v;
        if (v._map && typeof v._map.flyTo === "function") return v._map;
      } catch (e) {}
    }
    return null;
  }
  function findMap() {
    if (w.__chicaLeaflet && typeof w.__chicaLeaflet.flyTo === "function") return w.__chicaLeaflet;
    var nodes = document.querySelectorAll(".leaflet-container, .chica-map, .leaflet-pane, .leaflet-marker-icon, .leaflet-layer");
    for (var i = 0; i < nodes.length; i++) {
      var hit = scanNode(nodes[i]);
      if (hit) { w.__chicaLeaflet = hit; return hit; }
    }
    if (w.L && w.L.Map) {
      try {
        for (var k in w) {
          var v = w[k];
          if (v && v instanceof w.L.Map) { w.__chicaLeaflet = v; return v; }
        }
      } catch (e) {}
    }
    return null;
  }
  if (w.L && w.L.Map && w.L.Map.addInitHook) {
    try {
      w.L.Map.addInitHook(function () { w.__chicaLeaflet = this; });
    } catch (e) {}
  }
  w.__chicaFindMap = findMap;
  w.__chicaOnMap = onMapPath;
  w.__chicaBase = BASE;
  if (onMapPath()) {
    var n = 0;
    var id = setInterval(function () {
      findMap();
      n += 1;
      if (n > 80 || w.__chicaLeaflet) clearInterval(id);
    }, 250);
  }
})(window);
