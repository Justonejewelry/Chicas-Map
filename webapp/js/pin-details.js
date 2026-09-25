/* Pin details. Directions + Claim. Driveway notes are off the sale card. */
(function () {
  var p = location.pathname || "";
  if (!(/\/map\/?$/.test(p) || p.indexOf("/map/") !== -1 || /map\.html$/.test(p))) return;
  var BASE = "/Chicas-Map";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      if (c === "&") return "&" + "amp;";
      if (c === "<") return "&" + "lt;";
      if (c === ">") return "&" + "gt;";
      if (c === '"') return "&" + "quot;";
      return "&#39;";
    });
  }
  function ll(lat, lon) {
    return Number(lat).toFixed(6) + "," + Number(lon).toFixed(6);
  }
  function claimHref(sale) {
    var q = [];
    if (sale.title) q.push("title=" + encodeURIComponent(sale.title));
    if (sale.address) q.push("address=" + encodeURIComponent(sale.address));
    if (isFinite(Number(sale.lat))) q.push("lat=" + encodeURIComponent(String(sale.lat)));
    if (isFinite(Number(sale.lon))) q.push("lon=" + encodeURIComponent(String(sale.lon)));
    return BASE + "/claim/" + (q.length ? "?" + q.join("&") : "");
  }
  function actions(lat, lon) {
    var pair = ll(lat, lon);
    var enc = encodeURIComponent(pair);
    return (
      '<div class="chica-actions" role="group" aria-label="Directions and Street View">' +
      '<a class="go-nav" target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/dir/?api=1&destination=' + enc + '">Google Maps</a>' +
      '<a class="go-nav" target="_blank" rel="noopener noreferrer" href="https://maps.apple.com/?daddr=' + enc + '&dirflg=d">Apple Maps</a>' +
      '<a class="go-nav" target="_blank" rel="noopener noreferrer" href="https://waze.com/ul?ll=' + enc + '&navigate=yes">Waze</a>' +
      '<a class="go-nav go-street" target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=' + enc + '">Street View</a>' +
      "</div>"
    );
  }
  function css() {
    if (document.getElementById("chica-pin-details-css")) return;
    var s = document.createElement("style");
    s.id = "chica-pin-details-css";
    s.textContent =
      "#chica-intel-card{display:none;position:fixed!important;left:12px!important;top:64px!important;z-index:2147483647!important;width:min(360px,calc(100vw - 24px))!important;max-height:min(78dvh,620px)!important;overflow:auto!important;background:#fffdf8!important;color:#1a1714!important;border:2px solid #c513af!important;border-radius:14px!important;box-shadow:0 16px 40px rgba(18,18,18,.45)!important;padding:14px!important;font:500 13px/1.35 Inter,system-ui,sans-serif!important}" +
      "#chica-intel-card .x{position:absolute;top:4px;right:4px;border:0;background:transparent;font:800 22px/1 Inter,system-ui,sans-serif;min-width:36px;min-height:36px}" +
      "#chica-intel-card h3{margin:0 32px 6px 0;font:800 16px/1.2 Inter,system-ui,sans-serif}" +
      "#chica-intel-card .meta{margin:0;color:#5c5348;font-size:12px}" +
      "#chica-intel-card .chica-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0 0}" +
      "#chica-intel-card .chica-actions a.go-nav{display:flex;align-items:center;justify-content:center;min-height:40px;border:2px solid #c513af;border-radius:10px;padding:8px 10px;font:800 13px/1 Inter,system-ui,sans-serif;color:#7a0f6c;text-decoration:none;background:#fff}" +
      "#chica-intel-card .chica-actions a.go-street{background:#c513af;color:#fffdf8;border-color:#c513af}" +
      "#chica-intel-card a.claim{display:flex;align-items:center;justify-content:center;margin:12px 0 0;min-height:44px;border:0;border-radius:10px;background:#c513af;color:#fff;font:800 14px/1 Inter,system-ui,sans-serif;text-decoration:none;padding:12px}";
    (document.head || document.documentElement).appendChild(s);
  }
  function cardEl() {
    var el = document.getElementById("chica-intel-card");
    if (!el) {
      el = document.createElement("div");
      el.id = "chica-intel-card";
      el.setAttribute("role", "dialog");
      el.setAttribute("aria-label", "Sale details");
      document.documentElement.appendChild(el);
    }
    return el;
  }
  function render(sale) {
    if (!sale || !isFinite(Number(sale.lat))) return;
    css();
    var el = cardEl();
    var lat = Number(sale.lat), lon = Number(sale.lon);
    var when = sale.dates || sale.hours || "";
    el.innerHTML =
      '<button type="button" class="x" aria-label="Close">\u00d7</button>' +
      '<div class="chica-opt">' +
      "<h3>" + esc(sale.title || "Sale") + "</h3>" +
      '<p class="meta">' + esc(sale.address || "") + (when ? "<br>" + esc(when) : "") + "</p>" +
      actions(lat, lon) +
      '<a class="claim" href="' + esc(claimHref(sale)) + '">Claim My Garage Sale</a>' +
      "</div>";
    var x = el.querySelector(".x");
    if (x) x.onclick = function (ev) { ev.preventDefault(); ev.stopPropagation(); el.style.display = "none"; };
    el.style.display = "block";
  }
  function saleFromLayer(ly) {
    if (!ly || !ly.getLatLng) return null;
    if (ly._icon && (ly._icon.classList.contains("chica-overlay-pin") || ly._icon.querySelector(".chica-overlay-mark"))) return null;
    var llng = ly.getLatLng();
    var item = ly.__chicaSale || {};
    return {
      title: item.title || (ly.options && ly.options.title) || "Sale",
      address: item.address || "",
      dates: item.dates || "",
      hours: item.hours || "",
      lat: llng.lat,
      lon: llng.lng
    };
  }
  function hook() {
    var map = window.__chicaLeaflet;
    if (!map || !map.eachLayer) return;
    map.eachLayer(function (ly) {
      if (!ly.getLatLng || ly.__chicaDetailsHook) return;
      ly.__chicaDetailsHook = true;
      ly.on("click", function (ev) {
        if (ev && ev.originalEvent) {
          ev.originalEvent._chicaPin = true;
        }
        var sale = saleFromLayer(ly);
        if (sale) render(sale);
      });
    });
  }
  function asSale(a, b, c) {
    if (a && typeof a === "object" && isFinite(Number(a.lat))) return a;
    return { lat: a, lon: b, title: c || "Sale", address: "", dates: "", hours: "" };
  }
  window.__chicaOpenIntel = function (a, b, c) {
    render(asSale(a, b, c));
    return true;
  };
  window.__chicaHideIntel = function () {
    var el = document.getElementById("chica-intel-card");
    if (el) el.style.display = "none";
  };
  document.addEventListener("click", function (ev) {
    var t = ev.target;
    if (!t || !t.closest) return;
    if (t.closest("#chica-force-key,#chica-hunt-bar,#chica-listit-btn,#chica-home-chip,#chica-intel-card")) return;
    var icon = t.closest(".leaflet-marker-icon");
    if (!icon || icon.classList.contains("chica-overlay-pin") || icon.querySelector(".chica-overlay-mark")) return;
    var map = window.__chicaLeaflet;
    if (!map || !map.eachLayer) return;
    map.eachLayer(function (ly) {
      if (ly._icon === icon || (ly._icon && ly._icon.contains && ly._icon.contains(t))) {
        var sale = saleFromLayer(ly);
        if (sale) render(sale);
      }
    });
  }, true);
  css();
  setInterval(hook, 400);
})();
