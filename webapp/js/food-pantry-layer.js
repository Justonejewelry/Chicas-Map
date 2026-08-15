/**
 * Chica Map — 24h Food Pantry Layer
 * Toggleable overlay of Community First outdoor pantries.
 * Data: data/san-antonio-24h-food-pantries.geojson
 *
 * - Green = true 24/7
 * - Amber = limited hours
 * - Legend entries when layer is on
 * - Soft “restock near me” prompt after route is finished/cleared
 */
(function () {
  const SRC_ID = "yb-food-pantries";
  const LAYER_ID = "yb-food-pantries-layer";
  const LAYER_LABEL = "yb-food-pantries-label";
  const TOGGLE_ID = "btnFoodPantry";
  let pantryData = null;
  let enabled = false;
  let mapRef = null;
  let restockPromptShown = false;

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

    // Color by is_24h: green for 24/7, amber for limited-hour sites
    map.addLayer({
      id: LAYER_ID,
      type: "circle",
      source: SRC_ID,
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 5, 14, 11],
        "circle-color": [
          "case",
          ["==", ["get", "is_24h"], true],
          "#2d8a4e",
          ["==", ["get", "is_24h"], false],
          "#c47a12",
          "#2d8a4e"
        ],
        "circle-stroke-width": 2,
        "circle-stroke-color": "#ffffff",
        "circle-opacity": 0.92,
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
        "text-color": [
          "case",
          ["==", ["get", "is_24h"], true],
          "#1a6b3c",
          "#8a5508"
        ],
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
      // GeoJSON properties may arrive as strings after serialization
      const is24 = p.is_24h === true || p.is_24h === "true" || String(hours).includes("24");
      const html = `
        <div style="font-family:system-ui,sans-serif;max-width:260px">
          <div style="font-weight:700;font-size:14px;color:${is24 ? "#1a6b3c" : "#8a5508"};margin-bottom:4px">🥫 ${p.name || "Food Pantry"}</div>
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
    updateLegend(on);
  }

  function updateLegend(show) {
    const legend = document.querySelector(".map-legend");
    if (!legend) return;
    // Remove previous pantry legend entries
    legend.querySelectorAll("[data-pantry-legend]").forEach((el) => el.remove());
    if (!show) return;
    const span24 = document.createElement("span");
    span24.setAttribute("data-pantry-legend", "1");
    span24.innerHTML = '<i class="pin pantry-24" style="background:#2d8a4e;border-radius:50%;width:10px;height:10px;display:inline-block;margin-right:4px;vertical-align:middle;border:1px solid #fff;box-shadow:0 0 0 1px #2d8a4e"></i> 24h Pantry';
    const spanLtd = document.createElement("span");
    spanLtd.setAttribute("data-pantry-legend", "1");
    spanLtd.innerHTML = '<i class="pin pantry-ltd" style="background:#c47a12;border-radius:50%;width:10px;height:10px;display:inline-block;margin-right:4px;vertical-align:middle;border:1px solid #fff;box-shadow:0 0 0 1px #c47a12"></i> Limited hrs';
    legend.appendChild(span24);
    legend.appendChild(spanLtd);
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
    btn.title = "24h Food Pantries (Community First)";
    btn.innerHTML = "🥫 Pantries";
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggle();
    });
    bar.appendChild(btn);
  }

  /** Soft prompt after user finishes/clears a route */
  function showRestockNearMePrompt() {
    if (restockPromptShown) return;
    // Only nudge if they actually had a route going
    const stops = document.getElementById("routeStops");
    const hadStops = stops && stops.children && stops.children.length > 0;
    // Also check localStorage / global if available
    if (!hadStops && !(window.__YB_ROUTE_STOPS && window.__YB_ROUTE_STOPS.length)) return;

    restockPromptShown = true;
    const toast = document.getElementById("toast");
    const msg =
      "🥫 Finished the sales? There’s a 24h food pantry near many routes — drop a couple cans if you can. Tap 🥫 Pantries to see them.";

    if (toast) {
      toast.textContent = msg;
      toast.classList.remove("hidden");
      toast.style.display = "block";
      setTimeout(() => {
        toast.classList.add("hidden");
        toast.style.display = "";
      }, 7000);
    } else {
      // Fallback banner
      let ban = document.getElementById("yb-restock-banner");
      if (!ban) {
        ban = document.createElement("div");
        ban.id = "yb-restock-banner";
        ban.style.cssText =
          "position:fixed;bottom:72px;left:12px;right:12px;z-index:99998;background:#1a6b3c;color:#fff;padding:12px 14px;border-radius:12px;font:600 13px/1.4 system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.2)";
        document.body.appendChild(ban);
      }
      ban.innerHTML =
        msg +
        ' <button type="button" id="yb-restock-dismiss" style="margin-left:8px;background:rgba(255,255,255,.2);border:none;color:#fff;padding:4px 8px;border-radius:6px;cursor:pointer">Got it</button>';
      document.getElementById("yb-restock-dismiss")?.addEventListener("click", () => ban.remove());
      setTimeout(() => ban.remove(), 9000);
    }

    // Auto-enable layer so they can actually see the dots
    if (!enabled) {
      setTimeout(() => toggle(), 400);
    }
  }

  function wireRouteRestockHook() {
    // Clear route button
    document.getElementById("btnClearRoute")?.addEventListener("click", () => {
      setTimeout(showRestockNearMePrompt, 300);
    });
    // Share route buttons (user is done planning)
    document.getElementById("btnShareRoute")?.addEventListener("click", () => {
      setTimeout(showRestockNearMePrompt, 800);
    });
    document.getElementById("btnShareRoute2")?.addEventListener("click", () => {
      setTimeout(showRestockNearMePrompt, 800);
    });
    // Open in maps apps — they are leaving to drive the route
    ["btnOpenRoute", "btnOpenRouteApple", "btnOpenRouteWaze"].forEach((id) => {
      document.getElementById(id)?.addEventListener("click", () => {
        setTimeout(showRestockNearMePrompt, 600);
      });
    });
  }

  function boot() {
    injectToggle();
    wireRouteRestockHook();
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

  window.ChicaFoodPantry = { toggle, loadData, findMap, showRestockNearMePrompt };
})();
