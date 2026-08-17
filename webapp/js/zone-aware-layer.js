/**
 * Chica Map — Zone Aware
 * Live Bexar County school geofences with schedule-aware visibility and
 * optional soft voice alerts. Uses Bexar County GIS as the live source,
 * with the checked-in GeoJSON as an offline fallback.
 */
(function () {
  "use strict";

  const SRC_ID = "yb-zone-aware";
  const LAYER_ID = "yb-zone-aware-layer";
  const LAYER_HALO = "yb-zone-aware-halo";
  const TOGGLE_ID = "btnZoneAware";
  const VOICE_KEY = "chica_zone_aware_voice_v2";
  const CACHE_KEY = "chica_zone_aware_geo_v2";
  const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

  const COLOR_ACTIVE = "#f0a500";
  const COLOR_STROKE = "#b45309";
  const DEFAULT_BUFFER_FT = 400;
  const GPS_PAD_M = 25;
  const MAX_ACCURACY_M = 120;
  const ALERT_COOLDOWN_MS = 45 * 1000;

  // Official Bexar County GIS school point layer. It advertises GeoJSON output
  // and is the source used for the live campus set.
  const LIVE_SOURCE =
    "https://maps.bexar.org/arcgis/rest/services/Schools/MapServer/0/query" +
    "?where=1%3D1" +
    "&outFields=CAMPUS%2CLABEL%2CTYPE%2CDISTRICT%2CDIST_WEB%2CCAMPUS_WEB%2CAddress%2CCAMPID%2CSpan%2CSchType%2CDIST_ID%2CCharterSchool" +
    "&returnGeometry=true" +
    "&outSR=4326" +
    "&f=geojson";

  let zoneData = null;
  let enabled = false;
  let mapRef = null;
  let watchId = null;
  let checkTimer = null;
  let refreshTimer = null;
  let userLngLat = null;
  let userAccuracy = null;
  let lastInsideIds = new Set();
  let lastSpeak = 0;
  let voiceEnabled = true;
  let lastActiveCount = 0;
  let sourceLabel = "not loaded";

  try {
    voiceEnabled = localStorage.getItem(VOICE_KEY) !== "0";
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
      let iv = null;
      let to = null;
      const cleanup = () => {
        window.removeEventListener("yb-map-ready", onReady);
        if (iv) clearInterval(iv);
        if (to) clearTimeout(to);
      };
      const onReady = (e) => {
        const m = (e && e.detail && e.detail.map) || findMap();
        if (m) { cleanup(); resolve(m); }
      };
      window.addEventListener("yb-map-ready", onReady);
      let n = 0;
      iv = setInterval(() => {
        n++;
        const m = findMap();
        if (m) { cleanup(); resolve(m); }
        else if (n > 50) { cleanup(); resolve(null); }
      }, 100);
      to = setTimeout(() => { cleanup(); resolve(findMap()); }, ms || 5000);
    });
  }

  function toast(msg, ms) {
    const el = document.getElementById("toast");
    if (el) {
      el.textContent = msg;
      el.classList.remove("hidden");
      el.style.display = "block";
      setTimeout(() => { el.classList.add("hidden"); el.style.display = ""; }, ms || 3500);
    } else {
      console.log("[zone-aware]", msg);
    }
  }

  function isSchoolDay(d) {
    const day = (d || new Date()).getDay();
    return day >= 1 && day <= 5;
  }

  function toMinutes(hhmm) {
    if (hhmm == null || hhmm === "") return null;
    const p = String(hhmm).trim().split(":");
    const h = Number.parseInt(p[0], 10);
    const m = Number.parseInt(p[1] || "0", 10);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    return h * 60 + m;
  }

  function windowActive(now, start, end) {
    const t = now.getHours() * 60 + now.getMinutes();
    const s = toMinutes(start);
    const e = toMinutes(end);
    return s != null && e != null && t >= s && t <= e;
  }

  function isActiveWindow(now, p) {
    return windowActive(now, p.am_start, p.am_end) || windowActive(now, p.pm_start, p.pm_end);
  }

  function scheduleFor(properties) {
    const p = properties || {};
    const district = String(p.district || "").toLowerCase();
    const type = String(p.type || p.SchType || "").toLowerCase();
    const name = String(p.name || p.CAMPUS || "").toLowerCase();

    // Current published district patterns. These are intentionally wider than
    // the exact bell time so the geofence catches arrival and dismissal traffic.
    if (district.includes("north east") || district.includes("northeast") || district.includes("neisd")) {
      if (type.includes("high")) return ["08:25", "09:20", "15:55", "16:45"];
      if (type.includes("middle")) return ["08:00", "09:00", "15:20", "16:15"];
      return ["06:55", "08:35", "14:15", "15:25"];
    }
    if (district.includes("northside") || district.includes("nisd")) {
      if (type.includes("high")) return ["08:10", "09:25", "15:25", "16:25"];
      if (type.includes("middle")) return ["08:05", "09:20", "15:20", "16:20"];
      return ["07:00", "08:35", "14:30", "15:35"];
    }
    if (district.includes("san antonio") || district.includes("saisd")) {
      if (type.includes("high")) return ["08:05", "09:25", "15:45", "16:35"];
      if (type.includes("middle")) return ["07:50", "09:15", "15:15", "16:10"];
      return ["07:00", "08:30", "14:15", "15:25"];
    }
    if (district.includes("southwest") || district.includes("swisd")) {
      if (type.includes("high")) return ["08:20", "09:35", "15:55", "16:45"];
      if (type.includes("middle")) return ["07:00", "08:20", "14:30", "15:25"];
      return ["07:25", "08:45", "15:05", "16:05"];
    }
    if (district.includes("harlandale")) return ["06:45", "08:35", "14:15", "15:30"];
    if (district.includes("south san antonio") || district.includes("ssaisd")) return ["06:30", "08:25", "14:15", "15:30"];

    // Generic Bexar fallback. Keep a broad arrival/dismissal envelope rather
    // than pretending we know a campus-specific bell time.
    if (type.includes("high")) return ["08:00", "09:30", "15:30", "16:45"];
    if (type.includes("middle")) return ["07:30", "09:15", "14:30", "16:15"];
    if (name.includes("early childhood") || name.includes("ecec")) return ["06:45", "08:15", "13:45", "15:00"];
    return ["06:45", "09:15", "14:00", "16:15"];
  }

  function likelyK12(p) {
    const type = String(p.type || p.SchType || "").toLowerCase();
    const span = String(p.Span || p.span || "").toLowerCase();
    const name = String(p.name || p.CAMPUS || "").toLowerCase();
    const combined = type + " " + span + " " + name;
    if (/(high school|middle school|elementary|academy|k-\d|pk|pre-k|charter)/i.test(combined)) return true;
    if (/(university|community college|adult education|college campus|vocational adult)/i.test(combined)) return false;
    return true;
  }

  function normalizeFeature(f, index) {
    if (!f || !f.geometry || !Array.isArray(f.geometry.coordinates)) return null;
    const p = f.properties || {};
    const c = f.geometry.coordinates;
    if (c.length < 2 || !Number.isFinite(Number(c[0])) || !Number.isFinite(Number(c[1]))) return null;
    if (!likelyK12(p)) return null;
    const schedule = scheduleFor(p);
    const name = p.name || p.CAMPUS || p.LABEL || "School campus";
    const district = p.district || p.DISTRICT || "Bexar County school";
    const id = String(p.id || p.CAMPID || p.OBJECTID || (district + "-" + name + "-" + index))
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return {
      type: "Feature",
      geometry: { type: "Point", coordinates: [Number(c[0]), Number(c[1])] },
      properties: {
        id,
        name,
        district,
        type: p.type || p.SchType || "School",
        address: p.address || p.Address || "",
        district_web: p.dist_web || p.DIST_WEB || "",
        campus_web: p.campus_web || p.CAMPUS_WEB || "",
        am_start: p.am_start || schedule[0],
        am_end: p.am_end || schedule[1],
        pm_start: p.pm_start || schedule[2],
        pm_end: p.pm_end || schedule[3],
        buffer_ft: Number(p.buffer_ft) > 0 ? Number(p.buffer_ft) : DEFAULT_BUFFER_FT,
        confidence: p.confidence || "Medium",
        source: p.source || "Bexar County GIS Public_Schools"
      }
    };
  }

  function normalizeCollection(data) {
    if (!data || data.type !== "FeatureCollection" || !Array.isArray(data.features)) return null;
    const features = data.features.map(normalizeFeature).filter(Boolean);
    return {
      type: "FeatureCollection",
      name: "ZoneAware_Schools_Bexar",
      generated: new Date().toISOString(),
      notes: "Live Bexar County GIS school campus points normalized into soft arrival/dismissal geofences.",
      source: LIVE_SOURCE,
      features
    };
  }

  async function fetchLiveData() {
    if (!isOnline()) return null;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const r = await fetch(LIVE_SOURCE, {
        signal: controller.signal,
        cache: "no-store",
        headers: { Accept: "application/geo+json,application/json" }
      });
      if (!r.ok) throw new Error("school GIS " + r.status);
      const raw = await r.json();
      const normalized = normalizeCollection(raw);
      if (!normalized || !normalized.features.length) throw new Error("school GIS returned no usable campuses");
      sourceLabel = "Bexar County GIS live";
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: normalized }));
      } catch (_) {}
      return normalized;
    } catch (err) {
      console.warn("[zone-aware] live school source unavailable", err && err.message);
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function loadOfflineFallback() {
    try {
      const r = await fetch("data/zone-aware-schools.geojson?v=zone-final", { cache: "no-store" });
      if (r.ok) {
        const raw = await r.json();
        const normalized = normalizeCollection(raw);
        if (normalized && normalized.features.length) {
          sourceLabel = "checked-in fallback";
          return normalized;
        }
      }
    } catch (_) {}
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.data && Array.isArray(parsed.data.features)) {
          const age = Date.now() - Number(parsed.ts || 0);
          if (age <= CACHE_TTL_MS || !isOnline()) {
            sourceLabel = "cached Bexar County GIS";
            return parsed.data;
          }
        }
      }
    } catch (_) {}
    return null;
  }

  async function loadData() {
    const live = await fetchLiveData();
    if (live) return live;
    return loadOfflineFallback();
  }

  function filterActive(data, now) {
    if (!data || !Array.isArray(data.features) || !isSchoolDay(now)) {
      return { type: "FeatureCollection", features: [] };
    }
    const d = now || new Date();
    return {
      type: "FeatureCollection",
      features: data.features.filter((f) => isActiveWindow(d, f.properties || {}))
    };
  }

  function describeScheduleState() {
    const now = new Date();
    if (!isSchoolDay(now)) {
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      return "Weekend (" + days[now.getDay()] + ") — school geofences inactive";
    }
    if (!zoneData || !zoneData.features || !zoneData.features.length) return "No school data loaded";
    const n = filterActive(zoneData, now).features.length;
    return n ? n + " school geofence" + (n === 1 ? "" : "s") + " active now" : "Outside school-zone hours";
  }

  function haversineMeters(lng1, lat1, lng2, lat2) {
    const R = 6371000;
    const rad = (x) => x * Math.PI / 180;
    const dLat = rad(lat2 - lat1);
    const dLon = rad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function bufferMetersFor(f) {
    const ft = Number(f && f.properties && f.properties.buffer_ft) || DEFAULT_BUFFER_FT;
    return ft * 0.3048 + GPS_PAD_M;
  }

  function speak(text) {
    if (!voiceEnabled || !window.speechSynthesis) return;
    const now = Date.now();
    if (now - lastSpeak < ALERT_COOLDOWN_MS) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.92;
      u.pitch = 1;
      u.volume = 0.7;
      const voices = speechSynthesis.getVoices();
      const preferred = voices.find((v) => /en-US|en_US/i.test(v.lang) && /samantha|karen|zira|google|female/i.test(v.name))
        || voices.find((v) => /en/i.test(v.lang));
      if (preferred) u.voice = preferred;
      speechSynthesis.speak(u);
      lastSpeak = now;
    } catch (_) {}
  }

  function checkProximity() {
    if (!enabled || !zoneData || !userLngLat) return;
    const accuracy = Number(userAccuracy);
    if (!Number.isFinite(accuracy) || accuracy > MAX_ACCURACY_M) return;

    const active = filterActive(zoneData, new Date());
    const inside = new Set();
    let nearest = null;
    let nearestM = Infinity;

    for (const f of active.features) {
      const c = f.geometry && f.geometry.coordinates;
      if (!c || c.length < 2) continue;
      const dist = haversineMeters(userLngLat[0], userLngLat[1], c[0], c[1]);
      if (dist < nearestM) {
        nearestM = dist;
        nearest = f;
      }
      const effectiveBuffer = bufferMetersFor(f) + Math.min(accuracy, 60);
      if (dist <= effectiveBuffer) inside.add(f.properties.id);
    }

    const entered = [...inside].filter((id) => !lastInsideIds.has(id));
    const left = [...lastInsideIds].filter((id) => !inside.has(id));

    if (entered.length) {
      const f = active.features.find((x) => x.properties.id === entered[0]);
      speak("Entering school zone. Please slow down.");
      console.log("[zone-aware] ENTER", f && f.properties && f.properties.name, Math.round(nearestM) + "m");
    } else if (left.length) {
      speak("Leaving school zone.");
      console.log("[zone-aware] LEAVE", nearest && nearest.properties && nearest.properties.name);
    }
    lastInsideIds = inside;
  }

  function circleRadiusExpr(meters) {
    const m = meters || 122;
    return [
      "interpolate", ["linear"], ["zoom"],
      9, Math.max(3, m * 0.02),
      11, Math.max(6, m * 0.06),
      13, Math.max(10, m * 0.13),
      15, Math.max(18, m * 0.27),
      17, Math.max(32, m * 0.54),
      19, Math.max(48, m * 0.95)
    ];
  }

  function popupFor(map, f) {
    const p = f.properties || {};
    const coords = f.geometry.coordinates.slice();
    const esc = (v) => String(v == null ? "" : v).replace(/[&<>\"']/g, (ch) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]));
    const html =
      '<div style="font-family:system-ui,sans-serif;max-width:280px">' +
      '<div style="font-weight:800;font-size:14px;color:#1e293b;margin-bottom:4px">School Zone</div>' +
      '<div style="font-size:13px;font-weight:700;margin-bottom:2px">' + esc(p.name || "School campus") + '</div>' +
      '<div style="font-size:12px;color:#555;margin-bottom:4px">' + esc(p.district || "") + '</div>' +
      '<div style="font-size:11px;color:#b45309">Active now · please slow down</div>' +
      '<div style="font-size:10px;color:#777;margin-top:5px">AM ' + esc(p.am_start) + '–' + esc(p.am_end) +
      ' · PM ' + esc(p.pm_start) + '–' + esc(p.pm_end) + '</div>' +
      (p.address ? '<div style="font-size:10px;color:#888;margin-top:4px">' + esc(p.address) + '</div>' : '') +
      '</div>';
    if (window.__ybPinPopup) { try { window.__ybPinPopup.remove(); } catch (_) {} }
    window.__ybPinPopup = new maplibregl.Popup({ offset: 12, closeButton: true, maxWidth: "300px" })
      .setLngLat(coords).setHTML(html).addTo(map);
  }

  function ensureLayer(map) {
    if (!map || !zoneData) return false;
    const active = filterActive(zoneData, new Date());
    lastActiveCount = active.features.length;
    try {
      if (!map.getSource(SRC_ID)) map.addSource(SRC_ID, { type: "geojson", data: active });
      else map.getSource(SRC_ID).setData(active);

      if (!map.getLayer(LAYER_HALO)) {
        map.addLayer({
          id: LAYER_HALO,
          type: "circle",
          source: SRC_ID,
          paint: {
            "circle-radius": circleRadiusExpr(DEFAULT_BUFFER_FT * 0.3048),
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
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 4, 13, 7, 15, 10, 17, 13],
            "circle-color": COLOR_ACTIVE,
            "circle-stroke-width": 2,
            "circle-stroke-color": COLOR_STROKE,
            "circle-opacity": 0.92
          }
        });
        map.on("click", LAYER_ID, (e) => {
          const f = e.features && e.features[0];
          if (f) popupFor(map, f);
        });
        map.on("mouseenter", LAYER_ID, () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", LAYER_ID, () => { map.getCanvas().style.cursor = ""; });
      }
      return true;
    } catch (err) {
      console.warn("[zone-aware] ensureLayer error", err);
      return false;
    }
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
      toast("Location unavailable — school geofences still show on the map");
      return;
    }
    if (!watchId) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          userLngLat = [pos.coords.longitude, pos.coords.latitude];
          userAccuracy = pos.coords.accuracy;
          checkProximity();
        },
        (err) => {
          console.warn("[zone-aware] geolocation error", err && err.code, err && err.message);
          if (err && err.code === 1) toast("Location permission denied — enable it for voice alerts");
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
      );
    }
    if (!checkTimer) {
      checkTimer = setInterval(() => {
        if (enabled && mapRef) {
          ensureLayer(mapRef);
          checkProximity();
        }
      }, 20000);
    }
    if (!refreshTimer) {
      refreshTimer = setInterval(async () => {
        if (!enabled) return;
        const fresh = await fetchLiveData();
        if (fresh) {
          zoneData = fresh;
          if (mapRef) ensureLayer(mapRef);
        }
      }, 15 * 60 * 1000);
    }
  }

  function stopWatch() {
    if (watchId) {
      try { navigator.geolocation.clearWatch(watchId); } catch (_) {}
      watchId = null;
    }
    if (checkTimer) { clearInterval(checkTimer); checkTimer = null; }
    if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; }
    lastInsideIds = new Set();
  }

  async function toggle() {
    const btn = document.getElementById(TOGGLE_ID);
    try {
      if (btn) btn.disabled = true;
      let map = findMap() || mapRef;
      if (!map) { toast("Loading map..."); map = await waitForMap(5000); }
      if (!map) { toast("Map still loading — try again in a second"); return; }
      mapRef = map;
      window.__YB_MAP = map;
      enabled = !enabled;
      if (btn) btn.classList.toggle("active", enabled);

      if (enabled) {
        zoneData = await loadData();
        if (!zoneData || !zoneData.features || !zoneData.features.length) {
          enabled = false;
          if (btn) btn.classList.remove("active");
          toast("School geofence data is unavailable right now");
          return;
        }
        ensureLayer(map);
        setVisible(map, true);
        startWatch();
        toast("Zone Aware on — " + describeScheduleState(), 4500);
        console.log("[zone-aware]", describeScheduleState(), "campuses:", zoneData.features.length, "source:", sourceLabel);
      } else {
        setVisible(map, false);
        stopWatch();
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
    btn.title = "Zone Aware — school geofences + soft voice";
    btn.setAttribute("aria-pressed", "false");
    btn.textContent = "Zone";
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggle().finally(() => btn.setAttribute("aria-pressed", enabled ? "true" : "false"));
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
      if (enabled) ensureLayer(mapRef);
    }
  });

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
      featureCount: zoneData && zoneData.features ? zoneData.features.length : 0,
      source: sourceLabel,
      hasGps: !!userLngLat,
      gpsAccuracyM: userAccuracy,
      userLngLat,
      insideCount: lastInsideIds.size
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
