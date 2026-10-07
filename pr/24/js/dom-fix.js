/* Map container size + stacking. Leaflet tiles go black when getSize() is stale. */
(function () {
  var p = location.pathname || "";
  if (!(/\/map\/?$/.test(p) || p.indexOf("/map/") !== -1 || /map\.html$/.test(p))) return;

  try {
    if (navigator.serviceWorker) {
      navigator.serviceWorker.getRegistrations().then(function (regs) {
        regs.forEach(function (r) { r.unregister(); });
      });
    }
  } catch (e) {}

  document.documentElement.classList.remove("chica-fs-on");

  function size() {
    var host = document.getElementById("chica-live-map") || document.querySelector(".leaflet-container");
    if (!host) return;
    var w = window.innerWidth || document.documentElement.clientWidth;
    var h = window.innerHeight || document.documentElement.clientHeight;
    host.style.setProperty("position", "fixed", "important");
    host.style.setProperty("inset", "0", "important");
    host.style.setProperty("width", w + "px", "important");
    host.style.setProperty("height", h + "px", "important");
    host.style.setProperty("max-width", "100vw", "important");
    host.style.setProperty("max-height", "100dvh", "important");
    host.style.setProperty("z-index", "1", "important");
    var box = host.querySelector(".leaflet-container") || host;
    box.style.setProperty("width", w + "px", "important");
    box.style.setProperty("height", h + "px", "important");
    var map = window.__chicaLeaflet || host.__chicaMap;
    if (map && map.invalidateSize) {
      try { map.invalidateSize({ animate: false, pan: false }); } catch (err) {}
    }
  }

  function parkCard() {
    var el = document.getElementById("chica-intel-card");
    if (el && el.parentNode !== document.documentElement) document.documentElement.appendChild(el);
  }

  size();
  parkCard();
  window.addEventListener("resize", size);
  window.addEventListener("orientationchange", size);
  var n = 0;
  var id = setInterval(function () {
    size();
    parkCard();
    n += 1;
    if (n > 40) clearInterval(id);
  }, 200);
})();
