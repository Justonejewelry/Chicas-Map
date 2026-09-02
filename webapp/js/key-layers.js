/* Chicas Map KEY.
   Intel is NOT nearby parking / pantry / Wi-Fi / schools.
   Intel is driveway notes on THAT pin, GPS-gated at 200 ft (pin-details.js).
   Resale Trail (thrift/resale/flea) auto-enabled Mon–Thu; user toggle still respected.
*/
(function () {
  function onMapPath() {
    var p = location.pathname || "";
    return /\/map\/?$/.test(p) || p.indexOf("/map/") !== -1 || /map\.html$/.test(p);
  }
  if (!onMapPath()) return;
  var BASE = "/Chicas-Map";
  function isWeekday() {
    // Mon=1 ... Thu=4  (0=Sun, 6=Sat)
    var d = new Date().getDay();
    return d >= 1 && d <= 4;
  }
  function defaultThrift() {
    // Prefer Resale Trail Mon-Thu unless user has already toggled it
    return isWeekday();
  }
  var SAT_STORE = "chicas-map-layer-sat";
  var KEY_STORE = "chicas-map-key-open-v2";
  var LAYER_STORE = "chicas-map-key-layers";
  var overlayCache = {}, overlayGroups = {}, panelWired = false;
  function readSat() { try { return localStorage.getItem(SAT_STORE) === "1"; } catch (e) { return false; } }
  function writeSat(on) { try { localStorage.setItem(SAT_STORE, on ? "1" : "0"); } catch (e) {} }
  function emergencyOn() {
    try { return window.CHICA_EMERGENCY_DEPLOY === true || new URLSearchParams(location.search).get("emergency") === "1"; }
    catch (e) { return false; }
  }
  function loadLayerState() { try { var r = localStorage.getItem(LAYER_STORE); return r ? JSON.parse(r) : {}; } catch (e) { return {}; } }
  function saveLayerState() {
    try {
      localStorage.setItem(LAYER_STORE, JSON.stringify({
        garage: state.garage,
        estate: state.estate,
        permit: state.permit,
        satellite: state.satellite,
        parking: state.parking,
        pantry: state.pantry,
        schools: state.schools,
        wifi: state.wifi,
        claimed: state.claimed,
        thrift: state.thrift,
        emergency: state.emergency
      }));
    } catch (e) {}
  }
  var saved = loadLayerState();
  var state = {
    garage: saved.garage !== false,
    estate: saved.estate !== false,
    permit: saved.permit !== false,
    satellite: typeof saved.satellite === "boolean" ? saved.satellite : readSat(),
    parking: saved.parking === true,
    pantry: saved.pantry === true,
    schools: saved.schools === true,
    wifi: saved.wifi === true,
    claimed: saved.claimed !== false,
    thrift: ("thrift" in saved) ? !!saved.thrift : defaultThrift(),
    events: false,
    emergency: saved.emergency === true && emergencyOn()
  };
  var LAYERS = [
    { id: "garage", kind: "sale", label: "Garage sale" },
    { id: "estate", kind: "sale", label: "Estate sale" },
    { id: "permit", kind: "sale", label: "City permit" },
    { id: "satellite", kind: "basemap", label: "Satellite" },
    { id: "parking", kind: "overlay", label: "Parking", src: BASE + "/data/san-antonio-downtown-parking.geojson" },
    { id: "pantry", kind: "overlay", label: "Pantries", src: BASE + "/data/san-antonio-24h-food-pantries.geojson" },
    { id: "schools", kind: "overlay", label: "School zones", src: BASE + "/data/zone-aware-schools.geojson" },
    { id: "wifi", kind: "overlay", label: "Wi-Fi", src: BASE + "/data/san-antonio-public-wifi.geojson" },
    { id: "claimed", kind: "claimed", label: "Chicas Pack" },
    { id: "thrift", kind: "overlay", label: "Resale Trail", src: BASE + "/data/san-antonio-thrift.geojson" },
    { id: "listit", kind: "cta", label: "Pin it \u00b7 $5", href: BASE + "/claim", hint: "List it. Sell it. Done." }
  ];
  if (emergencyOn()) LAYERS.push({ id: "emergency", kind: "overlay", label: "Emergency hubs", src: BASE + "/data/san-antonio-emergency-info.geojson" });
  var specById = {};
  for (var si = 0; si < LAYERS.length; si++) specById[LAYERS[si].id] = LAYERS[si];
  function esc(s) { return String(s == null ? "" : s); }
  function svg(inner) { return '<svg class="chica-key-sym" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">' + inner + "</svg>"; }
  function symbolHtml(id) {
    if (id === "garage") return svg('<circle cx="8" cy="8" r="5.2" fill="#c513af" stroke="#121212" stroke-width="1.4"/>');
    if (id === "estate") return svg('<polygon points="8,1.8 14.4,8 8,14.2 1.6,8" fill="#f4f4f4" stroke="#121212" stroke-width="1.4"/>');
    if (id === "permit") return svg('<polygon points="8,2.2 14.2,13.6 1.8,13.6" fill="#8a8a8a" stroke="#121212" stroke-width="1.4"/>');
    if (id === "satellite") return svg('<circle cx="8" cy="8" r="6" fill="#0b3d62" stroke="#121212" stroke-width="1.2"/>');
    if (id === "parking") return svg('<rect x="2.2" y="2.2" width="11.6" height="11.6" rx="2" fill="#38bdf8" stroke="#0369a1" stroke-width="1.2"/>');
    if (id === "pantry") return svg('<ellipse cx="8" cy="5.2" rx="4.2" ry="1.5" fill="#f5d000" stroke="#5c4a00" stroke-width="1.1"/>');
    if (id === "schools") return svg('<circle cx="8" cy="8" r="6.1" fill="none" stroke="#f0a500" stroke-width="1.6"/>');
    if (id === "wifi") return svg('<path d="M3.2 7.2 A6.2 6.2 0 0 1 12.8 7.2" fill="none" stroke="#2dd4bf" stroke-width="1.5"/><circle cx="8" cy="12.1" r="1.15" fill="#2dd4bf"/>');
    if (id === "thrift") return svg('<circle cx="8" cy="8" r="5.2" fill="#C47A4A" stroke="#f3eee4" stroke-width="1.3"/><path d="M4.8 9.2 Q8 6.8 11.2 9.2" fill="none" stroke="#f3eee4" stroke-width="1.4" stroke-linecap="round"/><path d="M5.5 10.4 Q8 8.4 10.5 10.4" fill="none" stroke="#f3eee4" stroke-width="1.1" stroke-linecap="round" opacity="0.85"/>');
    if (id === "claimed" || id === "listit") return svg('<circle cx="8" cy="7.2" r="5.2" fill="#c513af" stroke="#121212" stroke-width="1.4"/>');
    if (id === "emergency") return svg('<circle cx="8" cy="8" r="6" fill="#7f1d1d" stroke="#121212" stroke-width="1.2"/>');
    return "";
  }
  function overlayColor(id) { return ({ parking: "#38bdf8", pantry: "#f5d000", schools: "#f0a500", wifi: "#2dd4bf", thrift: "#C47A4A", emergency: "#ef4444" })[id] || "#c513af"; }
  function findMap() {
    if (window.__chicaLeaflet && typeof window.__chicaLeaflet.flyTo === "function") return window.__chicaLeaflet;
    var nodes = document.querySelectorAll(".leaflet-container");
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      for (var k in el) { try { var v = el[k]; if (v && typeof v.flyTo === "function" && typeof v.addLayer === "function") { window.__chicaLeaflet = v; return v; } } catch (e) {} }
    }
    return null;
  }
  function ensureStyle() {
    if (document.getElementById("chica-key-style")) return;
    var s = document.createElement("style");
    s.id = "chica-key-style";
    s.textContent = "#chica-key{display:block!important;visibility:visible!important;opacity:1!important;position:fixed!important;left:12px!important;bottom:calc(16px + env(safe-area-inset-bottom,0px))!important;z-index:2147483646!important;width:min(228px,calc(100vw - 24px));max-height:min(58dvh,440px);overflow:auto;background:#1a1714f2;color:#f3eee4;border:1px solid #3a342e;border-radius:16px;font:500 12px/1.25 Inter,system-ui,sans-serif;padding:8px 10px 10px;pointer-events:auto!important}#chica-key[data-collapsed=true]{max-height:44px;overflow:hidden}#chica-key ul{list-style:none;margin:0;padding:0}#chica-key li{display:flex;align-items:center;gap:8px;padding:5px 4px;border-radius:8px;cursor:pointer;min-height:32px}.chica-overlay-pin{border:0;background:transparent}.chica-opt{font:500 12px/1.35 Inter,system-ui,sans-serif;color:#1a1714;min-width:200px}.chica-opt h3{margin:0 0 4px;font:800 13px/1.2 Inter,system-ui,sans-serif}.chica-opt .meta{color:#5c5348;font-size:11px}.chica-opt .acts{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}.chica-opt a.chip{border:1px solid #c513af;border-radius:999px;padding:3px 8px;font-size:11px;color:#7a0f6c;text-decoration:none;font-weight:700}.chica-opt .tag{font-size:10px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#7a0f6c}button.chica-dup-chip,.chica-dup-chip,#chica-pin-claim,#chica-intel-btn{display:none!important}aside[aria-label=Key]:not(#chica-key),aside[aria-label=key]:not(#chica-key),[data-chica-legend]{display:none!important}.leaflet-control-layers{display:none!important}#chica-fs-btn,#chica-listit-btn,#chica-map-chrome{display:flex!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important}.leaflet-container,.chica-map{visibility:visible!important}#chica-key [data-chica-layer=intel]{display:none!important}";
    (document.head || document.documentElement).appendChild(s);
  }
  function toggleSpec(spec) {
    if (!spec) return;
    if (spec.id === "intel") return;
    if (spec.kind === "cta") { location.href = spec.href || (BASE + "/claim"); return; }
    state[spec.id] = !state[spec.id];
    saveLayerState();
    var row = document.querySelector('#chica-key [data-chica-layer="' + spec.id + '"]');
    if (row && spec.kind !== "cta") styleRow(row, state[spec.id]);
    if (spec.kind === "sale") applyPins();
    else if (spec.kind === "basemap") applySat();
    else if (spec.kind === "claimed") applyClaimed();
    else if (spec.kind === "overlay") setOverlay(spec.id, state[spec.id], spec);
  }
  function bindPanel(p) {
    if (panelWired || !p) return;
    panelWired = true;
    p.addEventListener("click", function (ev) {
      var t = ev.target; if (!t || !t.closest) return;
      if (t.closest(".chica-key-toggle")) return;
      var row = t.closest("[data-chica-layer]");
      if (!row || !p.contains(row)) return;
      ev.preventDefault(); ev.stopPropagation();
      toggleSpec(specById[row.getAttribute("data-chica-layer")]);
    }, true);
    p.addEventListener("keydown", function (ev) {
      if (ev.key !== "Enter" && ev.key !== " ") return;
      var row = ev.target && ev.target.closest && ev.target.closest("[data-chica-layer]");
      if (!row) return;
      ev.preventDefault();
      toggleSpec(specById[row.getAttribute("data-chica-layer")]);
    }, true);
  }
  function ensurePanel() {
    var p = document.getElementById("chica-key");
    if (!p) {
      p = document.createElement("aside");
      p.id = "chica-key";
      p.setAttribute("aria-label", "Key");
      var open = true;
      try { if (localStorage.getItem(KEY_STORE) === "0") open = false; else if (localStorage.getItem(KEY_STORE) === null) localStorage.setItem(KEY_STORE, "1"); } catch (e) {}
      p.setAttribute("data-collapsed", open ? "false" : "true");
      p.innerHTML = '<div style="display:flex;justify-content:space-between;margin:0 0 6px"><p style="margin:0;font:800 11px/1 Inter,system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase">Key</p><button type="button" class="chica-key-toggle" style="border:0;background:transparent;color:#f3eee4;font:700 16px/1 Inter,system-ui,sans-serif">' + (open ? "\u2013" : "+") + "</button></div><ul data-chica-overlays=\"1\"></ul>";
      document.body.appendChild(p);
      p.querySelector(".chica-key-toggle").addEventListener("click", function (ev) {
        ev.preventDefault(); ev.stopPropagation();
        var next = p.getAttribute("data-collapsed") !== "true";
        p.setAttribute("data-collapsed", next ? "true" : "false");
        ev.currentTarget.textContent = next ? "+" : "\u2013";
        try { localStorage.setItem(KEY_STORE, next ? "0" : "1"); } catch (e) {}
      });
    }
    if (p.parentNode !== document.body) document.body.appendChild(p);
    var stale = p.querySelector('[data-chica-layer="intel"]');
    if (stale) stale.remove();
    bindPanel(p);
    return p;
  }
  function pinKind(el) {
    var html = el.innerHTML || "";
    if (html.indexOf("polygon points=") !== -1 && html.indexOf("1.6") !== -1) return "boost";
    if (html.indexOf("polygon points=") !== -1 && html.indexOf("2.2") !== -1) return "estate";
    if (html.indexOf("polygon points=") !== -1 && html.indexOf("2.4") !== -1) return "permit";
    if (html.indexOf("circle cx") !== -1) return "garage";
    var title = ((el.getAttribute("title") || "") + " " + (el.getAttribute("aria-label") || "")).toLowerCase();
    if (/estate/.test(title)) return "estate";
    if (/permit/.test(title)) return "permit";
    if (/garage|yard/.test(title)) return "garage";
    return "";
  }
  function applyPins() {
    var pins = document.querySelectorAll(".chica-sym, .chica-pin, .leaflet-marker-icon");
    for (var i = 0; i < pins.length; i++) {
      if (pins[i].closest("#chica-key") || (pins[i].querySelector && pins[i].querySelector(".chica-overlay-mark"))) continue;
      var kind = pinKind(pins[i]);
      var on = true;
      if (kind === "garage" || kind === "estate" || kind === "permit") on = state[kind];
      else if (kind === "boost") on = state.garage || state.estate || state.permit;
      var wrap = pins[i].closest(".leaflet-marker-icon") || pins[i];
      if (kind) wrap.style.display = on ? "" : "none";
    }
  }
  function stripIntelChrome() {
    document.documentElement.classList.remove("chica-intel-on");
    var b = document.querySelectorAll(".chica-intel-badge");
    for (var i = 0; i < b.length; i++) b[i].remove();
    var row = document.querySelector('#chica-key [data-chica-layer="intel"]');
    if (row) row.remove();
  }
  function applySat() {
    document.documentElement.classList.toggle("chica-sat-on", state.satellite);
    writeSat(state.satellite);
    try { window.dispatchEvent(new Event("chica-sat")); } catch (e) {}
    var row = document.querySelector('#chica-key [data-chica-layer="satellite"]');
    if (row) styleRow(row, state.satellite);
  }
  function applyClaimed() {
    var layer = document.getElementById("chica-claimed-layer");
    if (layer) layer.style.display = state.claimed ? "" : "none";
    var row = document.querySelector('#chica-key [data-chica-layer="claimed"]');
    if (row) styleRow(row, state.claimed);
  }
  function dirLinks(lat, lon) {
    return '<div class="acts"><a class="chip" target="_blank" rel="noreferrer" href="https://www.google.com/maps/dir/?api=1&destination=' + lat + "," + lon + '">Google</a><a class="chip" target="_blank" rel="noreferrer" href="https://maps.apple.com/?daddr=' + lat + "," + lon + '">Apple</a><a class="chip" target="_blank" rel="noreferrer" href="https://waze.com/ul?ll=' + lat + "%2C" + lon + '&navigate=yes">Waze</a></div>';
  }
  function popupHtml(props, id, lat, lon) {
    var name = (props && (props.name || props.title)) || id;
    var addr = (props && (props.address || props.addr)) || "";
    var extra = "";
    if (props) {
      if (props.hours) extra += "<div>" + esc(props.hours) + "</div>";
      if (props.ssid) extra += "<div>SSID " + esc(props.ssid) + "</div>";
      if (props.rates || props.hourly) extra += "<div>" + esc(props.rates || props.hourly) + "</div>";
      if (props.phone) extra += "<div>" + esc(props.phone) + "</div>";
      if (props.website) extra += '<div><a href="' + esc(props.website) + '" target="_blank" rel="noreferrer">Website</a></div>';
    }
    var kind = ({ parking: "Parking", pantry: "Pantry", wifi: "Wi-Fi", schools: "School zone", thrift: "Resale Trail", emergency: "Emergency" })[id] || "Spot";
    return '<div class="chica-opt"><span class="tag">' + kind + "</span><h3>" + esc(name) + "</h3>" + (addr ? '<div class="meta">' + esc(addr) + "</div>" : "") + extra + (lat && lon ? dirLinks(lat, lon) : "") + "</div>";
  }
  function featureLatLng(feat) {
    var g = feat && feat.geometry;
    if (!g || !g.coordinates || g.type !== "Point") return null;
    return [g.coordinates[1], g.coordinates[0]];
  }
  function buildGroup(id, feats) {
    var L = window.L; if (!L || !L.layerGroup) return null;
    var group = L.layerGroup(), color = overlayColor(id);
    for (var i = 0; i < feats.length; i++) {
      var feat = feats[i], ll = featureLatLng(feat);
      if (!ll || !isFinite(ll[0]) || !isFinite(ll[1])) continue;
      var props = feat.properties || {}, r = id === "schools" && props.radius_ft ? 8 : 7;
      var html = '<div class="chica-overlay-mark" style="width:' + (r * 2) + "px;height:" + (r * 2) + "px;border-radius:999px;background:" + color + ';border:2px solid #121212"></div>';
      var marker = L.marker(ll, { icon: L.divIcon({ className: "chica-overlay-pin", html: html, iconSize: [r * 2, r * 2], iconAnchor: [r, r] }), title: props.name || id, keyboard: false });
      marker.bindPopup(popupHtml(props, id, ll[0], ll[1]), { maxWidth: 260 });
      marker.addTo(group);
      if (id === "schools" && Number(props.radius_ft) > 0) L.circle(ll, { radius: Number(props.radius_ft) * 0.3048, color: color, weight: 1, fillColor: color, fillOpacity: 0.08, interactive: false }).addTo(group);
    }
    return group;
  }
  function setOverlay(id, on, spec) {
    var map = findMap(), row = document.querySelector('#chica-key [data-chica-layer="' + id + '"]');
    if (row) styleRow(row, on);
    if (!on) { if (overlayGroups[id] && map) try { map.removeLayer(overlayGroups[id]); } catch (e) {} return; }
    function attach(feats) {
      var live = findMap(); if (!live || !window.L) return;
      if (overlayGroups[id]) try { live.removeLayer(overlayGroups[id]); } catch (e) {}
      var group = buildGroup(id, feats || []); if (!group) return;
      overlayGroups[id] = group; group.addTo(live);
    }
    if (overlayCache[id]) { attach(overlayCache[id]); return; }
    fetch(spec.src + "?v=8", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (data) {
      overlayCache[id] = data && data.features ? data.features : [];
      if (state[id]) attach(overlayCache[id]);
    }).catch(function () {});
  }
  function styleRow(row, on) {
    row.setAttribute("aria-checked", on ? "true" : "false");
    row.style.opacity = on ? "1" : "0.38";
    row.style.cursor = "pointer";
    row.style.display = "flex";
  }
  function paintRow(row, spec) {
    row.setAttribute("data-chica-layer", spec.id);
    row.setAttribute("role", spec.kind === "cta" ? "link" : "switch");
    row.tabIndex = 0;
    row.innerHTML = symbolHtml(spec.id) + '<span class="chica-key-name">' + spec.label + (spec.hint ? '<span style="display:block;font-size:10px;color:#c4b8a8">' + spec.hint + "</span>" : "") + "</span>";
    if (spec.kind === "cta") row.style.opacity = "1";
    else styleRow(row, state[spec.id]);
  }
  function ensureOverlays(p) {
    var wrap = p.querySelector("[data-chica-overlays]");
    if (!wrap) { wrap = document.createElement("ul"); wrap.setAttribute("data-chica-overlays", "1"); p.appendChild(wrap); }
    var stale = wrap.querySelector('[data-chica-layer="intel"]');
    if (stale) stale.remove();
    for (var i = 0; i < LAYERS.length; i++) {
      var spec = LAYERS[i], row = wrap.querySelector('[data-chica-layer="' + spec.id + '"]');
      if (!row) { row = document.createElement("li"); wrap.appendChild(row); }
      paintRow(row, spec);
    }
  }
  function hideDup() {
    var bar = document.getElementById("chica-pin-claim"); if (bar) bar.remove();
    var a = document.getElementById("chica-intel-btn"); if (a) a.remove();
  }
  function restoreMap() {
    var map = document.querySelector(".leaflet-container") || document.querySelector(".chica-map");
    if (!map) return;
    var n = map;
    while (n && n !== document.body) {
      if (n.style && n.style.display === "none") n.style.removeProperty("display");
      n = n.parentElement;
    }
    document.documentElement.classList.add("chica-fs-on");
  }
  function restoreOverlays() {
    for (var i = 0; i < LAYERS.length; i++) { var spec = LAYERS[i]; if (spec.kind === "overlay" && state[spec.id]) setOverlay(spec.id, true, spec); }
  }
  function wire() {
    if (!onMapPath()) return;
    ensureStyle();
    var p = ensurePanel(); if (!p) return;
    ensureOverlays(p); hideDup(); restoreMap(); applyPins(); stripIntelChrome(); applySat(); applyClaimed(); restoreOverlays();
  }
  function boot() { wire(); setInterval(wire, 900); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
