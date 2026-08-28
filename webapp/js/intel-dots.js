/* Stamp magenta Intel dots on sale pins. KEY Intel row stays the switch. */
(function () {
  var p = location.pathname || "";
  if (!(/\/map\/?$/.test(p) || p.indexOf("/map/") !== -1 || /map\.html$/.test(p))) return;

  function css() {
    if (document.getElementById("chica-intel-dots-css")) return;
    var s = document.createElement("style");
    s.id = "chica-intel-dots-css";
    s.textContent =
      ".chica-intel-badge{position:absolute;right:-5px;top:-6px;width:14px;height:14px;border-radius:99px;background:#c513af;border:2px solid #fffdf8;box-shadow:0 0 0 1px #121212;display:none;pointer-events:none;z-index:2}" +
      "html.chica-intel-on .chica-intel-badge{display:block!important}" +
      "html.chica-intel-off .chica-intel-badge{display:none!important}" +
      ".leaflet-marker-icon.chica-pin{overflow:visible!important}";
    (document.head || document.documentElement).appendChild(s);
  }

  function salePin(el) {
    if (!el || !el.classList) return false;
    if (el.querySelector && el.querySelector(".chica-overlay-mark")) return false;
    if ((el.getAttribute("title") || "") === "You") return false;
    if (el.classList.contains("chica-overlay-pin")) return false;
    return el.classList.contains("chica-pin") ||
      el.classList.contains("chica-type-garage") ||
      el.classList.contains("chica-type-estate") ||
      el.classList.contains("chica-type-permit") ||
      !!el.querySelector(".chica-sym");
  }

  function stamp() {
    css();
    var pins = document.querySelectorAll(".leaflet-marker-icon");
    var n = 0;
    for (var i = 0; i < pins.length; i++) {
      var el = pins[i];
      if (!salePin(el)) continue;
      if (el.querySelector(".chica-intel-badge")) { n += 1; continue; }
      var mark = document.createElement("span");
      mark.className = "chica-intel-badge";
      mark.setAttribute("aria-hidden", "true");
      if (getComputedStyle(el).position === "static") el.style.position = "relative";
      el.style.overflow = "visible";
      el.appendChild(mark);
      n += 1;
    }
    return n;
  }

  function setIntelOn(on) {
    document.documentElement.classList.toggle("chica-intel-on", !!on);
    document.documentElement.classList.toggle("chica-intel-off", !on);
    var rows = document.querySelectorAll('[data-chica-layer="intel"]');
    for (var i = 0; i < rows.length; i++) {
      rows[i].style.opacity = on ? "1" : "0.45";
      rows[i].setAttribute("aria-checked", on ? "true" : "false");
    }
    if (on) stamp();
  }

  window.__chicaStampIntel = function () {
    var on = !document.documentElement.classList.contains("chica-intel-off");
    setIntelOn(on);
    return stamp();
  };

  function boot() {
    css();
    if (!document.documentElement.classList.contains("chica-intel-off")) setIntelOn(true);
    else setIntelOn(false);
  }

  boot();
  window.addEventListener("chica-intel", boot);
  var k = 0;
  var id = setInterval(function () {
    stamp();
    k += 1;
    if (k > 40) clearInterval(id);
  }, 250);
})();
