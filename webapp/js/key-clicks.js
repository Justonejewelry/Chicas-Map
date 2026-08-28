/* Document-level KEY clicks. React owns one panel; force-key owns the other. */
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
  function labelToId(text) {
    var t = String(text || "").toLowerCase().replace(/\s+/g, " ");
    if (t.indexOf("pin it") !== -1) return "listit";
    if (t.indexOf("chicas pack") !== -1) return "claimed";
    if (t.indexOf("garage") !== -1) return "garage";
    if (t.indexOf("estate") !== -1) return "estate";
    if (t.indexOf("permit") !== -1) return "permit";
    if (t.indexOf("intel") !== -1) return "intel";
    if (t.indexOf("satellite") !== -1) return "satellite";
    if (t.indexOf("parking") !== -1) return "parking";
    if (t.indexOf("pantr") !== -1) return "pantry";
    if (t.indexOf("school") !== -1) return "schools";
    if (t.indexOf("wi-fi") !== -1 || t.indexOf("wifi") !== -1) return "wifi";
    if (t.indexOf("emergency") !== -1) return "emergency";
    return "";
  }
  function looksLikeKey(el) {
    if (!el) return false;
    if (el.id === "chica-key" || el.id === "chica-force-key") return true;
    var t = el.innerText || "";
    return /Garage sale/i.test(t) && /Satellite/i.test(t);
  }
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
    for (var i = 0; i < rows.length; i++) rows[i].style.opacity = on ? "1" : "0.38";
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
      L.marker(ll, { icon: L.divIcon({ className: "chica-overlay-pin", html: html, iconSize: [14, 14], iconAnchor: [7, 7] }), title: name, keyboard: false }).addTo(g);
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
    fetch((SRC[id] || "") + "?v=7", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (data) {
      cache[id] = data && data.features ? data.features : [];
      if (document.documentElement.classList.contains("chica-ov-" + id)) addOverlay(id, cache[id]);
    }).catch(function () { cache[id] = []; });
  }
  function fallbackToggle(id) {
    if (id === "satellite") {
      document.documentElement.classList.toggle("chica-sat-on");
      var sat = document.documentElement.classList.contains("chica-sat-on");
      dimRow("satellite", sat);
      try { localStorage.setItem("chicas-map-layer-sat", sat ? "1" : "0"); } catch (e) {}
      try { window.dispatchEvent(new Event("chica-sat")); } catch (e) {}
      return;
    }
    if (id === "intel") {
      document.documentElement.classList.toggle("chica-intel-on");
      dimRow("intel", document.documentElement.classList.contains("chica-intel-on"));
      return;
    }
    if (id === "listit") { location.href = BASE + "/claim"; return; }
    if (id === "claimed") {
      var layer = document.getElementById("chica-claimed-layer");
      if (layer) layer.style.display = layer.style.display === "none" ? "" : "none";
      return;
    }
    if (SRC[id]) { toggleOverlay(id); return; }
    if (id === "garage" || id === "estate" || id === "permit") {
      document.documentElement.classList.toggle("chica-hide-" + id);
      var hide = document.documentElement.classList.contains("chica-hide-" + id);
      dimRow(id, !hide);
      var pins = document.querySelectorAll(".leaflet-marker-icon, .chica-sym, .chica-pin");
      for (var i = 0; i < pins.length; i++) {
        if (pins[i].querySelector && pins[i].querySelector(".chica-overlay-mark")) continue;
        var html = pins[i].innerHTML || "";
        var match = false;
        if (id === "estate" && html.indexOf("polygon points=") !== -1) match = true;
        else if (id === "permit" && html.indexOf("polygon points=") !== -1) match = true;
        else if (id === "garage" && html.indexOf("circle cx") !== -1) match = true;
        if (match) pins[i].style.display = hide ? "none" : "";
      }
    }
  }
  if (typeof window.__chicaToggleLayer !== "function") {
    window.__chicaToggleLayer = function (id) { fallbackToggle(id); };
  }
  document.addEventListener("click", function (ev) {
    var t = ev.target;
    if (!t || !t.closest) return;
    if (t.closest("#chica-force-key")) return;
    var host = t.closest("#chica-key, aside");
    if (!looksLikeKey(host)) return;
    if (t.closest(".tog, .chica-key-toggle")) return;
    var row = t.closest("[data-chica-layer], li, button, [role='switch'], label");
    var id = (row && row.getAttribute && row.getAttribute("data-chica-layer")) || "";
    if (!id && row) id = labelToId(row.textContent);
    if (!id) id = labelToId(t.textContent);
    if (!id) return;
    ev.preventDefault();
    ev.stopPropagation();
    if (ev.stopImmediatePropagation) ev.stopImmediatePropagation();
    fallbackToggle(id);
  }, true);
})();
