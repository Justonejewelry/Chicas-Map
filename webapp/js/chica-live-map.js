/* Standalone Leaflet boot + sale details on pin click. */
(function (w) {
  var BASE = "/Chicas-Map";
  var SA = [29.4241, -98.4936];
  var mtFails = 0;
  var amenity = { parking: [], pantry: [], schools: [], wifi: [] };
  var NEAR_M = 2400;

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

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      if (c === "&") return "&" + "amp;";
      if (c === "<") return "&" + "lt;";
      if (c === ">") return "&" + "gt;";
      if (c === '"') return "&" + "quot;";
      return "&#39;";
    });
  }

  function distM(aLat, aLon, bLat, bLon) {
    var R = 6371000;
    var dLat = (bLat - aLat) * Math.PI / 180;
    var dLon = (bLon - aLon) * Math.PI / 180;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(aLat * Math.PI / 180) * Math.cos(bLat * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  function nearest(id, lat, lon) {
    var feats = amenity[id] || [];
    var best = null;
    for (var i = 0; i < feats.length; i++) {
      var g = feats[i] && feats[i].geometry;
      if (!g || g.type !== "Point" || !g.coordinates) continue;
      var blat = g.coordinates[1], blon = g.coordinates[0];
      var d = distM(lat, lon, blat, blon);
      if (d > NEAR_M) continue;
      if (!best || d < best.d) best = { d: d, feat: feats[i], lat: blat, lon: blon };
    }
    return best;
  }

  function fmtM(m) {
    return m < 1000 ? Math.round(m) + " m" : (m / 1609.34).toFixed(1) + " mi";
  }

  function dirs(lat, lon) {
    return (
      '<p class="chica-dirs">' +
      '<a target="_blank" rel="noreferrer" href="https://www.google.com/maps/dir/?api=1&destination=' + lat + "," + lon + '">Google</a> ' +
      '<a target="_blank" rel="noreferrer" href="https://maps.apple.com/?daddr=' + lat + "," + lon + '">Apple</a> ' +
      '<a target="_blank" rel="noreferrer" href="https://waze.com/ul?ll=' + lat + "%2C" + lon + '&navigate=yes">Waze</a>' +
      "</p>"
    );
  }

  function nearLine(label, hit) {
    if (!hit) return "";
    var props = hit.feat.properties || {};
    var name = props.name || props.title || label;
    return "<li><strong>" + esc(label) + "</strong> " + esc(name) + " \u00b7 " + fmtM(hit.d) + "</li>";
  }

  function intelHtml(sale) {
    var lat = Number(sale.lat), lon = Number(sale.lon);
    var items =
      nearLine("Parking", nearest("parking", lat, lon)) +
      nearLine("Pantry", nearest("pantry", lat, lon)) +
      nearLine("Wi-Fi", nearest("wifi", lat, lon)) +
      nearLine("School", nearest("schools", lat, lon));
    if (!items) items = "<li>Nothing mapped within 1.5 miles.</li>";
    var when = sale.dates || sale.hours || "";
    return (
      '<div class="chica-opt">' +
      "<h3>" + esc(sale.title || "Sale") + "</h3>" +
      '<p class="meta">' + esc(sale.address || "") + (when ? "<br>" + esc(when) : "") + "</p>" +
      dirs(lat, lon) +
      "<ul>" + items + "</ul></div>"
    );
  }

  function showCard(sale, anchor) {
    var el = document.getElementById("chica-intel-card");
    if (!el) {
      el = document.createElement("div");
      el.id = "chica-intel-card";
      el.setAttribute("role", "dialog");
      el.setAttribute("aria-label", "Sale details");
      document.body.appendChild(el);
    }
    el.innerHTML =
      '<button type="button" class="x" aria-label="Close">\u00d7</button>' +
      intelHtml(sale);
    var x = el.querySelector(".x");
    if (x) x.onclick = function (ev) { ev.preventDefault(); ev.stopPropagation(); el.style.display = "none"; };
    el.style.left = "12px";
    el.style.top = "62px";
    el.style.display = "block";
  }

  function hideCard() {
    var el = document.getElementById("chica-intel-card");
    if (el) el.style.display = "none";
  }

  w.__chicaOpenIntel = function (lat, lon, title, anchor) {
    showCard({ lat: lat, lon: lon, title: title || "Sale" }, anchor);
    return true;
  };

  function prefetch() {
    var SRC = {
      parking: BASE + "/data/san-antonio-downtown-parking.geojson",
      pantry: BASE + "/data/san-antonio-24h-food-pantries.geojson",
      schools: BASE + "/data/zone-aware-schools.geojson",
      wifi: BASE + "/data/san-antonio-public-wifi.geojson"
    };
    Object.keys(SRC).forEach(function (id) {
      fetch(SRC[id] + "?v=13", { cache: "no-store" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) { amenity[id] = data && data.features ? data.features : []; })
        .catch(function () { amenity[id] = []; });
    });
  }

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
    el.style.cssText = "position:fixed;inset:0;width:100%;height:100%;z-index:1;background:#121212";
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
      iconSize: [26, 26],
      iconAnchor: [13, 13]
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
        return { title: p.title || p.name, type: p.type || p.kind, address: p.address, lat: c[1], lon: c[0], dates: p.dates, hours: p.hours };
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
        lon: lon
      };
      (function (item) {
        var mk = L.marker([item.lat, item.lon], {
          icon: iconFor(item.type, L),
          title: item.title,
          alt: item.title + " \u2014 tap for details",
          keyboard: true,
          riseOnHover: true
        });
        mk.on("click", function () {
          showCard(item, mk._icon);
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
      ".chica-opt{font:500 13px/1.35 Inter,system-ui,sans-serif;color:#1a1714}" +
      ".chica-opt h3{margin:0 0 4px;font:800 15px/1.2 Inter,system-ui,sans-serif}" +
      ".chica-opt .meta{margin:0;color:#5c5348;font-size:12px}" +
      ".chica-opt ul{margin:8px 0 0;padding:0;list-style:none}" +
      ".chica-opt li{margin:6px 0 0;padding-top:6px;border-top:1px solid #ece6dc}" +
      ".chica-dirs{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 0}" +
      ".chica-dirs a{border:1px solid #c513af;border-radius:999px;padding:4px 10px;font-size:12px;color:#7a0f6c;text-decoration:none;font-weight:800}" +
      "#chica-intel-card{display:none;position:fixed;z-index:2147483646;width:min(280px,calc(100vw - 24px));max-height:min(70dvh,460px);overflow:auto;background:#fffdf8;color:#1a1714;border:2px solid #c513af;border-radius:14px;box-shadow:0 16px 40px rgba(18,18,18,.4);padding:14px 14px 16px;font:500 13px/1.35 Inter,system-ui,sans-serif}" +
      "#chica-intel-card .x{position:absolute;top:6px;right:6px;border:0;background:transparent;font:800 20px/1 Inter,system-ui,sans-serif;min-width:32px;min-height:32px;cursor:pointer}" +
      ".leaflet-container{width:100%!important;height:100%!important}";
    (document.head || document.documentElement).appendChild(s);
  }

  function boot() {
    var L = w.L;
    if (!L || !L.map) return false;
    if (w.__chicaLeaflet && w.__chicaLeaflet._chicaLive) {
      try { w.__chicaLeaflet.invalidateSize({ animate: false }); } catch (e) {}
      return true;
    }
    injectCss();
    prefetch();
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
      keepBuffer: 6
    });
    var sat = L.tileLayer(satUrl(), {
      attribution: "\u00a9 MapTiler \u00a9 OpenStreetMap contributors",
      referrerPolicy: "origin",
      updateWhenIdle: false,
      keepBuffer: 6
    });
    var esriStreet = L.tileLayer(ESRI_STREET, { attribution: "Tiles \u00a9 Esri", updateWhenIdle: false });
    var esriSat = L.tileLayer(ESRI_SAT, { attribution: "Tiles \u00a9 Esri", updateWhenIdle: false });
    function showBase() {
      var satOn = document.documentElement.classList.contains("chica-sat-on");
      [street, sat, esriStreet, esriSat].forEach(function (ly) {
        if (map.hasLayer(ly)) map.removeLayer(ly);
      });
      (satOn ? esriSat : esriStreet).addTo(map);
      if (mtFails < 8) (satOn ? sat : street).addTo(map);
    }
    street.on("tileerror", function () { mtFails += 1; if (mtFails === 1 || mtFails === 8) showBase(); });
    sat.on("tileerror", function () { mtFails += 1; if (mtFails === 1 || mtFails === 8) showBase(); });
    showBase();
    map._chicaLive = true;
    w.__chicaLeaflet = map;
    el.__chicaMap = map;
    function size() {
      try {
        el.style.width = window.innerWidth + "px";
        el.style.height = window.innerHeight + "px";
        map.invalidateSize({ animate: false, pan: false });
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
      hideCard();
    });

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
      if (k > 24) clearInterval(sid);
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
