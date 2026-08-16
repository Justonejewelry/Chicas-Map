/**
 * Chica Map — Public WiFi Layer
 * Offline-first: works without network after first load.
 * Reports → localStorage (48h). Optional WebSocket when online.
 * Data: data/{city}-public-wifi.geojson
 */
(function () {
  const SRC_ID = "yb-public-wifi";
  const LAYER_ID = "yb-public-wifi-layer";
  const LAYER_LABEL = "yb-public-wifi-label";
  const TOGGLE_ID = "btnPublicWifi";
  const REPORT_KEY = "chica_wifi_reports_v1";
  const QUEUE_KEY = "chica_wifi_report_queue_v1";
  const CACHE_KEY = "chica_wifi_geo_cache_v1";

  const COLOR_OPEN_CONFIRMED = "#22c55e";
  const COLOR_OPEN = "#3b82f6";
  const COLOR_UNKNOWN = "#f59e0b";
  const COLOR_CLOSED = "#9ca3af";
  const COLOR_DOWN = "#ef4444";
  const STROKE = "#1e293b";

  let wifiData = null;
  let enabled = false;
  let mapRef = null;
  let layerBuilt = false;
  let currentCity = "san-antonio";
  let ws = null;

  function isOnline() {
    try { return navigator.onLine !== false; } catch (_) { return true; }
  }

  function getCity() {
    try {
      const sel = document.getElementById("citySelect");
      if (sel && sel.value && sel.value !== "texas") return sel.value;
    } catch (_) {}
    return currentCity || "san-antonio";
  }

  function getWsUrl() {
    try {
      const cfg = window.ChicaConfig || {};
      return cfg.WIFI_WS_URL || cfg.wifiWsUrl || null;
    } catch (_) { return null; }
  }

  function loadReports() {
    try {
      const raw = localStorage.getItem(REPORT_KEY);
      if (!raw) return {};
      const data = JSON.parse(raw);
      const now = Date.now();
      const cleaned = {};
      Object.keys(data).forEach((k) => {
        const entry = data[k];
        if (entry && entry.ts && now - entry.ts < 48 * 3600 * 1000) cleaned[k] = entry;
      });
      return cleaned;
    } catch (_) { return {}; }
  }

  function saveReport(name, kind) {
    try {
      const reports = loadReports();
      reports[name] = { kind: kind, ts: Date.now() };
      localStorage.setItem(REPORT_KEY, JSON.stringify(reports));
    } catch (_) {}
  }

  function queueReport(payload) {
    try {
      const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
      q.push(payload);
      while (q.length > 50) q.shift();
      localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
    } catch (_) {}
  }

  function flushQueue() {
    if (!isOnline() || !ws || ws.readyState !== 1) return;
    try {
      const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
      if (!q.length) return;
      q.forEach((p) => { try { ws.send(JSON.stringify(p)); } catch (_) {} });
      localStorage.setItem(QUEUE_KEY, "[]");
    } catch (_) {}
  }

  function cacheGeo(city, data) {
    try {
      localStorage.setItem(CACHE_KEY + ":" + city, JSON.stringify({ ts: Date.now(), data: data }));
    } catch (_) {}
  }

  function readCachedGeo(city) {
    try {
      const raw = localStorage.getItem(CACHE_KEY + ":" + city);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.data && parsed.ts && Date.now() - parsed.ts < 14 * 24 * 3600 * 1000) return parsed.data;
    } catch (_) {}
    return null;
  }

  function connectWs() {
    const url = getWsUrl();
    if (!url || !isOnline()) return;
    if (ws && (ws.readyState === 0 || ws.readyState === 1)) return;
    try {
      ws = new WebSocket(url);
      ws.onopen = () => {
        flushQueue();
        try { ws.send(JSON.stringify({ type: "join", city: getCity() })); } catch (_) {}
      };
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg && msg.type === "report" && msg.name && msg.kind) {
            saveReport(msg.name, msg.kind);
            if (enabled && mapRef) ensureLayer(mapRef);
          }
        } catch (_) {}
      };
      ws.onclose = () => { ws = null; };
      ws.onerror = () => { try { ws.close(); } catch (_) {} ws = null; };
    } catch (_) { ws = null; }
  }

  function disconnectWs() {
    if (ws) { try { ws.close(); } catch (_) {} ws = null; }
  }

  function publishReport(name, kind) {
    const payload = { type: "report", name: name, kind: kind, ts: Date.now(), city: getCity() };
    saveReport(name, kind);
    if (isOnline() && ws && ws.readyState === 1) {
      try { ws.send(JSON.stringify(payload)); } catch (_) { queueReport(payload); }
    } else {
      queueReport(payload);
    }
  }

  function patchMapConstructor() {
    if (!window.maplibregl || !window.maplibregl.Map) return false;
    if (window.maplibregl.Map.__ybWifiPatched) return true;
    const Orig = window.maplibregl.Map;
    function Wrapped(options) {
      const m = new Orig(options);
      try {
        window.__YB_MAP = m;
        window.map = m;
        mapRef = m;
        window.dispatchEvent(new CustomEvent("yb-map-ready", { detail: { map: m } }));
      } catch (_) {}
      return m;
    }
    Wrapped.prototype = Orig.prototype;
    try { Object.keys(Orig).forEach((k) => { try { Wrapped[k] = Orig[k]; } catch (_) {} }); } catch (_) {}
    Wrapped.__ybWifiPatched = true;
    window.maplibregl.Map = Wrapped;
    return true;
  }

  async function loadData(city) {
    city = city || getCity();
    currentCity = city;
    if (isOnline()) {
      try {
        const path = "data/" + city + "-public-wifi.geojson?t=" + Date.now();
        const r = await fetch(path, { cache: "no-store" });
        if (r.ok) {
          wifiData = await r.json();
          cacheGeo(city, wifiData);
          return wifiData;
        }
        if (city !== "san-antonio") return loadData("san-antonio");
      } catch (_) {}
    }
    const cached = readCachedGeo(city) || (city !== "san-antonio" ? readCachedGeo("san-antonio") : null);
    if (cached) { wifiData = cached; return wifiData; }
    if (wifiData) return wifiData;
    return null;
  }

  function findMap() {
    if (mapRef && mapRef.getSource) return mapRef;
    if (window.__YB_MAP && window.__YB_MAP.getSource) return window.__YB_MAP;
    if (window.map && window.map.getSource) return window.map;
    const el = document.getElementById("map");
    if (el && el._map && el._map.getSource) return el._map;
    return null;
  }

  function waitForMap(ms) {
    return new Promise((resolve) => {
      const existing = findMap();
      if (existing) return resolve(existing);
      const onReady = (e) => {
        const m = (e && e.detail && e.detail.map) || findMap();
        if (m) { cleanup(); resolve(m); }
      };
      const cleanup = () => {
        window.removeEventListener("yb-map-ready", onReady);
        clearInterval(iv);
        clearTimeout(to);
      };
      window.addEventListener("yb-map-ready", onReady);
      let n = 0;
      const iv = setInterval(() => {
        n++;
        const m = findMap();
        if (m) { cleanup(); resolve(m); }
        else if (n > 40) { cleanup(); resolve(null); }
      }, 100);
      const to = setTimeout(() => { cleanup(); resolve(findMap()); }, ms || 4000);
    });
  }

  function toast(msg, ms) {
    const el = document.getElementById("toast");
    if (el) {
      el.textContent = msg;
      el.classList.remove("hidden");
      el.style.display = "block";
      setTimeout(() => { el.classList.add("hidden"); el.style.display = ""; }, ms || 3500);
      return;
    }
    console.log("[public-wifi]", msg);
  }

  function computeStatus(props) {
    const reports = loadReports();
    const report = reports[props.name];
    const now = new Date();
    const hour = now.getHours() + now.getMinutes() / 60;
    const hours = (props.hours || "").toLowerCase();
    let isOpen = null;
    if (hours.includes("7:30") && hours.includes("10:30")) isOpen = hour >= 7.5 && hour < 22.5;
    else if (hours.includes("5am") || hours.includes("5 a.m")) isOpen = hour >= 5 && hour < 23;
    else if (hours.includes("sunrise") || hours.includes("sunset")) isOpen = hour >= 6.5 && hour < 20.5;
    else if (hours.includes("9am") || hours.includes("9 a.m")) isOpen = hour >= 9 && hour < 17;
    else if (hours.includes("business hours")) isOpen = hour >= 8 && hour < 21;
    if (report && report.kind === "down") return "down";
    if (isOpen === false) return "closed";
    if (isOpen === true && report && report.kind === "ok") return "open_confirmed";
    if (isOpen === true) return "open";
    if (report && report.kind === "ok") return "open_confirmed";
    return "unknown";
  }

  function statusColor(status) {
    switch (status) {
      case "open_confirmed": return COLOR_OPEN_CONFIRMED;
      case "open": return COLOR_OPEN;
      case "closed": return COLOR_CLOSED;
      case "down": return COLOR_DOWN;
      default: return COLOR_UNKNOWN;
    }
  }

  function ensureLayer(map) {
    if (!map || !wifiData) return false;
    const add = () => {
      try {
        const enriched = {
          type: "FeatureCollection",
          features: (wifiData.features || []).map((f) => {
            const props = Object.assign({}, f.properties);
            props._status = computeStatus(props);
            return { type: "Feature", geometry: f.geometry, properties: props };
          })
        };
        if (!map.getSource(SRC_ID)) map.addSource(SRC_ID, { type: "geojson", data: enriched });
        else map.getSource(SRC_ID).setData(enriched);
        if (!map.getLayer(LAYER_ID)) {
          map.addLayer({
            id: LAYER_ID, type: "circle", source: SRC_ID,
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 6, 14, 12],
              "circle-color": ["match", ["get", "_status"], "open_confirmed", COLOR_OPEN_CONFIRMED, "open", COLOR_OPEN, "closed", COLOR_CLOSED, "down", COLOR_DOWN, COLOR_UNKNOWN],
              "circle-stroke-width": 2, "circle-stroke-color": STROKE, "circle-opacity": 0.95
            }
          });
          map.addLayer({
            id: LAYER_LABEL, type: "symbol", source: SRC_ID, minzoom: 13,
            layout: { "text-field": ["get", "name"], "text-size": 11, "text-offset": [0, 1.2], "text-anchor": "top", "text-max-width": 14 },
            paint: { "text-color": "#1e293b", "text-halo-color": "#ffffff", "text-halo-width": 1.6 }
          });
          map.on("click", LAYER_ID, (e) => {
            const f = e.features && e.features[0];
            if (!f) return;
            const p = f.properties || {};
            const coords = f.geometry.coordinates.slice();
            const status = p._status || computeStatus(p);
            const statusLabel = { open_confirmed: "Open • recently confirmed", open: "Open now", closed: "Currently closed", down: "Reported down", unknown: "Status unknown" }[status] || "Status unknown";
            const offlineNote = !isOnline() ? '<div style="font-size:10px;color:#92400e;margin-bottom:6px">Offline mode — reports saved on this device</div>' : "";
            const ssidLine = p.ssid ? '<div style="font-size:12px;margin-bottom:4px"><b>SSID:</b> ' + p.ssid + "</div>" : "";
            const safeName = String(p.name || "").split(String.fromCharCode(34)).join(""");
            const html =
              '<div style="font-family:system-ui,sans-serif;max-width:270px">' +
              '<div style="font-weight:700;font-size:14px;color:#1e293b;margin-bottom:4px">📶 ' +
              (p.name || "Public WiFi") +
              "</div>" +
              '<div style="font-size:12px;color:#444;margin-bottom:4px">' +
              (p.address || "") +
              "</div>" +
              offlineNote +
              '<div style="font-size:12px;font-weight:600;margin-bottom:6px;color:' +
              statusColor(status) +
              '">' +
              statusLabel +
              "</div>" +
              ssidLine +
              '<div style="font-size:11px;color:#555;margin-bottom:8px">' +
              (p.hours || "") +
              "</div>" +
              '<div style="font-size:11px;color:#666;margin-bottom:8px">' +
              (p.provider || "") +
              " · " +
              (p.category || "") +
              "</div>" +
              '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
              '<button type="button" class="yb-wifi-ok" data-name="' +
              safeName +
              '" style="font-size:11px;padding:5px 8px;border-radius:6px;border:1px solid #22c55e;background:#dcfce7;color:#166534;font-weight:600;cursor:pointer">Still working</button>' +
              '<button type="button" class="yb-wifi-down" data-name="' +
              safeName +
              '" style="font-size:11px;padding:5px 8px;border-radius:6px;border:1px solid #ef4444;background:#fee2e2;color:#991b1b;font-weight:600;cursor:pointer">Not working</button>' +
              "</div></div>";
            if (window.__ybPinPopup) { try { window.__ybPinPopup.remove(); } catch (_) {} }
            window.__ybPinPopup = new maplibregl.Popup({ offset: 12, closeButton: true, maxWidth: "290px" }).setLngLat(coords).setHTML(html).addTo(map);
            setTimeout(() => {
              document.querySelectorAll(".yb-wifi-ok").forEach((btn) => {
                btn.onclick = () => {
                  publishReport(btn.getAttribute("data-name") || p.name, "ok");
                  toast(isOnline() ? "Thanks — marked as working." : "Saved offline — will sync when you’re back online.");
                  btn.textContent = "✓ Noted"; btn.disabled = true;
                  if (mapRef) ensureLayer(mapRef);
                };
              });
              document.querySelectorAll(".yb-wifi-down").forEach((btn) => {
                btn.onclick = () => {
                  publishReport(btn.getAttribute("data-name") || p.name, "down");
                  toast(isOnline() ? "Thanks — reported." : "Saved offline — will sync when you’re back online.");
                  btn.textContent = "✓ Reported"; btn.disabled = true;
                  if (mapRef) ensureLayer(mapRef);
                };
              });
            }, 40);
          });
          map.on("mouseenter", LAYER_ID, () => { map.getCanvas().style.cursor = "pointer"; });
          map.on("mouseleave", LAYER_ID, () => { map.getCanvas().style.cursor = ""; });
        } else {
          map.getSource(SRC_ID).setData(enriched);
        }
        layerBuilt = true;
        return true;
      } catch (err) {
        console.warn("[public-wifi] ensureLayer error", err);
        return false;
      }
    };
    if (map.isStyleLoaded && map.isStyleLoaded()) return add();
    map.once("load", add);
    map.once("styledata", () => { if (!layerBuilt) add(); });
    return add();
  }

  function setVisible(map, on) {
    if (!map) return;
    const vis = on ? "visible" : "none";
    try {
      if (map.getLayer(LAYER_ID)) map.setLayoutProperty(LAYER_ID, "visibility", vis);
      if (map.getLayer(LAYER_LABEL)) map.setLayoutProperty(LAYER_LABEL, "visibility", vis);
    } catch (_) {}
    updateLegend(on);
  }

  function updateLegend(show) {
    const legend = document.querySelector(".map-legend");
    if (!legend) return;
    legend.querySelectorAll("[data-wifi-legend]").forEach((el) => el.remove());
    if (!show) return;
    [
      { color: COLOR_OPEN_CONFIRMED, label: "Open + confirmed" },
      { color: COLOR_OPEN, label: "Open now" },
      { color: COLOR_UNKNOWN, label: "Unknown" },
      { color: COLOR_CLOSED, label: "Closed" },
      { color: COLOR_DOWN, label: "Reported down" }
    ].forEach((it) => {
      const span = document.createElement("span");
      span.setAttribute("data-wifi-legend", "1");
      span.innerHTML = '<i class="pin" style="background:' + it.color + ';border-radius:50%;width:10px;height:10px;display:inline-block;margin-right:3px;vertical-align:middle;border:1.5px solid ' + STROKE + '"></i> ' + it.label;
      legend.appendChild(span);
    });
  }

  async function toggle() {
    const btn = document.getElementById(TOGGLE_ID);
    if (btn) btn.disabled = true;
    let map = findMap() || mapRef;
    if (!map) { toast("Loading map…"); map = await waitForMap(5000); }
    if (!map) { toast("Map still loading — try again in a second"); if (btn) btn.disabled = false; return; }
    mapRef = map; window.__YB_MAP = map;
    enabled = !enabled;
    if (btn) { btn.classList.toggle("active", enabled); btn.disabled = false; }
    if (enabled) {
      const data = await loadData();
      if (!data || !data.features || !data.features.length) {
        toast(isOnline() ? "Couldn’t load WiFi data for this city yet" : "Offline and no cached WiFi data — connect once to download the layer");
        enabled = false; if (btn) btn.classList.remove("active"); return;
      }
      ensureLayer(map); setVisible(map, true); connectWs();
      toast(isOnline() ? "📶 Public WiFi on — status colors active" : "📶 Public WiFi on (offline) — using cached data");
    } else {
      setVisible(map, false); disconnectWs(); toast("Public WiFi off");
    }
  }

  function injectToggle() {
    const bar = document.querySelector(".feat-bar") || document.querySelector(".tools-bar") || document.querySelector(".map-tools");
    if (!bar) return false;
    if (document.getElementById(TOGGLE_ID)) return true;
    const btn = document.createElement("button");
    btn.type = "button"; btn.className = "tool-btn"; btn.id = TOGGLE_ID;
    btn.title = "Free Public WiFi (libraries, parks, guest networks)";
    btn.innerHTML = "📶 WiFi";
    btn.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); toggle(); });
    bar.appendChild(btn);
    return true;
  }

  function onOnline() {
    if (enabled) {
      connectWs(); flushQueue();
      loadData().then(() => { if (mapRef) ensureLayer(mapRef); });
      toast("Back online — WiFi layer synced");
    }
  }
  function onOffline() {
    disconnectWs();
    if (enabled) toast("Offline — WiFi layer using cache + local reports");
  }

  function boot() {
    patchMapConstructor(); injectToggle();
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const sel = document.getElementById("citySelect");
    if (sel && !sel.__ybWifiBound) {
      sel.__ybWifiBound = true;
      sel.addEventListener("change", () => {
        wifiData = null; layerBuilt = false;
        if (enabled) loadData().then(() => { const m = findMap(); if (m) ensureLayer(m); });
      });
    }
    let tries = 0;
    const iv = setInterval(() => {
      tries++; patchMapConstructor(); injectToggle();
      const m = findMap();
      if (m) { mapRef = m; window.__YB_MAP = m; }
      if (tries > 50) clearInterval(iv);
    }, 200);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  setTimeout(boot, 800); setTimeout(boot, 2000); setTimeout(boot, 4000);
  window.addEventListener("yb-map-ready", (e) => {
    if (e.detail && e.detail.map) { mapRef = e.detail.map; window.__YB_MAP = e.detail.map; }
  });
  window.ChicaPublicWifi = { toggle, loadData, findMap, loadReports, publishReport, isOnline };
})();
