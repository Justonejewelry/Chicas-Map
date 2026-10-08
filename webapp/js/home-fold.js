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
    var s = document.getElementById("chica-home-fold-css");
    if (!s) {
      s = document.createElement("style");
      s.id = "chica-home-fold-css";
      document.head.appendChild(s);
    }
    s.textContent =
      "[data-chica-dup='1']{display:none!important}" +
      "header{border-color:rgba(255,255,255,.08)!important;background:rgba(18,18,18,.86)!important}" +
      "main{padding-top:28px!important}" +
      "main h1{font-weight:650!important;letter-spacing:-.035em!important;line-height:1.05!important}" +
      "main a[data-chica-keep='1']{display:inline-flex!important;min-height:48px;align-items:center;justify-content:center;padding:0 22px!important;border-radius:980px!important;background:#c513af!important;color:#fff!important;text-decoration:none!important;font:600 16px/1 Inter,system-ui,sans-serif!important;letter-spacing:-.015em!important;border:1px solid rgba(255,255,255,.4)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.62),inset 0 -2px 0 rgba(0,0,0,.28),0 8px 16px rgba(0,0,0,.28)!important;background-image:linear-gradient(180deg,rgba(255,255,255,.46),rgba(255,255,255,.08) 46%,rgba(0,0,0,.2))!important}" +
      "header a[data-chica-mark='1']{cursor:pointer;position:relative}" +
      "header a[data-chica-mark='1'] span{display:none!important}" +
      "#chica-more{position:absolute;left:12px;top:58px;z-index:80}" +
      "#chica-more > summary{display:none}" +
      "#chica-more > div{position:relative;right:auto;top:auto;z-index:80;min-width:232px;padding:6px;border-radius:14px;background:rgba(18,18,18,.62);color:#f5f5f7;border:1px solid rgba(255,255,255,.22);box-shadow:0 16px 40px rgba(0,0,0,.32);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}" +
      "#chica-more a{display:flex;align-items:center;min-height:44px;padding:0 12px;border-radius:10px;color:#f5f5f7;text-decoration:none;font:500 15px/1.2 Inter,system-ui,sans-serif}" +
      "#chica-more a:hover,#chica-more a:focus-visible{background:rgba(255,255,255,.08);outline:2px solid #c513af;outline-offset:2px}" +
      "#chica-more a[data-primary='1']{color:#fff;font-weight:650}" +
      "footer{padding-bottom:28px}" +
      "@media (prefers-reduced-motion:reduce){#chica-more > div{transition:none}}";
  }

  function brandLink() {
    var header = document.querySelector("header");
    if (!header) return null;
    var links = header.querySelectorAll("a");
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      if (a.closest && a.closest("#chica-more")) continue;
      if (!a.querySelector("img")) continue;
      var raw = String(a.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
      if (raw.indexOf("chicas map") !== -1 || a.getAttribute("data-chica-mark") === "1") return a;
    }
    return null;
  }

  function items() {
    return [
      [BASE + "/map/", es() ? "Mapa" : "Map"],
      [BASE + "/submit", es() ? "Publicar una venta" : "Add a sale"],
      [BASE + "/claim/", es() ? "Impulsar · $5" : "Boost · $5"],
      [BASE + "/atlas/", "Alamo Atlas"],
      [BASE + "/facebook", "Facebook"],
      [BASE + "/media", "Reels"],
      [BASE + "/bulletin", es() ? "Boletín" : "Bulletin"],
      [BASE + "/backstory", es() ? "Historia" : "Backstory"],
      [BASE + "/principle/", es() ? "Principio de la manada" : "Pack principle"],
      [BASE + "/sponsors", es() ? "Patrocinios" : "Sponsors"],
      [BASE + "/legal", es() ? "Aviso legal" : "Legal"]
    ];
  }

  function fill(panel) {
    var want = items();
    var links = panel.querySelectorAll("a");
    if (links.length === want.length) {
      var same = true;
      for (var i = 0; i < want.length; i++) {
        if (links[i].getAttribute("href") !== want[i][0] || links[i].textContent !== want[i][1]) same = false;
      }
      if (same) return;
    }
    panel.textContent = "";
    want.forEach(function (item, i) {
      var a = document.createElement("a");
      a.href = item[0];
      a.textContent = item[1];
      if (i === 0) a.setAttribute("data-primary", "1");
      panel.appendChild(a);
    });
  }

  function ensureMore() {
    var header = document.querySelector("header");
    if (!header) return null;
    var details = document.getElementById("chica-more");
    if (!details) {
      details = document.createElement("details");
      details.id = "chica-more";
      var summary = document.createElement("summary");
      summary.setAttribute("aria-hidden", "true");
      summary.tabIndex = -1;
      var panel = document.createElement("div");
      details.appendChild(summary);
      details.appendChild(panel);
      details.setAttribute("data-chica-keep", "1");
      header.appendChild(details);
      document.addEventListener("click", function (ev) {
        if (!details.open) return;
        if (details.contains(ev.target)) return;
        if (ev.target && ev.target.closest && ev.target.closest("[data-chica-mark='1']")) return;
        details.open = false;
        var mark = brandLink();
        if (mark) mark.setAttribute("aria-expanded", "false");
      });
    }
    var panel = details.querySelector("div");
    if (panel) fill(panel);
    return details;
  }

  function bindMark(details) {
    var brand = brandLink();
    if (!brand || !details) return;
    brand.setAttribute("data-chica-keep", "1");
    brand.setAttribute("data-chica-mark", "1");
    brand.setAttribute("aria-haspopup", "menu");
    brand.setAttribute("aria-expanded", details.open ? "true" : "false");
    brand.setAttribute("aria-label", es() ? "Menú" : "Menu");
    var span = brand.querySelector("span");
    if (span) hide(span);
    if (brand.getAttribute("data-chica-menu") === "1") return;
    brand.setAttribute("data-chica-menu", "1");
    brand.addEventListener("click", function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      details.open = !details.open;
      brand.setAttribute("aria-expanded", details.open ? "true" : "false");
    });
  }

  function foldHeader() {
    var header = document.querySelector("header");
    if (!header) return;
    var crime = document.getElementById("chica-crime-map-btn");
    if (crime) hide(crime);
    Array.from(header.querySelectorAll("a, button")).forEach(function (el) {
      if (el.closest && el.closest("#chica-more")) return;
      if (el.getAttribute("data-chica-mark") === "1") return;
      var t = text(el).toLowerCase();
      if (!t) return;
      if (t === "en" || t === "es" || t.indexOf("theme") !== -1 || t.indexOf("tema") !== -1) return;
      if (t === "chicas map") {
        var span = el.querySelector("span");
        if (span) hide(span);
        return;
      }
      hide(el);
    });
  }

  function foldBody() {
    Array.from(document.querySelectorAll("main a, footer a")).forEach(function (el) {
      if (el.closest && el.closest("#chica-more")) return;
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
        t.indexOf("open atlas") !== -1 ||
        t.indexOf("the whole story") !== -1 ||
        t.indexOf("say hi") !== -1 ||
        t.indexOf("keep the cape") !== -1 ||
        t.indexOf("grok") !== -1 ||
        t.indexOf("chatgpt") !== -1 ||
        t.indexOf("leaflet") !== -1 ||
        t.indexOf("openstreetmap") !== -1 ||
        t === "github" ||
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

  function quietChrome() {
    Array.from(document.querySelectorAll("main p, main span, main div, main h2, footer h2, footer p, footer div")).forEach(function (el) {
      if (el.querySelector && el.querySelector("article, [data-chica-keep]")) return;
      var t = text(el);
      var low = t.toLowerCase();
      if (!t || t.length > 80) return;
      if (low.indexOf("grok build") !== -1 || low.indexOf("civic layer") !== -1 || low === "hunt" || low === "pack" || low === "fine print" || low === "made with" || low === "this map is") {
        hide(el);
      }
    });
  }

  function hideLine(sel, needle) {
    Array.from(document.querySelectorAll(sel)).forEach(function (el) {
      if (el.closest && el.closest("#chica-home-reels, #chica-reel-dialog")) return;
      var t = text(el);
      if (t && t.indexOf(needle) !== -1 && t.length < 420) hide(el);
    });
  }

  function run() {
    if (!home()) return;
    css();
    foldHeader();
    foldBody();
    quietChrome();
    hideLine("main section, main div", "Pack principle");
    hideLine("main section, main div", "Principio de la manada");
    hideLine("footer p, footer div, footer span", "free Saturday map");
    hideLine("footer p, footer div, footer span", "mapa gratis del sábado");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
  setInterval(run, 800);
  window.addEventListener("popstate", function () { setTimeout(run, 60); });
})();
