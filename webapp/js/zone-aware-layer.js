/**
 * Chica Map — Zone Aware Layer
 * Soft school-zone awareness with calm voice alerts.
 * Follows the same pattern as public-wifi-layer.js / food-pantry-layer.js
 *
 * Detection notes:
 * - School days: Mon–Fri (local device time)
 * - Active windows: per-school am_start/am_end + pm_start/pm_end
 * - Proximity: haversine vs buffer_ft (default 400 ft) + 25 m GPS pad
 * - Circles: zoom-scaled approximate geographic radius (not pure pixels)
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
  const GPS_PAD_M = 25; // extra meters for GPS jitter
  const DEFAULT_BUFFER_FT = 400;

  let zoneData = null;
  let enabled = false;
  let mapRef = null;
  let layerBuilt = false;
  let lastInside = false;
  let lastSpeak = 0;
  let watchId = null;
  let checkTimer = null;
  let userLngLat = null;
  let userAccuracy = null;
  let voiceEnabled = true;
  let lastActiveCount = -1;

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
      setTimeout(() => { el.classList.add("hidden"); el.style.display = ""; }, ms || 3500);
      return;
    }
    console.log("[zone-aware]", msg);
  }

  function isSchoolDay(d) {
    d = d || new Date();
    const day = d.getDay(); // 0=Sun … 6=Sat
    return day >= 1 && day <= 5;
  }

  function toMinutes(hhmm) {
    if (!hhmm && hhmm !== 0) return null;
    const parts = String(hhmm).trim().split(":");
    if (parts.length < 1) return null;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1] || "0", 10);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  }

  function isActiveWindow(now, amStart, amEnd, pmStart, pmEnd) {
    const t = now.getHours() * 60 + now.getMinutes();
    const aS = toMinutes(amStart);
    const aE = toMinutes(amEnd);
    const pS = toMinutes(pmStart);
    const pE = toMinutes(pmEnd);
    const inAm = aS != null && aE != null && t >= aS && t <= aE;
    const inPm = pS != null && pE != null && t >= pS && t <= pE;
    return inAm || inPm;
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

  function describeScheduleState() {
    const now = new Date();
    if (!isSchoolDay(now)) {
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      return "Weekend (" + days[now.getDay()] + ") — school zones inactive";
    }
    if (!zoneData || !zoneData.features || !zoneData.features.length) {
      return "No school data loaded";
    }
    const active = filterActive(zoneData);
    const n = (active.features || []).length;
    if (n > 0) return n + " school zone" + (n === 1 ? "" : "s") + " active now";
    // Find next window tip
    const t = now.getHours() * 60 + now.getMinutes();
    let nextHint = "outside school zone hours";
    // Sample first feature windows for a generic hint
    const p = zoneData.features[0].properties || {};
    const aS = toMinutes(p.am_start);
    const pS = toMinutes(p.pm_start);
    if (aS != null && t < aS) nextHint = "before morning zone hours";
    else if (pS != null && t < pS) nextHint = "between morning & afternoon zones";
    else nextHint = "after afternoon zone hours";
    return "No zones active — " + nextHint;
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
      // Cancel any queued speech so we don't stack
      try { speechSynthesis.cancel(); } catch (_) {}
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

  function bufferMetersFor(f) {
    const bufFt = (f.properties && f.properties.buffer_ft) || DEFAULT_BUFFER_FT;
    return bufFt * 0.3048 + GPS_PAD_M;
  }

  function checkProximity() {
    if (!enabled || !zoneData) {
      return;
    }
    if (!userLngLat) {
      return; // wait for first GPS fix
    }
    const active = filterActive(zoneData);
    let inside = false;
    let nearestM = Infinity;
    let nearestName = null;

    for (const f of active.features || []) {
      const coords = f.geometry && f.geometry.coordinates;
      if (!coords || coords.length < 2) continue;
      const dist = haversineMeters(userLngLat[0], userLngLat[1], coords[0], coords[1]);
      if (dist < nearestM) {
        nearestM = dist;
        nearestName = (f.properties && f.properties.name) || "school zone";
      }
      if (dist <= bufferMetersFor(f)) {
        inside = true;
      }
    }

    if (inside && !lastInside) {
      speak("Entering school zone. Please slow down.");
      console.log("[zone-aware] ENTER", nearestName, Math.round(nearestM) + "m");
    } else if (!inside && lastInside) {
      speak("Leaving school zone.");
      console.log("[zone-aware] LEAVE", nearestName ? Math.round(nearestM) + "m from " + nearestName : "");
    }
    lastInside = inside;
  }

  // Approximate meters→pixels at equator-ish latitude for MapLibre circle-radius
  // radius_px ≈ meters / (156543.03392 * cos(lat) / 2^zoom)
  // We use a fixed mid-SA latitude and an expression so circles scale with zoom.
  function circleRadiusExpr(meters) {
    // At zoom 14 near lat 29.4, 1 m ≈ 0.12 px roughly; we bake a practical curve
    // that reads as ~street-level 400 ft at z14–16.
    const m = meters || 122;
    return [
      "interpolate", ["linear"], ["zoom"],
      10, Math.max(4, m * 0.04),
      12, Math.max(8, m * 0.10),
      14, Math.max(14, m * 0.22),
      16, Math.max(28, m * 0.45),
      18, Math.max(50, m * 0.90)
    ];
  }

  function ensureLayer(map) {
    if (!map || !zoneData) return false;
    const add = () => {
      try {
        const active = filterActive(zoneData);
        lastActiveCount = (active.features || []).length;

        if (!map.getSource(SRC_ID)) {
          map.addSource(SRC_ID, { type: "geojson", data: active });
        } else {
          map.getSource(SRC_ID).setData(active);
        }

        // Halo ≈ 400 ft geographic feel
        if (!map.getLayer(LAYER_HALO)) {
          map.addLayer({
            id: LAYER_HALO,
            type: "circle",
            source: SRC_ID,
            paint: {
              "circle-radius": circleRadiusExpr(122),
              "circle-color": COLOR_ACTIVE,
              "circle-opacity": 0.20,
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
              "circle-radius": [
                "interpolate", ["linear"], ["zoom"],
                10, 5, 14, 9, 16, 12
              ],
              "circle-color": COLOR_ACTIVE,
              "circle-stroke-width": 2,
              "circle-stroke-color": COLOR_STROKE,
              "circle-opacity": 0.9
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
              '<div style="font-size:11px;color:#b45309">Active now · please slow down</div>' +
              '<div style="font-size:10px;color:#888;margin-top:4px">AM ' +
              (p.am_start || "?") + "–" + (p.am_end || "?") +
              " · PM " + (p.pm_start || "?") + "–" + (p.pm_end || "?") +
              "</div></div>";
            if (window.__ybPinPopup) { try { window.__ybPinPopup.remove(); } catch (_) {} }
            window.__ybPinPopup = new maplibregl.Popup({ offset: 12, closeButton: true, maxWidth: "280px" })
              .setLngLat(coords).setHTML(html).addTo(map);
          });
          map.on("mouseenter", LAYER_ID, () => { map.getCanvas().style.cursor = "pointer"; });
          map.on("mouseleave", LAYER_ID, () => { map.getCanvas().style.cursor = ""; });
        } else {
          // Refresh data on existing layer
          try { map.getSource(SRC_ID).setData(active); } catch (_) {}
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
    if (!navigator.geolocation) {
      toast("Location unavailable — zones still show on map");
      return;
    }
    if (watchId) return;
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        userLngLat = [pos.coords.longitude, pos.coords.latitude];
        userAccuracy = pos.coords.accuracy;
        checkProximity();
      },
      (err) => {
        console.warn("[zone-aware] geolocation error", err && err.code, err && err.message);
        if (err && err.code === 1) {
          toast("Location permission denied — enable for voice alerts");
        }
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );
    if (!checkTimer) {
      checkTimer = setInterval(() => {
        if (enabled && mapRef) {
          ensureLayer(mapRef); // refresh active set as time passes
          checkProximity();
        }
      }, 20000);
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
        const state = describeScheduleState();
        toast("Zone Aware on — " + state, 4500);
        console.log("[zone-aware]", state, "features:", data.features.length);
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

  // —— Public API / debug ——
  window.ChicaZoneAware = {
    toggle,
    setVoice: (on) => {
      voiceEnabled = !!on;
      try { localStorage.setItem(VOICE_KEY, on ? "1" : "0"); } catch (_) {}
    },
    isEnabled: () => enabled,
    status: () => ({
      enabled,
      voiceEnabled,
      isSchoolDay: isSchoolDay(),
      schedule: describeScheduleState(),
      activeCount: lastActiveCount,
      hasGps: !!userLngLat,
      gpsAccuracyM: userAccuracy,
      userLngLat,
      lastInside,
      featureCount: zoneData && zoneData.features ? zoneData.features.length : 0
    }),
    forceCheck: () => {
      if (mapRef) ensureLayer(mapRef);
      checkProximity();
      return window.ChicaZoneAware.status();
    },
    debug: () => {
      const s = window.ChicaZoneAware.status();
      console.table(s);
      toast(s.schedule, 4000);
      return s;
    }
  };
})();
