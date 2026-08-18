/* Chica Map — live Bexar County school count */
(function () {
  "use strict";
  if (window.__CHICA_BEXAR_COUNT__) return;
  window.__CHICA_BEXAR_COUNT__ = true;

  var LIVE = "https://maps.bexar.org/arcgis/rest/services/Schools/MapServer/0/query";
  var COUNT_ID = "chica-school-count";

  function ensureBadge() {
    var el = document.getElementById(COUNT_ID);
    if (el) return el;
    var bar = document.querySelector(".feat-bar") || document.querySelector(".tools-bar");
    if (!bar) return null;
    el = document.createElement("span");
    el.id = COUNT_ID;
    el.setAttribute("aria-live", "polite");
    el.title = "Schools returned by the live Bexar County GIS Public_Schools layer";
    el.textContent = "Schools: loading…";
    el.style.cssText = "display:inline-flex;align-items:center;padding:6px 10px;margin-left:6px;border-radius:999px;background:#fff;border:1px solid #d8ddd9;font:600 12px/1.2 system-ui,sans-serif;color:#145530;white-space:nowrap";
    bar.appendChild(el);
    return el;
  }

  async function loadCount() {
    var el = ensureBadge();
    if (!el) return;
    try {
      var u = new URL(LIVE);
      u.searchParams.set("where", "1=1");
      u.searchParams.set("returnCountOnly", "true");
      u.searchParams.set("f", "json");
      var r = await fetch(u.toString(), { cache: "no-store" });
      if (!r.ok) throw new Error("GIS " + r.status);
      var x = await r.json();
      if (!Number.isFinite(Number(x.count))) throw new Error("No count returned");
      el.textContent = "Schools: " + Number(x.count).toLocaleString();
      window.ChicaBexarSchoolCount = Number(x.count);
      console.log("[chica-bexar-count]", x.count);
    } catch (e) {
      el.textContent = "Schools: unavailable";
      console.warn("[chica-bexar-count]", e.message);
    }
  }

  function boot() {
    ensureBadge();
    loadCount();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  setTimeout(boot, 1200);
  setTimeout(boot, 3000);
})();
