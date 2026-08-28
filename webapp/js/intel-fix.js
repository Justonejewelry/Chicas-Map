/* Last-mile Intel: cream card, always under the hunt bar. */
(function () {
  function paint(el) {
    if (!el) return;
    el.style.setProperty("display", "block", "important");
    el.style.setProperty("position", "fixed", "important");
    el.style.setProperty("left", "12px", "important");
    el.style.setProperty("top", "62px", "important");
    el.style.setProperty("right", "auto", "important");
    el.style.setProperty("z-index", "2147483646", "important");
    el.style.setProperty("width", "min(300px, calc(100vw - 24px))", "important");
    el.style.setProperty("max-height", "min(70dvh, 460px)", "important");
    el.style.setProperty("overflow", "auto", "important");
    el.style.setProperty("background", "#fffdf8", "important");
    el.style.setProperty("color", "#1a1714", "important");
    el.style.setProperty("border", "2px solid #c513af", "important");
    el.style.setProperty("border-radius", "14px", "important");
    el.style.setProperty("padding", "14px", "important");
    el.style.setProperty("box-shadow", "0 16px 40px rgba(18,18,18,.45)", "important");
    el.style.setProperty("font", "500 13px/1.35 Inter, system-ui, sans-serif", "important");
  }
  function watch() {
    var el = document.getElementById("chica-intel-card");
    if (el && el.style.display !== "none" && !el.hidden) paint(el);
    var pops = document.querySelectorAll(".leaflet-popup-content-wrapper");
    for (var i = 0; i < pops.length; i++) {
      pops[i].style.background = "#fffdf8";
      pops[i].style.color = "#1a1714";
    }
  }
  var orig = window.__chicaOpenIntel;
  window.__chicaOpenIntel = function (lat, lon, title, anchor) {
    var ok = typeof orig === "function" ? orig(lat, lon, title, anchor) : false;
    setTimeout(watch, 0);
    setTimeout(watch, 50);
    return ok;
  };
  document.addEventListener("click", function () { setTimeout(watch, 30); }, true);
  setInterval(watch, 400);
})();
