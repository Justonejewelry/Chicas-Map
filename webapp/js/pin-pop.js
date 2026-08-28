/* Intel: tap a sale pin -> nearest parking / pantry / wifi / school + directions. */
(function () {
  var p = location.pathname || "";
  if (!(/\/map\/?$/.test(p) || p.indexOf("/map/") !== -1 || /map\.html$/.test(p))) return;
  var BASE = "/Chicas-Map";
  var NEAR_M = 2400;
  var cache = {};
  var ready = {};
  var SRC = {
    parking: BASE + "/data/san-antonio-downtown-parking.geojson",
    pantry: BASE + "/data/san-antonio-24h-food-pantries.geojson",
    schools: BASE + "/data/zone-aware-schools.geojson",
    wifi: BASE + "/data/san-antonio-public-wifi.geojson"
  };

  function intelOn() {
    return !document.documentElement.classList.contains("chica-intel-off");
  }

  function findMap() {
    if (typeof window.__chicaFindMap === "function") {
      var live = window.__chicaFindMap();
      if (live) return live;
    }
    if (window.__chicaLeaflet && window.__chicaLeaflet.openPopup) return window.__chicaLeaflet;
    return null;
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
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
      '<div class="chica-dirs">' +
      '<a target="_blank" rel="noreferrer" href="https://www.google.com/maps/dir/?api=1&destination=' + lat + "," + lon + '">Google</a>' +
      '<a target="_blank" rel="noreferrer" href="https://maps.apple.com/?daddr=' + lat + "," + lon + '">Apple</a>' +
      '<a target="_blank" rel="noreferrer" href="https://waze.com/ul?ll=' + lat + "%2C" + lon + '&navigate=yes">Waze</a>' +
      "</div>"
    );
  }

  function nearRow(label, hit) {
    if (!hit) return "";
    var props = hit.feat.properties || {};
    var name = props.name || props.title || label;
    var extra = props.ssid ? " \u00b7 SSID " + props.ssid : (props.rates || props.hourly || props.hours || "");
    return (
      '<li><span class="tag">' + esc(label) + "</span> " +
      esc(name) + ' <span class="meta">' + fmtM(hit.d) + (extra ? " \u00b7 " + esc(extra) : "") + "</span>" +
      dirs(hit.ll[0], hit.ll[1]) + "</li>"
    );
  }

  function popupCss() {
    if (document.getElementById("chica-intel-pop-css")) return;
    var s = document.createElement("style");
    s.id = "chica-intel-pop-css";
    s.textContent =
      ".chica-intel-pop .leaflet-popup-content-wrapper{border-radius:14px;box-shadow:0 12px 28px rgba(18,18,18,.28)}" +
      ".chica-opt{min-width:210px;max-width:260px;font:500 13px/1.35 Inter,system-ui,sans-serif;color:#1a1714}" +
      ".chica-opt .tag{display:inline-block;font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#c513af}" +
      ".chica-opt h3{margin:2px 0 0;font:800 14px/1.2 Inter,system-ui,sans-serif}" +
      ".chica-opt .meta{color:#5c5348;font-size:11px}" +
      ".chica-opt ul{list-style:none;margin:6px 0 0;padding:0}" +
      ".chica-opt li{margin:8px 0 0;padding-top:8px;border-top:1px solid #ece6dc}" +
      ".chica-dirs{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 0}" +
      ".chica-dirs a{border:1px solid #c513af;border-radius:999px;padding:4px 10px;font-size:12px;color:#7a0f6c;text-decoration:none;font-weight:800}";
    (document.head || document.documentElement).appendChild(s);
  }

  function html(title, lat, lon) {
    var items =
      nearRow("Parking", nearest("parking", lat, lon)) +
      nearRow("Pantry", nearest("pantry", lat, lon)) +
      nearRow("Wi-Fi", nearest("wifi", lat, lon)) +
      nearRow("School zone", nearest("schools", lat, lon));
    if (!items) items = '<li class="meta">Nothing mapped within 1.5 miles. Turn Parking / Wi-Fi / Pantries on in the Key to see them on the map.</li>';
    return (
      '<div class="chica-opt"><span class="tag">Intel</span><h3>' + esc(title || "This stop") + "</h3>" +
      '<div class="meta">Options around this driveway</div>' +
      dirs(lat, lon) +
      "<ul>" + items + "</ul></div>"
    );
  }

  function openIntel(lat, lon, title) {
    popupCss();
    var map = findMap(), L = window.L;
    if (!map || !L || !L.popup) return false;
    lat = Number(lat); lon = Number(lon);
    if (!isFinite(lat) || !isFinite(lon)) return false;
    L.popup({ maxWidth: 280, autoPan: true, className: "chica-intel-pop" })
      .setLatLng([lat, lon])
      .setContent(html(title, lat, lon))
      .openOn(map);
    try { if (window.__chicaTrack) window.__chicaTrack("intel_pop"); } catch (e) {}
    return true;
  }

  function prefetch() {
    Object.keys(SRC).forEach(function (id) {
      if (ready[id]) return;
      ready[id] = true;
      fetch(SRC[id] + "?v=11", { cache: "no-store" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) { cache[id] = data && data.features ? data.features : []; })
        .catch(function () { cache[id] = []; });
    });
  }

  function stampBadges() {
    var on = intelOn();
    document.documentElement.classList.toggle("chica-intel-on", on);
    var pins = document.querySelectorAll(".leaflet-marker-icon.chica-pin, .leaflet-marker-icon.chica-type-garage, .leaflet-marker-icon.chica-type-estate, .leaflet-marker-icon.chica-type-permit");
    for (var i = 0; i < pins.length; i++) {
      var host = pins[i];
      if (host.querySelector(".chica-overlay-mark")) continue;
      var badge = host.querySelector(".chica-intel-badge");
      if (!badge) {
        badge = document.createElement("span");
        badge.className = "chica-intel-badge";
        badge.setAttribute("aria-hidden", "true");
        if (getComputedStyle(host).position === "static") host.style.position = "relative";
        host.appendChild(badge);
      }
      badge.style.display = on ? "block" : "none";
    }
  }

  window.__chicaOpenIntel = function (lat, lon, title) {
    prefetch();
    return openIntel(lat, lon, title);
  };
  window.__chicaIntelOn = intelOn;
  window.__chicaStampIntel = stampBadges;

  prefetch();
  document.documentElement.classList.add("chica-intel-on");

  document.addEventListener("click", function (ev) {
    if (!intelOn()) return;
    var t = ev.target;
    if (!t || !t.closest) return;
    if (t.closest(".leaflet-popup") || t.closest("#chica-force-key") || t.closest("#chica-key") || t.closest("#chica-hunt-bar") || t.closest("#chica-listit-btn")) return;
    var pin = t.closest(".leaflet-marker-icon, .chica-sym, .chica-pin");
    if (!pin) return;
    if (pin.querySelector && pin.querySelector(".chica-overlay-mark")) return;
    var map = findMap();
    if (!map || !map.containerPointToLatLng) return;
    var wrap = pin.closest(".leaflet-marker-icon") || pin;
    var rect = wrap.getBoundingClientRect();
    var box = map.getContainer().getBoundingClientRect();
    var ll;
    try {
      ll = map.containerPointToLatLng([
        rect.left + rect.width / 2 - box.left,
        rect.top + rect.height / 2 - box.top
      ]);
    } catch (e) { return; }
    ev.preventDefault();
    ev.stopPropagation();
    openIntel(ll.lat, ll.lng, wrap.getAttribute("title") || wrap.getAttribute("alt") || "Sale");
  }, true);

  window.addEventListener("chica-intel", function () {
    prefetch();
    stampBadges();
  });

  var n = 0;
  var id = setInterval(function () {
    stampBadges();
    n += 1;
    if (n > 40) clearInterval(id);
  }, 250);
})();
