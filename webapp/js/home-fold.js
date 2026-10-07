/* Home only. One map action. Duplicate routes live in a roll-up. */
(function () {
  var BASE = "/Chicas-Map";

  function home() {
    var p = (location.pathname || "/").replace(/\/+$/, "") || "/";
    return p === BASE || p === BASE + "/index.html";
  }

  function es() {
    return String(document.documentElement.lang || "").toLowerCase().indexOf("es") === 0;
  }

  function text(el) {
    return String((el && (el.innerText || el.textContent)) || "").replace(/\s+/g, " ").trim();
  }

  function hide(el) {
    if (!el || el.getAttribute("data-chica-keep") === "1") return;
    el.setAttribute("data-chica-dup", "1");
    el.setAttribute("hidden", "");
  }

  function css() {
    if (document.getElementById("chica-home-fold-css")) return;
    var s = document.createElement("style");
    s.id = "chica-home-fold-css";
    s.textContent =
      "[data-chica-dup='1']{display:none!important}" +
      "#chica-more{position:relative}" +
      "#chica-more > summary{list-style:none;cursor:pointer;min-height:44px;display:inline-flex;align-items:center;gap:6px;padding:0 14px;border-radius:999px;border:1px solid rgba(255,255,255,.14);background:transparent;color:inherit;font:600 14px/1 Inter,system-ui,sans-serif;letter-spacing:-.01em}" +
      "#chica-more > summary::-webkit-details-marker{display:none}" +
      "#chica-more > summary:after{content:'';width:7px;height:7px;border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;transform:rotate(45deg) translateY(-2px);opacity:.7}" +
      "#chica-more[open] > summary:after{transform:rotate(225deg) translateY(-1px)}" +
      "#chica-more > div{position:absolute;right:0;top:calc(100% + 8px);z-index:80;min-width:220px;padding:8px;border-radius:16px;background:#161616;color:#f5f5f7;border:1px solid rgba(255,255,255,.08);box-shadow:0 18px 50px rgba(0,0,0,.28)}" +
      "#chica-more a{display:flex;align-items:center;min-height:44px;padding:0 12px;border-radius:10px;color:#f5f5f7;text-decoration:none;font:500 15px/1.2 Inter,system-ui,sans-serif}" +
      "#chica-more a:hover,#chica-more a:focus-visible{background:rgba(255,255,255,.06);outline:none}" +
      "#chica-more a[data-primary='1']{color:#c513af;font-weight:700}" +
      "#chica-pack,#chica-fine{margin:28px auto 0;max-width:720px}" +
      "#chica-pack > summary,#chica-fine > summary{list-style:none;cursor:pointer;min-height:52px;display:flex;align-items:center;justify-content:space-between;padding:0 2px;font:600 17px/1.2 Syne,Inter,sans-serif;letter-spacing:-.02em}" +
      "#chica-pack > summary::-webkit-details-marker,#chica-fine > summary::-webkit-details-marker{display:none}" +
      "#chica-pack a,#chica-fine a{display:flex;min-height:44px;align-items:center;text-decoration:none;color:inherit;border-top:1px solid rgba(255,255,255,.08)}" +
      "@media (prefers-reduced-motion:reduce){#chica-more > div{transition:none}}";
    document.head.appendChild(s);
  }

  function ensureMore() {
    if (document.getElementById("chica-more")) return;
    var header = document.querySelector("header");
    if (!header) return;
    var slot = header.querySelector("div.flex.items-center.gap-2") || header;
    var details = document.createElement("details");
    details.id = "chica-more";
    var summary = document.createElement("summary");
    summary.textContent = es() ? "Más" : "More";
    var panel = document.createElement("div");
    var items = [
      [BASE + "/map/", es() ? "Mapa" : "Map", "1"],
      [BASE + "/submit", es() ? "Publicar una venta" : "Add a sale", ""],
      [BASE + "/claim/", es() ? "Impulsar · $5" : "Boost · $5", ""],
      [BASE + "/atlas/", "Atlas", ""],
      ["https://chicas-alamo-atlas.grok.me/", es() ? "Mapa del crimen" : "Crime map", ""],
      [BASE + "/facebook", "Facebook", ""],
      [BASE + "/media", "Reels", ""],
      [BASE + "/bulletin", es() ? "Boletín" : "Bulletin", ""],
      [BASE + "/backstory", es() ? "Historia" : "Backstory", ""],
      [BASE + "/sponsors", es() ? "Patrocinios" : "Sponsors", ""],
      [BASE + "/legal", es() ? "Aviso legal" : "Legal", ""]
    ];
    items.forEach(function (item) {
      var a = document.createElement("a");
      a.href = item[0];
      a.textContent = item[1];
      if (item[2]) a.setAttribute("data-primary", "1");
      if (item[0].indexOf("http") === 0) {
        a.target = "_blank";
        a.rel = "noopener noreferrer";
      }
      panel.appendChild(a);
    });
    details.appendChild(summary);
    details.appendChild(panel);
    details.setAttribute("data-chica-keep", "1");
    slot.insertBefore(details, slot.firstChild);
    document.addEventListener("click", function (ev) {
      if (!details.open) return;
      if (details.contains(ev.target)) return;
      details.open = false;
    });
  }

  function foldHeader() {
    var header = document.querySelector("header");
    if (!header) return;
    Array.from(header.querySelectorAll("a, button")).forEach(function (el) {
      if (el.closest && el.closest("#chica-more")) return;
      var t = text(el).toLowerCase();
      if (!t) return;
      if (t === "en" || t === "es" || t.indexOf("theme") !== -1 || t.indexOf("tema") !== -1) return;
      if (t === "chicas map") return;
      hide(el);
    });
  }

  function foldBody() {
    Array.from(document.querySelectorAll("main a, footer a")).forEach(function (el) {
      if (el.closest && el.closest("#chica-more, #chica-pack, #chica-fine")) return;
      var t = text(el).toLowerCase();
      var href = String(el.getAttribute("href") || "");
      if (t.indexOf("open the map") !== -1 || t.indexOf("abre el mapa") !== -1) {
        el.setAttribute("data-chica-keep", "1");
        return;
      }
      if (el.closest && el.closest("article, li") && href.indexOf("/map") !== -1 && t.length > 24) return;
      var dup =
        t.indexOf("share with the pack") !== -1 ||
        t.indexOf("comparte con la manada") !== -1 ||
        t.indexOf("add a sale") !== -1 ||
        t.indexOf("sales map") !== -1 ||
        t.indexOf("crime map") !== -1 ||
        t.indexOf("come along") !== -1 ||
        t.indexOf("watch the video") !== -1 ||
        t.indexOf("the whole story") !== -1 ||
        t.indexOf("say hi") !== -1 ||
        t.indexOf("keep the cape") !== -1 ||
        t === "map" ||
        t === "facebook" ||
        t === "reels" ||
        t === "bulletin" ||
        t === "backstory" ||
        t === "sponsors" ||
        t === "sponsor" ||
        t === "disclaimer";
      if (dup) hide(el.closest("article, li") || el);
    });
  }

  function run() {
    if (!home()) return;
    css();
    ensureMore();
    foldHeader();
    foldBody();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
  setInterval(run, 800);
  window.addEventListener("popstate", function () { setTimeout(run, 60); });
})();
