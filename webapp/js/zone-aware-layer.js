/**
 * Chica Map — Zone Aware Layer
 * Soft school-zone awareness with calm voice alerts.
 * Follows the same pattern as public-wifi-layer.js / food-pantry-layer.js
 */
(function () {
  const SRC_ID = "yb-zone-aware";
  const LAYER_ID = "yb-zone-aware-layer";
  const LAYER_HALO = "yb-zone-aware-halo";
  const TOGGLE_ID = "btnZoneAware";
  const VOICE_KEY = "chica_zone_aware_voice_v1";
  const CACHE_KEY = "chica_zone_aware_geo_v1";

  const COLOR_ACTIVE = "#f0a500";
  const COLOR_STROKE = "#b45309";

  let zoneData = null;
  let enabled = false;
  let mapRef = null;
  let layerBuilt = false;
  let lastInside = false;
  let lastSpeak = 0;
  let watchId = null;
  let checkTimer = null;
  let userLngLat = null;
  let voiceEnabled = true;

  try {
    const v = localStorage.getItem(VOICE_KEY);
    if (v === "0") voiceEnabled = false;
  } catch (_) {}

  function isOnline() {
    try { return navigator.onLine !== false; } catch (_) { return true; }
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
      setTimeout(() => { el.classList.add("hidden"); el.style.display = ""; }, ms || 3200);
      return;
    }
    console.log("[zone-aware]", msg);
  }

  function isSchoolDay(d) {
    d = d || new Date();
    const day = d.getDay();
    return day >= 1 && day <= 5;
  }

  function toMinutes(hhmm) {
    if (!hhmm) return 0;
    const parts = String(hhmm).split(":");
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1] || "0", 10);
  }

  function isActiveWindow(now, amStart, amEnd, pmStart, pmEnd) {
    const t = now.getHours() * 60 + now.getMinutes();
    const aS = toMinutes(amStart), aE = toMinutes(amEnd);
    const pS = toMinutes(pmStart), pE = toMinutes(pmEnd);
    return (t >= aS && t <= aE) || (t >= pS && t <= pE);
  }

  function filterActive(data) {
    if (!data || !data.features) return { type: "FeatureCollection", features: [] };
    if (!isSchoolDay()) return { type: "FeatureCollection", features: [] };
    const now = new Date();
    return {
      type: "FeatureCollection",
      features: data.features.filter((f) => {
        const p = f.properties || {};
        return isActiveWindow(now, p.am_start, p.am_end, p.pm_start, p.pm_end);
      })
    };
  }

  async function loadData() {
    if (isOnline()) {
      try {
        const path = "data/zone-aware-schools.geojson?t=" + Date.now();
        const r = await fetch(path, { cache: "no-store" });
        if (r.ok) {
          zoneData = await r.json();
          try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: zoneData })); } catch (_) {}
          return zoneData;
        }
      } catch (_) {}
    }
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.data) { zoneData = parsed.data; return zoneData; }
      }
    } catch (_) {}
    return zoneData;
  }

  function haversineMeters(lng1, lat1, lng2, lat2) {
    const R = 6371000;
    const toRad = (x) => x * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function speak(text) {
    if (!voiceEnabled || !window.speechSynthesis) return;
    const now = Date.now();
    if (now - lastSpeak < 45000) return;
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.92;
      u.pitch = 1.0;
      u.volume = 0.7;
      const voices = speechSynthesis.getVoices();
      const preferred = voices.find((v) =>
        /en-US|en_US/i.test(v.lang) && /female|samantha|karen|zira|google/i.test(v.name)
      ) || voices.find((v) => /en/i.test(v.lang));
      if (preferred) u.voice = preferred;
      speechSynthesis.speak(u);
      lastSpeak = now;
    } catch (_) {}
  }

  function checkProximity() {
    if (!enabled || !userLngLat || !zoneData) {
      if (lastInside) { lastInside = false; }
      return;
    }
    const active = filterActive(zoneData);
    let inside = false;
    for (const f of active.features || []) {
      const coords = f.geometry && f.geometry.coordinates;
      if (!coords) continue;
      const bufFt = (f.properties && f.properties.buffer_ft) || 400;
      const bufM = bufFt * 0.3048;
      const dist = haversineMeters(userLngLat[0], userLngLat[1], coords[0], coords[1]);
      if (dist <= bufM) { inside = true; break; }
    }
    if (inside && !lastInside) {
      speak("Entering school zone. Please slow down.");
    } else if (!inside && lastInside) {
      speak("Leaving school zone.");
    }
    lastInside = inside;
  }

  function ensureLayer(map) {
    if (!map || !zoneData) return false;
    const add = () => {
      try {
        const active = filterActive(zoneData);
        if (!map.getSource(SRC_ID)) {
          map.addSource(SRC_ID, { type: "geojson", data: active });
        } else {
          map.getSource(SRC_ID).setData(active);
        }
        if (!map.getLayer(LAYER_HALO)) {
          map.addLayer({
            id: LAYER_HALO,
            type: "circle",
            source: SRC_ID,
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 18, 14, 42],
              "circle-color": COLOR_ACTIVE,
              "circle-opacity": 0.18,
              "circle-stroke-width": 0
            }
          });
        }
        if (!map.getLayer(LAYER_ID)) {
          map.addLayer({
            id: LAYER_ID,
            type: "circle",
            source: SRC_ID,
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 6, 14, 11],
              "circle-color": COLOR_ACTIVE,
              "circle-stroke-width": 2,
              "circle-stroke-color": COLOR_STROKE,
              "circle-opacity": 0.85
            }
          });
          map.on("click", LAYER_ID, (e) => {
            const f = e.features && e.features[0];
            if (!f) return;
            const p = f.properties || {};
            const coords = f.geometry.coordinates.slice();
            const html =
              '<div style="font-family:system-ui,sans-serif;max-width:260px">' +
              '<div style="font-weight:700;font-size:14px;color:#1e293b;margin-bottom:4px">Zone Aware</div>' +
              '<div style="font-size:13px;margin-bottom:2px">' + (p.name || "School zone") + "</div>" +
              '<div style="font-size:12px;color:#555;margin-bottom:4px">' + (p.district || "") + "</div>" +
              '<div style="font-size:11px;color:#b45309">Active now · slow down</div></div>';
            if (window.__ybPinPopup) { try { window.__ybPinPopup.remove(); } catch (_) {} }
            window.__ybPinPopup = new maplibregl.Popup({ offset: 12, closeButton: true, maxWidth: "280px" })
              .setLngLat(coords).setHTML(html).addTo(map);
          });
          map.on("mouseenter", LAYER_ID, () => { map.getCanvas().style.cursor = "pointer"; });
          map.on("mouseleave", LAYER_ID, () => { map.getCanvas().style.cursor = ""; });
        }
        layerBuilt = true;
        return true;
      } catch (err) {
        console.warn("[zone-aware] ensureLayer error", err);
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
      if (map.getLayer(LAYER_HALO)) map.setLayoutProperty(LAYER_HALO, "visibility", vis);
    } catch (_) {}
  }

  function startWatch() {
    if (!navigator.geolocation) return;
    if (watchId) return;
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        userLngLat = [pos.coords.longitude, pos.coords.latitude];
        checkProximity();
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 12000, timeout: 10000 }
    );
    if (!checkTimer) {
      checkTimer = setInterval(() => {
        if (enabled && mapRef) {
          ensureLayer(mapRef);
          checkProximity();
        }
      }, 25000);
    }
  }

  function stopWatch() {
    if (watchId) {
      try { navigator.geolocation.clearWatch(watchId); } catch (_) {}
      watchId = null;
    }
    if (checkTimer) {
      clearInterval(checkTimer);
      checkTimer = null;
    }
  }

  async function toggle() {
    const btn = document.getElementById(TOGGLE_ID);
    try {
      if (btn) btn.disabled = true;
      let map = findMap() || mapRef;
      if (!map) {
        toast("Loading map...");
        map = await waitForMap(5000);
      }
      if (!map) {
        toast("Map still loading — try again in a second");
        return;
      }
      mapRef = map;
      window.__YB_MAP = map;
      enabled = !enabled;
      if (btn) btn.classList.toggle("active", enabled);

      if (enabled) {
        const data = await loadData();
        if (!data || !data.features || !data.features.length) {
          toast("Could not load school zone data yet");
          enabled = false;
          if (btn) btn.classList.remove("active");
          return;
        }
        ensureLayer(map);
        setVisible(map, true);
        startWatch();
        toast("Zone Aware on");
      } else {
        setVisible(map, false);
        stopWatch();
        lastInside = false;
        toast("Zone Aware off");
      }
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function injectToggle() {
    const bar = document.querySelector(".feat-bar") || document.querySelector(".tools-bar") || document.querySelector(".map-tools");
    if (!bar) return false;
    if (document.getElementById(TOGGLE_ID)) return true;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tool-btn";
    btn.id = TOGGLE_ID;
    btn.title = "Zone Aware — school zones + soft voice";
    btn.innerHTML = "Zone";
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggle();
    });
    bar.appendChild(btn);
    return true;
  }

  function boot() {
    injectToggle();
    let tries = 0;
    const iv = setInterval(() => {
      tries++;
      injectToggle();
      const m = findMap();
      if (m) { mapRef = m; window.__YB_MAP = m; }
      if (tries > 50) clearInterval(iv);
    }, 200);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  setTimeout(boot, 800);
  setTimeout(boot, 2000);
  setTimeout(boot, 4000);

  window.addEventListener("yb-map-ready", (e) => {
    if (e.detail && e.detail.map) {
      mapRef = e.detail.map;
      window.__YB_MAP = e.detail.map;
    }
  });

  window.ChicaZoneAware = {
    toggle,
    setVoice: (on) => {
      voiceEnabled = !!on;
      try { localStorage.setItem(VOICE_KEY, on ? "1" : "0"); } catch (_) {}
    },
    isEnabled: () => enabled
  };
})();
