/**
 * Chica Map — 24h Food Pantry Layer
 * Toggleable overlay of Community First outdoor pantries.
 */
(function () {
  const SRC_ID = "yb-food-pantries";
  const LAYER_ID = "yb-food-pantries-layer";
  const LAYER_LABEL = "yb-food-pantries-label";
  const TOGGLE_ID = "btnFoodPantry";
  const YELLOW_24 = "#FFD400";
  const YELLOW_LTD = "#FFB000";
  const YELLOW_STROKE = "#5C4A00";
  const LABEL_COLOR = "#5C4A00";

  let pantryData = null;
  let enabled = false;
  let mapRef = null;
  let restockPromptShown = false;
  let layerBuilt = false;
  let toggleLock = false;

  const BLURB =
    "These free outdoor boxes are open day and night. If you can, leave something when you pass by.";

  function patchMapConstructor() {
    if (!window.maplibregl || !window.maplibregl.Map) return false;
    if (window.maplibregl.Map.__ybPantryPatched) return true;
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
    try {
      Object.keys(Orig).forEach((k) => {
        try { Wrapped[k] = Orig[k]; } catch (_) {}
      });
    } catch (_) {}
    Wrapped.__ybPantryPatched = true;
    window.maplibregl.Map = Wrapped;
    return true;
  }

  async function loadData() {
    if (pantryData) return pantryData;
    const sources = [
      "data/san-antonio-24h-food-pantries.geojson?t=" + Date.now(),
      "https://cdn.jsdelivr.net/gh/Justonejewelry/Chicas-Map@main/webapp/data/san-antonio-24h-food-pantries.geojson"
    ];
    for (const url of sources) {
      try {
        if (window.ChicaLayerWorker && typeof window.ChicaLayerWorker.preparePantry === "function") {
          const prepared = await window.ChicaLayerWorker.preparePantry({ url: url });
          if (prepared) {
            pantryData = prepared;
            return pantryData;
          }
        }
        const response = await fetch(url, { cache: "no-store" });
        if (response.ok) {
          pantryData = await response.json();
          return pantryData;
        }
      } catch (_) {}
    }
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
    console.log("[food-pantry]", msg);
  }

  function applyYellowPaint(map) {
    if (!map.getLayer(LAYER_ID)) return;
    map.setPaintProperty(LAYER_ID, "circle-color", [
      "case",
      ["any", ["==", ["get", "is_24h"], true], ["==", ["get", "is_24h"], "true"]],
      YELLOW_24,
      ["any", ["==", ["get", "is_24h"], false], ["==", ["get", "is_24h"], "false"]],
      YELLOW_LTD,
      YELLOW_24,
    ]);
    map.setPaintProperty(LAYER_ID, "circle-stroke-color", YELLOW_STROKE);
    map.setPaintProperty(LAYER_ID, "circle-stroke-width", 2.5);
    map.setPaintProperty(LAYER_ID, "circle-radius", ["interpolate", ["linear"], ["zoom"], 9, 7, 14, 14]);
    map.setPaintProperty(LAYER_ID, "circle-opacity", 0.98);
    if (map.getLayer(LAYER_LABEL)) {
      map.setPaintProperty(LAYER_LABEL, "text-color", LABEL_COLOR);
      map.setPaintProperty(LAYER_LABEL, "text-halo-color", "#fff8d6");
      map.setPaintProperty(LAYER_LABEL, "text-halo-width", 1.8);
    }
  }

  function ensureLayer(map) {
    if (!map || !pantryData) return false;
    const add = () => {
      try {
        if (!map.getSource(SRC_ID)) {
          map.addSource(SRC_ID, { type: "geojson", data: pantryData });
        } else {
          map.getSource(SRC_ID).setData(pantryData);
        }
        if (!map.getLayer(LAYER_ID)) {
          map.addLayer({
            id: LAYER_ID,
            type: "circle",
            source: SRC_ID,
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 7, 14, 14],
              "circle-color": [
                "case",
                ["any", ["==", ["get", "is_24h"], true], ["==", ["get", "is_24h"], "true"]],
                YELLOW_24,
                ["any", ["==", ["get", "is_24h"], false], ["==", ["get", "is_24h"], "false"]],
                YELLOW_LTD,
                YELLOW_24,
              ],
              "circle-stroke-width": 2.5,
              "circle-stroke-color": YELLOW_STROKE,
              "circle-opacity": 0.98,
            },
          });
          map.addLayer({
            id: LAYER_LABEL,
            type: "symbol",
            source: SRC_ID,
            minzoom: 13,
            layout: {
              "text-field": ["get", "name"],
              "text-size": 11,
              "text-offset": [0, 1.25],
              "text-anchor": "top",
              "text-max-width": 12,
            },
            paint: {
              "text-color": LABEL_COLOR,
              "text-halo-color": "#fff8d6",
              "text-halo-width": 1.8,
            },
          });
          map.on("click", LAYER_ID, (e) => {
            const f = e.features && e.features[0];
            if (!f) return;
            const p = f.properties || {};
            const coords = f.geometry.coordinates.slice();
            const hours = p.hours || "24/7";
            const is24 = p.is_24h === true || p.is_24h === "true" || String(hours).includes("24");
            const html =
              '<div style="font-family:system-ui,sans-serif;max-width:260px">' +
              '<div style="font-weight:700;font-size:14px;color:#5C4A00;margin-bottom:4px">' +
              (p.name || "Food Pantry") +
              "</div>" +
              '<div style="font-size:12px;color:#444;margin-bottom:6px">' +
              (p.address || "") +
              "</div>" +
              '<div style="font-size:12px;font-weight:600">' +
              (is24 ? "Open 24/7" : hours) +
              "</div></div>";
            if (window.__ybPinPopup) {
              try { window.__ybPinPopup.remove(); } catch (_) {}
            }
            window.__ybPinPopup = new maplibregl.Popup({
              offset: 12, closeButton: true, maxWidth: "280px",
            }).setLngLat(coords).setHTML(html).addTo(map);
          });
          map.on("mouseenter", LAYER_ID, () => { map.getCanvas().style.cursor = "pointer"; });
          map.on("mouseleave", LAYER_ID, () => { map.getCanvas().style.cursor = ""; });
        } else {
          applyYellowPaint(map);
        }
        layerBuilt = true;
        return true;
      } catch (err) {
        console.warn("[food-pantry] ensureLayer error", err);
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
  }

  async function toggle() {
    if (toggleLock) return;
    toggleLock = true;
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
      const wantOn = enabled;
      if (btn) btn.classList.toggle("active", wantOn);
      if (wantOn) {
        const data = await loadData();
        if (!enabled) {
          setVisible(map, false);
          return;
        }
        if (!data || !data.features || !data.features.length) {
          toast("Could not load pantry data");
          enabled = false;
          if (btn) btn.classList.remove("active");
          return;
        }
        ensureLayer(map);
        applyYellowPaint(map);
        setVisible(map, true);
        toast("Food pantries on — yellow dots");
      } else {
        setVisible(map, false);
        toast("Food pantries off");
      }
    } finally {
      toggleLock = false;
      if (btn) btn.disabled = false;
    }
  }

  function injectToggle() {
    if (document.getElementById(TOGGLE_ID)) return true;
    if (document.querySelector(".rail-layers")) return true;
    const bar =
      document.querySelector(".feat-bar") ||
      document.querySelector(".tools-bar") ||
      document.querySelector(".map-tools");
    if (!bar) return false;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tool-btn";
    btn.id = TOGGLE_ID;
    btn.title = "24h Food Pantries";
    btn.innerHTML = "Pantries";
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggle();
    });
    bar.appendChild(btn);
    return true;
  }

  function boot() {
    patchMapConstructor();
    injectToggle();
    let tries = 0;
    const iv = setInterval(() => {
      tries++;
      patchMapConstructor();
      injectToggle();
      const m = findMap();
      if (m) {
        mapRef = m;
        window.__YB_MAP = m;
      }
      if (tries > 50) clearInterval(iv);
    }, 200);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
  setTimeout(boot, 800);
  setTimeout(boot, 2000);
  setTimeout(boot, 4000);

  window.addEventListener("yb-map-ready", (e) => {
    if (e.detail && e.detail.map) {
      mapRef = e.detail.map;
      window.__YB_MAP = e.detail.map;
    }
  });

  window.ChicaFoodPantry = { toggle, loadData, findMap };
})();
