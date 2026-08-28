/* Document-level KEY clicks. React owns the panel; we steal the taps. */
(function () {
  function onMapPath() {
    var p = location.pathname || "";
    return /\/map\/?$/.test(p) || p.indexOf("/map/") !== -1 || /map\.html$/.test(p);
  }
  if (!onMapPath()) return;
  function labelToId(text) {
    var t = String(text || "").toLowerCase().replace(/\s+/g, " ");
    if (t.indexOf("pin it") !== -1) return "listit";
    if (t.indexOf("chicas pack") !== -1) return "claimed";
    if (t.indexOf("garage") !== -1) return "garage";
    if (t.indexOf("estate") !== -1) return "estate";
    if (t.indexOf("permit") !== -1) return "permit";
    if (t.indexOf("intel") !== -1) return "intel";
    if (t.indexOf("satellite") !== -1) return "satellite";
    if (t.indexOf("parking") !== -1) return "parking";
    if (t.indexOf("pantr") !== -1) return "pantry";
    if (t.indexOf("school") !== -1) return "schools";
    if (t.indexOf("wi-fi") !== -1 || t.indexOf("wifi") !== -1) return "wifi";
    if (t.indexOf("emergency") !== -1) return "emergency";
    return "";
  }
  function looksLikeKey(el) {
    if (!el) return false;
    if (el.id === "chica-key") return true;
    var t = el.innerText || "";
    return /Garage sale/i.test(t) && /Satellite/i.test(t);
  }
  function hijack() {
    var nodes = document.querySelectorAll("aside, #chica-key, [aria-label='Key'], [aria-label='key']");
    var host = null;
    for (var i = 0; i < nodes.length; i++) {
      if (!looksLikeKey(nodes[i])) continue;
      host = nodes[i];
      try { host.id = "chica-key"; } catch (e) {}
      host.style.setProperty("pointer-events", "auto", "important");
      host.style.setProperty("z-index", "2147483646", "important");
      break;
    }
    if (!host) return null;
    var rows = host.querySelectorAll("li, button, [role='switch'], label");
    for (var r = 0; r < rows.length; r++) {
      var id = rows[r].getAttribute("data-chica-layer") || labelToId(rows[r].textContent);
      if (id) rows[r].setAttribute("data-chica-layer", id);
    }
    return host;
  }
  document.addEventListener("click", function (ev) {
    var t = ev.target;
    if (!t || !t.closest) return;
    var host = t.closest("#chica-key, aside");
    if (!looksLikeKey(host)) return;
    if (t.closest(".chica-key-toggle")) return;
    var row = t.closest("[data-chica-layer], li, button, [role='switch'], label");
    var id = (row && row.getAttribute && row.getAttribute("data-chica-layer")) || "";
    if (!id && row) id = labelToId(row.textContent);
    if (!id) id = labelToId(t.textContent);
    if (!id) return;
    ev.preventDefault();
    ev.stopPropagation();
    if (ev.stopImmediatePropagation) ev.stopImmediatePropagation();
    if (typeof window.__chicaToggleLayer === "function") window.__chicaToggleLayer(id);
    else if (id === "listit") location.href = "/Chicas-Map/claim";
  }, true);
  hijack();
  setInterval(hijack, 800);
})();
