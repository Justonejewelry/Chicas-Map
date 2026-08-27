(function () {
  var LAYER_ID = "chica-claimed-layer";
  var SRC = "/Chicas-Map/preview/11/data/claimed-pins.json";
  var STORE = "chicas-map-claimed-pins";
  var pins = [];
  var hooked = false;

  function onMapPath() {
    var p = location.pathname || "";
    return /\/map\/?$/.test(p) || p.indexOf("/map/") !== -1;
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

  function detectZoom(box) {
    var imgs = (box || document).querySelectorAll(".leaflet-tile img, .leaflet-tile, img.leaflet-tile");
    for (var i = 0; i < imgs.length; i++) {
      var src = imgs[i].src || imgs[i].getAttribute("src") || "";
      var carto = src.match(/\/(\d{1,2})\/\d+\/\d+(\.@\d+x)?\.(png|jpg|webp)/i);
      if (carto) return Number(carto[1]);
      var esri = src.match(/\/tile\/(\d{1,2})\/\d+\/\d+/i);
      if (esri) return Number(esri[1]);
    }
    var wrap = document.querySelector(".leaflet-proxy, .leaflet-zoom-anim");
    var cls = ((box && box.className) || "") + " " + ((wrap && wrap.className) || "");
    var zm = cls.match(/leaflet-zoom-(\d+)/);
    return zm ? Number(zm[1]) : 11;
  }

  function parseTransform(el) {
    if (!el) return { x: 0, y: 0 };
    var t = window.getComputedStyle(el).transform;
    if (!t || t === "none") return { x: 0, y: 0 };
    var m = t.match(/matrix3d\(([^)]+)\)/);
    if (m) {
      var a = m[1].split(",").map(Number);
      return { x: a[12], y: a[13] };
    }
    m = t.match(/matrix\(([^)]+)\)/);
    if (m) {
      var b = m[1].split(",").map(Number);
      return { x: b[4], y: b[5] };
    }
    return { x: 0, y: 0 };
  }

  function worldPoint(lat, lon, zoom) {
    var siny = Math.sin((lat * Math.PI) / 180);
    siny = Math.min(Math.max(siny, -0.9999), 0.9999);
    var scale = 256 * Math.pow(2, zoom);
    return {
      x: scale * (0.5 + lon / 360),
      y: scale * (0.5 - Math.log((1 + siny) / (1 - siny)) / (4 * Math.PI)),
    };
  }

  function toContainer(lat, lon, box) {
    var pane = box.querySelector(".leaflet-map-pane") || box.querySelector(".leaflet-tile-pane");
    var zoom = detectZoom(box);
    var world = worldPoint(Number(lat), Number(lon), zoom);
    var tr = parseTransform(pane);
    return { x: world.x + tr.x, y: world.y + tr.y, zoom: zoom };
  }

  function pinHtml(pin) {
    return (
      '<div class="chica-claimed-pin" data-claimed="1">' +
      '<span class="chica-claimed-head">$5</span>' +
      '<span class="chica-claimed-tail"></span></div>'
    );
  }

  function ensureLayer(box) {
    var layer = document.getElementById(LAYER_ID);
    if (!layer) {
      layer = document.createElement("div");
      layer.id = LAYER_ID;
      layer.setAttribute("aria-hidden", "true");
    }
    if (box && layer.parentNode !== box) box.appendChild(layer);
    return layer;
  }

  function draw() {
    if (!onMapPath()) {
      var leftover = document.getElementById(LAYER_ID);
      if (leftover) leftover.remove();
      return;
    }
    var box = document.querySelector(".leaflet-container");
    if (!box || !pins.length) return;
    var layer = ensureLayer(box);
    layer.innerHTML = "";
    var placed = 0;
    pins.forEach(function (pin) {
      if (!pin || !Number.isFinite(Number(pin.lat)) || !Number.isFinite(Number(pin.lon))) return;
      var pt = toContainer(pin.lat, pin.lon, box);
      if (!Number.isFinite(pt.x) || !Number.isFinite(pt.y)) return;
      if (pt.x < -80 || pt.y < -80 || pt.x > box.clientWidth + 80 || pt.y > box.clientHeight + 80) {
        /* keep offscreen pins out of the way */
      }
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
        window.alert(
          (pin.preview ? "Preview — not a sale.\n" : "Claimed $5 pin\n") +
            (pin.title || "") +
            (pin.address ? "\n" + pin.address : ""),
        );
      });
      layer.appendChild(el);
      placed += 1;
    });
    if (!placed && pins[0]) {
      var fallback = document.createElement("button");
      fallback.type = "button";
      fallback.className = "chica-claimed-wrap is-preview";
      fallback.style.left = box.clientWidth / 2 + "px";
      fallback.style.top = box.clientHeight / 2 + "px";
      fallback.title = pins[0].title || "Claimed pin";
      fallback.innerHTML = pinHtml(pins[0]);
      layer.appendChild(fallback);
    }
  }

  function hook(box) {
    if (hooked || !box) return;
    hooked = true;
    box.addEventListener("transitionend", draw);
    window.addEventListener("resize", draw);
    var pane = box.querySelector(".leaflet-map-pane");
    if (pane && window.MutationObserver) {
      new MutationObserver(function () {
        draw();
      }).observe(pane, { attributes: true, attributeFilter: ["style", "class"], subtree: true });
    }
    setInterval(draw, 700);
  }

  function boot() {
    if (!onMapPath()) return false;
    var box = document.querySelector(".leaflet-container");
    if (!box) return false;
    hook(box);
    if (pins.length) {
      draw();
      return true;
    }
    fetch(SRC + "?v=2")
      .then(function (r) {
        return r.ok ? r.json() : { pins: [] };
      })
      .catch(function () {
        return { pins: [] };
      })
      .then(function (data) {
        pins = merge(data.pins || []);
        draw();
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
    hooked = false;
    setTimeout(wait, 60);
  });
})();
