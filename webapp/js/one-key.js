/* One KEY. Hide the upper-left mini legend. Rename Claimed $5 to Chicas Pack. */
(function () {
  var LOGO = "/Chicas-Map/favicon.svg";
  function hideEl(el) {
    if (!el || el.id === "chica-key" || (el.closest && el.closest("#chica-key"))) return;
    if (el.closest && (el.closest("#chica-map-chrome") || el.closest(".leaflet-control-zoom") || el.closest(".leaflet-control-attribution"))) return;
    el.style.setProperty("display", "none", "important");
    el.style.setProperty("visibility", "hidden", "important");
    el.setAttribute("data-chica-dup-key", "1");
  }
  function ensureCss() {
    if (document.getElementById("chica-one-key-style")) return;
    var s = document.createElement("style");
    s.id = "chica-one-key-style";
    s.textContent =
      ".leaflet-top.leaflet-left,.leaflet-control-layers,#chica-intel-btn{display:none!important;visibility:hidden!important}" +
      "aside[aria-label=Key]:not(#chica-key),aside[aria-label=key]:not(#chica-key){display:none!important}" +
      ".chica-pack-logo{width:28px;height:28px;object-fit:contain;display:block;filter:drop-shadow(0 4px 8px rgba(0,0,0,.45))}" +
      "html.chica-pack-off #chica-claimed-layer{display:none!important}";
    (document.head || document.documentElement).appendChild(s);
  }
  function retitlePack() {
    var row = document.querySelector('#chica-key [data-chica-layer="claimed"]');
    if (!row) return;
    var name = row.querySelector(".chica-key-name");
    if (name && name.textContent !== "Chicas Pack") name.textContent = "Chicas Pack";
    var old = row.querySelector(".chica-key-sym");
    if (old && old.tagName !== "IMG") {
      var img = document.createElement("img");
      img.className = "chica-key-sym";
      img.src = LOGO;
      img.width = 14;
      img.height = 14;
      img.alt = "";
      old.replaceWith(img);
    }
    var on = row.getAttribute("aria-checked") !== "false";
    document.documentElement.classList.toggle("chica-pack-off", !on);
  }
  function wipe() {
    ensureCss();
    var a = document.getElementById("chica-intel-btn");
    if (a) a.remove();
    var tops = document.querySelectorAll(".leaflet-top.leaflet-left, .leaflet-control-layers");
    for (var i = 0; i < tops.length; i++) hideEl(tops[i]);
    var keys = document.querySelectorAll('aside[aria-label="Key"], aside[aria-label="key"], [data-chica-legend]');
    for (var j = 0; j < keys.length; j++) hideEl(keys[j]);
    var nodes = document.querySelectorAll("section, aside, div");
    for (var k = 0; k < nodes.length; k++) {
      var el = nodes[k];
      if (el.id === "chica-key" || (el.closest && el.closest("#chica-key"))) continue;
      var r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) continue;
      if (r.top > 170 || r.left > 180) continue;
      var t = (el.textContent || "").replace(/\s+/g, " ").trim();
      if (/^(Key|KEY)$/.test(t) || (/Garage/.test(t) && /Estate/.test(t) && r.width < 280 && r.height < 320 && r.left < 90 && r.top < 150)) {
        hideEl(el);
      }
    }
    retitlePack();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wipe);
  else wipe();
  setInterval(wipe, 600);
})();
