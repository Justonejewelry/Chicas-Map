/* Sale / intel pin tap → popup with nearby parking, pantry, wifi, schools + directions. */
(function () {
  var p = location.pathname || "";
  if (!(/\/map\/?$/.test(p) || p.indexOf("/map/") !== -1)) return;
  var BASE = "/Chicas-Map";
  var NEAR_M = 1600;
  var cache = {};
  var SRC = {
    parking: BASE + "/data/san-antonio-downtown-parking.geojson",
    pantry: BASE + "/data/san-antonio-24h-food-pantries.geojson",
    schools: BASE + "/data/zone-aware-schools.geojson",
    wifi: BASE + "/data/san-antonio-public-wifi.geojson"
  };
  var wired = false;

  function findMap() {
    if (window.__chicaLeaflet && window.__chicaLeaflet.openPopup) return window.__chicaLeaflet;
    var nodes = document.querySelectorAll(".leaflet-container");
    for (var i = 0; i < nodes.length; i++) {
      for (var k in nodes[i]) {
        try {
          var v = nodes[i][k];
          if (v && v.flyTo && v.openPopup) { window.__chicaLeaflet = v; return v; }
        } catch (e) {}
      }
    }
    return null;
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  function pinTitle(el) {
    var wrap = el.closest(".leaflet-marker-icon") || el;
    var t = (wrap.getAttribute("title") || wrap.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim();
    if (t && t !== "You") return t;
    var inner = wrap.querySelector("[title], [aria-label]");
    if (inner) {
      t = (inner.getAttribute("title") || inner.getAttribute("aria-label") || "").trim();
      if (t && t !== "You") return t;
    }
    return "This stop";
  }

  function featLL(feat) {
    var g = feat && feat.geometry;
    if (!g || g.type !== "Point" || !g.coordinates) return null;
    return [g.coordinates[1], g.coordinates[0]];
  }

  function distM(aLat, aLon, bLat, bLon) {
    var R = 6371000;
    var dLat = (bLat - aLat) * Math.PI / 180;
    var dLon = (bLon - aLon) * Math.PI / 180;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(aLat * Math.PI / 180) * Math.cos(bLat * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  function nearest(id, lat, lon) {
    var feats = cache[id] || [];
    var best = null;
    for (var i = 0; i < feats.length; i++) {
      var ll = featLL(feats[i]);
      if (!ll) continue;
      var d = distM(lat, lon, ll[0], ll[1]);
      if (d > NEAR_M) continue;
      if (!best || d < best.d) best = { d: d, feat: feats[i], ll: ll };
    }
    return best;
  }

  function fmtM(m) {
    return m < 1000 ? Math.round(m) + " m" : (m / 1609.34).toFixed(1) + " mi";
  }

  function dirs(lat, lon) {
    return (
      '<div style="display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 4px">' +
      '<a style="border:1px solid #c513af;border-radius:999px;padding:4px 10px;font-size:12px;color:#7a0f6c;text-decoration:none;font-weight:800" target="_blank" rel="noreferrer" href="https://www.google.com/maps/dir/?api=1&destination=' + lat + "," + lon + '">Google</a>' +
      '<a style="border:1px solid #c513af;border-radius:999px;padding:4px 10px;font-size:12px;color:#7a0f6c;text-decoration:none;font-weight:800" target="_blank" rel="noreferrer" href="https://maps.apple.com/?daddr=' + lat + "," + lon + '">Apple</a>' +
      '<a style="border:1px solid #c513af;border-radius:999px;padding:4px 10px;font-size:12px;color:#7a0f6c;text-decoration:none;font-weight:800" target="_blank" rel="noreferrer" href="https://waze.com/ul?ll=' + lat + "%2C" + lon + '&navigate=yes">Waze</a>' +
      "</div>"
    );
  }

  function nearRow(label, hit) {
    if (!hit) return "";
    var props = hit.feat.properties || {};
    var name = props.name || props.title || label;
    var extra = props.ssid ? " · SSID " + props.ssid : (props.rates || props.hourly || props.hours || "");
    return (
      '<li style="margin:8px 0 0;padding-top:8px;border-top:1px solid #ece6dc">' +
      '<div style="font-size:10px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#7a0f6c">' + esc(label) + "</div>" +
      "<div>" + esc(name) + ' <span style="color:#5c5348;font-size:11px">' + fmtM(hit.d) + (extra ? " · " + esc(extra) : "") + "</span></div>" +
      dirs(hit.ll[0], hit.ll[1]) +
      "</li>"
    );
  }

  function html(title, lat, lon) {
    var items =
      nearRow("Parking", nearest("parking", lat, lon)) +
      nearRow("Pantry", nearest("pantry", lat, lon)) +
      nearRow("Wi-Fi", nearest("wifi", lat, lon)) +
      nearRow("School zone", nearest("schools", lat, lon));
    if (!items) items = '<li style="margin-top:8px;color:#5c5348">Nothing mapped within a mile of this pin yet.</li>';
    return (
      '<div class="chica-opt" style="min-width:210px;max-width:260px;font:500 13px/1.35 Inter,system-ui,sans-serif;color:#1a1714">' +
      '<div style="font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#c513af">Intel</div>' +
      "<strong>" + esc(title) + "</strong>" +
      '<div style="color:#5c5348;font-size:11px;margin-top:2px">Options around this driveway</div>' +
      dirs(lat, lon) +
      '<ul style="list-style:none;margin:4px 0 0;padding:0">' + items + "</ul></div>"
    );
  }

  function openPop(el) {
    var map = findMap(), L = window.L;
    if (!map || !L || !L.popup) return;
    var wrap = el.closest(".leaflet-marker-icon") || el;
    if ((wrap.getAttribute("title") || "") === "You") return;
    var rect = wrap.getBoundingClientRect();
    var box = map.getContainer().getBoundingClientRect();
    var ll;
    try {
      ll = map.containerPointToLatLng([
        rect.left + rect.width / 2 - box.left,
        rect.top + rect.height - box.top
      ]);
    } catch (e) { return; }
    L.popup({ maxWidth: 280, autoPan: true, className: "chica-intel-pop" })
      .setLatLng(ll)
      .setContent(html(pinTitle(wrap), ll.lat, ll.lng))
      .openOn(map);
  }

  function prefetch() {
    Object.keys(SRC).forEach(function (id) {
      if (cache[id]) return;
      fetch(SRC[id] + "?v=8", { cache: "no-store" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) { cache[id] = data && data.features ? data.features : []; })
        .catch(function () { cache[id] = []; });
    });
  }

  function wire() {
    if (wired) return;
    wired = true;
    prefetch();
    document.addEventListener("click", function (ev) {
      var t = ev.target;
      if (!t || !t.closest) return;
      if (t.closest(".leaflet-popup") || t.closest("#chica-force-key") || t.closest("#chica-key") || t.closest("#chica-hunt-bar") || t.closest("#chica-map-chrome") || t.closest("#chica-listit-btn")) return;
      var pin = t.closest(".leaflet-marker-icon, .chica-sym, .chica-pin");
      if (!pin) return;
      if (pin.querySelector && pin.querySelector(".chica-overlay-mark")) return;
      ev.preventDefault();
      ev.stopPropagation();
      openPop(pin);
    }, true);
  }

  wire();
})();
