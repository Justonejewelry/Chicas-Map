/* Site menu. Same roll-up on every page. Icon opens it. No wordmark. No Crime Map. */
(function () {
  var BASE = "/Chicas-Map";
  var LOGO = BASE + "/images/chica-logo.png";

  function es() {
    return String(document.documentElement.lang || "").toLowerCase().indexOf("es") === 0;
  }

  function text(el) {
    return String((el && (el.innerText || el.textContent)) || "").replace(/\s+/g, " ").trim();
  }

  function path() {
    return String(location.pathname || "").replace(/\/+$/, "") || "/";
  }

  function isMap() {
    var p = path();
    return p === BASE + "/map" || p === BASE + "/map.html";
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
      [BASE + "/sponsors", es() ? "Patrocinios" : "Sponsors"],
      [BASE + "/legal", es() ? "Aviso legal" : "Legal"]
    ];
  }

  function css() {
    var s = document.getElementById("chica-menu-css");
    if (!s) {
      s = document.createElement("style");
      s.id = "chica-menu-css";
      document.head.appendChild(s);
    }
    s.textContent =
      "#chica-site-bar{position:sticky;top:0;z-index:90;display:flex;align-items:center;justify-content:space-between;height:64px;padding:0 12px;background:rgba(18,18,18,.92);border-bottom:1px solid rgba(255,255,255,.08);font-family:Inter,system-ui,sans-serif}" +
      "#chica-site-bar .tools{display:flex;align-items:center;gap:8px}" +
      "#chica-mark{display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;padding:0;border:0;border-radius:999px;background:transparent;cursor:pointer}" +
      "#chica-mark img,header a[data-chica-mark='1'] img{width:36px;height:36px;border-radius:999px;object-fit:cover;background:#121212}" +
      "header a[data-chica-mark='1']{cursor:pointer}" +
      "header a[data-chica-mark='1'] span{display:none!important}" +
      "#chica-lang{display:inline-flex;height:44px;align-items:center;padding:4px;border-radius:999px;background:#1c1c1e;border:1px solid rgba(255,255,255,.12)}" +
      "#chica-lang button,#chica-theme{height:36px;min-width:36px;border:0;border-radius:999px;background:transparent;color:#f5f5f7;font:700 12px/1 Inter,system-ui,sans-serif;cursor:pointer}" +
      "#chica-lang button[aria-pressed='true']{background:#c513af;color:#fff}" +
      "#chica-theme{width:44px;background:#1c1c1e;border:1px solid rgba(255,255,255,.12)}" +
      "#chica-more{position:absolute;left:12px;top:58px;z-index:120}" +
      "#chica-more > summary{display:none}" +
      "#chica-more > div{min-width:232px;padding:6px;border-radius:14px;background:#1d1d1f;color:#f5f5f7;border:1px solid rgba(255,255,255,.08);box-shadow:0 16px 40px rgba(0,0,0,.32)}" +
      "#chica-more a{display:flex;align-items:center;min-height:44px;padding:0 12px;border-radius:10px;color:#f5f5f7;text-decoration:none;font:500 15px/1.2 Inter,system-ui,sans-serif}" +
      "#chica-more a:hover,#chica-more a:focus-visible{background:rgba(255,255,255,.08);outline:none}" +
      "#chica-more a[aria-current='page']{color:#fff;font-weight:650}" +
      "body.chica-map-menu #chica-site-bar{position:fixed;top:max(10px,env(safe-area-inset-top));left:10px;width:auto;height:auto;padding:0;background:transparent;border:0}" +
      "body.chica-map-menu #chica-more{position:fixed;left:10px;top:62px}" +
      "body.chica-map-menu #chica-mark{background:#121212;border:1px solid rgba(255,255,255,.14)}" +
      "#chica-mini{display:none!important}";
  }

  function current(href) {
    var p = path();
    var h = String(href || "").replace(/\/+$/, "");
    if (h === BASE + "/map" && isMap()) return true;
    return p === h;
  }

  function fill(panel) {
    var want = items();
    panel.textContent = "";
    want.forEach(function (item) {
      var a = document.createElement("a");
      a.href = item[0];
      a.textContent = item[1];
      if (current(item[0])) a.setAttribute("aria-current", "page");
      panel.appendChild(a);
    });
  }

  function menu() {
    var details = document.getElementById("chica-more");
    if (!details) {
      details = document.createElement("details");
      details.id = "chica-more";
      var summary = document.createElement("summary");
      summary.tabIndex = -1;
      summary.setAttribute("aria-hidden", "true");
      var panel = document.createElement("div");
      details.appendChild(summary);
      details.appendChild(panel);
      document.addEventListener("click", function (ev) {
        if (!details.open) return;
        if (details.contains(ev.target)) return;
        if (ev.target && ev.target.closest && ev.target.closest("[data-chica-mark='1'], #chica-mark")) return;
        details.open = false;
        var mark = document.querySelector("[data-chica-mark='1'], #chica-mark");
        if (mark) mark.setAttribute("aria-expanded", "false");
      });
    }
    var host = document.getElementById("chica-site-bar") || document.querySelector("header") || document.body;
    if (details.parentNode !== host) host.appendChild(details);
    var panel = details.querySelector("div");
    if (panel) fill(panel);
    return details;
  }

  function setLang(next) {
    try { localStorage.setItem("chicas-map-locale", next); } catch (e) {}
    document.documentElement.lang = next;
    var details = document.getElementById("chica-more");
    if (details) fill(details.querySelector("div"));
    var buttons = document.querySelectorAll("#chica-lang button");
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute("aria-pressed", buttons[i].getAttribute("data-lang") === next ? "true" : "false");
    }
  }

  function setTheme(next) {
    try { localStorage.setItem("chicas-map-theme", next); } catch (e) {}
    document.documentElement.setAttribute("data-theme", next);
    document.documentElement.style.colorScheme = next;
    var btn = document.getElementById("chica-theme");
    if (btn) btn.textContent = next === "light" ? "☾" : "☀";
  }

  function brandLink() {
    var headers = document.querySelectorAll("header");
    var header = null;
    for (var h = 0; h < headers.length; h++) {
      if (headers[h].id !== "chica-site-bar") { header = headers[h]; break; }
    }
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

  function hideHeaderNoise() {
    var header = document.querySelector("header");
    if (!header || header.id === "chica-site-bar") return;
    Array.from(header.querySelectorAll("a, button")).forEach(function (el) {
      if (el.closest && el.closest("#chica-more")) return;
      if (el.getAttribute("data-chica-mark") === "1") return;
      var t = text(el).toLowerCase();
      if (!t) return;
      if (t === "en" || t === "es" || t.indexOf("theme") !== -1 || t.indexOf("tema") !== -1) return;
      if (t.indexOf("chicas map") !== -1) {
        var span = el.querySelector("span");
        if (span) span.style.setProperty("display", "none", "important");
        return;
      }
      el.setAttribute("hidden", "");
      el.style.setProperty("display", "none", "important");
    });
  }

  function bind(el, details) {
    if (!el || !details) return;
    el.setAttribute("data-chica-mark", "1");
    el.setAttribute("aria-haspopup", "menu");
    el.setAttribute("aria-expanded", details.open ? "true" : "false");
    el.setAttribute("aria-label", es() ? "Menú" : "Menu");
    if (el.getAttribute("data-chica-menu") === "1") return;
    el.setAttribute("data-chica-menu", "1");
    el.addEventListener("click", function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      details.open = !details.open;
      el.setAttribute("aria-expanded", details.open ? "true" : "false");
    });
  }

  function injectBar() {
    if (document.getElementById("chica-site-bar")) return document.getElementById("chica-site-bar");
    var bar = document.createElement("header");
    bar.id = "chica-site-bar";
    var btn = document.createElement("button");
    btn.id = "chica-mark";
    btn.type = "button";
    var img = document.createElement("img");
    img.src = LOGO;
    img.alt = "";
    btn.appendChild(img);
    var tools = document.createElement("div");
    tools.className = "tools";
    if (!isMap()) {
      var lang = document.createElement("div");
      lang.id = "chica-lang";
      ["en", "es"].forEach(function (code) {
        var b = document.createElement("button");
        b.type = "button";
        b.setAttribute("data-lang", code);
        b.textContent = code.toUpperCase();
        b.setAttribute("aria-pressed", (es() ? "es" : "en") === code ? "true" : "false");
        b.addEventListener("click", function () { setLang(code); });
        lang.appendChild(b);
      });
      var theme = document.createElement("button");
      theme.id = "chica-theme";
      theme.type = "button";
      theme.setAttribute("aria-label", es() ? "Tema" : "Theme");
      var cur = "dark";
      try { cur = localStorage.getItem("chicas-map-theme") === "light" ? "light" : "dark"; } catch (e) {}
      theme.textContent = cur === "light" ? "☾" : "☀";
      theme.addEventListener("click", function () {
        setTheme(document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light");
      });
      tools.appendChild(lang);
      tools.appendChild(theme);
    }
    bar.appendChild(btn);
    bar.appendChild(tools);
    document.body.insertBefore(bar, document.body.firstChild);
    return bar;
  }

  function run() {
    css();
    if (isMap()) document.body.classList.add("chica-map-menu");
    var mini = document.getElementById("chica-mini");
    if (mini) mini.setAttribute("hidden", "");
    var details = menu();
    var brand = brandLink();
    if (brand) {
      bind(brand, details);
      hideHeaderNoise();
      var bar = document.getElementById("chica-site-bar");
      if (bar && bar.parentNode) bar.parentNode.removeChild(bar);
      var header = brand.closest("header");
      if (header && details.parentNode !== header) header.appendChild(details);
      return;
    }
    var injected = injectBar();
    bind(document.getElementById("chica-mark"), details);
    if (details.parentNode !== injected) injected.appendChild(details);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
  setInterval(run, 800);
  window.addEventListener("popstate", function () { setTimeout(run, 60); });
})();
