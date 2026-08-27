/* Chicas Map — KEY is one layer list. Symbol sits next to every name.
   Creates the Key if React no longer ships the aside.
   Sale rows filter pins. Overlay rows load city GeoJSON onto Leaflet.
   Intel never defaults on. Emergency stays dormant unless ?emergency=1.
*/
(function () {
  if (!/\/map\/?$/.test(location.pathname || "") && (location.pathname || "").indexOf("/map/") === -1) return;

  var BASE = "/Chicas-Map";
  var INTEL_CFG = BASE + "/data/sale-intel.json";
  var INTEL_ICON = BASE + "/images/intel-brain.svg?v=2";
  var SAT_STORE = "chicas-map-layer-sat";
  var KEY_STORE = "chicas-map-key-open";
  var intelRadius = 200;
  var openedKey = false;
  var overlayCache = {};
  var overlayGroups = {};

  function readSat() {
    try { return localStorage.getItem(SAT_STORE) === "1"; } catch (e) { return false; }
  }
  function writeSat(on) {
    try { localStorage.setItem(SAT_STORE, on ? "1" : "0"); } catch (e) {}
  }
  function emergencyOn() {
    try {
      if (window.CHICA_EMERGENCY_DEPLOY === true) return true;
      return new URLSearchParams(location.search).get("emergency") === "1";
    } catch (e) { return false; }
  }

  var state = {
    garage: true, estate: true, permit: true, intel: false,
    satellite: readSat(), parking: false, pantry: false, schools: false,
    wifi: false, claimed: true, events: false, emergency: false,
  };

  var LAYERS = [
    { id: "garage", kind: "sale", re: /garage|yard/, label: "Garage sale" },
    { id: "estate", kind: "sale", re: /estate/, label: "Estate sale" },
    { id: "permit", kind: "sale", re: /permit/, label: "City permit" },
    { id: "intel", kind: "intel", re: /intel|inteligencia/, label: "Intel" },
    { id: "satellite", kind: "basemap", re: /satellite|sat[e\u00e9]lite/, label: "Satellite" },
    { id: "parking", kind: "overlay", re: /parking|estacionamiento/, label: "Parking", src: BASE + "/data/san-antonio-downtown-parking.geojson" },
    { id: "pantry", kind: "overlay", re: /pantr|despensa/, label: "Pantries", src: BASE + "/data/san-antonio-24h-food-pantries.geojson" },
    { id: "schools", kind: "overlay", re: /school|escolar/, label: "School zones", src: BASE + "/data/zone-aware-schools.geojson" },
    { id: "wifi", kind: "overlay", re: /wi-?fi/, label: "Wi-Fi", src: BASE + "/data/san-antonio-public-wifi.geojson" },
    { id: "claimed", kind: "claimed", re: /claimed|\$5/, label: "Claimed $5" },
  ];
  if (emergencyOn()) {
    LAYERS.push({ id: "emergency", kind: "overlay", re: /emergency|resilience/, label: "Emergency hubs", src: BASE + "/data/san-antonio-emergency-info.geojson" });
  }

  function svg(inner) {
    return '<svg class="chica-key-sym" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">' + inner + "</svg>";
  }
  function symbolHtml(id) {
    if (id === "garage") return svg('<circle cx="8" cy="8" r="5.2" fill="#c513af" stroke="#121212" stroke-width="1.4"/>');
    if (id === "estate") return svg('<polygon points="8,1.8 14.4,8 8,14.2 1.6,8" fill="#f4f4f4" stroke="#121212" stroke-width="1.4"/>');
    if (id === "permit") return svg('<polygon points="8,2.2 14.2,13.6 1.8,13.6" fill="#8a8a8a" stroke="#121212" stroke-width="1.4"/>');
    if (id === "intel") return '<img class="chica-key-sym" src="' + INTEL_ICON + '" width="14" height="14" alt="" aria-hidden="true" />';
    if (id === "satellite") return svg('<circle cx="8" cy="8" r="6" fill="#0b3d62" stroke="#121212" stroke-width="1.2"/><circle cx="6.2" cy="7" r="1.6" fill="#7dd3fc"/><path d="M3.4 11.2 C5.2 9.4 10.6 9.6 12.6 11.4" fill="#22c55e"/>');
    if (id === "parking") return svg('<rect x="2.2" y="2.2" width="11.6" height="11.6" rx="2" fill="#38bdf8" stroke="#0369a1" stroke-width="1.2"/><text x="8" y="11.2" text-anchor="middle" font-size="8.2" font-weight="800" font-family="Inter,system-ui,sans-serif" fill="#082f49">P</text>');
    if (id === "pantry") return svg('<ellipse cx="8" cy="5.2" rx="4.2" ry="1.5" fill="#f5d000" stroke="#5c4a00" stroke-width="1.1"/><path d="M3.8 5.2 V12.2 C3.8 13.6 11.8 13.6 12.2 12.2 V5.2" fill="#f5d000" stroke="#5c4a00" stroke-width="1.1"/>');
    if (id === "schools") return svg('<circle cx="8" cy="8" r="6.1" fill="none" stroke="#f0a500" stroke-width="1.6"/><path d="M3.4 9.2 L8 4.6 L12.6 9.2 V12.4 H3.4Z" fill="#f0a500" stroke="#7a5200" stroke-width="1"/>');
    if (id === "wifi") return svg('<path d="M3.2 7.2 A6.2 6.2 0 0 1 12.8 7.2" fill="none" stroke="#2dd4bf" stroke-width="1.5" stroke-linecap="round"/><path d="M5.2 9.4 A3.6 3.6 0 0 1 10.8 9.4" fill="none" stroke="#2dd4bf" stroke-width="1.5" stroke-linecap="round"/><circle cx="8" cy="12.1" r="1.15" fill="#2dd4bf"/>');
    if (id === "claimed") return svg('<circle cx="8" cy="7.2" r="5.2" fill="#f4c430" stroke="#c513af" stroke-width="1.4"/><text x="8" y="10" text-anchor="middle" font-size="6.4" font-weight="800" font-family="Inter,system-ui,sans-serif" fill="#1a1204">$</text>');
    if (id === "emergency") return svg('<circle cx="8" cy="8" r="6" fill="#7f1d1d" stroke="#121212" stroke-width="1.2"/><path d="M8 4.4 V9.2" stroke="#fecaca" stroke-width="1.6" stroke-linecap="round"/><circle cx="8" cy="11.4" r="0.9" fill="#fecaca"/>');
    return "";
  }
  function overlayColor(id) {
    if (id === "parking") return "#38bdf8";
    if (id === "pantry") return "#f5d000";
    if (id === "schools") return "#f0a500";
    if (id === "wifi") return "#2dd4bf";
    if (id === "emergency") return "#ef4444";
    return "#c513af";
  }
  function findMap() {
    var nodes = document.querySelectorAll(".leaflet-container");
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      for (var k in el) {
        try { var v = el[k]; if (v && typeof v.flyTo === "function" && typeof v.addLayer === "function") return v; } catch (e) {}
      }
    }
    return null;
  }
  function panel() {
    var existing = document.getElementById("chica-key");
    if (existing) return existing;
    var asides = document.querySelectorAll("aside");
    for (var i = 0; i < asides.length; i++) {
      var a = asides[i];
      var lab = (a.getAttribute("aria-label") || "").toLowerCase();
      if (lab === "key") return a;
      if ((a.textContent || "").trim().toUpperCase().indexOf("KEY") === 0) return a;
    }
    return null;
  }
  function ensureStyle() {
    if (document.getElementById("chica-key-style")) return;
    var s = document.createElement("style");
    s.id = "chica-key-style";
    s.textContent = "#chica-key{position:fixed;left:12px;bottom:calc(88px + env(safe-area-inset-bottom));z-index:2147483644;width:min(220px,calc(100vw - 24px));max-height:min(58dvh,420px);overflow:auto;background:#1a1714f2;color:#f3eee4;border:1px solid #3a342e;border-radius:16px;box-shadow:0 12px 32px rgba(0,0,0,.42);backdrop-filter:blur(10px);font:500 12px/1.25 Inter,system-ui,sans-serif;padding:8px 10px 10px}#chica-key[data-collapsed=true]{max-height:44px;overflow:hidden}#chica-key .chica-key-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 6px}#chica-key .chica-key-title{margin:0;font:800 11px/1 Inter,system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#f3eee4}#chica-key .chica-key-toggle{border:0;background:transparent;color:#f3eee4;font:700 16px/1 Inter,system-ui,sans-serif;cursor:pointer;padding:2px 4px}#chica-key ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:4px}#chica-key li[role=button]{display:flex;align-items:center;gap:8px;padding:5px 4px;border-radius:8px;cursor:pointer}#chica-key li[role=button]:hover{background:rgba(255,255,255,.06)}#chica-key .chica-key-sym{flex:0 0 14px;width:14px;height:14px;object-fit:contain;display:block}#chica-key .chica-key-name{font-size:12px;font-weight:500;line-height:1.2}.chica-intel-badge{position:absolute;right:-5px;top:-6px;width:14px;height:14px;border-radius:999px;background:#c513af;box-shadow:0 0 0 2px #fffdf8;display:none;z-index:3;pointer-events:none}.chica-intel-badge img{width:12px;height:12px;display:block;margin:1px auto}html.chica-intel-on .leaflet-marker-icon .chica-intel-badge,html.chica-intel-on .chica-sym .chica-intel-badge{display:block}#chica-intel-btn[aria-pressed=\"true\"]{filter:brightness(1.08)}#chica-intel-btn[aria-pressed=\"false\"]{opacity:.55}.leaflet-control-attribution{font-size:10px}.chica-overlay-pin{border:0;background:transparent}@media (max-width:480px){#chica-key{left:8px;width:min(196px,calc(100vw - 88px))}}";
    (document.head || document.documentElement).appendChild(s);
  }
  function ensurePanel() {
    var p = panel();
    if (p) return p;
    if (!document.querySelector(".leaflet-container")) return null;
    p = document.createElement("aside");
    p.id = "chica-key";
    p.setAttribute("aria-label", "Key");
    var open = true;
    try { open = localStorage.getItem(KEY_STORE) !== "0"; } catch (e) {}
    p.setAttribute("data-collapsed", open ? "false" : "true");
    p.innerHTML = '<div class="chica-key-head"><p class="chica-key-title">Key</p><button type="button" class="chica-key-toggle" aria-expanded="' + (open ? "true" : "false") + '" aria-label="Toggle key">' + (open ? "\u2013" : "+") + '</button></div><ul data-chica-overlays="1"></ul>';
    document.body.appendChild(p);
    var btn = p.querySelector(".chica-key-toggle");
    btn.addEventListener("click", function (ev) {
      ev.preventDefault(); ev.stopPropagation();
      var next = p.getAttribute("data-collapsed") !== "true";
      p.setAttribute("data-collapsed", next ? "true" : "false");
      btn.setAttribute("aria-expanded", next ? "false" : "true");
      btn.textContent = next ? "+" : "\u2013";
      try { localStorage.setItem(KEY_STORE, next ? "0" : "1"); } catch (e) {}
    });
    return p;
  }
  function pinKind(el) {
    var html = el.innerHTML || "";
    if (html.indexOf('polygon points="8,1.6') !== -1) return "boost";
    if (html.indexOf('polygon points="8,2.2') !== -1) return "estate";
    if (html.indexOf('polygon points="8,2.4') !== -1) return "permit";
    if (html.indexOf('fill="#f6f6f6"') !== -1) return "you";
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
      if (pins[i].closest("#chica-key")) continue;
      if (pins[i].querySelector && pins[i].querySelector(".chica-overlay-mark")) continue;
      var kind = pinKind(pins[i]);
      var on = true;
      if (kind === "garage" || kind === "estate" || kind === "permit") on = state[kind];
      else if (kind === "boost") on = state.garage || state.estate || state.permit;
      var wrap = pins[i].closest(".leaflet-marker-icon") || pins[i];
      if (kind) wrap.style.display = on ? "" : "none";
    }
  }
  function stampBadges() {
    if (!state.intel) return;
    var pins = document.querySelectorAll(".leaflet-marker-icon, .chica-sym");
    for (var i = 0; i < pins.length; i++) {
      var host = pins[i];
      if (host.querySelector(".chica-intel-badge")) continue;
      if ((host.getAttribute("title") || "") === "You") continue;
      if (host.querySelector && host.querySelector(".chica-overlay-mark")) continue;
      var mark = document.createElement("span");
      mark.className = "chica-intel-badge";
      mark.innerHTML = '<img src="' + INTEL_ICON + '" alt="" width="12" height="12" />';
      if (getComputedStyle(host).position === "static") host.style.position = "relative";
      host.appendChild(mark);
    }
  }
  function applyIntel() {
    document.documentElement.classList.toggle("chica-intel-on", state.intel);
    if (state.intel) stampBadges();
    else {
      var badges = document.querySelectorAll(".chica-intel-badge");
      for (var i = 0; i < badges.length; i++) badges[i].style.display = "none";
    }
    var row = document.querySelector('[data-chica-layer="intel"]');
    if (row) styleRow(row, state.intel);
  }
  function applySat() {
    document.documentElement.classList.toggle("chica-sat-on", state.satellite);
    writeSat(state.satellite);
    try { window.dispatchEvent(new Event("chica-sat")); } catch (e) {}
    var row = document.querySelector('[data-chica-layer="satellite"]');
    if (row) styleRow(row, state.satellite);
  }
  function applyClaimed() {
    var layer = document.getElementById("chica-claimed-layer");
    if (layer) layer.style.display = state.claimed ? "" : "none";
    var row = document.querySelector('[data-chica-layer="claimed"]');
    if (row) styleRow(row, state.claimed);
  }
  function popupHtml(props, id) {
    var name = (props && (props.name || props.title)) || id;
    var addr = (props && (props.address || props.addr)) || "";
    var extra = "";
    if (props) {
      if (props.hours) extra += "<div>" + String(props.hours).replace(/</g, "") + "</div>";
      if (props.ssid) extra += "<div>SSID " + String(props.ssid).replace(/</g, "") + "</div>";
      if (props.rates) extra += "<div>" + String(props.rates).replace(/</g, "") + "</div>";
      if (props.district) extra += "<div>" + String(props.district).replace(/</g, "") + "</div>";
    }
    return "<strong>" + String(name).replace(/</g, "") + "</strong>" + (addr ? "<div>" + String(addr).replace(/</g, "") + "</div>" : "") + extra;
  }
  function featureLatLng(feat) {
    var g = feat && feat.geometry;
    if (!g || !g.coordinates || g.type !== "Point") return null;
    return [g.coordinates[1], g.coordinates[0]];
  }
  function buildGroup(id, feats) {
    var L = window.L;
    if (!L || !L.layerGroup) return null;
    var group = L.layerGroup();
    var color = overlayColor(id);
    for (var i = 0; i < feats.length; i++) {
      var feat = feats[i];
      var ll = featureLatLng(feat);
      if (!ll || !isFinite(ll[0]) || !isFinite(ll[1])) continue;
      var props = feat.properties || {};
      var r = id === "schools" && props.radius_ft ? 8 : 7;
      var html = '<div class="chica-overlay-mark" style="width:' + (r * 2) + "px;height:" + (r * 2) + "px;border-radius:999px;background:" + color + ';border:2px solid #121212;box-shadow:0 0 0 1px rgba(255,255,255,.35)"></div>';
      var icon = L.divIcon({ className: "chica-overlay-pin", html: html, iconSize: [r * 2, r * 2], iconAnchor: [r, r] });
      var marker = L.marker(ll, { icon: icon, title: props.name || id, keyboard: false });
      marker.bindPopup(popupHtml(props, id), { maxWidth: 240 });
      marker.addTo(group);
      if (id === "schools" && Number(props.radius_ft) > 0) {
        L.circle(ll, { radius: Number(props.radius_ft) * 0.3048, color: color, weight: 1, fillColor: color, fillOpacity: 0.08, interactive: false }).addTo(group);
      }
    }
    return group;
  }
  function setOverlay(id, on, spec) {
    var map = findMap();
    var row = document.querySelector('[data-chica-layer="' + id + '"]');
    if (row) styleRow(row, on);
    if (!on) {
      if (overlayGroups[id] && map) { try { map.removeLayer(overlayGroups[id]); } catch (e) {} }
      return;
    }
    function attach(feats) {
      var live = findMap();
      if (!live || !window.L) return;
      if (overlayGroups[id]) { try { live.removeLayer(overlayGroups[id]); } catch (e) {} }
      var group = buildGroup(id, feats || []);
      if (!group) return;
      overlayGroups[id] = group;
      group.addTo(live);
    }
    if (overlayCache[id]) { attach(overlayCache[id]); return; }
    fetch(spec.src + "?v=4", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (data) {
      var feats = data && data.features ? data.features : [];
      overlayCache[id] = feats;
      if (state[id]) attach(feats);
    }).catch(function () {});
  }
  function styleRow(row, on) {
    row.setAttribute("aria-pressed", on ? "true" : "false");
    row.style.opacity = on ? "1" : "0.38";
    row.style.cursor = "pointer";
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.gap = "8px";
    row.style.listStyle = "none";
  }
  function decorateRow(row, spec) {
    if (row.getAttribute("data-chica-sym") === spec.id) return;
    row.setAttribute("data-chica-sym", spec.id);
    row.innerHTML = symbolHtml(spec.id) + '<span class="chica-key-name">' + spec.label.replace(/</g, "") + "</span>";
  }
  function wireRow(row, spec) {
    decorateRow(row, spec);
    if (row.getAttribute("data-chica-layer") === spec.id) { styleRow(row, state[spec.id]); return; }
    row.setAttribute("data-chica-layer", spec.id);
    row.setAttribute("role", "button");
    row.tabIndex = 0;
    styleRow(row, state[spec.id]);
    function tog(ev) {
      ev.preventDefault(); ev.stopPropagation();
      state[spec.id] = !state[spec.id];
      styleRow(row, state[spec.id]);
      if (spec.kind === "sale") applyPins();
      else if (spec.kind === "intel") applyIntel();
      else if (spec.kind === "basemap") applySat();
      else if (spec.kind === "claimed") applyClaimed();
      else setOverlay(spec.id, state[spec.id], spec);
    }
    row.addEventListener("click", tog, true);
    row.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") tog(e); });
  }
  function hideHeadings(p) {
    var nodes = p.querySelectorAll("p,h2,h3,h4,span,div,strong");
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].classList && nodes[i].classList.contains("chica-key-title")) continue;
      var t = (nodes[i].textContent || "").replace(/\s+/g, " ").trim();
      if (/^(SALES|LAYERS|VENTAS|CAPAS)$/i.test(t)) nodes[i].style.display = "none";
    }
  }
  function scrubCredit() {
    var nodes = document.querySelectorAll(".leaflet-control-attribution");
    for (var i = 0; i < nodes.length; i++) {
      if (/CARTO|carto/i.test(nodes[i].textContent || "")) {
        nodes[i].innerHTML = '<a href="https://leafletjs.com" target="_blank" rel="noreferrer">Leaflet</a> \u00a9 Esri';
      }
    }
  }
  function ensureOverlays(p) {
    var wrap = p.querySelector("[data-chica-overlays]");
    if (!wrap) {
      wrap = document.createElement("ul");
      wrap.setAttribute("data-chica-overlays", "1");
      wrap.style.cssText = "list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:4px";
      p.appendChild(wrap);
    }
    for (var i = 0; i < LAYERS.length; i++) {
      var spec = LAYERS[i];
      if (p.querySelector('[data-chica-layer="' + spec.id + '"]')) continue;
      var li = document.createElement("li");
      li.textContent = spec.label;
      wrap.appendChild(li);
      wireRow(li, spec);
    }
  }
  function hideDup() {
    var labels = /^(All|Garage|Estate|Permit|Intel|Satellite|Parking|Pantries|School zones|Wi-Fi|Claimed \$5)$/i;
    var btns = document.querySelectorAll("button[aria-pressed]");
    for (var i = 0; i < btns.length; i++) {
      var t = (btns[i].textContent || "").replace(/\s+/g, " ").trim();
      if (!labels.test(t) || btns[i].closest("aside") || btns[i].closest("#chica-key")) continue;
      if (btns[i].id === "chica-intel-btn" || btns[i].id === "chica-fs-btn") continue;
      btns[i].classList.add("chica-dup-chip");
    }
  }
  function wire() {
    ensureStyle();
    var p = ensurePanel();
    if (!p) return;
    hideHeadings(p);
    scrubCredit();
    var items = p.querySelectorAll("li");
    for (var i = 0; i < items.length; i++) {
      var t = (items[i].textContent || "").toLowerCase();
      for (var j = 0; j < LAYERS.length; j++) {
        if (LAYERS[j].re.test(t)) { wireRow(items[i], LAYERS[j]); break; }
      }
    }
    ensureOverlays(p);
    hideDup();
    applyPins();
    applyIntel();
    applySat();
    applyClaimed();
  }
  function boot() {
    fetch(INTEL_CFG, { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (cfg) {
      if (!cfg) return;
      var n = Number(cfg.radius_m);
      if (n > 0) intelRadius = n;
    }).catch(function () {});
    wire();
    setInterval(wire, 900);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
