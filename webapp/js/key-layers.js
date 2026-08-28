/* Chicas Map KEY + intel options popup (combined) */
(function () {
  function onMapPath() {
    var p = location.pathname || "";
    return /\/map\/?$/.test(p) || p.indexOf("/map/") !== -1 || /map\.html$/.test(p);
  }
  if (!onMapPath()) return;
  var BASE = "/Chicas-Map";
  var INTEL_ICON = BASE + "/images/intel-brain.svg?v=2";
  var SAT_STORE = "chicas-map-layer-sat";
  var KEY_STORE = "chicas-map-key-open-v2";
  var LAYER_STORE = "chicas-map-key-layers";
  var overlayCache = {}, overlayGroups = {}, wired = {}, intelWired = false, NEAR_M = 1600;
  function readSat() { try { return localStorage.getItem(SAT_STORE) === "1"; } catch (e) { return false; } }
  function writeSat(on) { try { localStorage.setItem(SAT_STORE, on ? "1" : "0"); } catch (e) {} }
  function emergencyOn() {
    try { return window.CHICA_EMERGENCY_DEPLOY === true || new URLSearchParams(location.search).get("emergency") === "1"; }
    catch (e) { return false; }
  }
  function loadLayerState() { try { var r = localStorage.getItem(LAYER_STORE); return r ? JSON.parse(r) : {}; } catch (e) { return {}; } }
  function saveLayerState() {
    try { localStorage.setItem(LAYER_STORE, JSON.stringify({ garage: state.garage, estate: state.estate, permit: state.permit, intel: state.intel, satellite: state.satellite, parking: state.parking, pantry: state.pantry, schools: state.schools, wifi: state.wifi, claimed: state.claimed, emergency: state.emergency })); } catch (e) {}
  }
  var saved = loadLayerState();
  var state = { garage: saved.garage !== false, estate: saved.estate !== false, permit: saved.permit !== false, intel: saved.intel === true, satellite: typeof saved.satellite === "boolean" ? saved.satellite : readSat(), parking: saved.parking === true, pantry: saved.pantry === true, schools: saved.schools === true, wifi: saved.wifi === true, claimed: saved.claimed !== false, events: false, emergency: saved.emergency === true && emergencyOn() };
  var LAYERS = [
    { id: "garage", kind: "sale", label: "Garage sale" },
    { id: "estate", kind: "sale", label: "Estate sale" },
    { id: "permit", kind: "sale", label: "City permit" },
    { id: "intel", kind: "intel", label: "Intel" },
    { id: "satellite", kind: "basemap", label: "Satellite" },
    { id: "parking", kind: "overlay", label: "Parking", src: BASE + "/data/san-antonio-downtown-parking.geojson" },
    { id: "pantry", kind: "overlay", label: "Pantries", src: BASE + "/data/san-antonio-24h-food-pantries.geojson" },
    { id: "schools", kind: "overlay", label: "School zones", src: BASE + "/data/zone-aware-schools.geojson" },
    { id: "wifi", kind: "overlay", label: "Wi-Fi", src: BASE + "/data/san-antonio-public-wifi.geojson" },
    { id: "claimed", kind: "claimed", label: "Chicas Pack" },
    { id: "listit", kind: "cta", label: "Pin it \u00b7 $5", href: BASE + "/claim", hint: "List it. Sell it. Done." }
  ];
  if (emergencyOn()) LAYERS.push({ id: "emergency", kind: "overlay", label: "Emergency hubs", src: BASE + "/data/san-antonio-emergency-info.geojson" });
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&").replace(/</g, "<").replace(/"/g, """); }
  function svg(inner) { return '<svg class="chica-key-sym" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">' + inner + "</svg>"; }
  function symbolHtml(id) {
    if (id === "garage") return svg('<circle cx="8" cy="8" r="5.2" fill="#c513af" stroke="#121212" stroke-width="1.4"/>');
    if (id === "estate") return svg('<polygon points="8,1.8 14.4,8 8,14.2 1.6,8" fill="#f4f4f4" stroke="#121212" stroke-width="1.4"/>');
    if (id === "permit") return svg('<polygon points="8,2.2 14.2,13.6 1.8,13.6" fill="#8a8a8a" stroke="#121212" stroke-width="1.4"/>');
    if (id === "intel") return '<img class="chica-key-sym" src="' + INTEL_ICON + '" width="14" height="14" alt="" />';
    if (id === "satellite") return svg('<circle cx="8" cy="8" r="6" fill="#0b3d62" stroke="#121212" stroke-width="1.2"/>');
    if (id === "parking") return svg('<rect x="2.2" y="2.2" width="11.6" height="11.6" rx="2" fill="#38bdf8" stroke="#0369a1" stroke-width="1.2"/>');
    if (id === "pantry") return svg('<ellipse cx="8" cy="5.2" rx="4.2" ry="1.5" fill="#f5d000" stroke="#5c4a00" stroke-width="1.1"/>');
    if (id === "schools") return svg('<circle cx="8" cy="8" r="6.1" fill="none" stroke="#f0a500" stroke-width="1.6"/>');
    if (id === "wifi") return svg('<path d="M3.2 7.2 A6.2 6.2 0 0 1 12.8 7.2" fill="none" stroke="#2dd4bf" stroke-width="1.5"/><circle cx="8" cy="12.1" r="1.15" fill="#2dd4bf"/>');
    if (id === "claimed" || id === "listit") return svg('<circle cx="8" cy="7.2" r="5.2" fill="#c513af" stroke="#121212" stroke-width="1.4"/>');
    if (id === "emergency") return svg('<circle cx="8" cy="8" r="6" fill="#7f1d1d" stroke="#121212" stroke-width="1.2"/>');
    return "";
  }
  function overlayColor(id) { return ({ parking: "#38bdf8", pantry: "#f5d000", schools: "#f0a500", wifi: "#2dd4bf", emergency: "#ef4444" })[id] || "#c513af"; }
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
    s.textContent = "#chica-key{display:block!important;visibility:visible!important;opacity:1!important;position:fixed!important;left:12px!important;bottom:calc(16px + env(safe-area-inset-bottom,0px))!important;z-index:2147483646!important;width:min(228px,calc(100vw - 24px));max-height:min(58dvh,440px);overflow:auto;background:#1a1714f2;color:#f3eee4;border:1px solid #3a342e;border-radius:16px;font:500 12px/1.25 Inter,system-ui,sans-serif;padding:8px 10px 10px}#chica-key[data-collapsed=true]{max-height:44px;overflow:hidden}#chica-key ul{list-style:none;margin:0;padding:0}#chica-key li{display:flex;align-items:center;gap:8px;padding:5px 4px;border-radius:8px;cursor:pointer;min-height:32px}.chica-intel-badge{position:absolute;right:-5px;top:-6px;width:14px;height:14px;border-radius:999px;background:#c513af;display:none}html.chica-intel-on .chica-intel-badge{display:block}.chica-overlay-pin{border:0;background:transparent}.chica-opt{font:500 12px/1.35 Inter,system-ui,sans-serif;color:#1a1714;min-width:200px}.chica-opt h3{margin:0 0 4px;font:800 13px/1.2 Inter,system-ui,sans-serif}.chica-opt .meta{color:#5c5348;font-size:11px}.chica-opt .acts{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}.chica-opt a.chip{border:1px solid #c513af;border-radius:999px;padding:3px 8px;font-size:11px;color:#7a0f6c;text-decoration:none;font-weight:700}.chica-opt .near{list-style:none;margin:6px 0 0;padding:0}.chica-opt .near li{margin:6px 0 0;padding-top:6px;border-top:1px solid #ece6dc}.chica-opt .tag{font-size:10px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#7a0f6c}button.chica-dup-chip,.chica-dup-chip,#chica-pin-claim{display:none!important}aside[aria-label=Key]:not(#chica-key),aside[aria-label=key]:not(#chica-key),[data-chica-legend]{display:none!important}.leaflet-top.leaflet-left,.leaflet-control-layers,#chica-intel-btn{display:none!important}html.chica-pack-off #chica-claimed-layer{display:none!important}";
    (document.head || document.documentElement).appendChild(s);
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
    return p;
  }
  function pinKind(el) {
    var html = el.innerHTML || "";
    if (html.indexOf('polygon points=\"8,1.6') !== -1) return "boost";
    if (html.indexOf('polygon points=\"8,2.2') !== -1) return "estate";
    if (html.indexOf('polygon points=\"8,2.4') !== -1) return "permit";
    if (html.indexOf('fill=\"#f6f6f6\"') !== -1) return "you";
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
  function stampBadges() {
    if (!state.intel) return;
    var pins = document.querySelectorAll(".leaflet-marker-icon, .chica-sym");
    for (var i = 0; i < pins.length; i++) {
      var host = pins[i];
      if (host.querySelector(".chica-intel-badge") || (host.getAttribute("title") || "") === "You" || (host.querySelector && host.querySelector(".chica-overlay-mark"))) continue;
      var mark = document.createElement("span");
      mark.className = "chica-intel-badge";
      mark.innerHTML = '<img src="' + INTEL_ICON + '" alt="" width="12" height="12" />';
      if (getComputedStyle(host).position === "static") host.style.position = "relative";
      host.appendChild(mark);
    }
  }
  function applyIntel() {
    document.documentElement.classList.toggle("chica-intel-on", state.intel);
    if (state.intel) { stampBadges(); prefetchOverlays(); }
    else { var b = document.querySelectorAll(".chica-intel-badge"); for (var i = 0; i < b.length; i++) b[i].style.display = "none"; }
    var row = document.querySelector('#chica-key [data-chica-layer="intel"]');
    if (row) styleRow(row, state.intel);
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
    document.documentElement.classList.toggle("chica-pack-off", !state.claimed);
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
    }
    var kind = ({ parking: "Parking", pantry: "Pantry", wifi: "Wi-Fi", schools: "School zone", emergency: "Emergency" })[id] || "Spot";
    return '<div class="chica-opt"><span class="tag">' + kind + "</span><h3>" + esc(name) + "</h3>" + (addr ? '<div class="meta">' + esc(addr) + "</div>" : "") + extra + (lat && lon ? dirLinks(lat, lon) : "") + "</div>";
  }
  function featureLatLng(feat) {
    var g = feat && feat.geometry;
    if (!g || !g.coordinates || g.type !== "Point") return null;
    return [g.coordinates[1], g.coordinates[0]];
  }
  function distM(aLat, aLon, bLat, bLon) {
    var R = 6371000, dLat = (bLat - aLat) * Math.PI / 180, dLon = (bLon - aLon) * Math.PI / 180;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(aLat * Math.PI / 180) * Math.cos(bLat * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }
  function nearest(id, lat, lon) {
    var feats = overlayCache[id] || [], best = null;
    for (var i = 0; i < feats.length; i++) {
      var ll = featureLatLng(feats[i]); if (!ll) continue;
      var d = distM(lat, lon, ll[0], ll[1]);
      if (d > NEAR_M) continue;
      if (!best || d < best.d) best = { d: d, feat: feats[i], ll: ll };
    }
    return best;
  }
  function fmtM(m) { return m < 1000 ? Math.round(m) + " m" : (m / 1609.34).toFixed(1) + " mi"; }
  function nearRow(label, hit) {
    if (!hit) return "";
    var props = hit.feat.properties || {}, name = props.name || label;
    var extra = props.ssid ? " \u00b7 SSID " + props.ssid : (props.rates || props.hourly || props.hours || "");
    return '<li><span class="tag">' + esc(label) + "</span> " + esc(name) + ' <span class="meta">' + fmtM(hit.d) + (extra ? " \u00b7 " + esc(extra) : "") + "</span>" + dirLinks(hit.ll[0], hit.ll[1]) + "</li>";
  }
  function intelPopupHtml(title, lat, lon) {
    var items = nearRow("Parking", nearest("parking", lat, lon)) + nearRow("Pantry", nearest("pantry", lat, lon)) + nearRow("Wi-Fi", nearest("wifi", lat, lon)) + nearRow("School zone", nearest("schools", lat, lon));
    if (!items) items = '<li class="meta">Nothing within a mile. Turn Parking / Wi-Fi / Pantries on in the Key.</li>';
    return '<div class="chica-opt"><span class="tag">Intel</span><h3>' + esc(title || "This pin") + '</h3><div class="meta">Options around this driveway</div>' + dirLinks(lat, lon) + '<ul class="near">' + items + '</ul><div class="acts"><a class="chip" href="' + BASE + '/intel/">Sale Intel</a><a class="chip" href="' + BASE + '/claim">Pin it \u00b7 $5</a></div></div>';
  }
  function openIntelPopup(el) {
    var map = findMap(), L = window.L;
    if (!map || !L || !L.popup) return;
    var wrap = el.closest(".leaflet-marker-icon") || el, rect = wrap.getBoundingClientRect(), box = map.getContainer().getBoundingClientRect();
    var ll;
    try { ll = map.containerPointToLatLng([rect.left + rect.width / 2 - box.left, rect.top + rect.height - box.top]); } catch (e) { return; }
    var title = (el.getAttribute("title") || el.getAttribute("aria-label") || "Sale pin").replace(/\s+/g, " ").trim();
    L.popup({ maxWidth: 280, autoPan: true }).setLatLng(ll).setContent(intelPopupHtml(title, ll.lat, ll.lng)).openOn(map);
  }
  function wireIntelClicks() {
    if (intelWired) return;
    intelWired = true;
    document.addEventListener("click", function (ev) {
      if (!state.intel) return;
      var t = ev.target; if (!t || !t.closest) return;
      if (t.closest("#chica-key") || t.closest(".leaflet-popup") || t.closest("#chica-map-chrome")) return;
      var pin = t.closest(".leaflet-marker-icon, .chica-sym, .chica-pin");
      if (!pin || (pin.querySelector && pin.querySelector(".chica-overlay-mark")) || (pin.getAttribute("title") || "") === "You") return;
      openIntelPopup(pin);
    }, true);
  }
  function prefetchOverlays() {
    for (var i = 0; i < LAYERS.length; i++) {
      var spec = LAYERS[i];
      if (spec.kind !== "overlay" || overlayCache[spec.id]) continue;
      (function (id, src) {
        fetch(src + "?v=6", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (data) { overlayCache[id] = data && data.features ? data.features : []; }).catch(function () { overlayCache[id] = overlayCache[id] || []; });
      })(spec.id, spec.src);
    }
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
    fetch(spec.src + "?v=6", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (data) {
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
  function wireRow(row, spec) {
    if (wired[spec.id]) { if (spec.kind !== "cta") styleRow(row, state[spec.id]); return; }
    wired[spec.id] = true;
    row.setAttribute("data-chica-layer", spec.id);
    row.setAttribute("role", spec.kind === "cta" ? "link" : "switch");
    row.tabIndex = 0;
    row.innerHTML = symbolHtml(spec.id) + '<span class="chica-key-name">' + spec.label + (spec.hint ? '<span style="display:block;font-size:10px;color:#c4b8a8">' + spec.hint + "</span>" : "") + "</span>";
    if (spec.kind === "cta") {
      row.style.opacity = "1";
      row.addEventListener("click", function (ev) { ev.preventDefault(); location.href = spec.href || (BASE + "/claim"); }, true);
      return;
    }
    styleRow(row, state[spec.id]);
    function tog(ev) {
      ev.preventDefault(); ev.stopPropagation();
      state[spec.id] = !state[spec.id]; styleRow(row, state[spec.id]); saveLayerState();
      if (spec.kind === "sale") applyPins();
      else if (spec.kind === "intel") applyIntel();
      else if (spec.kind === "basemap") applySat();
      else if (spec.kind === "claimed") applyClaimed();
      else setOverlay(spec.id, state[spec.id], spec);
    }
    row.addEventListener("click", tog, true);
    row.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") tog(e); });
  }
  function ensureOverlays(p) {
    var wrap = p.querySelector("[data-chica-overlays]");
    if (!wrap) { wrap = document.createElement("ul"); wrap.setAttribute("data-chica-overlays", "1"); p.appendChild(wrap); }
    for (var i = 0; i < LAYERS.length; i++) {
      var spec = LAYERS[i], row = wrap.querySelector('[data-chica-layer="' + spec.id + '"]');
      if (!row) { row = document.createElement("li"); wrap.appendChild(row); }
      wireRow(row, spec);
    }
  }
  function hideDup() {
    var labels = /^(All|Posted|Permits|Permit|Garage|Estate|Yard|Weekend|Sat|Sun|All days|Intel|Satellite|Street|Parking|Pantries|School zones|Wi-?Fi|Claimed \$?5|Chicas Pack|Home|How it works|Pin it)$/i;
    var bar = document.getElementById("chica-pin-claim"); if (bar) bar.remove();
    var a = document.getElementById("chica-intel-btn"); if (a) a.remove();
    var nodes = document.querySelectorAll("button, a, [role=button], [role=tab]");
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.closest("#chica-key") || el.closest("#chica-map-chrome") || el.id === "chica-fs-btn" || el.closest(".leaflet-control-zoom")) continue;
      var t = (el.textContent || "").replace(/\s+/g, " ").trim();
      if (labels.test(t)) el.classList.add("chica-dup-chip");
    }
  }
  function restoreOverlays() {
    for (var i = 0; i < LAYERS.length; i++) { var spec = LAYERS[i]; if (spec.kind === "overlay" && state[spec.id]) setOverlay(spec.id, true, spec); }
  }
  function wire() {
    if (!onMapPath()) return;
    ensureStyle();
    var p = ensurePanel(); if (!p) return;
    ensureOverlays(p); hideDup(); applyPins(); applyIntel(); applySat(); applyClaimed(); restoreOverlays(); wireIntelClicks();
  }
  function boot() { wire(); setInterval(wire, 900); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
