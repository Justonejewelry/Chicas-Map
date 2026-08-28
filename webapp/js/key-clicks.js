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
  var GLYPH = {
    parking: '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><circle cx="8" cy="8" r="6.2" fill="#38bdf8" stroke="#121212" stroke-width="1.2"/><text x="8" y="11.2" text-anchor="middle" font-size="8" font-weight="800" font-family="Inter,system-ui,sans-serif" fill="#121212">P</text></svg>',
    pantry: '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><circle cx="8" cy="8" r="6.2" fill="#f5d000" stroke="#121212" stroke-width="1.2"/><path d="M4.5 7.2h7v1.4c0 2-1.6 3.6-3.5 3.6S4.5 10.6 4.5 8.6z" fill="#121212"/></svg>',
    schools: '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><circle cx="8" cy="8" r="6.2" fill="#f0a500" stroke="#121212" stroke-width="1.2"/><path d="M3.8 8.2 L8 5.4 L12.2 8.2 V12 H3.8z" fill="#121212"/><rect x="7.2" y="9.2" width="1.6" height="2.8" fill="#f0a500"/></svg>',
    wifi: '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><circle cx="8" cy="8" r="6.2" fill="#2dd4bf" stroke="#121212" stroke-width="1.2"/><path d="M5 8.2a4 4 0 0 1 6 0 M6.2 9.5a2.2 2.2 0 0 1 3.6 0" fill="none" stroke="#121212" stroke-width="1.3" stroke-linecap="round"/><circle cx="8" cy="11.2" r="0.9" fill="#121212"/></svg>',
    emergency: '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><circle cx="8" cy="8" r="6.2" fill="#ef4444" stroke="#121212" stroke-width="1.2"/><text x="8" y="11.2" text-anchor="middle" font-size="8" font-weight="800" font-family="Inter,system-ui,sans-serif" fill="#fff">!</text></svg>'
  };

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
      rows[i].style.opacity = on ? "1" : "0.45";
      rows[i].setAttribute("aria-checked", on ? "true" : "false");
      rows[i].setAttribute("aria-pressed", on ? "true" : "false");
    }
  }

  function addOverlay(id, feats) {
    var map = findMap(), L = window.L;
    if (!map || !L || !L.layerGroup) return;
    if (groups[id]) try { map.removeLayer(groups[id]); } catch (e) {}
    var g = L.layerGroup(), color = COLOR[id] || "#c513af";
    var glyph = GLYPH[id];
    for (var i = 0; i < feats.length; i++) {
      var feat = feats[i], geo = feat && feat.geometry;
      if (!geo || geo.type !== "Point" || !geo.coordinates) continue;
      var ll = [geo.coordinates[1], geo.coordinates[0]];
      if (!isFinite(ll[0]) || !isFinite(ll[1])) continue;
      var props = feat.properties || {};
      var name = props.name || props.title || id;
      var html = glyph
        ? '<div class="chica-overlay-mark">' + glyph + "</div>"
        : '<div class="chica-overlay-mark" style="width:16px;height:16px;border-radius:999px;background:' + color + ';border:2px solid #121212"></div>';
      L.marker(ll, {
        icon: L.divIcon({ className: "chica-overlay-pin", html: html, iconSize: [18, 18], iconAnchor: [9, 9] }),
        title: name,
        alt: name + " \u2014 " + id,
        keyboard: false
      }).addTo(g);
      if (id === "schools" && Number(props.radius_ft) > 0) {
        L.circle(ll, {
          radius: Number(props.radius_ft) * 0.3048,
          color: color,
          weight: 1.4,
          dashArray: "4 4",
          fillColor: color,
          fillOpacity: 0.1,
          interactive: false
        }).addTo(g);
      }
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
    fetch((SRC[id] || "") + "?v=10", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (data) {
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
      var on = !document.documentElement.classList.contains("chica-intel-off");
      document.documentElement.classList.toggle("chica-intel-on", on);
      dimRow("intel", on);
      try { window.dispatchEvent(new Event("chica-intel")); } catch (e) {}
      if (typeof window.__chicaStampIntel === "function") window.__chicaStampIntel();
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
