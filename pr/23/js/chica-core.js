/* Shared map handle + tiny event pings. React never publishes the Leaflet instance. */
(function (w) {
  var BASE = "/Chicas-Map";
  function onMapPath() {
    var p = location.pathname || "";
    return /\/map\/?$/.test(p) || p.indexOf("/map/") !== -1 || /map\.html$/.test(p);
  }
  function capture(map) {
    if (!map || typeof map.flyTo !== "function") return null;
    w.__chicaLeaflet = map;
    try {
      var c = map.getContainer && map.getContainer();
      if (c) c.__chicaMap = map;
    } catch (e) {}
    return map;
  }
  function hookL() {
    var L = w.L;
    if (!L || !L.Map || !L.Map.prototype) return false;
    if (L.Map.prototype.__chicaHooked) return true;
    L.Map.prototype.__chicaHooked = true;
    function grab() { capture(this); }
    try { if (L.Map.addInitHook) L.Map.addInitHook(grab); } catch (e) {}
    ["initialize", "setView", "flyTo", "invalidateSize", "addLayer", "eachLayer", "fitBounds", "removeLayer"].forEach(function (name) {
      var orig = L.Map.prototype[name];
      if (typeof orig !== "function" || orig.__chicaWrap) return;
      L.Map.prototype[name] = function () {
        grab.call(this);
        return orig.apply(this, arguments);
      };
      L.Map.prototype[name].__chicaWrap = true;
    });
    return true;
  }
  function scanNode(el) {
    if (!el) return null;
    if (el.__chicaMap && typeof el.__chicaMap.flyTo === "function") return capture(el.__chicaMap);
    if (el._map && typeof el._map.flyTo === "function") return capture(el._map);
    var names = [];
    try { names = Object.getOwnPropertyNames(el); } catch (e) {}
    try { names = names.concat(Object.keys(el)); } catch (e) {}
    var L = w.L;
    for (var i = 0; i < names.length; i++) {
      try {
        var v = el[names[i]];
        if (!v || typeof v !== "object") continue;
        if (typeof v.flyTo === "function" && typeof v.addLayer === "function") return capture(v);
        if (L && L.Map && v instanceof L.Map) return capture(v);
        if (v._map && typeof v._map.flyTo === "function") return capture(v._map);
      } catch (e) {}
    }
    return null;
  }
  function findMap() {
    hookL();
    if (w.__chicaLeaflet && typeof w.__chicaLeaflet.flyTo === "function") return w.__chicaLeaflet;
    var nodes = document.querySelectorAll(".leaflet-container, .chica-map, .leaflet-pane, .leaflet-marker-icon, .leaflet-layer");
    for (var i = 0; i < nodes.length; i++) {
      var hit = scanNode(nodes[i]);
      if (hit) return hit;
    }
    if (w.L && w.L.Map) {
      try {
        for (var k in w) {
          var v = w[k];
          if (v && v instanceof w.L.Map) return capture(v);
        }
      } catch (e) {}
    }
    return null;
  }
  function hideDupKey() {
    var extra = document.getElementById("chica-key");
    if (extra && document.getElementById("chica-force-key")) {
      extra.style.setProperty("display", "none", "important");
      extra.style.setProperty("visibility", "hidden", "important");
      extra.style.setProperty("pointer-events", "none", "important");
    }
  }
  function track(name) {
    try {
      if (w.goatcounter && typeof w.goatcounter.count === "function") {
        w.goatcounter.count({ path: location.pathname + "?evt=" + encodeURIComponent(name), title: name, event: true });
      }
    } catch (e) {}
  }
  w.__chicaFindMap = findMap;
  w.__chicaOnMap = onMapPath;
  w.__chicaBase = BASE;
  w.__chicaTrack = track;
  hookL();
  if (onMapPath()) {
    track("map_open");
    var n = 0;
    var id = setInterval(function () {
      hookL();
      findMap();
      hideDupKey();
      n += 1;
      if (n > 120 && w.__chicaLeaflet) clearInterval(id);
    }, 200);
  }
})(window);
