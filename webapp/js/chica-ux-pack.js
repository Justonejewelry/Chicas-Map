/**
 * Chica Map — UX pack (recommendations batch 2026-08-19)
 * 1 Build refresh banner  2 Layer toasts  4 Empty sales state
 * 5 280ms close  6 Dock sync  7 Zone honesty (zone module)
 * 8 Solo layer long-press  9 Weekend forecast nudge
 * 10 Data-as-of line  14 Sales-first defaults  15 Origin story link
 */
(function () {
  "use strict";
  var BUILD = "uxpack1";
  var BUILD_KEY = "chica_map_build_seen";

  function toast(msg, ms) {
    var el = document.getElementById("toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "toast";
      el.style.cssText =
        "position:fixed;left:50%;bottom:72px;transform:translateX(-50%);z-index:99990;" +
        "background:#145530;color:#fff;padding:10px 14px;border-radius:12px;font:600 13px/1.35 system-ui,sans-serif;" +
        "box-shadow:0 8px 24px rgba(0,0,0,.2);max-width:min(92vw,360px);text-align:center";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.remove("hidden");
    el.style.display = "block";
    el.style.opacity = "1";
    clearTimeout(el.__t);
    el.__t = setTimeout(function () {
      el.classList.add("hidden");
      el.style.display = "";
    }, ms || 3200);
  }

  function maybeBuildBanner() {
    try {
      var seen = localStorage.getItem(BUILD_KEY);
      if (seen === BUILD) return;
      if (document.getElementById("chicaBuildBanner")) return;
      var bar = document.createElement("div");
      bar.id = "chicaBuildBanner";
      bar.setAttribute(
        "style",
        "position:fixed;top:56px;left:12px;right:12px;z-index:99980;" +
          "background:linear-gradient(180deg,#145530,#0f3d24);color:#fff;padding:12px 14px;" +
          "border-radius:14px;font:600 13px/1.4 system-ui,sans-serif;" +
          "box-shadow:0 12px 32px rgba(20,17,15,.25);display:flex;gap:10px;align-items:center"
      );
      bar.innerHTML =
        '<span style="flex:1">New map build ready — tap to refresh for smooth layers & updates.</span>' +
        '<button type="button" id="chicaBuildRefresh" style="border:0;background:#fff;color:#145530;font-weight:800;padding:8px 12px;border-radius:10px;cursor:pointer">Refresh</button>' +
        '<button type="button" id="chicaBuildDismiss" aria-label="Dismiss" style="border:0;background:transparent;color:#cfe8d8;font-size:18px;cursor:pointer;padding:4px 6px">×</button>';
      document.body.appendChild(bar);
      document.getElementById("chicaBuildRefresh").onclick = function () {
        try { localStorage.setItem(BUILD_KEY, BUILD); } catch (_) {}
        location.reload();
      };
      document.getElementById("chicaBuildDismiss").onclick = function () {
        try { localStorage.setItem(BUILD_KEY, BUILD); } catch (_) {}
        bar.remove();
      };
    } catch (_) {}
  }

  function syncDock() {
    var rail = document.getElementById("sideRail");
    var dock = document.getElementById("dockList");
    if (!rail || !dock) return;
    dock.classList.toggle("active", rail.classList.contains("open"));
  }
  function watchRail() {
    var rail = document.getElementById("sideRail");
    if (!rail || rail.__ybDockObs) return;
    rail.__ybDockObs = true;
    new MutationObserver(syncDock).observe(rail, { attributes: true, attributeFilter: ["class"] });
    syncDock();
  }

  function renderDataAsOf(meta) {
    var host = document.getElementById("listTitle") || document.querySelector(".rail-section h2");
    if (!host) return;
    var line = document.getElementById("chicaDataAsOf");
    if (!line) {
      line = document.createElement("p");
      line.id = "chicaDataAsOf";
      line.style.cssText = "margin:2px 12px 8px;font-size:0.72rem;color:#7a736b;font-weight:600";
      if (host.parentNode) host.parentNode.insertBefore(line, host.nextSibling);
      else host.after(line);
    }
    var stamp = meta.last_refresh || meta.date || meta.updated || "";
    var total = meta.total_locations != null ? meta.total_locations : null;
    var stale = false;
    try {
      if (stamp) {
        var t = Date.parse(stamp);
        if (Number.isFinite(t)) stale = Date.now() - t > 36 * 60 * 60 * 1000;
      }
    } catch (_) {}
    var bits = [];
    if (stamp) bits.push("Data as of " + String(stamp).replace("T", " ").slice(0, 19));
    if (total != null) bits.push(total + " listings");
    if (meta.status) bits.push(String(meta.status));
    line.textContent = bits.join(" · ") || "Data freshness unknown";
    line.style.color = stale ? "#b45309" : "#7a736b";
    if (stale) line.textContent += " · may be stale — pull to refresh soon";
  }

  async function loadCityMeta() {
    try {
      var r = await fetch("data/cities/san-antonio.json?t=" + Date.now(), { cache: "no-store" });
      if (!r.ok) return null;
      return await r.json();
    } catch (_) { return null; }
  }

  function enhanceEmptySales() {
    var list = document.getElementById("saleList");
    if (!list || list.__ybEmptyWatch) return;
    list.__ybEmptyWatch = true;
    function paint() {
      var items = list.querySelectorAll(".sale-item");
      if (items.length > 0) {
        var card = list.querySelector(".chica-empty-card");
        if (card) card.remove();
        return;
      }
      var existing = list.querySelector(".empty");
      if (existing && !existing.classList.contains("chica-empty-card")) {
        existing.classList.add("chica-empty-card");
        existing.innerHTML =
          '<div style="padding:8px 4px">' +
          '<div style="font-weight:800;color:#145530;margin-bottom:4px">Quiet mid-week</div>' +
          '<div style="color:#7a736b;font-size:0.82rem;margin-bottom:10px">Most garage sales land Friday–Sunday. Check the weekend forecast and set a reminder.</div>' +
          '<button type="button" id="chicaOpenForecast" style="border:0;background:#145530;color:#fff;font-weight:700;padding:9px 12px;border-radius:10px;cursor:pointer;width:100%">Weekend forecast →</button>' +
          "</div>";
        var btn = document.getElementById("chicaOpenForecast");
        if (btn) btn.onclick = function () {
          var block = document.getElementById("forecastBlock");
          if (block) { block.open = true; block.scrollIntoView({ behavior: "smooth", block: "nearest" }); }
          if (window.openRail) window.openRail();
        };
        return;
      }
      if (!list.querySelector(".chica-empty-card") && items.length === 0) {
        var li = document.createElement("li");
        li.className = "empty chica-empty-card";
        li.style.cssText = "list-style:none;border:1px solid #e6e1d8;border-radius:14px;background:#fff;margin:8px 0";
        li.innerHTML =
          '<div style="padding:14px 12px">' +
          '<div style="font-weight:800;color:#145530;margin-bottom:4px">Quiet mid-week</div>' +
          '<div style="color:#7a736b;font-size:0.82rem;margin-bottom:10px">Most garage sales land Friday–Sunday. Open the weekend forecast to plan your route.</div>' +
          '<button type="button" id="chicaOpenForecast2" style="border:0;background:#145530;color:#fff;font-weight:700;padding:9px 12px;border-radius:10px;cursor:pointer;width:100%">Weekend forecast →</button>' +
          "</div>";
        list.appendChild(li);
        var b2 = document.getElementById("chicaOpenForecast2");
        if (b2) b2.onclick = function () {
          var block = document.getElementById("forecastBlock");
          if (block) { block.open = true; block.scrollIntoView({ behavior: "smooth", block: "nearest" }); }
        };
      }
    }
    new MutationObserver(function () { setTimeout(paint, 50); }).observe(list, { childList: true, subtree: true });
    setTimeout(paint, 800);
    setTimeout(paint, 2500);
    setTimeout(paint, 5000);
  }

  function wireSoloLayers() {
    var ids = ["btnFoodPantry", "btnPublicWifi", "btnZoneAware", "btnDowntownParking", "btnLayerPermits"];
    ids.forEach(function (id) {
      var btn = document.getElementById(id);
      if (!btn || btn.__ybSolo) return;
      btn.__ybSolo = true;
      var timer = null;
      btn.addEventListener("pointerdown", function () {
        timer = setTimeout(function () {
          timer = null;
          toast("Solo mode · other layers dimmed", 2200);
          ids.forEach(function (other) {
            if (other === id) return;
            var o = document.getElementById(other);
            if (o && o.classList.contains("active")) o.click();
          });
          if (!btn.classList.contains("active")) btn.click();
        }, 650);
      }, true);
      ["pointerup", "pointerleave", "pointercancel"].forEach(function (ev) {
        btn.addEventListener(ev, function () { if (timer) clearTimeout(timer); timer = null; }, true);
      });
    });
  }

  function salesFirst() {
    var sales = document.getElementById("btnLayerSales");
    if (sales) sales.classList.add("active");
  }

  function ensureOriginInMenu() {
    var drop = document.getElementById("menuDrop");
    if (!drop || document.getElementById("menuOriginStory")) return;
    var a = document.createElement("a");
    a.id = "menuOriginStory";
    a.href = "backyard.html";
    a.textContent = "Chica’s story (veteran-built)";
    a.style.cssText = "display:block;padding:10px 12px;font-weight:700;color:#145530;text-decoration:none";
    drop.appendChild(a);
  }

  window.ChicaUx = {
    toast: toast,
    build: BUILD,
    closeMs: 280,
    layerToast: function (label, on) {
      if (on) toast(label + " on · showing on map", 2600);
      else toast(label + " off", 1800);
    },
  };

  function boot() {
    maybeBuildBanner();
    watchRail();
    enhanceEmptySales();
    wireSoloLayers();
    salesFirst();
    ensureOriginInMenu();
    loadCityMeta().then(function (meta) { if (meta) renderDataAsOf(meta); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  setTimeout(boot, 600);
  setTimeout(boot, 1800);
  setTimeout(boot, 4000);
})();
