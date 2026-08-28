/* Always-on KEY. Lives on <html>, not in React's body tree. */
(function () {
  var p = location.pathname || "";
  if (!(/\/map\/?$/.test(p) || p.indexOf("/map/") !== -1 || /map\.html$/.test(p))) return;
  var BASE = "/Chicas-Map";
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
  function style() {
    if (document.getElementById("chica-force-key-css")) return;
    var s = document.createElement("style");
    s.id = "chica-force-key-css";
    s.textContent =
      "#chica-force-key{display:block!important;visibility:visible!important;opacity:1!important;position:fixed!important;left:10px!important;bottom:calc(12px + env(safe-area-inset-bottom,0px))!important;z-index:2147483647!important;width:min(220px,calc(100vw - 20px));max-height:min(56dvh,420px);overflow:auto;background:#1a1714f5;color:#f3eee4;border:1px solid #3a342e;border-radius:16px;font:500 12px/1.25 Inter,system-ui,sans-serif;padding:8px 10px 10px;pointer-events:auto!important}" +
      "#chica-force-key[data-collapsed=true] ul{display:none}" +
      "#chica-force-key .hd{display:flex;justify-content:space-between;align-items:center;margin:0 0 6px}" +
      "#chica-force-key .hd b{font:800 11px/1 Inter,system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase}" +
      "#chica-force-key button.tog{border:0;background:transparent;color:#f3eee4;font:700 16px/1 Inter,system-ui,sans-serif}" +
      "#chica-force-key ul{list-style:none;margin:0;padding:0}" +
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
    var open = true;
    try { if (localStorage.getItem("chicas-map-key-open-v2") === "0") open = false; } catch (e) {}
    el.setAttribute("data-collapsed", open ? "false" : "true");
    var lis = "";
    for (var i = 0; i < ROWS.length; i++) {
      lis += '<li data-chica-layer="' + ROWS[i][0] + '" role="switch">' + ROWS[i][1] + "</li>";
    }
    el.innerHTML = '<div class="hd"><b>Key</b><button type="button" class="tog">' + (open ? "\u2013" : "+") + "</button></div><ul>" + lis + "</ul>";
    document.documentElement.appendChild(el);
    el.querySelector(".tog").addEventListener("click", function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      var next = el.getAttribute("data-collapsed") !== "true";
      el.setAttribute("data-collapsed", next ? "true" : "false");
      ev.currentTarget.textContent = next ? "+" : "\u2013";
      try { localStorage.setItem("chicas-map-key-open-v2", next ? "0" : "1"); } catch (e) {}
    });
    el.addEventListener("click", function (ev) {
      var row = ev.target && ev.target.closest && ev.target.closest("[data-chica-layer]");
      if (!row) return;
      ev.preventDefault();
      ev.stopPropagation();
      var id = row.getAttribute("data-chica-layer");
      if (typeof window.__chicaToggleLayer === "function") window.__chicaToggleLayer(id);
      else {
        try { window.dispatchEvent(new CustomEvent("chica-key-tap", { detail: id })); } catch (e) {}
        var fake = document.querySelector("#chica-key [data-chica-layer='" + id + "']");
        if (fake && fake !== row) {
          /* key-clicks listens on aside#chica-key too */
        }
        if (id === "listit") location.href = BASE + "/claim";
        if (id === "satellite") {
          document.documentElement.classList.toggle("chica-sat-on");
          try { window.dispatchEvent(new Event("chica-sat")); } catch (e2) {}
        }
      }
    }, true);
    return el;
  }
  function tick() { style(); mount(); }
  tick();
  setInterval(tick, 700);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", tick);
})();
