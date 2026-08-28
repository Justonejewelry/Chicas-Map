/* Search + Near Me. Lives on <html> so fullscreen cannot bury it. */
(function () {
  var p = location.pathname || "";
  if (!(/\/map\/?$/.test(p) || p.indexOf("/map/") !== -1 || /map\.html$/.test(p))) return;
  var SA = { lat: 29.4241, lon: -98.4936 };

  function findMap() {
    if (window.__chicaLeaflet && window.__chicaLeaflet.flyTo) return window.__chicaLeaflet;
    var nodes = document.querySelectorAll(".leaflet-container");
    for (var i = 0; i < nodes.length; i++) {
      for (var k in nodes[i]) {
        try {
          var v = nodes[i][k];
          if (v && v.flyTo && v.invalidateSize) { window.__chicaLeaflet = v; return v; }
        } catch (e) {}
      }
    }
    return null;
  }

  function pinText(el) {
    return ((el.getAttribute("title") || "") + " " + (el.getAttribute("aria-label") || "") + " " + (el.textContent || "")).replace(/\s+/g, " ").trim();
  }

  function pinLatLng(el, map) {
    var wrap = el.closest(".leaflet-marker-icon") || el;
    var rect = wrap.getBoundingClientRect();
    var box = map.getContainer().getBoundingClientRect();
    try {
      return map.containerPointToLatLng([
        rect.left + rect.width / 2 - box.left,
        rect.top + rect.height - box.top
      ]);
    } catch (e) { return null; }
  }

  function searchPins(q) {
    var map = findMap();
    if (!map || !q) return 0;
    var needle = q.toLowerCase();
    var pins = document.querySelectorAll(".leaflet-marker-icon, .chica-sym, .chica-pin");
    var hits = [];
    for (var i = 0; i < pins.length; i++) {
      if (pins[i].querySelector && pins[i].querySelector(".chica-overlay-mark")) continue;
      var t = pinText(pins[i]).toLowerCase();
      if (!t || t === "you") continue;
      var show = t.indexOf(needle) !== -1;
      var wrap = pins[i].closest(".leaflet-marker-icon") || pins[i];
      wrap.style.opacity = show ? "1" : "0.18";
      if (show) {
        var ll = pinLatLng(pins[i], map);
        if (ll) hits.push(ll);
      }
    }
    if (hits.length === 1) {
      try { map.flyTo(hits[0], Math.max(map.getZoom(), 15), { duration: 0.8 }); } catch (e) { map.setView(hits[0], 15); }
    } else if (hits.length > 1) {
      try {
        var b = window.L && window.L.latLngBounds && window.L.latLngBounds(hits);
        if (b) map.fitBounds(b.pad(0.2));
        else map.flyTo(hits[0], 13, { duration: 0.8 });
      } catch (e) {}
    }
    return hits.length;
  }

  function clearSearch() {
    var pins = document.querySelectorAll(".leaflet-marker-icon, .chica-sym, .chica-pin");
    for (var i = 0; i < pins.length; i++) {
      var wrap = pins[i].closest(".leaflet-marker-icon") || pins[i];
      wrap.style.opacity = "";
    }
  }

  function nearMe() {
    var map = findMap();
    if (!map) return;
    if (!navigator.geolocation) {
      try { map.flyTo([SA.lat, SA.lon], 12, { duration: 0.9 }); } catch (e) { map.setView([SA.lat, SA.lon], 12); }
      return;
    }
    var btn = document.getElementById("chica-near-btn");
    if (btn) btn.textContent = "…";
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        var lat = pos.coords.latitude, lon = pos.coords.longitude;
        try { map.flyTo([lat, lon], 15, { duration: 1.1 }); } catch (e) { map.setView([lat, lon], 15); }
        if (btn) btn.textContent = "Near me";
      },
      function () {
        try { map.flyTo([SA.lat, SA.lon], 12, { duration: 0.9 }); } catch (e) { map.setView([SA.lat, SA.lon], 12); }
        if (btn) btn.textContent = "Near me";
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  }

  function mount() {
    if (document.getElementById("chica-hunt-bar")) return;
    if (!document.getElementById("chica-hunt-css")) {
      var s = document.createElement("style");
      s.id = "chica-hunt-css";
      s.textContent =
        "#chica-hunt-bar{position:fixed!important;top:max(10px,env(safe-area-inset-top))!important;left:10px!important;right:118px!important;z-index:2147483647!important;display:flex!important;gap:6px;align-items:center;pointer-events:auto!important}" +
        "#chica-hunt-bar input{flex:1;min-width:0;height:42px;border:1px solid #3a342e;border-radius:12px;background:#1a1714f5;color:#f3eee4;padding:0 12px;font:600 14px/1 Inter,system-ui,sans-serif}" +
        "#chica-hunt-bar button{height:42px;border:0;border-radius:12px;background:#c513af;color:#fff;font:800 12px/1 Inter,system-ui,sans-serif;padding:0 12px;white-space:nowrap;cursor:pointer}" +
        "#chica-force-key[data-collapsed=true]{max-height:44px!important;overflow:hidden!important;width:auto!important;min-width:88px}" +
        "#chica-force-key[data-collapsed=true] ul{display:none!important}" +
        "@media (max-width:720px){#chica-hunt-bar{right:118px}}";
      (document.head || document.documentElement).appendChild(s);
    }
    var bar = document.createElement("div");
    bar.id = "chica-hunt-bar";
    bar.innerHTML = '<input id="chica-hunt-q" type="search" placeholder="Search sales, streets, zip" enterkeyhint="search" /><button type="button" id="chica-near-btn">Near me</button>';
    document.documentElement.appendChild(bar);
    var q = bar.querySelector("#chica-hunt-q");
    var t = null;
    q.addEventListener("input", function () {
      clearTimeout(t);
      var val = q.value.trim();
      t = setTimeout(function () {
        if (!val) { clearSearch(); return; }
        searchPins(val);
      }, 180);
    });
    q.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter") { ev.preventDefault(); searchPins(q.value.trim()); }
    });
    bar.querySelector("#chica-near-btn").addEventListener("click", function (ev) {
      ev.preventDefault();
      nearMe();
    });
  }

  function tick() { mount(); }
  tick();
  setInterval(tick, 1200);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", tick);
})();
