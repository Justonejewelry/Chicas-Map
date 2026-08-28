/* Standalone Leaflet boot. React on /map is a dead shell. */
(function (w) {
  var BASE = "/Chicas-Map";
  var SA = [29.4241, -98.4936];
  var mtFails = 0;

  function onMapPath() {
    var p = location.pathname || "";
    return /\/map\/?$/.test(p) || p.indexOf("/map/") !== -1 || /map\.html$/.test(p);
  }
  if (!onMapPath()) return;

  function key() {
    var cfg = (w.CHICA_CONFIG && w.CHICA_CONFIG.MAPTILER_KEY) || "";
    return String(cfg || "ecxzoKzcx8AsCvqSPx3n").trim();
  }
  function streetUrl() {
    return "https://api.maptiler.com/maps/outdoor-v2/256/{z}/{x}/{y}.png?key=" + encodeURIComponent(key());
  }
  function satUrl() {
    return "https://api.maptiler.com/maps/hybrid/256/{z}/{x}/{y}.jpg?key=" + encodeURIComponent(key());
  }
  var ESRI_STREET = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}";
  var ESRI_SAT = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

  function host() {
    var el = document.getElementById("chica-live-map");
    if (!el) {
      el = document.createElement("div");
      el.id = "chica-live-map";
      el.className = "chica-map";
      (document.body || document.documentElement).appendChild(el);
    }
    el.setAttribute("role", "application");
    el.setAttribute("aria-label", "San Antonio garage sale map");
    el.style.cssText = "position:fixed;inset:0;width:100vw;height:100dvh;z-index:1;background:#121212";
    return el;
  }

  function iconFor(type, L) {
    var kind = type === "estate" || type === "permit" ? type : "garage";
    var html;
    if (kind === "estate") {
      html = '<svg class="chica-sym" viewBox="0 0 18 18" width="18" height="18" aria-hidden="true"><polygon points="9,1.6 16.4,9 9,16.4 1.6,9" fill="#f4f4f4" stroke="#121212" stroke-width="1.6"/></svg>';
    } else if (kind === "permit") {
      html = '<svg class="chica-sym" viewBox="0 0 18 18" width="18" height="18" aria-hidden="true"><polygon points="9,2 16.2,15.6 1.8,15.6" fill="#8a8a8a" stroke="#121212" stroke-width="1.6"/></svg>';
    } else {
      html = '<svg class="chica-sym" viewBox="0 0 18 18" width="18" height="18" aria-hidden="true"><circle cx="9" cy="9" r="6" fill="#c513af" stroke="#fffdf8" stroke-width="1.8"/></svg>';
    }
    return L.divIcon({
      className: "chica-pin chica-type-" + kind,
      html: html,
      iconSize: [22, 22],
      iconAnchor: [11, 11]
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
        return { title: p.title || p.name, type: p.type || p.kind, address: p.address, lat: c[1], lon: c[0] };
      });
    }
    return out;
  }

  function addPins(map, L, sales) {
    var n = 0;
    for (var i = 0; i < sales.length; i++) {
      var s = sales[i];
      var lat = Number(s.lat != null ? s.lat : s.latitude), lon = Number(s.lon != null ? s.lon : s.lng != null ? s.lng : s.longitude);
      if (!isFinite(lat) || !isFinite(lon)) continue;
      var title = s.title || s.address || "Sale";
      var kind = s.type || s.kind || "garage";
      var label = title + " \u2014 " + (kind === "estate" ? "estate sale" : kind === "permit" ? "city permit" : "garage sale");
      (function (plat, plon, ptitle, pkind, plabel) {
        var mk = L.marker([plat, plon], {
          icon: iconFor(pkind, L),
          title: ptitle,
          alt: plabel,
          keyboard: false,
          chicaType: pkind
        });
        mk.on("click", function (ev) {
          if (document.documentElement.classList.contains("chica-intel-off")) return;
          if (typeof window.__chicaOpenIntel === "function") {
            try { if (ev.originalEvent) { ev.originalEvent.preventDefault(); ev.originalEvent.stopPropagation(); } } catch (e) {}
            window.__chicaOpenIntel(plat, plon, ptitle);
          }
        });
        mk.addTo(map);
      })(lat, lon, title, kind, label);
      n += 1;
    }
    return n;
  }

  function boot() {
    var L = w.L;
    if (!L || !L.map) return false;
    if (w.__chicaLeaflet && w.__chicaLeaflet._chicaLive) {
      try { w.__chicaLeaflet.invalidateSize({ animate: false }); } catch (e) {}
      return true;
    }
    var el = host();
    var map = L.map(el, {
      zoomControl: false,
      maxZoom: 19,
      attributionControl: true,
      keyboard: true
    }).setView(SA, 12);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    var street = L.tileLayer(streetUrl(), {
      attribution: "\u00a9 MapTiler \u00a9 OpenStreetMap contributors",
      referrerPolicy: "origin",
      updateWhenIdle: false,
      keepBuffer: 4
    });
    var sat = L.tileLayer(satUrl(), {
      attribution: "\u00a9 MapTiler \u00a9 OpenStreetMap contributors",
      referrerPolicy: "origin",
      updateWhenIdle: false,
      keepBuffer: 4
    });
    var esriStreet = L.tileLayer(ESRI_STREET, { attribution: "Tiles \u00a9 Esri", updateWhenIdle: false });
    var esriSat = L.tileLayer(ESRI_SAT, { attribution: "Tiles \u00a9 Esri", updateWhenIdle: false });
    function currentBase(satOn) {
      if (satOn) return mtFails >= 3 ? esriSat : sat;
      return mtFails >= 3 ? esriStreet : street;
    }
    function showBase() {
      var satOn = document.documentElement.classList.contains("chica-sat-on");
      [street, sat, esriStreet, esriSat].forEach(function (ly) {
        if (map.hasLayer(ly)) map.removeLayer(ly);
      });
      currentBase(satOn).addTo(map);
    }
    street.on("tileerror", function () {
      mtFails += 1;
      if (mtFails === 3) showBase();
    });
    sat.on("tileerror", function () {
      mtFails += 1;
      if (mtFails === 3) showBase();
    });
    showBase();
    map._chicaLive = true;
    w.__chicaLeaflet = map;
    el.__chicaMap = map;
    function size() {
      try { map.invalidateSize({ animate: false, pan: false }); } catch (e) {}
    }
    size();
    w.addEventListener("resize", size);
    w.addEventListener("orientationchange", size);
    w.addEventListener("chica-sat", showBase);
    map.whenReady(size);
    map.on("load", size);

    fetch(BASE + "/data/cities/san-antonio.json", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        addPins(map, L, salesFrom(data));
        size();
      })
      .catch(function () {});

    var k = 0;
    var sid = setInterval(function () {
      size();
      k += 1;
      if (k > 20) clearInterval(sid);
    }, 150);
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
