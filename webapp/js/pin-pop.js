/* Intel card. Fixed on <html> so Leaflet panes cannot bury it. */
(function () {
  var p = location.pathname || "";
  if (!(/\/map\/?$/.test(p) || p.indexOf("/map/") !== -1 || /map\.html$/.test(p))) return;
  var BASE = "/Chicas-Map";
  var NEAR_M = 2400;
  var cache = {};
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
    return window.__chicaLeaflet || null;
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
      '<div class="acts">' +
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
    return "<li><b>" + esc(label) + "</b> " + esc(name) + " <i>" + fmtM(hit.d) + (extra ? " \u00b7 " + esc(extra) : "") + "</i>" + dirs(hit.ll[0], hit.ll[1]) + "</li>";
  }

  function css() {
    if (document.getElementById("chica-intel-card-css")) return;
    var s = document.createElement("style");
    s.id = "chica-intel-card-css";
    s.textContent =
      "#chica-intel-card{position:fixed;z-index:2147483646;width:min(280px,calc(100vw - 24px));max-height:min(70dvh,480px);overflow:auto;background:#fffdf8;color:#1a1714;border:1px solid #c513af;border-radius:14px;box-shadow:0 16px 40px rgba(18,18,18,.35);padding:12px 12px 14px;font:500 13px/1.35 Inter,system-ui,sans-serif}" +
      "#chica-intel-card .hd{display:flex;justify-content:space-between;align-items:center;gap:8px}" +
      "#chica-intel-card .tag{font:800 10px/1 Inter,system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#c513af}" +
      "#chica-intel-card button.x{border:0;background:transparent;font:800 18px/1 Inter,system-ui,sans-serif;color:#1a1714;min-width:32px;min-height:32px}" +
      "#chica-intel-card h3{margin:4px 0 0;font:800 15px/1.2 Inter,system-ui,sans-serif}" +
      "#chica-intel-card .sub{color:#5c5348;font-size:12px;margin:2px 0 6px}" +
      "#chica-intel-card ul{list-style:none;margin:8px 0 0;padding:0}" +
      "#chica-intel-card li{margin:8px 0 0;padding-top:8px;border-top:1px solid #ece6dc}" +
      "#chica-intel-card i{font-style:normal;color:#5c5348;font-size:11px}" +
      "#chica-intel-card .acts{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 0}" +
      "#chica-intel-card .acts a{border:1px solid #c513af;border-radius:999px;padding:4px 10px;font-size:12px;color:#7a0f6c;text-decoration:none;font-weight:800}" +
      ".chica-intel-badge{position:absolute;right:-4px;top:-5px;width:12px;height:12px;border-radius:99px;background:#c513af;border:1px solid #fffdf8}";
    (document.head || document.documentElement).appendChild(s);
  }

  function card() {
    var el = document.getElementById("chica-intel-card");
    if (el) return el;
    el = document.createElement("div");
    el.id = "chica-intel-card";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-label", "Sale intel");
    el.hidden = true;
    document.documentElement.appendChild(el);
    return el;
  }

  function closeCard() {
    var el = document.getElementById("chica-intel-card");
    if (el) el.hidden = true;
  }

  function placeCard(anchor) {
    var el = card();
    var x = 16, y = 72;
    if (anchor && anchor.getBoundingClientRect) {
      var r = anchor.getBoundingClientRect();
      x = Math.min(window.innerWidth - 296, Math.max(8, r.right + 8));
      y = Math.min(window.innerHeight - 220, Math.max(56, r.top));
    }
    el.style.left = x + "px";
    el.style.top = y + "px";
    el.hidden = false;
  }

  function html(title, lat, lon) {
    var items =
      nearRow("Parking", nearest("parking", lat, lon)) +
      nearRow("Pantry", nearest("pantry", lat, lon)) +
      nearRow("Wi-Fi", nearest("wifi", lat, lon)) +
      nearRow("School zone", nearest("schools", lat, lon));
    if (!items) items = "<li>Nothing mapped within 1.5 miles yet.</li>";
    return (
      '<div class="hd"><span class="tag">Intel</span><button type="button" class="x" aria-label="Close intel">\u00d7</button></div>' +
      "<h3>" + esc(title || "This stop") + "</h3>" +
      '<div class="sub">Options around this driveway</div>' +
      dirs(lat, lon) +
      "<ul>" + items + "</ul>"
    );
  }

  function openIntel(lat, lon, title, anchor) {
    if (!intelOn()) return false;
    css();
    lat = Number(lat); lon = Number(lon);
    if (!isFinite(lat) || !isFinite(lon)) return false;
    var el = card();
    el.innerHTML = html(title, lat, lon);
    var xbtn = el.querySelector("button.x");
    if (xbtn) xbtn.onclick = function (ev) { ev.preventDefault(); ev.stopPropagation(); closeCard(); };
    placeCard(anchor);
    try { if (window.__chicaTrack) window.__chicaTrack("intel_pop"); } catch (e) {}
    return true;
  }

  function prefetch() {
    Object.keys(SRC).forEach(function (id) {
      if (cache[id]) return;
      fetch(SRC[id] + "?v=12", { cache: "no-store" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) { cache[id] = data && data.features ? data.features : []; })
        .catch(function () { cache[id] = []; });
    });
  }

  function hookMarkers() {
    var map = findMap();
    if (!map || !map.eachLayer) return;
    map.eachLayer(function (ly) {
      if (!ly || !ly.getLatLng || ly._chicaIntelHook) return;
      var cls = (ly.options && ly.options.icon && ly.options.icon.options && ly.options.icon.options.className) || "";
      if (cls.indexOf("chica-pin") === -1 && cls.indexOf("chica-type-") === -1) return;
      ly._chicaIntelHook = true;
      ly.on("click", function (ev) {
        if (!intelOn()) return;
        var ll = ly.getLatLng();
        var title = (ly.options && ly.options.title) || "Sale";
        try { if (ev.originalEvent) { ev.originalEvent.preventDefault(); ev.originalEvent.stopPropagation(); } } catch (e) {}
        openIntel(ll.lat, ll.lng, title, ly._icon);
      });
    });
  }

  window.__chicaOpenIntel = function (lat, lon, title, anchor) {
    prefetch();
    return openIntel(lat, lon, title, anchor);
  };

  prefetch();
  css();
  document.documentElement.classList.add("chica-intel-on");

  document.addEventListener("click", function (ev) {
    var t = ev.target;
    if (!t || !t.closest) return;
    if (t.closest("#chica-intel-card")) return;
    if (t.closest("#chica-force-key") || t.closest("#chica-hunt-bar") || t.closest("#chica-listit-btn")) {
      closeCard();
      return;
    }
    var pin = t.closest(".leaflet-marker-icon");
    if (!pin) {
      closeCard();
      return;
    }
    if (pin.querySelector && pin.querySelector(".chica-overlay-mark")) return;
    if (!intelOn()) return;
    var map = findMap();
    var title = pin.getAttribute("title") || "Sale";
    var lat = null, lon = null;
    if (map && map.containerPointToLatLng) {
      var rect = pin.getBoundingClientRect();
      var box = map.getContainer().getBoundingClientRect();
      try {
        var ll = map.containerPointToLatLng([
          rect.left + rect.width / 2 - box.left,
          rect.top + rect.height / 2 - box.top
        ]);
        lat = ll.lat; lon = ll.lng;
      } catch (e) {}
    }
    if (lat == null) return;
    ev.preventDefault();
    ev.stopPropagation();
    openIntel(lat, lon, title, pin);
  }, true);

  window.addEventListener("chica-intel", hookMarkers);
  var n = 0;
  var id = setInterval(function () {
    hookMarkers();
    n += 1;
    if (n > 60) clearInterval(id);
  }, 200);
})();
