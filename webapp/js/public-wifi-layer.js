/**
 * Chica Map — Public WiFi Layer
 * Toggleable overlay of free public / guest WiFi locations.
 * Data: data/san-antonio-public-wifi.geojson
 * Status colors: green (open+confirmed), blue (open), amber (unknown), gray (closed), red (reported down)
 */
(function () {
  const SRC_ID = "yb-public-wifi";
  const LAYER_ID = "yb-public-wifi-layer";
  const LAYER_LABEL = "yb-public-wifi-label";
  const TOGGLE_ID = "btnPublicWifi";

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
    try {
      Object.keys(Orig).forEach((k) => {
        try { Wrapped[k] = Orig[k]; } catch (_) {}
      });
    } catch (_) {}
    Wrapped.__ybWifiPatched = true;
    window.maplibregl.Map = Wrapped;
    return true;
  }

  async function loadData() {
    if (wifiData) return wifiData;
    try {
      const r = await fetch("data/san-antonio-public-wifi.geojson?t=" + Date.now(), { cache: "no-store" });
      if (!r.ok) return null;
      wifiData = await r.json();
      return wifiData;
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
        if (m) {
          cleanup();
          resolve(m);
        }
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
        if (m) {
          cleanup();
          resolve(m);
        } else if (n > 40) {
          cleanup();
          resolve(null);
        }
      }, 100);
      const to = setTimeout(() => {
        cleanup();
        resolve(findMap());
      }, ms || 4000);
    });
  }

  function toast(msg, ms) {
    const el = document.getElementById("toast");
    if (el) {
      el.textContent = msg;
      el.classList.remove("hidden");
      el.style.display = "block";
      setTimeout(() => {
        el.classList.add("hidden");
        el.style.display = "";
      }, ms || 3500);
      return;
    }
    console.log("[public-wifi]", msg);
  }

  function computeStatus(props) {
    const now = new Date();
    const hour = now.getHours() + now.getMinutes() / 60;
    const hours = (props.hours || "").toLowerCase();
    let isOpen = null;

    if (hours.includes("7:30") && hours.includes("10:30")) {
      isOpen = hour >= 7.5 && hour < 22.5;
    } else if (hours.includes("5am") || hours.includes("5 a.m")) {
      isOpen = hour >= 5 && hour < 23;
    } else if (hours.includes("sunrise") || hours.includes("sunset")) {
      isOpen = hour >= 6.5 && hour < 20.5;
    } else if (hours.includes("9am") || hours.includes("9 a.m")) {
      isOpen = hour >= 9 && hour < 17;
    } else if (hours.includes("business hours")) {
      isOpen = hour >= 8 && hour < 21;
    }

    const reportedDown = props.status === "reported_down" || (props.report_count_48h || 0) > 2;
    const recentlyConfirmed = props.last_verified && (Date.now() - new Date(props.last_verified).getTime()) < 48 * 3600 * 1000;

    if (reportedDown) return "down";
    if (isOpen === false) return "closed";
    if (isOpen === true && recentlyConfirmed) return "open_confirmed";
    if (isOpen === true) return "open";
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

        if (!map.getSource(SRC_ID)) {
          map.addSource(SRC_ID, { type: "geojson", data: enriched });
        } else {
          map.getSource(SRC_ID).setData(enriched);
        }

        if (!map.getLayer(LAYER_ID)) {
          map.addLayer({
            id: LAYER_ID,
            type: "circle",
            source: SRC_ID,
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 6, 14, 12],
              "circle-color": [
                "match",
                ["get", "_status"],
                "open_confirmed", COLOR_OPEN_CONFIRMED,
                "open", COLOR_OPEN,
                "closed", COLOR_CLOSED,
                "down", COLOR_DOWN,
                COLOR_UNKNOWN
              ],
              "circle-stroke-width": 2,
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
              "text-offset": [0, 1.2],
              "text-anchor": "top",
              "text-max-width": 14
            },
            paint: {
              "text-color": "#1e293b",
              "text-halo-color": "#ffffff",
              "text-halo-width": 1.6
            }
          });

          map.on("click", LAYER_ID, (e) => {
            const f = e.features && e.features[0];
            if (!f) return;
            const p = f.properties || {};
            const coords = f.geometry.coordinates.slice();
            const status = p._status || computeStatus(p);
            const statusLabel = {
              open_confirmed: "Open • recently confirmed",
              open: "Open now",
              closed: "Currently closed",
              down: "Reported down",
              unknown: "Status unknown"
            }[status] || "Status unknown";

            const ssidLine = p.ssid ? `<div style="font-size:12px;margin-bottom:4px"><b>SSID:</b> ${p.ssid}</div>` : "";
            const html = `
        <div style="font-family:system-ui,sans-serif;max-width:270px">
          <div style="font-weight:700;font-size:14px;color:#1e293b;margin-bottom:4px">📶 ${p.name || "Public WiFi"}</div>
          <div style="font-size:12px;color:#444;margin-bottom:4px">${p.address || ""}</div>
          <div style="font-size:12px;font-weight:600;margin-bottom:6px;color:${statusColor(status)}">${statusLabel}</div>
          ${ssidLine}
          <div style="font-size:11px;color:#555;margin-bottom:8px">${p.hours || ""}</div>
          <div style="font-size:11px;color:#666;margin-bottom:8px">${p.provider || ""} · ${p.category || ""}</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button type="button" class="yb-wifi-ok" style="font-size:11px;padding:5px 8px;border-radius:6px;border:1px solid #22c55e;background:#dcfce7;color:#166534;font-weight:600;cursor:pointer">Still working</button>
            <button type="button" class="yb-wifi-down" style="font-size:11px;padding:5px 8px;border-radius:6px;border:1px solid #ef4444;background:#fee2e2;color:#991b1b;font-weight:600;cursor:pointer">Not working</button>
          </div>
        </div>`;

            if (window.__ybPinPopup) {
              try { window.__ybPinPopup.remove(); } catch (_) {}
            }
            window.__ybPinPopup = new maplibregl.Popup({
              offset: 12,
              closeButton: true,
              maxWidth: "290px"
            })
              .setLngLat(coords)
              .setHTML(html)
              .addTo(map);

            setTimeout(() => {
              document.querySelectorAll(".yb-wifi-ok").forEach((btn) => {
                btn.onclick = () => {
                  toast("Thanks — marked as working. Helps the next person.");
                  btn.textContent = "✓ Noted";
                  btn.disabled = true;
                };
              });
              document.querySelectorAll(".yb-wifi-down").forEach((btn) => {
                btn.onclick = () => {
                  toast("Thanks — reported. Status will update shortly.");
                  btn.textContent = "✓ Reported";
                  btn.disabled = true;
                };
              });
            }, 40);
          });

          map.on("mouseenter", LAYER_ID, () => {
            map.getCanvas().style.cursor = "pointer";
          });
          map.on("mouseleave", LAYER_ID, () => {
            map.getCanvas().style.cursor = "";
          });
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
    map.once("styledata", () => {
      if (!layerBuilt) add();
    });
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
    const items = [
      { color: COLOR_OPEN_CONFIRMED, label: "Open + confirmed" },
      { color: COLOR_OPEN, label: "Open now" },
      { color: COLOR_UNKNOWN, label: "Unknown" },
      { color: COLOR_CLOSED, label: "Closed" },
      { color: COLOR_DOWN, label: "Reported down" }
    ];
    items.forEach((it) => {
      const span = document.createElement("span");
      span.setAttribute("data-wifi-legend", "1");
      span.innerHTML = `<i class="pin" style="background:${it.color};border-radius:50%;width:10px;height:10px;display:inline-block;margin-right:3px;vertical-align:middle;border:1.5px solid ${STROKE}"></i> ${it.label}`;
      legend.appendChild(span);
    });
  }

  async function toggle() {
    const btn = document.getElementById(TOGGLE_ID);
    if (btn) btn.disabled = true;

    let map = findMap() || mapRef;
    if (!map) {
      toast("Loading map…");
      map = await waitForMap(5000);
    }
    if (!map) {
      toast("Map still loading — try again in a second");
      if (btn) btn.disabled = false;
      return;
    }
    mapRef = map;
    window.__YB_MAP = map;

    enabled = !enabled;
    if (btn) {
      btn.classList.toggle("active", enabled);
      btn.disabled = false;
    }

    if (enabled) {
      const data = await loadData();
      if (!data || !data.features || !data.features.length) {
        toast("Couldn’t load WiFi data");
        enabled = false;
        if (btn) btn.classList.remove("active");
        return;
      }
      ensureLayer(map);
      setVisible(map, true);
      toast("📶 Public WiFi on — status colors active");
    } else {
      setVisible(map, false);
      toast("Public WiFi off");
    }
  }

  function injectToggle() {
    const bar =
      document.querySelector(".feat-bar") ||
      document.querySelector(".tools-bar") ||
      document.querySelector(".map-tools");
    if (!bar) return false;
    if (document.getElementById(TOGGLE_ID)) return true;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tool-btn";
    btn.id = TOGGLE_ID;
    btn.title = "Free Public WiFi (libraries, parks, guest networks)";
    btn.innerHTML = "📶 WiFi";
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

  window.ChicaPublicWifi = { toggle, loadData, findMap };
})();
