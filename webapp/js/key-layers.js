/* Chicas Map — KEY panel is the layer switcher. */
(function () {
  if (!/\/map\/?$/.test(location.pathname || "") && (location.pathname || "").indexOf("/map/") === -1) return;

  var state = { garage: true, estate: true, permit: true, parking: false, pantry: false, schools: false, wifi: false };

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
    if (html.indexOf("polygon points=\"8,1.6") !== -1) return "boost";
    if (html.indexOf("polygon points=\"8,2.2") !== -1) return "estate";
    if (html.indexOf("polygon points=\"8,2.4") !== -1) return "permit";
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
  }

  function wireRow(row, id, kind) {
    if (row.getAttribute("data-chica-layer") === id) return;
    row.setAttribute("data-chica-layer", id);
    row.setAttribute("role", "button");
    row.tabIndex = 0;
    styleRow(row, state[id]);
    function tog(ev) {
      ev.preventDefault();
      ev.stopPropagation();
      state[id] = !state[id];
      styleRow(row, state[id]);
      if (kind === "sale") applyPins();
      else clickOverlay(id);
    }
    row.addEventListener("click", tog, true);
    row.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") tog(e);
    });
  }

  function ensureOverlays(p) {
    if (p.querySelector("[data-chica-overlays]")) return;
    var body = p.lastElementChild;
    if (!body) return;
    var wrap = document.createElement("div");
    wrap.setAttribute("data-chica-overlays", "1");
    wrap.style.marginTop = "10px";
    var title = document.createElement("p");
    title.style.cssText = "font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;opacity:.7;margin:0 0 6px";
    title.textContent = "Layers";
    wrap.appendChild(title);
    var rows = [["parking", "Parking"], ["pantry", "Pantries"], ["schools", "School zones"], ["wifi", "Wi-Fi"]];
    var ul = document.createElement("ul");
    ul.style.cssText = "list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px";
    for (var i = 0; i < rows.length; i++) {
      var li = document.createElement("li");
      li.textContent = rows[i][1];
      li.style.cssText = "font-size:12px;font-weight:500;padding:2px 0";
      ul.appendChild(li);
      wireRow(li, rows[i][0], "overlay");
    }
    wrap.appendChild(ul);
    body.appendChild(wrap);
  }

  function hideDup() {
    var labels = /^(All|Garage|Estate|Permit|Parking|Pantries|School zones|Wi-Fi)$/i;
    var btns = document.querySelectorAll("button[aria-pressed]");
    for (var i = 0; i < btns.length; i++) {
      var t = (btns[i].textContent || "").replace(/\s+/g, " ").trim();
      if (!labels.test(t) || btns[i].closest("aside")) continue;
      btns[i].classList.add("chica-dup-chip");
    }
  }

  function wire() {
    var p = panel();
    if (!p) return;
    var hint = p.querySelector("p");
    if (hint && /Arrow keys/.test(hint.textContent || "")) {
      hint.textContent = "Tap a row to turn that layer on or off.";
    }
    var items = p.querySelectorAll("li");
    for (var i = 0; i < items.length; i++) {
      var t = (items[i].textContent || "").toLowerCase();
      if (/garage/.test(t)) wireRow(items[i], "garage", "sale");
      else if (/estate/.test(t)) wireRow(items[i], "estate", "sale");
      else if (/permit/.test(t)) wireRow(items[i], "permit", "sale");
    }
    ensureOverlays(p);
    hideDup();
    applyPins();
  }

  function boot() {
    wire();
    setInterval(wire, 900);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
