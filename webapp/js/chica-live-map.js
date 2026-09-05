/* Standalone Leaflet boot. Pin card is owned by pin-details.js (GPS-gated pack notes, 200 ft). */
(function (w) {
  var BASE = "/Chicas-Map";
  var SA = [29.4241, -98.4936];
  var mtDead = false;
  var probed = false;
  var PIN = 40;
  var HALF = PIN / 2;
  var GLYPH = 28;

  function onMapPath() {
    var p = location.pathname || "";
    return /\/map\/?$/.test(p) || p.indexOf("/map/") !== -1 || /map\.html$/.test(p);
  }
  if (!onMapPath()) return;

  function key() {
    var cfg = (w.CHICA_CONFIG && w.CHICA_CONFIG.MAPTILER_KEY) || "";
    return String(cfg || "").trim();
  }
  function streetUrl() {
    return "https://api.maptiler.com/maps/outdoor-v2/256/{z}/{x}/{y}.png?key=" + encodeURIComponent(key());
  }
  function satUrl() {
    return "https://api.maptiler.com/maps/hybrid/256/{z}/{x}/{y}.jpg?key=" + encodeURIComponent(key());
  }
  var ESRI_STREET = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}";
  var ESRI_SAT = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

  function isPack(s) {
    if (!s) return false;
    if (s.pack || s.preferred || s.boost) return true;
    var cat = Array.isArray(s.categories) ? s.categories.join(" ") : String(s.categories || "");
    var blob = (cat + " " + (s.source || "") + " " + (s.title || "") + " " + (s.external_id || "")).toLowerCase();
    return /pack[\s-]?point/.test(blob) || blob.indexOf("pack-point") !== -1;
  }

  function iconFor(type, pack, L) {
    var kind = type === "estate" || type === "permit" ? type : "garage";
    var html;
    if (kind === "estate") {
      html = '<svg class="chica-sym" viewBox="0 0 28 28" width="28" height="28" aria-hidden="true"><polygon points="14,2.2 25.4,14 14,25.8 2.6,14" fill="#f4f4f4" stroke="#121212" stroke-width="2.2"/></svg>';
    } else if (kind === "permit") {
      html = '<svg class="chica-sym" viewBox="0 0 28 28" width="28" height="28" aria-hidden="true"><polygon points="14,2.4 25.6,24.8 2.4,24.8" fill="#8a8a8a" stroke="#121212" stroke-width="2.2"/></svg>';
    } else {
      html = '<svg class="chica-sym" viewBox="0 0 28 28" width="28" height="28" aria-hidden="true"><circle cx="14" cy="14" r="10" fill="#c513af" stroke="#fffdf8" stroke-width="2.4"/></svg>';
    }
    if (pack) {
      html = '<span class="chica-pack-halo" aria-hidden="true"></span><span class="chica-pack-ring" aria-hidden="true"></span>' + html;
    }
    return L.divIcon({
      className: "chica-pin chica-type-" + kind + (pack ? " chica-pack-pin" : ""),
      html: html,
      iconSize: [PIN, PIN],
      iconAnchor: [HALF, HALF]
    });
  }

  function salesFrom(data) {
    var out = [];
    if (!data) return out;
    if (Array.isArray(data)) return data;
    var bags = [data.public, data.permits, data.sales, data.listings];
    for (var i = 0; i < bags.length; i++) {
      if (Array.isArray(bags[i])) out = out.concat(bags[i]);
    }
    if (!out.length && Array.isArray(data.features)) {
      out = data.features.map(function (f) {
        var p = f.properties || {};
        var c = (f.geometry && f.geometry.coordinates) || [];
        return { title: p.title || p.name, type: p.type || p.kind, address: p.address, lat: c[1], lon: c[0], dates: p.dates, hours: p.hours, pack: p.pack, preferred: p.preferred, source: p.source, categories: p.categories };
      });
    }
    return out;
  }

  function addPins(map, L, sales) {
    var n = 0;
    for (var i = 0; i < sales.length; i++) {
      var s = sales[i];
      var lat = Number(s.lat != null ? s.lat : s.latitude);
      var lon = Number(s.lon != null ? s.lon : s.lng != null ? s.lng : s.longitude);
      if (!isFinite(lat) || !isFinite(lon)) continue;
      var sale = {
        title: s.title || s.address || "Sale",
        address: s.address || "",
        dates: s.dates || "",
        hours: s.hours || "",
        type: s.type || s.kind || "garage",
        lat: lat,
        lon: lon,
        pack: isPack(s),
        source: s.source || ""
      };
      (function (item) {
        var mk = L.marker([item.lat, item.lon], {
          icon: iconFor(item.type, item.pack, L),
          title: item.pack ? "Pack point \u00b7 " + item.title : item.title,
          alt: item.title + " \u2014 tap for details",
          keyboard: true,
          riseOnHover: true,
          zIndexOffset: item.pack ? 600 : 0
        });
        mk.__chicaSale = item;
        mk.on("click", function () {
          if (typeof w.__chicaOpenIntel === "function") w.__chicaOpenIntel(item);
        });
        mk.addTo(map);
      })(sale);
      n += 1;
    }
    return n;
  }

  function injectCss() {
    if (document.getElementById("chica-live-intel-css")) return;
    var s = document.createElement("style");
    s.id = "chica-live-intel-css";
    s.textContent =
      ".leaflet-container{width:100%!important;height:100%!important}" +
      ".leaflet-marker-icon.chica-pin,.leaflet-div-icon.chica-pin{width:40px!important;height:40px!important;margin-left:-20px!important;margin-top:-20px!important;padding:0!important;border:0!important;background:transparent!important;display:flex;align-items:center;justify-content:center;overflow:visible!important;box-sizing:border-box}" +
      ".chica-pin .chica-sym{display:block;width:28px;height:28px;flex:0 0 28px;position:relative;z-index:2}" +
      ".chica-pack-halo,.chica-pack-ring{position:absolute;left:20px;top:20px;width:24px;height:24px;margin:0;border-radius:50%;pointer-events:none;transform:translate3d(-50%,-50%,0);backface-visibility:hidden}" +
      ".chica-pack-halo{background:#ff3ad1;opacity:.35}" +
      ".chica-pack-ring{background:#ff3ad1;opacity:.9;will-change:transform,opacity;animation:chica-pack-pulse 1.4s ease-out infinite}" +
      "@keyframes chica-pack-pulse{0%{transform:translate3d(-50%,-50%,0) scale(.7);opacity:.85}100%{transform:translate3d(-50%,-50%,0) scale(2.2);opacity:0}}" +
      "@media (prefers-reduced-motion:reduce){.chica-pack-ring{animation:none;opacity:.4;transform:translate3d(-50%,-50%,0) scale(1.55)}}";
    (document.head || document.documentElement).appendChild(s);
  }

  function armTiles(root) {
    var imgs = (root || document).querySelectorAll(".leaflet-tile-pane img, img.leaflet-tile");
    for (var i = 0; i < imgs.length; i++) {
      try { imgs[i].referrerPolicy = "origin"; imgs[i].setAttribute("referrerpolicy", "origin"); } catch (e) {}
    }
  }

  function layersOf(map) {
    return [map._chicaStreet, map._chicaSat, map._chicaEsriStreet, map._chicaEsriSat];
  }

  function only(map, keep) {
    layersOf(map).forEach(function (ly) {
      if (!ly) return;
      if (ly === keep) {
        if (!map.hasLayer(ly)) ly.addTo(map);
      } else if (map.hasLayer(ly)) {
        try { map.removeLayer(ly); } catch (e) {}
      }
    });
  }

  function showBase() {
    var map = w.__chicaLeaflet;
    if (!map) return;
    var satOn = document.documentElement.classList.contains("chica-sat-on");
    var useMt = !mtDead && key().length > 8;
    var keep = useMt ? (satOn ? map._chicaSat : map._chicaStreet) : (satOn ? map._chicaEsriSat : map._chicaEsriStreet);
    only(map, keep);
    w.__chicaMtDead = mtDead;
    try { map.invalidateSize({ animate: false, pan: false }); } catch (e) {}
    armTiles(map.getContainer && map.getContainer());
  }

  function markDead() {
    if (mtDead) return;
    mtDead = true;
    w.__chicaMtDead = true;
    showBase();
  }

  function probeMapTiler() {
    if (probed) return;
    probed = true;
    if (key().length < 8) {
      mtDead = true;
      w.__chicaMtDead = true;
      showBase();
      return;
    }
    var url = streetUrl().replace("{z}", "12").replace("{x}", "963").replace("{y}", "1695");
    fetch(url, { mode: "cors", referrerPolicy: "origin", cache: "no-store" })
      .then(function (r) {
        mtDead = !r.ok;
        w.__chicaMtDead = mtDead;
        showBase();
      })
      .catch(function () {
        mtDead = true;
        w.__chicaMtDead = true;
        showBase();
      });
  }

  function boot() {
    var L = w.L;
    if (!L || !L.map) return false;
    if (w.__chicaLeaflet && w.__chicaLeaflet._chicaLive) {
      try { w.__chicaLeaflet.invalidateSize({ animate: false }); } catch (e) {}
      return true;
    }
    injectCss();
    var el = document.getElementById("chica-live-map");
    if (!el) {
      el = document.createElement("div");
      el.id = "chica-live-map";
      el.className = "chica-map";
      (document.body || document.documentElement).appendChild(el);
    }
    el.setAttribute("role", "application");
    el.setAttribute("aria-label", "San Antonio garage sale map");
    el.style.cssText = "position:fixed;inset:0;width:100%;height:100%;z-index:1;background:#121212";
    var map = L.map(el, {
      zoomControl: false,
      maxZoom: 19,
      attributionControl: true,
      keyboard: true
    }).setView(SA, 12);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    var tileOpts = { referrerPolicy: "origin", updateWhenIdle: false, keepBuffer: 6, maxZoom: 19 };
    var street = L.tileLayer(streetUrl(), Object.assign({ attribution: "\u00a9 MapTiler \u00a9 OpenStreetMap contributors" }, tileOpts));
    var sat = L.tileLayer(satUrl(), Object.assign({ attribution: "\u00a9 MapTiler \u00a9 OpenStreetMap contributors" }, tileOpts));
    var esriStreet = L.tileLayer(ESRI_STREET, Object.assign({ attribution: "Tiles \u00a9 Esri" }, tileOpts));
    var esriSat = L.tileLayer(ESRI_SAT, Object.assign({ attribution: "Tiles \u00a9 Esri" }, tileOpts));
    map._chicaStreet = street; map._chicaSat = sat; map._chicaEsriStreet = esriStreet; map._chicaEsriSat = esriSat;
    street.on("tileerror", markDead);
    sat.on("tileerror", markDead);
    map.on("tileload", function () { armTiles(el); });
    showBase();
    probeMapTiler();
    map._chicaLive = true;
    w.__chicaLeaflet = map;
    el.__chicaMap = map;
    function size() {
      try {
        el.style.width = window.innerWidth + "px";
        el.style.height = window.innerHeight + "px";
        map.invalidateSize({ animate: false, pan: false });
        armTiles(el);
      } catch (e) {}
    }
    size();
    w.addEventListener("resize", size);
    w.addEventListener("orientationchange", size);
    w.addEventListener("chica-sat", showBase);
    map.whenReady(size);
    map.on("load", size);
    map.on("click", function (ev) {
      var tgt = ev.originalEvent && ev.originalEvent.target;
      if (tgt && tgt.closest && tgt.closest(".leaflet-marker-icon, .chica-pin, .leaflet-popup, #chica-intel-card")) return;
      if (typeof w.__chicaHideIntel === "function") w.__chicaHideIntel();
    });
    fetch(BASE + "/data/cities/san-antonio.json?v=31", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) { addPins(map, L, salesFrom(data)); size(); })
      .catch(function () {});
    var k = 0;
    var sid = setInterval(function () { size(); k += 1; if (k > 24) clearInterval(sid); }, 150);
    return true;
  }

  var n = 0;
  var id = setInterval(function () {
    n += 1;
    if (boot() || n > 80) clearInterval(id);
  }, 80);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(window);
