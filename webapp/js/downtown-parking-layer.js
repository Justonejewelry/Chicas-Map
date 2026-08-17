/**
 * Chica Map — Downtown Parking Layer
 * City-owned garages + on-street meter summary with rates & free periods.
 */
(function () {
  const SRC_ID = "yb-downtown-parking";
  const LAYER_ID = "yb-downtown-parking-layer";
  const LAYER_LABEL = "yb-downtown-parking-label";
  const TOGGLE_ID = "btnDowntownParking";
  const COLOR_GARAGE = "#0ea5e9";
  const COLOR_METERS = "#f97316";
  const STROKE = "#0c4a6e";
  const LABEL_COLOR = "#0c4a6e";

  let parkingData = null;
  let enabled = false;
  let mapRef = null;
  let layerBuilt = false;
  let toggleLock = false;

  function patchMapConstructor() {
    if (!window.maplibregl || !window.maplibregl.Map) return false;
    if (window.maplibregl.Map.__ybParkingPatched) return true;
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
    Wrapped.__ybParkingPatched = true;
    window.maplibregl.Map = Wrapped;
    return true;
  }

  async function loadData() {
    if (parkingData) return parkingData;
    const url = "data/san-antonio-downtown-parking.geojson?t=" + Date.now();
    try {
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) return null;
      parkingData = await r.json();
      return parkingData;
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
      setTimeout(() => { el.classList.add("hidden"); el.style.display = ""; }, ms || 3500);
      return;
    }
    console.log("[downtown-parking]", msg);
  }

  function ensureLayer(map) {
    if (!map || !parkingData) return false;
    const add = () => {
      try {
        if (!map.getSource(SRC_ID)) {
          map.addSource(SRC_ID, { type: "geojson", data: parkingData });
        } else {
          map.getSource(SRC_ID).setData(parkingData);
        }
        if (!map.getLayer(LAYER_ID)) {
          map.addLayer({
            id: LAYER_ID,
            type: "circle",
            source: SRC_ID,
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 8, 14, 16],
              "circle-color": [
                "case",
                ["==", ["get", "type"], "meters"],
                COLOR_METERS,
                COLOR_GARAGE
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
            minzoom: 13,
            layout: {
              "text-field": ["get", "name"],
              "text-size": 11,
              "text-offset": [0, 1.3],
              "text-anchor": "top",
              "text-max-width": 14
            },
            paint: {
              "text-color": LABEL_COLOR,
              "text-halo-color": "#ffffff",
              "text-halo-width": 1.8
            }
          });
          map.on("click", LAYER_ID, (e) => {
            const f = e.features && e.features[0];
            if (!f) return;
            const p = f.properties || {};
            const coords = f.geometry.coordinates.slice();
            const html =
              '<div style="font-family:system-ui,sans-serif;max-width:280px">' +
              '<div style="font-weight:700;font-size:14px;color:#0c4a6e;margin-bottom:4px">' +
              (p.name || "Parking") +
              "</div>" +
              '<div style="font-size:12px;color:#444;margin-bottom:6px">' +
              (p.address || "") +
              "</div>" +
              (p.clearance && p.clearance !== "N/A" ? '<div style="font-size:11px;margin-bottom:4px"><b>Clearance:</b> ' + p.clearance + "</div>" : "") +
              '<div style="font-size:12px;font-weight:600;margin-bottom:4px">' + (p.hours || "") + "</div>" +
              '<div style="font-size:12px;margin-bottom:6px;line-height:1.35">' + (p.rates || "") + "</div>" +
              (p.free_periods ? '<div style="font-size:11px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:6px;padding:6px 8px;margin-bottom:6px;color:#065f46"><b>Free periods:</b> ' + p.free_periods + "</div>" : "") +
              (p.notes ? '<div style="font-size:11px;color:#555;margin-bottom:6px">' + p.notes + "</div>" : "") +
              '<div style="font-size:10px;color:#64748b">Verify live rates & events → <a href="https://sapark.sanantonio.gov/Parking-Locations" target="_blank" rel="noopener" style="color:#0284c7">SAPark</a></div>' +
              "</div>";
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
        console.warn("[downtown-parking] ensureLayer error", err);
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
          toast("Could not load parking data");
          enabled = false;
          if (btn) btn.classList.remove("active");
          return;
        }
        ensureLayer(map);
        setVisible(map, true);
        toast("Downtown parking on — sky = garages, orange = meters");
      } else {
        setVisible(map, false);
        toast("Downtown parking off");
      }
    } finally {
      toggleLock = false;
      if (btn) btn.disabled = false;
    }
  }

  function injectToggle() {
    if (document.getElementById(TOGGLE_ID)) return true;
    const grid = document.querySelector(".layer-grid");
    if (grid) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "layer-btn";
      btn.id = TOGGLE_ID;
      btn.title = "Downtown parking rates & hours";
      btn.setAttribute("data-layer", "parking");
      btn.innerHTML = '<span class="layer-ico">🅿️</span><span>Parking</span>';
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      });
      grid.appendChild(btn);
      return true;
    }
    const bar = document.querySelector(".feat-bar") || document.querySelector(".tools-bar") || document.querySelector(".map-tools");
    if (!bar) return false;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tool-btn";
    btn.id = TOGGLE_ID;
    btn.title = "Downtown parking";
    btn.innerHTML = "Parking";
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

  window.ChicaDowntownParking = { toggle, loadData, findMap };
})();
