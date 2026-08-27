(function () {
  var LAYER_ID = "chica-claimed-layer";
  var SRC = "/Chicas-Map/data/claimed-pins.json";
  var STORE = "chicas-map-claimed-pins";

  function onMapPath() {
    var p = location.pathname || "";
    return /\/map\/?$/.test(p) || p.indexOf("/map/") !== -1;
  }

  function findMap(el) {
    if (!el) return null;
    for (var k in el) {
      try {
        var v = el[k];
        if (v && typeof v.addLayer === "function" && typeof v.latLngToContainerPoint === "function") return v;
      } catch (e) {}
    }
    return null;
  }

  function loadLocal() {
    try {
      var raw = localStorage.getItem(STORE);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function pinHtml(pin) {
    var label = pin.preview ? "$5" : "$5";
    return (
      '<div class="chica-claimed-pin" data-claimed="1">' +
      '<span class="chica-claimed-head">' +
      label +
      "</span><span class=\"chica-claimed-tail\"></span></div>"
    );
  }

  function ensureLayer() {
    var layer = document.getElementById(LAYER_ID);
    if (layer) return layer;
    layer = document.createElement("div");
    layer.id = LAYER_ID;
    layer.setAttribute("aria-hidden", "true");
    return layer;
  }

  function place(map, layer, pins) {
    var box = map.getContainer();
    if (!box) return;
    if (layer.parentNode !== box) box.appendChild(layer);
    layer.innerHTML = "";
    pins.forEach(function (pin) {
      if (!pin || !Number.isFinite(Number(pin.lat)) || !Number.isFinite(Number(pin.lon))) return;
      var pt = map.latLngToContainerPoint([Number(pin.lat), Number(pin.lon)]);
      var el = document.createElement("button");
      el.type = "button";
      el.className = "chica-claimed-wrap" + (pin.preview ? " is-preview" : "");
      el.style.left = pt.x + "px";
      el.style.top = pt.y + "px";
      el.title = pin.title || "Claimed pin";
      el.setAttribute("aria-label", pin.title || "Claimed $5 pin");
      el.innerHTML = pinHtml(pin);
      el.addEventListener("click", function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        var msg = (pin.preview ? "Preview — not a sale.\n" : "Claimed $5 pin\n") +
          (pin.title || "") +
          (pin.address ? "\n" + pin.address : "");
        window.alert(msg);
      });
      layer.appendChild(el);
    });
  }

  function merge(remote) {
    var out = [];
    var seen = {};
    function add(list) {
      (list || []).forEach(function (p) {
        if (!p) return;
        var id = String(p.id || p.external_id || p.address || p.lat + "," + p.lon);
        if (seen[id]) return;
        seen[id] = true;
        out.push(p);
      });
    }
    add(remote);
    add(loadLocal());
    return out;
  }

  function boot() {
    if (!onMapPath()) {
      var leftover = document.getElementById(LAYER_ID);
      if (leftover) leftover.remove();
      return;
    }
    var el = document.querySelector(".leaflet-container");
    var map = findMap(el);
    if (!el || !map) return false;

    var layer = ensureLayer();
    fetch(SRC + "?v=1")
      .then(function (r) {
        return r.ok ? r.json() : { pins: [] };
      })
      .catch(function () {
        return { pins: [] };
      })
      .then(function (data) {
        var pins = merge(data.pins || []);
        function redraw() {
          place(map, layer, pins);
        }
        redraw();
        map.on && map.on("move zoom moveend zoomend viewreset", redraw);
        if (!map._chicaClaimedHooked) {
          map._chicaClaimedHooked = true;
          el.addEventListener("transitionend", redraw);
        }
      });
    return true;
  }

  function wait() {
    if (boot()) return;
    var n = 0;
    var t = setInterval(function () {
      n += 1;
      if (boot() || n > 80) clearInterval(t);
    }, 200);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wait);
  else wait();
  window.addEventListener("popstate", function () {
    setTimeout(wait, 60);
  });
})();
