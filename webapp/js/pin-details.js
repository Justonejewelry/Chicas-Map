/* Pin details + GPS-gated pack Intel. 200 ft. Couch rumors stay on the porch. */
(function () {
  var p = location.pathname || "";
  if (!(/\/map\/?$/.test(p) || p.indexOf("/map/") !== -1 || /map\.html$/.test(p))) return;
  var BASE = "/Chicas-Map";
  var RADIUS_FT = 200;
  var RADIUS_M = RADIUS_FT * 0.3048;
  var STORE = "chicas-map-sale-intel-v1";
  var last = null;
  var here = null;
  var watching = false;

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
  function fmtFt(m) {
    var ft = m / 0.3048;
    return ft < 1000 ? Math.round(ft) + " ft" : (ft / 5280).toFixed(2) + " mi";
  }
  function pinKey(sale) {
    return (Number(sale.lat).toFixed(4) + "," + Number(sale.lon).toFixed(4));
  }
  function loadNotes() {
    try {
      var raw = localStorage.getItem(STORE);
      var parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (e) { return {}; }
  }
  function saveNote(sale, handle, text) {
    var all = loadNotes();
    var key = pinKey(sale);
    var list = Array.isArray(all[key]) ? all[key] : [];
    list.unshift({
      handle: String(handle || "neighbor").slice(0, 24),
      text: String(text || "").slice(0, 280),
      t: Date.now()
    });
    all[key] = list.slice(0, 20);
    try { localStorage.setItem(STORE, JSON.stringify(all)); } catch (e) {}
    return all[key];
  }
  function notesFor(sale) {
    var all = loadNotes();
    return Array.isArray(all[pinKey(sale)]) ? all[pinKey(sale)] : [];
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
  function css() {
    if (document.getElementById("chica-pin-details-css")) return;
    var s = document.createElement("style");
    s.id = "chica-pin-details-css";
    s.textContent =
      "#chica-intel-card{display:none;position:fixed!important;left:12px!important;top:58px!important;z-index:2147483647!important;width:min(340px,calc(100vw - 24px))!important;max-height:min(74dvh,560px)!important;overflow:auto!important;background:#fffdf8!important;color:#1a1714!important;border:2px solid #c513af!important;border-radius:14px!important;box-shadow:0 16px 40px rgba(18,18,18,.45)!important;padding:14px!important;font:500 13px/1.35 Inter,system-ui,sans-serif!important}" +
      "#chica-intel-card .x{position:absolute;top:4px;right:4px;border:0;background:transparent;font:800 22px/1 Inter,system-ui,sans-serif;min-width:36px;min-height:36px}" +
      "#chica-intel-card .near-label{margin:12px 0 0;padding:6px 8px;background:#c513af;color:#fffdf8;border-radius:8px;font:800 12px/1 Inter,system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase}" +
      "#chica-intel-card .gate{margin:8px 0 0;color:#5c5348}" +
      "#chica-intel-card .note{margin:8px 0 0;padding:8px 0 0;border-top:1px solid #ece6dc}" +
      "#chica-intel-card .note b{display:block;font:800 12px/1.2 Inter,system-ui,sans-serif}" +
      "#chica-intel-card .note time{color:#5c5348;font-size:11px}" +
      "#chica-intel-card form{margin:10px 0 0;display:grid;gap:6px}" +
      "#chica-intel-card input,#chica-intel-card textarea{width:100%;box-sizing:border-box;border:1px solid #cfc6b8;border-radius:8px;padding:8px;font:500 13px/1.3 Inter,system-ui,sans-serif}" +
      "#chica-intel-card button.go{border:0;border-radius:10px;background:#c513af;color:#fff;font:800 13px/1 Inter,system-ui,sans-serif;padding:10px 12px;cursor:pointer}" +
      "#chica-intel-card .chica-dirs{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 0}" +
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
      document.documentElement.appendChild(el);
    }
    return el;
  }
  function gateState(sale) {
    if (!here) return { ok: false, copy: "Stand at the sale. Pack intel unlocks within 200 ft. We need your GPS." };
    var d = distM(here.lat, here.lon, Number(sale.lat), Number(sale.lon));
    if (d <= RADIUS_M) return { ok: true, copy: "You are " + fmtFt(d) + " from this pin. Tell the pack what is on the driveway." };
    return { ok: false, copy: "Too far \u2014 " + fmtFt(d) + " out. Intel unlocks inside 200 ft. No couch rumors." };
  }
  function render(sale) {
    if (!sale || !isFinite(Number(sale.lat))) return;
    last = sale;
    css();
    var el = cardEl();
    var lat = Number(sale.lat), lon = Number(sale.lon);
    var when = sale.dates || sale.hours || "";
    var gate = gateState(sale);
    var notes = gate.ok ? notesFor(sale) : [];
    var list = "";
    if (gate.ok && !notes.length) list = '<p class="gate">No driveway notes yet. You are close enough to leave the first one.</p>';
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i];
      list += '<div class="note"><b>' + esc(n.handle) + '</b><time>' + new Date(n.t).toLocaleString() + "</time><p>" + esc(n.text) + "</p></div>";
    }
    var form = gate.ok
      ? '<form id="chica-intel-form"><input name="handle" maxlength="24" placeholder="Sidewalk handle" required /><textarea name="text" rows="3" maxlength="280" placeholder="Cash only? Parking? What is left?" required></textarea><button class="go" type="submit">Leave a note</button></form>'
      : '<p class="gate">' + esc(gate.copy) + '</p><button class="go" type="button" id="chica-intel-gps">Use my location</button>';
    el.innerHTML =
      '<button type="button" class="x" aria-label="Close">\u00d7</button>' +
      '<div class="chica-opt">' +
      "<h3>" + esc(sale.title || "Sale") + "</h3>" +
      '<p class="meta">' + esc(sale.address || "") + (when ? "<br>" + esc(when) : "") + "</p>" +
      dirs(lat, lon) +
      '<p class="near-label">Pack intel \u00b7 200 ft</p>' +
      form + list +
      '<p class="gate"><a href="' + BASE + '/intel/">Porch rules</a></p>' +
      "</div>";
    var x = el.querySelector(".x");
    if (x) x.onclick = function (ev) { ev.preventDefault(); ev.stopPropagation(); el.style.display = "none"; };
    var gps = el.querySelector("#chica-intel-gps");
    if (gps) gps.onclick = function (ev) { ev.preventDefault(); askGps(true); };
    var f = el.querySelector("#chica-intel-form");
    if (f) f.onsubmit = function (ev) {
      ev.preventDefault();
      var handle = f.handle.value;
      var text = f.text.value;
      if (!text.trim()) return;
      saveNote(sale, handle, text);
      render(sale);
    };
    el.style.display = "block";
  }
  function askGps(force) {
    if (!navigator.geolocation) {
      if (last) render(last);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        here = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        if (last) render(last);
      },
      function () { if (last) render(last); },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: force ? 0 : 20000 }
    );
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
        if (sale) { render(sale); askGps(false); startWatch(); }
      });
    });
  }
  function startWatch() {
    if (watching || !navigator.geolocation || !navigator.geolocation.watchPosition) return;
    watching = true;
    navigator.geolocation.watchPosition(
      function (pos) {
        here = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        if (last) render(last);
      },
      function () {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
  }
  window.__chicaOpenIntel = function (lat, lon, title) {
    render({ lat: lat, lon: lon, title: title || "Sale" });
    askGps(false);
    startWatch();
    return true;
  };
  window.__chicaHideIntel = function () {
    var el = document.getElementById("chica-intel-card");
    if (el) el.style.display = "none";
  };
  document.addEventListener("click", function (ev) {
    var t = ev.target;
    if (!t || !t.closest) return;
    if (t.closest("#chica-force-key,#chica-hunt-bar,#chica-listit-btn,#chica-home-chip,#chica-intel-card")) return;
    var icon = t.closest(".leaflet-marker-icon");
    if (!icon || icon.classList.contains("chica-overlay-pin") || icon.querySelector(".chica-overlay-mark")) return;
    var map = window.__chicaLeaflet;
    if (!map || !map.eachLayer) return;
    map.eachLayer(function (ly) {
      if (ly._icon === icon || (ly._icon && ly._icon.contains && ly._icon.contains(t))) {
        var sale = saleFromLayer(ly);
        if (sale) { render(sale); askGps(false); startWatch(); }
      }
    });
  }, true);
  css();
  setInterval(hook, 400);
})();
