/* Tap a map pin → popup with name + directions. Does not wait on Intel toggle. */
(function () {
  var p = location.pathname || "";
  if (!(/\/map\/?$/.test(p) || p.indexOf("/map/") !== -1)) return;
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
    var title = pinTitle(wrap);
    var lat = ll.lat, lon = ll.lng;
    var html =
      '<div class="chica-opt" style="min-width:200px;font:600 13px/1.35 Inter,system-ui,sans-serif;color:#1a1714">' +
      "<strong>" + title.replace(/</g, "") + "</strong>" +
      '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">' +
      '<a style="border:1px solid #c513af;border-radius:999px;padding:4px 10px;font-size:12px;color:#7a0f6c;text-decoration:none;font-weight:800" target="_blank" rel="noreferrer" href="https://www.google.com/maps/dir/?api=1&destination=' + lat + "," + lon + '">Google</a>' +
      '<a style="border:1px solid #c513af;border-radius:999px;padding:4px 10px;font-size:12px;color:#7a0f6c;text-decoration:none;font-weight:800" target="_blank" rel="noreferrer" href="https://maps.apple.com/?daddr=' + lat + "," + lon + '">Apple</a>' +
      '<a style="border:1px solid #c513af;border-radius:999px;padding:4px 10px;font-size:12px;color:#7a0f6c;text-decoration:none;font-weight:800" target="_blank" rel="noreferrer" href="https://waze.com/ul?ll=' + lat + "%2C" + lon + '&navigate=yes">Waze</a>' +
      "</div></div>";
    L.popup({ maxWidth: 280, autoPan: true }).setLatLng(ll).setContent(html).openOn(map);
  }
  function wire() {
    if (wired) return;
    wired = true;
    document.addEventListener("click", function (ev) {
      var t = ev.target;
      if (!t || !t.closest) return;
      if (t.closest(".leaflet-popup") || t.closest("#chica-force-key") || t.closest("#chica-key") || t.closest("#chica-hunt-bar") || t.closest("#chica-map-chrome")) return;
      var pin = t.closest(".leaflet-marker-icon, .chica-sym, .chica-pin");
      if (!pin) return;
      ev.preventDefault();
      ev.stopPropagation();
      openPop(pin);
    }, true);
  }
  wire();
})();
