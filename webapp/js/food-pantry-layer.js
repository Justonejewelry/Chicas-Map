/**
 * Chica Map — 24h Food Pantry Layer
 * Toggleable overlay of Community First outdoor pantries.
 * Data: data/san-antonio-24h-food-pantries.geojson
 */
(function () {
  const SRC_ID = "yb-food-pantries";
  const LAYER_ID = "yb-food-pantries-layer";
  const LAYER_LABEL = "yb-food-pantries-label";
  const TOGGLE_ID = "btnFoodPantry";
  let pantryData = null;
  let enabled = false;
  let mapRef = null;

  const BLURB = `These free outdoor boxes are open day & night so nobody waits for “business hours.” More people knowing about them means more use — that’s the point. If you can, leave something when you pass by (canned goods, peanut butter, rice, pasta, hygiene, baby supplies). The network only works when the community restocks it.`;

  async function loadData() {
    if (pantryData) return pantryData;
    try {
      const r = await fetch("data/san-antonio-24h-food-pantries.geojson?t=" + Date.now(), { cache: "no-store" });
      if (!r.ok) return null;
      pantryData = await r.json();
      return pantryData;
    } catch (_) {
      return null;
    }
  }

  function findMap() {
    if (window.map && window.map.getSource) return window.map;
    if (window.__YB_MAP) return window.__YB_MAP;
    if (window.maplibregl) {
      const el = document.getElementById("map");
      if (el && el._map) return el._map;
    }
    return null;
  }

  function ensureLayer(map) {
    if (!map || !pantryData) return;
    if (map.getSource(SRC_ID)) {
      map.getSource(SRC_ID).setData(pantryData);
      return;
    }
    map.addSource(SRC_ID, {
      type: "geojson",
      data: pantryData,
    });
    map.addLayer({
      id: LAYER_ID,
      type: "circle",
      source: SRC_ID,
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 5, 14, 11],
        "circle-color": "#2d8a4e",
        "circle-stroke-width": 2,
        "circle-stroke-color": "#ffffff",
        "circle-opacity": 0.9,
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
        "text-offset": [0, 1.2],
        "text-anchor": "top",
        "text-max-width": 12,
      },
      paint: {
        "text-color": "#1a6b3c",
        "text-halo-color": "#fff",
        "text-halo-width": 1.5,
      },
    });

    map.on("click", LAYER_ID, (e) => {
      const f = e.features && e.features[0];
      if (!f) return;
      const p = f.properties || {};
      const coords = f.geometry.coordinates.slice();
      const hours = p.hours || "24/7";
      const is24 = p.is_24h !== false && String(hours).includes("24");
      const html = `
        <div style="font-family:system-ui,sans-serif;max-width:260px">
          <div style="font-weight:700;font-size:14px;color:#1a6b3c;margin-bottom:4px">🥫 ${p.name || "Food Pantry"}</div>
          <div style="font-size:12px;color:#444;margin-bottom:6px">${p.address || ""}</div>
          <div style="font-size:12px;font-weight:600;margin-bottom:8px">${is24 ? "Open 24/7" : hours}</div>
          <div style="font-size:11px;line-height:1.4;color:#333;background:#f4f7f5;padding:8px;border-radius:8px;margin-bottom:8px">${BLURB}</div>
          <div style="display:flex;flex-direction:column;gap:6px">
            <a href="https://communityfirsthealthplans.com/food-pantry/" target="_blank" rel="noopener" style="font-size:12px;font-weight:700;color:#1a6b3c;text-decoration:none">Official map & Adopt a Pantry →</a>
            <button type="button" id="yb-restock-share" style="font-size:12px;padding:6px 10px;border-radius:8px;border:1px solid #1a6b3c;background:#eaf5ee;color:#1a6b3c;font-weight:600;cursor:pointer">Share restock invite</button>
          </div>
        </div>`;
      if (window.__ybPinPopup) {
        try { window.__ybPinPopup.remove(); } catch (_) {}
      }
      window.__ybPinPopup = new maplibregl.Popup({ offset: 12, closeButton: true, maxWidth: "280px" })
        .setLngLat(coords)
        .setHTML(html)
        .addTo(map);
      setTimeout(() => {
        const btn = document.getElementById("yb-restock-share");
        if (btn) {
          btn.onclick = () => {
            const text = `🥫 Community Food Pantry restock\n\n${p.name}\n${p.address}\n\nThese outdoor boxes stay full only because neighbors restock them. If you can drop a few cans, peanut butter, or hygiene items next time you pass by — it helps the next person who needs it.\n\nOfficial map: https://communityfirsthealthplans.com/food-pantry/\n\nShared from Chica Map`;
            if (navigator.share) {
              navigator.share({ title: "Restock a food pantry", text }).catch(() => {});
            } else if (navigator.clipboard) {
              navigator.clipboard.writeText(text).then(() => {
                btn.textContent = "Copied!";
                setTimeout(() => (btn.textContent = "Share restock invite"), 1500);
              });
            }
          };
        }
      }, 50);
    });

    map.on("mouseenter", LAYER_ID, () => { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", LAYER_ID, () => { map.getCanvas().style.cursor = ""; });
  }

  function setVisible(map, on) {
    if (!map) return;
    const vis = on ? "visible" : "none";
    if (map.getLayer(LAYER_ID)) map.setLayoutProperty(LAYER_ID, "visibility", vis);
    if (map.getLayer(LAYER_LABEL)) map.setLayoutProperty(LAYER_LABEL, "visibility", vis);
  }

  async function toggle() {
    const map = findMap() || mapRef;
    if (!map) {
      console.warn("[food-pantry] map not ready yet");
      return;
    }
    mapRef = map;
    enabled = !enabled;
    const btn = document.getElementById(TOGGLE_ID);
    if (btn) btn.classList.toggle("active", enabled);

    if (enabled) {
      await loadData();
      ensureLayer(map);
      setVisible(map, true);
    } else {
      setVisible(map, false);
    }
  }

  function injectToggle() {
    const bar = document.querySelector(".feat-bar") || document.querySelector(".tools-bar");
    if (!bar || document.getElementById(TOGGLE_ID)) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tool-btn";
    btn.id = TOGGLE_ID;
    btn.title = "24h Food Pantries";
    btn.innerHTML = "🥫 Pantries";
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggle();
    });
    bar.appendChild(btn);
  }

  function boot() {
    injectToggle();
    let tries = 0;
    const iv = setInterval(() => {
      tries++;
      const m = findMap();
      if (m) {
        mapRef = m;
        window.__YB_MAP = m;
        clearInterval(iv);
      }
      if (tries > 40) clearInterval(iv);
    }, 250);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  setTimeout(boot, 1200);
  setTimeout(boot, 3000);

  window.ChicaFoodPantry = { toggle, loadData, findMap };
})();
