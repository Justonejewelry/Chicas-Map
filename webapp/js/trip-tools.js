/* Trip planning on /map/: "My route" list of picked sales -> Google Maps directions,
   a real Share button on every sale card, and ?sale=<id> deep links that open the pin. */
(function (w) {
  var p = location.pathname || "";
  if (!(/\/map\/?$/.test(p) || p.indexOf("/map/") !== -1 || /map\.html$/.test(p))) return;
  var KEY = "chicas-map-route-v1";
  var MAX = 10; // Google Maps: destination + 9 waypoints

  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function load() { try { var a = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function save(a) { try { localStorage.setItem(KEY, JSON.stringify(a)); } catch (e) {} }
  function sales() { return w.__chicaSales || []; }
  function byId(id) { var s = sales(); for (var i = 0; i < s.length; i++) if (String(s[i].id) === String(id)) return s[i]; return null; }
  function shareUrl(id) { return location.origin + location.pathname.replace(/[^/]*$/, "") + "?sale=" + encodeURIComponent(id); }

  function css() {
    if (document.getElementById("chica-trip-css")) return;
    var s = document.createElement("style");
    s.id = "chica-trip-css";
    s.textContent =
      "#chica-route-btn{position:fixed;right:12px;bottom:calc(150px + env(safe-area-inset-bottom,0px));z-index:2147483646;display:none;align-items:center;gap:6px;min-height:44px;padding:0 14px;border:0;border-radius:22px;background:#c513af;color:#fff;font:800 14px/1 Inter,system-ui,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.3);cursor:pointer}" +
      "#chica-route-btn.has{display:flex}" +
      "#chica-route-panel{position:fixed;right:12px;bottom:calc(200px + env(safe-area-inset-bottom,0px));z-index:2147483647;width:min(340px,calc(100vw - 24px));max-height:55vh;overflow:auto;background:#fffdf8;color:#1a1714;border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,.35);padding:14px;font:500 14px/1.35 Inter,system-ui,sans-serif;display:none}" +
      "#chica-route-panel.open{display:block}" +
      "#chica-route-panel h3{margin:0 0 6px;font-size:16px}#chica-route-panel ol{margin:8px 0;padding-left:20px}#chica-route-panel li{margin:6px 0}" +
      "#chica-route-panel li button{margin-left:6px;border:0;background:none;color:#7a0f6c;font-weight:800;cursor:pointer}" +
      "#chica-route-panel .go{display:block;text-align:center;margin-top:8px;padding:12px;border-radius:10px;background:#c513af;color:#fff;font-weight:800;text-decoration:none}" +
      "#chica-route-panel .clear{display:block;width:100%;margin-top:6px;padding:8px;border:0;background:none;color:#555;cursor:pointer}" +
      ".chica-trip-row{display:flex;gap:8px;margin:10px 0 0}.chica-trip-row button{flex:1;min-height:44px;border:2px solid #c513af;border-radius:10px;background:#fff;color:#7a0f6c;font:800 14px/1 Inter,system-ui,sans-serif;cursor:pointer}" +
      ".chica-trip-row button.on{background:#c513af;color:#fff}" +
      "#chica-trip-toast{position:fixed;left:50%;top:84px;transform:translateX(-50%);z-index:2147483647;background:#1a1714;color:#fffdf8;padding:10px 14px;border-radius:10px;font:600 14px/1.3 Inter,system-ui,sans-serif;max-width:90vw;box-shadow:0 6px 18px rgba(0,0,0,.3)}";
    (document.head || document.documentElement).appendChild(s);
  }
  function toast(msg) {
    var t = document.getElementById("chica-trip-toast");
    if (!t) { t = document.createElement("div"); t.id = "chica-trip-toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.textContent = msg; t.style.display = "block";
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.style.display = "none"; }, 3200);
  }

  function ui() {
    css();
    var btn = document.getElementById("chica-route-btn");
    if (!btn) {
      btn = document.createElement("button");
      btn.id = "chica-route-btn"; btn.type = "button";
      btn.setAttribute("aria-controls", "chica-route-panel"); btn.setAttribute("aria-expanded", "false");
      btn.addEventListener("click", function () {
        var pnl = document.getElementById("chica-route-panel");
        var open = !pnl.classList.contains("open");
        pnl.classList.toggle("open", open); btn.setAttribute("aria-expanded", open ? "true" : "false");
        if (open) paint();
      });
      document.body.appendChild(btn);
      var pnl = document.createElement("div");
      pnl.id = "chica-route-panel"; pnl.setAttribute("role", "dialog"); pnl.setAttribute("aria-label", "My route");
      pnl.addEventListener("click", function (ev) {
        var rm = ev.target.closest("[data-rm]");
        if (rm) { save(load().filter(function (x) { return String(x.id) !== rm.getAttribute("data-rm"); })); paint(); syncCard(); }
        if (ev.target.closest(".clear")) { save([]); paint(); syncCard(); }
      });
      document.body.appendChild(pnl);
    }
    paint();
  }
  function directions(list) {
    var pts = list.map(function (s) { return s.lat + "," + s.lon; });
    var dest = pts.pop();
    var u = "https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=" + encodeURIComponent(dest);
    if (pts.length) u += "&waypoints=" + encodeURIComponent(pts.join("|"));
    return u;
  }
  function paint() {
    var list = load();
    var btn = document.getElementById("chica-route-btn");
    var pnl = document.getElementById("chica-route-panel");
    if (!btn || !pnl) return;
    btn.textContent = "\ud83d\ude97 My route (" + list.length + ")";
    btn.classList.toggle("has", list.length > 0);
    if (!list.length) { pnl.classList.remove("open"); pnl.innerHTML = ""; return; }
    pnl.innerHTML = "<h3>My sale route</h3><div>Chica will line these up in Google Maps, starting from where you are.</div><ol>" +
      list.map(function (s) { return "<li>" + esc(s.title) + (s.address ? "<br><small>" + esc(s.address) + "</small>" : "") + ' <button type="button" data-rm="' + esc(s.id) + '" aria-label="Remove ' + esc(s.title) + '">Remove</button></li>'; }).join("") +
      '</ol><a class="go" target="_blank" rel="noopener noreferrer" href="' + esc(directions(list)) + '">Open route in Google Maps</a><button type="button" class="clear">Clear route</button>';
  }
  function toggleRoute(sale) {
    var list = load();
    var has = list.some(function (x) { return String(x.id) === String(sale.id); });
    if (has) list = list.filter(function (x) { return String(x.id) !== String(sale.id); });
    else {
      if (list.length >= MAX) { toast("Your route is full (10 stops). Remove one to add another."); return; }
      list.push({ id: sale.id, title: sale.title || "Sale", address: sale.address || "", lat: Number(sale.lat), lon: Number(sale.lon) });
      toast("Added to your route \ud83d\udc3e");
    }
    save(list); paint();
  }
  function share(sale) {
    var url = shareUrl(sale.id);
    var text = (sale.title || "Garage sale") + (sale.dates ? " \u00b7 " + sale.dates : "") + " \u2014 found on Chica's Map";
    if (navigator.share) { navigator.share({ title: "Chica's Map", text: text, url: url }).catch(function () {}); return; }
    var done = function () { toast("Link copied! Paste it anywhere to share this sale."); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, function () { prompt("Copy this link:", url); });
    else prompt("Copy this link:", url);
  }

  function cardSale(card) {
    var a = card.querySelector('a[href*="?sale="]');
    var id = "";
    if (a) { try { id = decodeURIComponent((a.getAttribute("href").split("?sale=")[1] || "").split("&")[0]); } catch (e) {} }
    return id ? byId(id) : null;
  }
  function syncCard() {
    var card = document.getElementById("chica-intel-card");
    if (!card) return;
    var sale = cardSale(card);
    var row = card.querySelector(".chica-trip-row");
    if (!sale) { if (row) row.remove(); return; }
    var inRoute = load().some(function (x) { return String(x.id) === String(sale.id); });
    if (!row) {
      row = document.createElement("div");
      row.className = "chica-trip-row";
      row.innerHTML = '<button type="button" data-act="route"></button><button type="button" data-act="share">Share</button>';
      var anchor = card.querySelector(".chica-actions");
      if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(row, anchor.nextSibling); else (card.querySelector(".chica-opt") || card).appendChild(row);
      row.addEventListener("click", function (ev) {
        var b = ev.target.closest("button"); if (!b) return;
        ev.preventDefault(); ev.stopPropagation();
        var s = cardSale(card); if (!s) return;
        if (b.getAttribute("data-act") === "route") toggleRoute(s); else share(s);
        syncCard();
      });
    }
    row.setAttribute("data-id", sale.id);
    var rb = row.querySelector('[data-act="route"]');
    rb.textContent = inRoute ? "\u2713 In my route" : "+ Add to route";
    rb.classList.toggle("on", inRoute);
    // Old "Share this sale" link becomes the same real share action
    var old = card.querySelector('a.secondary[href*="?sale="]');
    if (old && !old.__chicaShare) {
      old.__chicaShare = true;
      old.href = shareUrl(sale.id);
      old.addEventListener("click", function (ev) { ev.preventDefault(); share(sale); });
    }
  }
  function watchCard() {
    var obs = new MutationObserver(function () {
      var card = document.getElementById("chica-intel-card");
      if (card && !card.__chicaTripObs) {
        card.__chicaTripObs = true;
        new MutationObserver(function () { if (!card.querySelector(".chica-trip-row")) syncCard(); }).observe(card, { childList: true });
        syncCard();
      }
    });
    obs.observe(document.documentElement, { childList: true, subtree: false });
    obs.observe(document.body, { childList: true });
  }

  function deepLink() {
    var id = "";
    try { id = new URLSearchParams(location.search).get("sale") || ""; } catch (e) {}
    if (!id || deepLink.done) return;
    deepLink.done = true;
    var sale = byId(id);
    if (!sale) { toast("That sale has wrapped up or moved. Here's what's on the map right now!"); return; }
    var map = w.__chicaLeaflet;
    if (map && map.setView) map.setView([sale.lat, sale.lon], 16, { animate: false });
    setTimeout(function () { if (typeof w.__chicaOpenIntel === "function") w.__chicaOpenIntel(sale); }, 250);
  }

  function start() {
    ui(); watchCard();
    // Drop any saved stops whose sale has ended / left the map
    function prune() {
      if (!w.__chicaSalesReady) return;
      var live = load().filter(function (x) { return byId(x.id); });
      if (live.length !== load().length) { save(live); paint(); }
      deepLink();
      if (w.__chicaHiddenEnded) try { console.info("Chica's Map: hid " + w.__chicaHiddenEnded + " ended sales"); } catch (e) {}
    }
    w.addEventListener("chica-sales", prune);
    prune();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})(window);
