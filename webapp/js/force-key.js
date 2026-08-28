/* Always-on KEY. Lives on <html>, not in React's body tree. */
(function () {
  var p = location.pathname || "";
  if (!(/\/map\/?$/.test(p) || p.indexOf("/map/") !== -1 || /map\.html$/.test(p))) return;
  var BASE = "/Chicas-Map";
  var STORE = "chicas-map-key-open-v3";
  var ROWS = [
    ["garage", "Garage sale"],
    ["estate", "Estate sale"],
    ["permit", "City permit"],
    ["intel", "Intel"],
    ["satellite", "Satellite"],
    ["parking", "Parking"],
    ["pantry", "Pantries"],
    ["schools", "School zones"],
    ["wifi", "Wi-Fi"],
    ["claimed", "Chicas Pack"],
    ["listit", "Pin it \u00b7 $5"]
  ];
  function wantOpen() {
    try {
      var v = localStorage.getItem(STORE);
      if (v === "1") return true;
      if (v === "0") return false;
    } catch (e) {}
    return window.innerWidth >= 900;
  }
  function style() {
    if (document.getElementById("chica-force-key-css")) return;
    var s = document.createElement("style");
    s.id = "chica-force-key-css";
    s.textContent =
      "#chica-force-key{display:block!important;visibility:visible!important;opacity:1!important;position:fixed!important;left:10px!important;bottom:calc(12px + env(safe-area-inset-bottom,0px))!important;z-index:2147483647!important;width:min(220px,calc(100vw - 20px));max-height:min(52dvh,400px);overflow:auto;background:#1a1714f5;color:#f3eee4;border:1px solid #3a342e;border-radius:16px;font:500 12px/1.25 Inter,system-ui,sans-serif;padding:8px 10px 10px;pointer-events:auto!important}" +
      "#chica-force-key[data-collapsed=true]{width:auto!important;max-height:44px!important;overflow:hidden!important;padding:8px 10px!important}" +
      "#chica-force-key[data-collapsed=true] ul{display:none!important}" +
      "#chica-force-key .hd{display:flex;justify-content:space-between;align-items:center;margin:0;gap:16px}" +
      "#chica-force-key .hd b{font:800 11px/1 Inter,system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase}" +
      "#chica-force-key button.tog{border:0;background:transparent;color:#f3eee4;font:700 18px/1 Inter,system-ui,sans-serif;min-width:28px}" +
      "#chica-force-key ul{list-style:none;margin:8px 0 0;padding:0}" +
      "#chica-force-key li{display:flex;align-items:center;gap:8px;padding:6px 4px;border-radius:8px;cursor:pointer;min-height:32px}" +
      "aside[aria-label=Key],aside[aria-label=key],[data-chica-legend]{display:none!important}";
    (document.head || document.documentElement).appendChild(s);
  }
  function mount() {
    var el = document.getElementById("chica-force-key");
    if (el) {
      if (el.parentNode !== document.documentElement) document.documentElement.appendChild(el);
      return el;
    }
    el = document.createElement("aside");
    el.id = "chica-force-key";
    el.setAttribute("aria-label", "Map key");
    var open = wantOpen();
    el.setAttribute("data-collapsed", open ? "false" : "true");
    var lis = "";
    for (var i = 0; i < ROWS.length; i++) {
      lis += '<li data-chica-layer="' + ROWS[i][0] + '" role="switch">' + ROWS[i][1] + "</li>";
    }
    el.innerHTML = '<div class="hd"><b>Key</b><button type="button" class="tog" aria-label="Toggle key">' + (open ? "\u2013" : "+") + "</button></div><ul>" + lis + "</ul>";
    document.documentElement.appendChild(el);
    el.querySelector(".tog").addEventListener("click", function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      var next = el.getAttribute("data-collapsed") !== "true";
      el.setAttribute("data-collapsed", next ? "true" : "false");
      ev.currentTarget.textContent = next ? "+" : "\u2013";
      try { localStorage.setItem(STORE, next ? "0" : "1"); } catch (e) {}
    });
    el.addEventListener("click", function (ev) {
      var row = ev.target && ev.target.closest && ev.target.closest("[data-chica-layer]");
      if (!row) return;
      ev.preventDefault();
      ev.stopPropagation();
      var id = row.getAttribute("data-chica-layer");
      if (typeof window.__chicaToggleLayer === "function") window.__chicaToggleLayer(id);
      else if (id === "listit") location.href = BASE + "/claim";
    }, true);
    return el;
  }
  function tick() { style(); mount(); }
  tick();
  setInterval(tick, 700);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", tick);
})();
