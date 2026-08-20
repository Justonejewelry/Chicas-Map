/* Chicas Map — category icon upgrade */
(function () {
  "use strict";

  const ICONS = {
    garage: "assets/map-icons/garage-sale.svg",
    estate: "assets/map-icons/estate-sale.svg",
    pantry: "assets/map-icons/food-pantry.svg",
    school: "assets/map-icons/school-zone.svg",
    wifi: "assets/map-icons/public-wifi.svg"
  };
  const IMAGE_NAMES = {
    garage: "chica-icon-garage",
    estate: "chica-icon-estate",
    pantry: "chica-icon-pantry",
    school: "chica-icon-school",
    wifi: "chica-icon-wifi"
  };

  function getMap() {
    return (window.__YB_MAP && window.__YB_MAP.getStyle) ? window.__YB_MAP :
      ((window.map && window.map.getStyle) ? window.map : null);
  }

  function loadImage(map, key) {
    const name = IMAGE_NAMES[key];
    if (!map || map.hasImage(name)) return Promise.resolve();
    return new Promise(function (resolve) {
      map.loadImage(ICONS[key], function (err, image) {
        if (!err && image && !map.hasImage(name)) {
          try { map.addImage(name, image.data, { pixelRatio: 2 }); } catch (_) {}
        }
        resolve();
      });
    });
  }

  function symbolSpec(source, icon, size, before) {
    return {
      id: before.id,
      type: "symbol",
      source: source,
      minzoom: before.minzoom,
      maxzoom: before.maxzoom,
      layout: {
        "icon-image": IMAGE_NAMES[icon],
        "icon-size": size,
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
        "visibility": before.visibility || "visible"
      }
    };
  }

  function replaceLayer(map, id, source, icon, size, beforeId) {
    const layer = map.getLayer(id);
    if (!layer || !map.getSource(source)) return false;
    if (layer.type === "symbol") return true;
    const visibility = map.getLayoutProperty(id, "visibility") || "visible";
    const minzoom = layer.minzoom;
    const maxzoom = layer.maxzoom;
    map.removeLayer(id);
    const spec = symbolSpec(source, icon, size, { id: id, visibility: visibility, minzoom: minzoom, maxzoom: maxzoom });
    try { map.addLayer(spec, beforeId && map.getLayer(beforeId) ? beforeId : undefined); }
    catch (_) { map.addLayer(spec); }
    return true;
  }

  async function upgrade() {
    const map = getMap();
    if (!map || !map.isStyleLoaded || !map.isStyleLoaded()) return;
    await Promise.all(Object.keys(ICONS).map(function (k) { return loadImage(map, k); }));
    replaceLayer(map, "yb-pins-layer", "yb-pins", "garage", 0.52);
    const pins = map.getLayer("yb-pins-layer");
    if (pins && pins.type === "symbol") {
      map.setLayoutProperty("yb-pins-layer", "icon-image", [
        "match", ["get", "kind"],
        "estate", IMAGE_NAMES.estate,
        "garage", IMAGE_NAMES.garage,
        "top", IMAGE_NAMES.garage,
        "permit", IMAGE_NAMES.garage,
        "fundraiser", IMAGE_NAMES.garage,
        IMAGE_NAMES.garage
      ]);
      map.setLayoutProperty("yb-pins-layer", "icon-size", [
        "interpolate", ["linear"], ["zoom"], 9, 0.38, 12, 0.52, 15, 0.66
      ]);
    }
    replaceLayer(map, "yb-food-pantries-layer", "yb-food-pantries", "pantry", 0.50, "yb-food-pantries-label");
    replaceLayer(map, "yb-public-wifi-layer", "yb-public-wifi", "wifi", 0.46, "yb-public-wifi-label");
    replaceLayer(map, "yb-zone-aware-layer", "yb-zone-aware", "school", 0.46);
  }

  function boot() {
    let tries = 0;
    const tick = function () {
      tries++;
      upgrade().catch(function () {});
      if (tries < 40) setTimeout(tick, 500);
    };
    tick();
    const map = getMap();
    if (map && !map.__chicaIconStyleBound) {
      map.__chicaIconStyleBound = true;
      map.on("styledata", function () { setTimeout(function () { upgrade().catch(function () {}); }, 50); });
      map.on("idle", function () { upgrade().catch(function () {}); });
    }
  }

  window.ChicaMapIcons = { upgrade: upgrade, icons: ICONS };
  window.addEventListener("yb-map-ready", boot);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  setTimeout(boot, 1000);
})();