/**
 * Chica Map — Emergency Public Info Layer (DORMANT / DEPLOY-READY)
 *
 * NOT shown on the day-to-day map or Layers rail.
 * Tucked in public-info data. Ready for function testing and rapid activation
 * during wet / flood / severe weather events.
 *
 * Activation (test or live):
 *   window.CHICA_EMERGENCY_DEPLOY = true;
 *   — or URL param ?emergency=1
 *   — or localStorage.setItem("chica_emergency_deploy", "1")
 *
 * When activated: toggle appears, layer loads, popups push Ready South Texas
 * app + SAOEM / Bexar OEM links. On real need we flip the flag, push live,
 * and promote the app immediately.
 *
 * Data: data/san-antonio-emergency-info.geojson
 */
(function () {
  const SRC_ID = "yb-emergency-info";
  const LAYER_ID = "yb-emergency-info-layer";
  const LAYER_LABEL = "yb-emergency-info-label";
  const TOGGLE_ID = "btnEmergencyInfo";
  const HUB_COLOR = "#0ea5e9";
  const RESOURCE_COLOR = "#f97316";
  const STROKE = "#0c4a6e";
  const LABEL_COLOR = "#0c4a6e";

  let emergencyData = null;
  let enabled = false;
  let mapRef = null;
  let layerBuilt = false;
  let toggleLock = false;
  let deployActive = false;

  function isDeployActive() {
    try {
      if (window.CHICA_EMERGENCY_DEPLOY === true) return true;
      if (localStorage.getItem("chica_emergency_deploy") === "1") return true;
      const params = new URLSearchParams(window.location.search || "");
      if (params.get("emergency") === "1" || params.get("emergency") === "true") return true;
    } catch (_) {}
    return false;
  }

  function patchMapConstructor() {
    if (!window.maplibregl || !window.maplibregl.Map) return false;
    if (window.maplibregl.Map.__ybEmergencyPatched) return true;
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
    Wrapped.__ybEmergencyPatched = true;
    window.maplibregl.Map = Wrapped;
    return true;
  }

  async function loadData() {
    if (emergencyData) return emergencyData;
    const url = "data/san-antonio-emergency-info.geojson?t=" + Date.now();
    try {
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) return null;
      emergencyData = await r.json();
      return emergencyData;
    } catch (_) {
      return null;
    }
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
      setTimeout(() => { el.classList.add("hidden"); el.style.display = ""; }, ms || 4000);
      return;
    }
    console.log("[emergency-info]", msg);
  }

  function ensureLayer(map) {
    if (!map || !emergencyData) return false;
    const add = () => {
      try {
        if (!map.getSource(SRC_ID)) {
          map.addSource(SRC_ID, { type: "geojson", data: emergencyData });
        } else {
          map.getSource(SRC_ID).setData(emergencyData);
        }
        if (!map.getLayer(LAYER_ID)) {
          map.addLayer({
            id: LAYER_ID,
            type: "circle",
            source: SRC_ID,
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 7, 14, 13],
              "circle-color": [
                "case",
                ["==", ["get", "type"], "resilience_hub"], HUB_COLOR,
                RESOURCE_COLOR
              ],
              "circle-stroke-width": 2.5,
              "circle-stroke-color": STROKE,
              "circle-opacity": 0.95
            }
          });
          map.addLayer({
            id: LAYER_LABEL,
            type: "symbol",
            source: SRC_ID,
            minzoom: 12,
            layout: {
              "text-field": ["get", "name"],
              "text-size": 11,
              "text-offset": [0, 1.25],
              "text-anchor": "top",
              "text-max-width": 14
            },
            paint: {
              "text-color": LABEL_COLOR,
              "text-halo-color": "#e0f2fe",
              "text-halo-width": 1.8
            }
          });
          map.on("click", LAYER_ID, (e) => {
            const f = e.features && e.features[0];
            if (!f) return;
            const p = f.properties || {};
            const coords = f.geometry.coordinates.slice();
            const readyLink = p.ready_south_texas || "https://www.readysouthtexasapp.com/";
            const official = p.official_url || "https://www.saoemprepare.com/";
            const html =
              '<div style="font-family:system-ui,sans-serif;max-width:280px">' +
              '<div style="font-weight:700;font-size:14px;color:#0c4a6e;margin-bottom:4px">' +
              (p.name || "Emergency Info") +
              "</div>" +
              '<div style="font-size:12px;color:#444;margin-bottom:6px">' +
              (p.address || "") +
              "</div>" +
              (p.hours_note ? '<div style="font-size:11px;color:#0369a1;margin-bottom:6px">' + p.hours_note + "</div>" : "") +
              (p.notes ? '<div style="font-size:11px;color:#555;margin-bottom:8px">' + p.notes + "</div>" : "") +
              '<div style="margin-top:8px;display:flex;flex-direction:column;gap:6px">' +
              '<a href="' + readyLink + '" target="_blank" rel="noopener" style="background:#0ea5e9;color:#fff;text-align:center;padding:6px 10px;border-radius:6px;font-size:12px;font-weight:600;text-decoration:none">Open Ready South Texas App</a>' +
              '<a href="' + official + '" target="_blank" rel="noopener" style="background:#e0f2fe;color:#0c4a6e;text-align:center;padding:5px 10px;border-radius:6px;font-size:11px;text-decoration:none">SAOEM / Official Info</a>' +
              (p.phone ? '<div style="font-size:11px;color:#666;text-align:center">Call 311 or ' + p.phone + "</div>" : "") +
              "</div></div>";
            if (window.__ybPinPopup) {
              try { window.__ybPinPopup.remove(); } catch (_) {}
            }
            window.__ybPinPopup = new maplibregl.Popup({
              offset: 12, closeButton: true, maxWidth: "300px"
            }).setLngLat(coords).setHTML(html).addTo(map);
          });
          map.on("mouseenter", LAYER_ID, () => { map.getCanvas().style.cursor = "pointer"; });
          map.on("mouseleave", LAYER_ID, () => { map.getCanvas().style.cursor = ""; });
        }
        layerBuilt = true;
        return true;
      } catch (err) {
        console.warn("[emergency-info] ensureLayer error", err);
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
    if (!isDeployActive()) {
      toast("Emergency layer is dormant. Set CHICA_EMERGENCY_DEPLOY=true to activate.");
      return;
    }
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
          toast("Could not load emergency info data");
          enabled = false;
          if (btn) btn.classList.remove("active");
          return;
        }
        ensureLayer(map);
        setVisible(map, true);
        toast("Emergency info on — hubs + Ready South Texas links");
      } else {
        setVisible(map, false);
        toast("Emergency info off");
      }
    } finally {
      toggleLock = false;
      if (btn) btn.disabled = false;
    }
  }

  function injectToggle() {
    if (!isDeployActive()) return false;
    if (document.getElementById(TOGGLE_ID)) return true;

    const rail = document.querySelector(".rail-layers .layer-grid") ||
                 document.querySelector(".layer-grid");
    if (rail) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "layer-btn";
      btn.id = TOGGLE_ID;
      btn.setAttribute("data-layer", "emergency");
      btn.title = "Emergency info / resilience hubs (deploy mode)";
      btn.innerHTML = '<span class="layer-ico">🆘</span><span>Emergency</span>';
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      });
      rail.appendChild(btn);
      return true;
    }

    const bar = document.querySelector(".feat-bar") ||
                document.querySelector(".tools-bar") ||
                document.querySelector(".map-tools");
    if (!bar) return false;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tool-btn";
    btn.id = TOGGLE_ID;
    btn.title = "Emergency Public Info (deploy mode)";
    btn.innerHTML = "Emergency";
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggle();
    });
    bar.appendChild(btn);
    return true;
  }

  function enableDeploy(force) {
    deployActive = true;
    try {
      window.CHICA_EMERGENCY_DEPLOY = true;
      if (force) localStorage.setItem("chica_emergency_deploy", "1");
    } catch (_) {}
    injectToggle();
    toast("Emergency layer deploy mode ON — toggle available");
  }

  function boot() {
    patchMapConstructor();
    deployActive = isDeployActive();
    if (deployActive) injectToggle();
    let tries = 0;
    const iv = setInterval(() => {
      tries++;
      patchMapConstructor();
      if (isDeployActive()) injectToggle();
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

  window.ChicaEmergencyInfo = {
    toggle,
    enableDeploy,
    loadData,
    findMap,
    isDeployActive: () => isDeployActive()
  };
})();
