/* Always-on KEY. Lives on <html>, not in React's body tree. One panel only. */
(function () {
  var p = location.pathname || "";
  if (!(/\/map\/?$/.test(p) || p.indexOf("/map/") !== -1 || /map\.html$/.test(p))) return;
  var STORE = "chicas-map-key-open-v3";
  var ICO = {
    garage: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><circle cx="8" cy="8" r="5.2" fill="#c513af" stroke="#f3eee4" stroke-width="1.3"/></svg>',
    estate: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><polygon points="8,1.8 14.4,8 8,14.2 1.6,8" fill="#f4f4f4" stroke="#121212" stroke-width="1.3"/></svg>',
    permit: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><polygon points="8,2.2 14.2,13.6 1.8,13.6" fill="#8a8a8a" stroke="#f3eee4" stroke-width="1.3"/></svg>',
    satellite: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><rect x="3" y="6.2" width="10" height="3.6" rx="1" fill="#7dd3fc"/><circle cx="8" cy="8" r="1.4" fill="#121212"/><path d="M3 5 L1.5 3.5 M13 5 L14.5 3.5 M3 11 L1.5 12.5 M13 11 L14.5 12.5" stroke="#7dd3fc" stroke-width="1.2"/></svg>',
    parking: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><circle cx="8" cy="8" r="6.2" fill="#38bdf8"/><text x="8" y="11.2" text-anchor="middle" font-size="8" font-weight="800" font-family="Inter,system-ui,sans-serif" fill="#121212">P</text></svg>',
    pantry: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><circle cx="8" cy="8" r="6.2" fill="#f5d000"/><path d="M4.5 7.2h7v1.4c0 2-1.6 3.6-3.5 3.6S4.5 10.6 4.5 8.6z" fill="#121212"/></svg>',
    schools: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><circle cx="8" cy="8" r="6.2" fill="#f0a500"/><path d="M3.8 8.2 L8 5.4 L12.2 8.2 V12 H3.8z" fill="#121212"/><rect x="7.2" y="9.2" width="1.6" height="2.8" fill="#f0a500"/></svg>',
    wifi: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><circle cx="8" cy="8" r="6.2" fill="#2dd4bf"/><path d="M5 8.2a4 4 0 0 1 6 0 M6.2 9.5a2.2 2.2 0 0 1 3.6 0" fill="none" stroke="#121212" stroke-width="1.3" stroke-linecap="round"/><circle cx="8" cy="11.2" r="0.9" fill="#121212"/></svg>',
    claimed: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><circle cx="8" cy="8" r="6.2" fill="#c513af"/><path d="M8 3.6 L9.2 6.6 H12.4 L9.8 8.5 L10.8 11.6 L8 9.8 L5.2 11.6 L6.2 8.5 L3.6 6.6 H6.8z" fill="#fff"/></svg>',
    resale: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><circle cx="8" cy="8" r="5.2" fill="#C47A4A" stroke="#f3eee4" stroke-width="1.3"/><path d="M4.8 9.2 Q8 6.8 11.2 9.2" fill="none" stroke="#f3eee4" stroke-width="1.4" stroke-linecap="round"/><path d="M5.5 10.4 Q8 8.4 10.5 10.4" fill="none" stroke="#f3eee4" stroke-width="1.1" stroke-linecap="round" opacity="0.85"/></svg>'
  };
  var ROWS = [
    ["garage", "Garage"],
    ["estate", "Estate"],
    ["permit", "Permit"],
    ["satellite", "Satellite"],
    ["parking", "Parking"],
    ["pantry", "Pantries"],
    ["schools", "Schools"],
    ["wifi", "Wi-Fi"],
    ["claimed", "Pack"],
    ["resale", "Resale Trail"]
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
      "#chica-force-key{display:block!important;visibility:visible!important;opacity:1!important;position:fixed!important;left:8px!important;bottom:calc(10px + env(safe-area-inset-bottom,0px))!important;z-index:2147483647!important;width:min(168px,calc(100vw - 132px));max-height:min(58dvh,420px);overflow:auto;background:rgba(26,23,20,.5);color:#f3eee4;border:1px solid rgba(243,238,228,.55);border-radius:12px;font:700 14px/1.15 Inter,system-ui,sans-serif;padding:6px 8px;pointer-events:auto!important;-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);text-shadow:0 1px 2px rgba(0,0,0,.85)}" +
      "#chica-force-key[data-collapsed=true]{width:auto!important;max-height:36px!important;overflow:hidden!important;padding:4px 8px!important}" +
      "#chica-force-key[data-collapsed=true] ul{display:none!important}" +
      "#chica-force-key .hd{display:flex;justify-content:space-between;align-items:center;margin:0;gap:8px}" +
      "#chica-force-key .hd b{font:800 11px/1 Inter,system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase}" +
      "#chica-force-key button.tog{border:0;background:transparent;color:#f3eee4;font:700 16px/1 Inter,system-ui,sans-serif;min-width:28px;min-height:28px;padding:0}" +
      "#chica-force-key ul{list-style:none;margin:4px 0 0;padding:0}" +
      "#chica-force-key li{display:flex;align-items:center;gap:6px;padding:3px 2px;border-radius:6px;cursor:pointer;min-height:26px}" +
      "#chica-force-key li:focus,#chica-force-key li:focus-visible,#chica-force-key button.tog:focus-visible,#chica-home-chip:focus-visible,#chica-hunt-bar input:focus-visible,#chica-hunt-bar button:focus-visible,#chica-listit-btn:focus-visible,.leaflet-control-zoom a:focus-visible{outline:3px solid #fffdf8;outline-offset:2px}" +
      "#chica-force-key .sym{width:16px;height:16px;flex:0 0 16px;display:inline-flex;align-items:center;justify-content:center}" +
      "#chica-force-key .sym svg{display:block}" +
      "#chica-key,aside[aria-label=Key]:not(#chica-force-key),aside[aria-label=key]:not(#chica-force-key),[data-chica-legend]{display:none!important;visibility:hidden!important;pointer-events:none!important}" +
      ".leaflet-control-layers{display:none!important}" +
      "#chica-hunt-bar,#chica-listit-btn,#chica-fs-btn,#chica-map-chrome{pointer-events:auto!important;z-index:2147483647!important}";
    (document.head || document.documentElement).appendChild(s);
  }
  function killDup() {
    var extra = document.getElementById("chica-key");
    if (extra) extra.style.setProperty("display", "none", "important");
  }
  function setOpen(el, open) {
    el.setAttribute("data-collapsed", open ? "false" : "true");
    var tog = el.querySelector(".tog");
    if (tog) {
      tog.textContent = open ? "\u2013" : "+";
      tog.setAttribute("aria-expanded", open ? "true" : "false");
      tog.setAttribute("aria-label", open ? "Collapse map key" : "Expand map key");
    }
    try { localStorage.setItem(STORE, open ? "1" : "0"); } catch (e) {}
  }
  function mount() {
    var el = document.getElementById("chica-force-key");
    if (el) {
      if (el.parentNode !== document.documentElement) document.documentElement.appendChild(el);
      var stale = el.querySelector('[data-chica-layer="intel"]');
      if (stale) stale.remove();
      killDup();
      return el;
    }
    el = document.createElement("aside");
    el.id = "chica-force-key";
    el.setAttribute("aria-label", "Map layers");
    var open = wantOpen();
    var lis = "";
    for (var i = 0; i < ROWS.length; i++) {
      var id = ROWS[i][0];
      lis += '<li data-chica-layer="' + id + '" role="switch" tabindex="0" aria-checked="false"><span class="sym" aria-hidden="true">' + (ICO[id] || "") + "</span>" + ROWS[i][1] + "</li>";
    }
    el.innerHTML = '<div class="hd"><b id="chica-key-title">Key</b><button type="button" class="tog" aria-controls="chica-key-list">+</button></div><ul id="chica-key-list" role="list">' + lis + "</ul>";
    document.documentElement.appendChild(el);
    setOpen(el, open);
    el.querySelector(".tog").addEventListener("click", function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      setOpen(el, el.getAttribute("data-collapsed") === "true");
    });
    el.addEventListener("click", function (ev) {
      var row = ev.target && ev.target.closest && ev.target.closest("[data-chica-layer]");
      if (!row) return;
      ev.preventDefault();
      ev.stopPropagation();
      var id = row.getAttribute("data-chica-layer");
      if (typeof window.__chicaToggleLayer === "function") window.__chicaToggleLayer(id);
      try { if (window.__chicaTrack) window.__chicaTrack("key_" + id); } catch (e) {}
    }, true);
    el.addEventListener("keydown", function (ev) {
      if (ev.key !== "Enter" && ev.key !== " ") return;
      var row = ev.target && ev.target.closest && ev.target.closest("[data-chica-layer]");
      if (!row) return;
      ev.preventDefault();
      var id = row.getAttribute("data-chica-layer");
      if (typeof window.__chicaToggleLayer === "function") window.__chicaToggleLayer(id);
    });
    killDup();
    return el;
  }
  function tick() { style(); mount(); }
  tick();
  setInterval(tick, 700);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", tick);
})();
