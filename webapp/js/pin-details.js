/* Sale-pin details: title, address, directions, nearby intel. No extra layer. */
(function () {
  var p = location.pathname || "";
  if (!(/\/map\/?$/.test(p) || p.indexOf("/map/") !== -1 || /map\.html$/.test(p))) return;
  var BASE = "/Chicas-Map";
  var NEAR_M = 2400;
  var amenity = { parking: [], pantry: [], schools: [], wifi: [] };
  var SRC = {
    parking: BASE + "/data/san-antonio-downtown-parking.geojson",
    pantry: BASE + "/data/san-antonio-24h-food-pantries.geojson",
    schools: BASE + "/data/zone-aware-schools.geojson",
    wifi: BASE + "/data/san-antonio-public-wifi.geojson"
  };

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
      '<a target="_blank" rel="noreferrer" href="https://www.google.com/maps/dir/?api=1&destination=' + lat + "," + lon + '">Google</a>' +
      '<a target="_blank" rel="noreferrer" href="https://maps.apple.com/?daddr=' + lat + "," + lon + '">Apple</a>' +
      '<a target="_blank" rel="noreferrer" href="https://waze.com/ul?ll=' + lat + "%2C" + lon + '&navigate=yes">Waze</a>' +
      "</p>"
    );
  }
  function row(label, hit) {
    if (!hit) return "<li><strong>" + esc(label) + "</strong> None within 1.5 mi</li>";
    var props = hit.feat.properties || {};
    var name = props.name || props.title || label;
    return "<li><strong>" + esc(label) + "</strong> " + esc(name) + " \u00b7 " + fmtM(hit.d) + dirs(hit.lat, hit.lon) + "</li>";
  }

  function css() {
    if (document.getElementById("chica-pin-details-css")) return;
    var s = document.createElement("style");
    s.id = "chica-pin-details-css";
    s.textContent =
      "#chica-intel-card{display:none;position:fixed!important;left:12px!important;top:62px!important;right:auto!important;z-index:2147483646!important;width:min(320px,calc(100vw - 24px))!important;max-height:min(72dvh,520px)!important;overflow:auto!important;background:#fffdf8!important;color:#1a1714!important;border:2px solid #c513af!important;border-radius:14px!important;box-shadow:0 16px 40px rgba(18,18,18,.45)!important;padding:14px 14px 16px!important;font:500 13px/1.35 Inter,system-ui,sans-serif!important}" +
      "#chica-intel-card .x{position:absolute;top:6px;right:6px;border:0;background:transparent;font:800 22px/1 Inter,system-ui,sans-serif;min-width:36px;min-height:36px;cursor:pointer}" +
      "#chica-intel-card .chica-opt h3{margin:0 28px 4px 0;font:800 15px/1.2 Inter,system-ui,sans-serif}" +
      "#chica-intel-card .meta{margin:0;color:#5c5348;font-size:12px}" +
      "#chica-intel-card .near-label{margin:12px 0 0;font:800 11px/1 Inter,system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#7a0f6c}" +
      "#chica-intel-card ul{margin:6px 0 0;padding:0;list-style:none}" +
      "#chica-intel-card li{margin:8px 0 0;padding-top:8px;border-top:1px solid #ece6dc}" +
      "#chica-intel-card .chica-dirs{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 0}" +
      "#chica-intel-card .chica-dirs a{border:1px solid #c513af;border-radius:999px;padding:4px 10px;font-size:12px;color:#7a0f6c;text-decoration:none;font-weight:800}" +
      ".leaflet-marker-icon.chica-pin,.leaflet-marker-icon.chica-type-garage,.leaflet-marker-icon.chica-type-estate,.leaflet-marker-icon.chica-type-permit{pointer-events:auto!important;cursor:pointer!important}";
    (document.head || document.documentElement).appendChild(s);
  }

  function card() {
    var el = document.getElementById("chica-intel-card");
    if (!el) {
      el = document.createElement("div");
      el.id = "chica-intel-card";
      el.setAttribute("role", "dialog");
      el.setAttribute("aria-label", "Sale details");
      document.body.appendChild(el);
    }
    return el;
  }

  function render(sale) {
    css();
    var el = card();
    var lat = Number(sale.lat), lon = Number(sale.lon);
    var when = sale.dates || sale.hours || "";
    var loaded = amenity.parking.length + amenity.pantry.length + amenity.schools.length + amenity.wifi.length;
    var nearby = loaded
      ? row("Parking", nearest("parking", lat, lon)) +
        row("Pantry", nearest("pantry", lat, lon)) +
        row("Wi-Fi", nearest("wifi", lat, lon)) +
        row("School", nearest("schools", lat, lon))
      : "<li>Loading nearby intel\u2026</li>";
    el.innerHTML =
      '<button type="button" class="x" aria-label="Close">\u00d7</button>' +
      '<div class="chica-opt">' +
      "<h3>" + esc(sale.title || "Sale") + "</h3>" +
      '<p class="meta">' + esc(sale.address || "") + (when ? "<br>" + esc(when) : "") + "</p>" +
      dirs(lat, lon) +
      '<p class="near-label">Nearby</p>' +
      "<ul>" + nearby + "</ul></div>";
    var x = el.querySelector(".x");
    if (x) x.onclick = function (ev) { ev.preventDefault(); ev.stopPropagation(); el.style.display = "none"; };
    el.style.display = "block";
    if (!loaded) setTimeout(function () { render(sale); }, 400);
  }

  function prefetch() {
    Object.keys(SRC).forEach(function (id) {
      fetch(SRC[id] + "?v=14", { cache: "no-store" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) { amenity[id] = data && data.features ? data.features : []; })
        .catch(function () { amenity[id] = amenity[id] || []; });
    });
  }

  function saleFromMarker(ly) {
    if (!ly || !ly.getLatLng) return null;
    var ll = ly.getLatLng();
    var opt = ly.options || {};
    return {
      title: opt.title || "Sale",
      address: "",
      dates: "",
      hours: "",
      lat: ll.lat,
      lon: ll.lng
    };
  }

  function findSaleFromEvent(ev) {
    var t = ev.target;
    if (!t || !t.closest) return null;
    if (t.closest("#chica-force-key") || t.closest("#chica-hunt-bar") || t.closest("#chica-listit-btn") || t.closest("#chica-intel-card")) return null;
    var icon = t.closest(".leaflet-marker-icon");
    if (!icon || icon.classList.contains("chica-overlay-pin") || icon.querySelector(".chica-overlay-mark")) return null;
    var map = window.__chicaLeaflet;
    if (!map || !map.eachLayer) return null;
    var found = null;
    map.eachLayer(function (ly) {
      if (found) return;
      if (ly._icon === icon || (ly._icon && ly._icon.contains && ly._icon.contains(t))) found = saleFromMarker(ly);
    });
    return found;
  }

  window.__chicaOpenIntel = function (lat, lon, title) {
    render({ lat: lat, lon: lon, title: title || "Sale" });
    return true;
  };

  document.addEventListener("click", function (ev) {
    var sale = findSaleFromEvent(ev);
    if (!sale) return;
    render(sale);
  }, true);

  prefetch();
  css();
})();
