/* Chicas Map — KEY is one layer list. Symbol sits next to every name.
   Intel is a layer, not a separate hunt. Intel never defaults on.
*/
(function () {
  if (!/\/map\/?$/.test(location.pathname || "") && (location.pathname || "").indexOf("/map/") === -1) return;

  var INTEL_CFG = "/Chicas-Map/data/sale-intel.json";
  var INTEL_ICON = "/Chicas-Map/images/intel-brain.svg?v=2";
  var SAT_STORE = "chicas-map-layer-sat";
  var intelRadius = 200;

  function readSat() {
    try {
      return localStorage.getItem(SAT_STORE) === "1";
    } catch (e) {
      return false;
    }
  }

  function writeSat(on) {
    try {
      localStorage.setItem(SAT_STORE, on ? "1" : "0");
    } catch (e) {}
  }

  var state = {
    garage: true,
    estate: true,
    permit: true,
    intel: false,
    satellite: readSat(),
    parking: false,
    pantry: false,
    schools: false,
    wifi: false,
  };

  var LAYERS = [
    { id: "garage", kind: "sale", re: /garage/, label: "Garage sale" },
    { id: "estate", kind: "sale", re: /estate/, label: "Estate sale" },
    { id: "permit", kind: "sale", re: /permit/, label: "City permit" },
    { id: "intel", kind: "intel", re: /intel|inteligencia/, label: "Intel" },
    { id: "satellite", kind: "basemap", re: /satellite|sat[e\u00e9]lite/, label: "Satellite" },
    { id: "parking", kind: "overlay", re: /parking|estacionamiento/, label: "Parking" },
    { id: "pantry", kind: "overlay", re: /pantr|despensa/, label: "Pantries" },
    { id: "schools", kind: "overlay", re: /school|escolar/, label: "School zones" },
    { id: "wifi", kind: "overlay", re: /wi-?fi/, label: "Wi-Fi" },
  ];

  function svg(inner) {
    return (
      '<svg class="chica-key-sym" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">' +
      inner +
      "</svg>"
    );
  }

  function symbolHtml(id) {
    if (id === "garage") {
      return svg('<circle cx="8" cy="8" r="5.2" fill="#c513af" stroke="#121212" stroke-width="1.4"/>');
    }
    if (id === "estate") {
      return svg('<polygon points="8,1.8 14.4,8 8,14.2 1.6,8" fill="#f4f4f4" stroke="#121212" stroke-width="1.4"/>');
    }
    if (id === "permit") {
      return svg('<polygon points="8,2.2 14.2,13.6 1.8,13.6" fill="#8a8a8a" stroke="#121212" stroke-width="1.4"/>');
    }
    if (id === "intel") {
      return (
        '<img class="chica-key-sym" src="' +
        INTEL_ICON +
        '" width="14" height="14" alt="" aria-hidden="true" />'
      );
    }
    if (id === "satellite") {
      return svg(
        '<circle cx="8" cy="8" r="6" fill="#0b3d62" stroke="#121212" stroke-width="1.2"/>' +
          '<circle cx="6.2" cy="7" r="1.6" fill="#7dd3fc"/>' +
          '<path d="M3.4 11.2 C5.2 9.4 10.6 9.6 12.6 11.4" fill="#22c55e"/>'
      );
    }
    if (id === "parking") {
      return svg(
        '<rect x="2.2" y="2.2" width="11.6" height="11.6" rx="2" fill="#38bdf8" stroke="#0369a1" stroke-width="1.2"/>' +
          '<text x="8" y="11.2" text-anchor="middle" font-size="8.2" font-weight="800" font-family="Inter,system-ui,sans-serif" fill="#082f49">P</text>'
      );
    }
    if (id === "pantry") {
      return svg(
        '<ellipse cx="8" cy="5.2" rx="4.2" ry="1.5" fill="#f5d000" stroke="#5c4a00" stroke-width="1.1"/>' +
          '<path d="M3.8 5.2 V12.2 C3.8 13.6 11.8 13.6 12.2 12.2 V5.2" fill="#f5d000" stroke="#5c4a00" stroke-width="1.1"/>'
      );
    }
    if (id === "schools") {
      return svg(
        '<circle cx="8" cy="8" r="6.1" fill="none" stroke="#f0a500" stroke-width="1.6"/>' +
          '<path d="M3.4 9.2 L8 4.6 L12.6 9.2 V12.4 H3.4Z" fill="#f0a500" stroke="#7a5200" stroke-width="1"/>'
      );
    }
    if (id === "wifi") {
      return svg(
        '<path d="M3.2 7.2 A6.2 6.2 0 0 1 12.8 7.2" fill="none" stroke="#2dd4bf" stroke-width="1.5" stroke-linecap="round"/>' +
          '<path d="M5.2 9.4 A3.6 3.6 0 0 1 10.8 9.4" fill="none" stroke="#2dd4bf" stroke-width="1.5" stroke-linecap="round"/>' +
          '<circle cx="8" cy="12.1" r="1.15" fill="#2dd4bf"/>'
      );
    }
    return "";
  }

  function panel() {
    var asides = document.querySelectorAll("aside");
    for (var i = 0; i < asides.length; i++) {
      var a = asides[i];
      var lab = (a.getAttribute("aria-label") || "").toLowerCase();
      if (lab === "key") return a;
      if ((a.textContent || "").trim().toUpperCase().indexOf("KEY") === 0) return a;
    }
    return null;
  }

  function chip(re) {
    var btns = document.querySelectorAll("button");
    for (var i = 0; i < btns.length; i++) {
      var t = (btns[i].textContent || "").replace(/\s+/g, " ").trim();
      if (re.test(t) && !btns[i].closest("aside")) return btns[i];
    }
    return null;
  }

  function pinKind(el) {
    var html = el.innerHTML || "";
    if (html.indexOf('polygon points="8,1.6') !== -1) return "boost";
    if (html.indexOf('polygon points="8,2.2') !== -1) return "estate";
    if (html.indexOf('polygon points="8,2.4') !== -1) return "permit";
    if (html.indexOf('fill="#f6f6f6"') !== -1) return "you";
    if (html.indexOf("circle cx") !== -1) return "garage";
    return "";
  }

  function applyPins() {
    var pins = document.querySelectorAll(".chica-sym");
    for (var i = 0; i < pins.length; i++) {
      var kind = pinKind(pins[i]);
      var on = true;
      if (kind === "garage" || kind === "estate" || kind === "permit") on = state[kind];
      else if (kind === "boost") on = state.garage || state.estate || state.permit;
      var wrap = pins[i].closest(".leaflet-marker-icon") || pins[i];
      wrap.style.display = on ? "" : "none";
    }
  }

  function ensureIntelStyle() {
    if (document.getElementById("chica-intel-layer-style")) return;
    var s = document.createElement("style");
    s.id = "chica-intel-layer-style";
    s.textContent =
      ".chica-intel-badge{position:absolute;right:-5px;top:-6px;width:14px;height:14px;border-radius:999px;" +
      "background:#c513af;box-shadow:0 0 0 2px #fffdf8;display:none;z-index:3;pointer-events:none}" +
      ".chica-intel-badge img{width:12px;height:12px;display:block;margin:1px auto}" +
      "html.chica-intel-on .leaflet-marker-icon .chica-intel-badge," +
      "html.chica-intel-on .chica-sym .chica-intel-badge{display:block}" +
      "#chica-intel-btn[aria-pressed=\"true\"]{filter:brightness(1.08)}" +
      "#chica-intel-btn[aria-pressed=\"false\"]{opacity:.55}";
    (document.head || document.documentElement).appendChild(s);
  }

  function stampBadges() {
    if (!state.intel) return;
    var pins = document.querySelectorAll(".leaflet-marker-icon, .chica-sym");
    for (var i = 0; i < pins.length; i++) {
      var host = pins[i];
      if (host.querySelector(".chica-intel-badge")) continue;
      if ((host.getAttribute("title") || "") === "You") continue;
      var mark = document.createElement("span");
      mark.className = "chica-intel-badge";
      mark.innerHTML = '<img src="' + INTEL_ICON + '" alt="" width="12" height="12" />';
      if (getComputedStyle(host).position === "static") host.style.position = "relative";
      host.appendChild(mark);
    }
  }

  function syncIntelChrome() {
    var btn = document.getElementById("chica-intel-btn");
    if (!btn) return;
    btn.setAttribute("aria-pressed", state.intel ? "true" : "false");
    btn.setAttribute("aria-label", state.intel ? "Hide Intel layer" : "Show Intel layer");
    btn.title = state.intel ? "Intel layer on" : "Intel layer off";
    if (!btn.getAttribute("data-chica-intel-layer")) {
      btn.setAttribute("data-chica-intel-layer", "1");
      btn.addEventListener(
        "click",
        function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          setIntel(!state.intel);
        },
        true,
      );
    }
  }

  function applyIntel() {
    ensureIntelStyle();
    document.documentElement.classList.toggle("chica-intel-on", state.intel);
    if (state.intel) stampBadges();
    else {
      var badges = document.querySelectorAll(".chica-intel-badge");
      for (var i = 0; i < badges.length; i++) badges[i].style.display = "none";
    }
    syncIntelChrome();
    var row = document.querySelector('[data-chica-layer="intel"]');
    if (row) styleRow(row, state.intel);
  }

  function setIntel(on) {
    state.intel = !!on;
    applyIntel();
  }

  function applySat() {
    document.documentElement.classList.toggle("chica-sat-on", state.satellite);
    writeSat(state.satellite);
    try {
      window.dispatchEvent(new Event("chica-sat"));
    } catch (e) {}
    var row = document.querySelector('[data-chica-layer="satellite"]');
    if (row) styleRow(row, state.satellite);
  }

  function clickOverlay(id) {
    var map = {
      parking: /^(Parking|Estacionamiento)/i,
      pantry: /^(Pantries|Despensas)/i,
      schools: /^(School zones|Zonas escolares)/i,
      wifi: /^(Wi-Fi|Wifi)/i,
    };
    var btn = chip(map[id]);
    if (btn) btn.click();
  }

  function styleRow(row, on) {
    row.setAttribute("aria-pressed", on ? "true" : "false");
    row.style.opacity = on ? "1" : "0.38";
    row.style.cursor = "pointer";
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.gap = "8px";
    row.style.listStyle = "none";
  }

  function decorateRow(row, spec) {
    if (row.getAttribute("data-chica-sym") === spec.id) return;
    row.setAttribute("data-chica-sym", spec.id);
    var label = "";
    var nodes = row.childNodes;
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].nodeType === 3) label += nodes[i].textContent;
    }
    label = (label || row.textContent || spec.label).replace(/\s+/g, " ").trim();
    row.innerHTML =
      symbolHtml(spec.id) +
      '<span class="chica-key-name">' +
      label.replace(/</g, "") +
      "</span>";
    var name = row.querySelector(".chica-key-name");
    if (name) {
      name.style.cssText = "font-size:12px;font-weight:500;line-height:1.2";
    }
    var mark = row.querySelector(".chica-key-sym");
    if (mark) {
      mark.style.cssText = "flex:0 0 14px;display:block;width:14px;height:14px;object-fit:contain";
    }
  }

  function wireRow(row, spec) {
    decorateRow(row, spec);
    if (row.getAttribute("data-chica-layer") === spec.id) {
      styleRow(row, state[spec.id]);
      return;
    }
    row.setAttribute("data-chica-layer", spec.id);
    row.setAttribute("role", "button");
    row.tabIndex = 0;
    styleRow(row, state[spec.id]);
    function tog(ev) {
      ev.preventDefault();
      ev.stopPropagation();
      state[spec.id] = !state[spec.id];
      styleRow(row, state[spec.id]);
      if (spec.kind === "sale") applyPins();
      else if (spec.kind === "intel") applyIntel();
      else if (spec.kind === "basemap") applySat();
      else clickOverlay(spec.id);
    }
    row.addEventListener("click", tog, true);
    row.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") tog(e);
    });
  }

  function hideHeadings(p) {
    var nodes = p.querySelectorAll("p,h2,h3,h4,span,div,strong");
    for (var i = 0; i < nodes.length; i++) {
      var t = (nodes[i].textContent || "").replace(/\s+/g, " ").trim();
      if (/^(SALES|LAYERS|VENTAS|CAPAS)$/i.test(t)) nodes[i].style.display = "none";
      if (/Arrow keys|Tap a row|Tap a layer|walk the pins|turn it on or off/i.test(t)) {
        nodes[i].style.display = "none";
      }
    }
  }

  function ensureOverlays(p) {
    var body = p.lastElementChild;
    if (!body) return;
    var wrap = p.querySelector("[data-chica-overlays]");
    if (!wrap) {
      wrap = document.createElement("ul");
      wrap.setAttribute("data-chica-overlays", "1");
      wrap.style.cssText = "list-style:none;margin:8px 0 0;padding:0;display:flex;flex-direction:column;gap:6px";
      body.appendChild(wrap);
    }
    var extras = ["intel", "satellite", "parking", "pantry", "schools", "wifi"];
    for (var i = 0; i < extras.length; i++) {
      var id = extras[i];
      if (p.querySelector('[data-chica-layer="' + id + '"]')) continue;
      var spec = null;
      for (var j = 0; j < LAYERS.length; j++) if (LAYERS[j].id === id) spec = LAYERS[j];
      if (!spec) continue;
      var li = document.createElement("li");
      li.textContent = spec.label;
      wrap.appendChild(li);
      wireRow(li, spec);
    }
  }

  function hideDup() {
    var labels = /^(All|Garage|Estate|Permit|Intel|Satellite|Parking|Pantries|School zones|Wi-Fi)$/i;
    var btns = document.querySelectorAll("button[aria-pressed]");
    for (var i = 0; i < btns.length; i++) {
      var t = (btns[i].textContent || "").replace(/\s+/g, " ").trim();
      if (!labels.test(t) || btns[i].closest("aside")) continue;
      if (btns[i].id === "chica-intel-btn" || btns[i].id === "chica-fs-btn") continue;
      btns[i].classList.add("chica-dup-chip");
    }
  }

  function wire() {
    var p = panel();
    if (!p) return;
    hideHeadings(p);
    var items = p.querySelectorAll("li");
    for (var i = 0; i < items.length; i++) {
      var t = (items[i].textContent || "").toLowerCase();
      for (var j = 0; j < LAYERS.length; j++) {
        if (LAYERS[j].re.test(t)) {
          wireRow(items[i], LAYERS[j]);
          break;
        }
      }
    }
    ensureOverlays(p);
    hideDup();
    applyPins();
    applyIntel();
    applySat();
  }

  function loadIntelCfg() {
    fetch(INTEL_CFG, { cache: "no-store" })
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (cfg) {
        if (!cfg) return;
        var n = Number(cfg.radius_m);
        if (n > 0) intelRadius = n;
      })
      .catch(function () {});
  }

  function boot() {
    loadIntelCfg();
    wire();
    setInterval(wire, 900);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
