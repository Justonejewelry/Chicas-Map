/* Own the sale card. If another script opens it without Nearby, rewrite it. */
(function () {
  var p = location.pathname || "";
  if (!(/\/map\/?$/.test(p) || p.indexOf("/map/") !== -1 || /map\.html$/.test(p))) return;
  var BASE = "/Chicas-Map";
  var NEAR_M = 8000;
  var amenity = { parking: [], pantry: [], schools: [], wifi: [] };
  var last = null;
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
      if (!g || !g.coordinates) continue;
      var coords = g.type === "Point" ? g.coordinates : (g.coordinates[0] || []);
      if (!coords || coords.length < 2) continue;
      var blat = Number(coords[1]), blon = Number(coords[0]);
      if (!isFinite(blat) || !isFinite(blon)) continue;
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
    if (!hit) return "<li><strong>" + esc(label) + "</strong> None within 5 mi</li>";
    var props = hit.feat.properties || {};
    var name = props.name || props.title || label;
    return "<li><strong>" + esc(label) + "</strong> " + esc(name) + " \u00b7 " + fmtM(hit.d) + dirs(hit.lat, hit.lon) + "</li>";
  }
  function css() {
    if (document.getElementById("chica-pin-details-css")) return;
    var s = document.createElement("style");
    s.id = "chica-pin-details-css";
    s.textContent =
      "#chica-intel-card{display:none;position:fixed!important;left:12px!important;top:58px!important;z-index:2147483646!important;width:min(340px,calc(100vw - 24px))!important;max-height:min(74dvh,560px)!important;overflow:auto!important;background:#fffdf8!important;color:#1a1714!important;border:2px solid #c513af!important;border-radius:14px!important;box-shadow:0 16px 40px rgba(18,18,18,.45)!important;padding:14px!important;font:500 13px/1.35 Inter,system-ui,sans-serif!important}" +
      "#chica-intel-card .x{position:absolute;top:4px;right:4px;border:0;background:transparent;font:800 22px/1 Inter,system-ui,sans-serif;min-width:36px;min-height:36px}" +
      "#chica-intel-card .near-label{margin:12px 0 0;padding:6px 8px;background:#c513af;color:#fffdf8;border-radius:8px;font:800 12px/1 Inter,system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase}" +
      "#chica-intel-card ul{margin:6px 0 0;padding:0;list-style:none}" +
      "#chica-intel-card li{margin:8px 0 0;padding-top:8px;border-top:1px solid #ece6dc}" +
      "#chica-intel-card .chica-dirs{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 0}" +
      "#chica-intel-card .chica-dirs a{border:1px solid #c513af;border-radius:999px;padding:4px 10px;font-size:12px;color:#7a0f6c;text-decoration:none;font-weight:800}";
    (document.head || document.documentElement).appendChild(s);
  }
  function cardEl() {
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
  function loaded() {
    return amenity.parking.length + amenity.pantry.length + amenity.schools.length + amenity.wifi.length;
  }
  function render(sale) {
    if (!sale || !isFinite(Number(sale.lat)) || !isFinite(Number(sale.lon))) return;
    last = sale;
    css();
    var el = cardEl();
    var lat = Number(sale.lat), lon = Number(sale.lon);
    var when = sale.dates || sale.hours || "";
    var nearby = loaded()
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
      '<p class="near-label">Nearby intel</p>' +
      "<ul>" + nearby + "</ul></div>";
    var x = el.querySelector(".x");
    if (x) x.onclick = function (ev) { ev.preventDefault(); ev.stopPropagation(); el.style.display = "none"; };
    el.style.display = "block";
    if (!loaded()) setTimeout(function () { if (last === sale) render(sale); }, 350);
  }
  function parseLatLon(el) {
    var a = el.querySelector('a[href*="destination="]');
    if (!a) a = el.querySelector('a[href*="daddr="]');
    if (!a) return null;
    var href = a.getAttribute("href") || "";
    var m = href.match(/(-?\d+\.\d+)[, ]+(-?\d+\.\d+)/);
    if (!m) return null;
    return { lat: Number(m[1]), lon: Number(m[2]) };
  }
  function enrich() {
    var el = document.getElementById("chica-intel-card");
    if (!el || el.style.display === "none") return;
    if (el.querySelector(".near-label")) return;
    var ll = parseLatLon(el) || last;
    var titleEl = el.querySelector("h3");
    var meta = el.querySelector(".meta");
    render({
      title: titleEl ? titleEl.textContent : (last && last.title) || "Sale",
      address: meta ? meta.textContent : "",
      lat: ll && ll.lat,
      lon: ll && ll.lon
    });
  }
  function saleFromLayer(ly) {
    if (!ly || !ly.getLatLng) return null;
    if (ly._icon && (ly._icon.classList.contains("chica-overlay-pin") || ly._icon.querySelector(".chica-overlay-mark"))) return null;
    var ll = ly.getLatLng();
    var item = ly.__chicaSale || {};
    return {
      title: item.title || (ly.options && ly.options.title) || "Sale",
      address: item.address || "",
      dates: item.dates || "",
      hours: item.hours || "",
      lat: ll.lat,
      lon: ll.lng
    };
  }
  function hook() {
    var map = window.__chicaLeaflet;
    if (!map || !map.eachLayer) return;
    map.eachLayer(function (ly) {
      if (!ly.getLatLng || ly.__chicaDetailsHook) return;
      ly.__chicaDetailsHook = true;
      ly.on("click", function () {
        var sale = saleFromLayer(ly);
        if (sale) render(sale);
      });
    });
  }
  function prefetch() {
    Object.keys(SRC).forEach(function (id) {
      fetch(SRC[id] + "?v=15", { cache: "no-store" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) { amenity[id] = data && data.features ? data.features : []; })
        .catch(function () { amenity[id] = amenity[id] || []; });
    });
  }

  window.__chicaOpenIntel = function (lat, lon, title) {
    render({ lat: lat, lon: lon, title: title || "Sale" });
    return true;
  };

  document.addEventListener("click", function (ev) {
    var t = ev.target;
    if (!t || !t.closest) return;
    if (t.closest("#chica-force-key,#chica-hunt-bar,#chica-listit-btn,#chica-home-chip")) return;
    var icon = t.closest(".leaflet-marker-icon");
    if (!icon || icon.classList.contains("chica-overlay-pin") || icon.querySelector(".chica-overlay-mark")) return;
    var map = window.__chicaLeaflet;
    if (!map || !map.eachLayer) return;
    map.eachLayer(function (ly) {
      if (ly._icon === icon || (ly._icon && ly._icon.contains && ly._icon.contains(t))) {
        var sale = saleFromLayer(ly);
        if (sale) render(sale);
      }
    });
  }, true);

  prefetch();
  css();
  setInterval(function () { hook(); enrich(); }, 300);
})();
