/* KEY layer actions for the standalone map. force-key owns the panel; this owns the map. */
(function () {
  function onMapPath() {
    var p = location.pathname || "";
    return /\/map\/?$/.test(p) || p.indexOf("/map/") !== -1 || /map\.html$/.test(p);
  }
  if (!onMapPath()) return;
  var BASE = "/Chicas-Map";
  var groups = {};
  var cache = {};
  var SRC = {
    parking: BASE + "/data/san-antonio-downtown-parking.geojson",
    pantry: BASE + "/data/san-antonio-24h-food-pantries.geojson",
    schools: BASE + "/data/zone-aware-schools.geojson",
    wifi: BASE + "/data/san-antonio-public-wifi.geojson",
    emergency: BASE + "/data/san-antonio-emergency-info.geojson"
  };
  var COLOR = { parking: "#38bdf8", pantry: "#f5d000", schools: "#f0a500", wifi: "#2dd4bf", emergency: "#ef4444" };

  function findMap() {
    if (typeof window.__chicaFindMap === "function") {
      var live = window.__chicaFindMap();
      if (live) return live;
    }
    if (window.__chicaLeaflet && window.__chicaLeaflet.addLayer) return window.__chicaLeaflet;
    return null;
  }

  function dimRow(id, on) {
    var rows = document.querySelectorAll('[data-chica-layer="' + id + '"]');
    for (var i = 0; i < rows.length; i++) {
      rows[i].style.opacity = on ? "1" : "0.38";
      rows[i].setAttribute("aria-checked", on ? "true" : "false");
    }
  }

  function addOverlay(id, feats) {
    var map = findMap(), L = window.L;
    if (!map || !L || !L.layerGroup) return;
    if (groups[id]) try { map.removeLayer(groups[id]); } catch (e) {}
    var g = L.layerGroup(), color = COLOR[id] || "#c513af";
    for (var i = 0; i < feats.length; i++) {
      var feat = feats[i], geo = feat && feat.geometry;
      if (!geo || geo.type !== "Point" || !geo.coordinates) continue;
      var ll = [geo.coordinates[1], geo.coordinates[0]];
      if (!isFinite(ll[0]) || !isFinite(ll[1])) continue;
      var name = (feat.properties && (feat.properties.name || feat.properties.title)) || id;
      var html = '<div class="chica-overlay-mark" style="width:14px;height:14px;border-radius:999px;background:' + color + ';border:2px solid #121212"></div>';
      L.marker(ll, {
        icon: L.divIcon({ className: "chica-overlay-pin", html: html, iconSize: [14, 14], iconAnchor: [7, 7] }),
        title: name,
        keyboard: false
      }).addTo(g);
    }
    groups[id] = g;
    g.addTo(map);
  }

  function toggleOverlay(id) {
    var map = findMap();
    var on = !document.documentElement.classList.contains("chica-ov-" + id);
    document.documentElement.classList.toggle("chica-ov-" + id, on);
    dimRow(id, on);
    if (!on) {
      if (groups[id] && map) try { map.removeLayer(groups[id]); } catch (e) {}
      return;
    }
    if (cache[id]) { addOverlay(id, cache[id]); return; }
    fetch((SRC[id] || "") + "?v=9", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (data) {
      cache[id] = data && data.features ? data.features : [];
      if (document.documentElement.classList.contains("chica-ov-" + id)) addOverlay(id, cache[id]);
    }).catch(function () { cache[id] = []; });
  }

  function toggleSaleType(id) {
    document.documentElement.classList.toggle("chica-hide-" + id);
    var hide = document.documentElement.classList.contains("chica-hide-" + id);
    dimRow(id, !hide);
    var pins = document.querySelectorAll(".leaflet-marker-icon.chica-type-" + id);
    for (var i = 0; i < pins.length; i++) pins[i].style.display = hide ? "none" : "";
  }

  function toggle(id) {
    if (!id) return;
    if (id === "satellite") {
      document.documentElement.classList.toggle("chica-sat-on");
      var sat = document.documentElement.classList.contains("chica-sat-on");
      dimRow("satellite", sat);
      try { localStorage.setItem("chicas-map-layer-sat", sat ? "1" : "0"); } catch (e) {}
      try { window.dispatchEvent(new Event("chica-sat")); } catch (e) {}
      return;
    }
    if (id === "intel") {
      document.documentElement.classList.toggle("chica-intel-off");
      dimRow("intel", !document.documentElement.classList.contains("chica-intel-off"));
      return;
    }
    if (id === "listit") { location.href = BASE + "/claim/"; return; }
    if (id === "claimed") {
      var on = !document.documentElement.classList.contains("chica-claimed-on");
      document.documentElement.classList.toggle("chica-claimed-on", on);
      dimRow("claimed", on);
      try { window.dispatchEvent(new Event("chica-claimed")); } catch (e) {}
      return;
    }
    if (SRC[id]) { toggleOverlay(id); return; }
    if (id === "garage" || id === "estate" || id === "permit") toggleSaleType(id);
  }

  window.__chicaToggleLayer = toggle;

  ["garage", "estate", "permit", "intel"].forEach(function (id) { dimRow(id, true); });
  ["satellite", "parking", "pantry", "schools", "wifi", "claimed"].forEach(function (id) { dimRow(id, false); });
})();
