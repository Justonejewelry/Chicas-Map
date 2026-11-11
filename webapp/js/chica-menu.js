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
      [BASE + "/stats/", es() ? "Números del mapa" : "Map stats"],
      [BASE + "/submit", es() ? "Publicar una venta" : "Add a sale"],
      [BASE + "/claim/", es() ? "Impulsa mi venta" : "Boost My Sale"],
      [BASE + "/deals/", es() ? "Buscador de Gangas 💸" : "Deal Finder 💸"],
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

  function css() {
    var s = document.getElementById("chica-menu-css");
    if (!s) {
      s = document.createElement("style");
      s.id = "chica-menu-css";
      document.head.appendChild(s);
    } else if (s.getAttribute("data-ready") === "1") {
      return;
    }
    s.setAttribute("data-ready", "1");
    s.textContent =
      "#chica-site-bar{position:sticky;top:0;z-index:90;display:flex;align-items:center;justify-content:space-between;height:64px;padding:0 12px;background:rgba(18,18,18,.92);border-bottom:1px solid rgba(255,255,255,.08);font-family:Inter,system-ui,sans-serif}" +
      "body:has(header:not(#chica-site-bar)) #chica-site-bar{display:none!important;visibility:hidden!important;pointer-events:none!important;height:0!important;overflow:hidden!important;border:0!important;padding:0!important;margin:0!important}" +
      "#chica-site-bar .tools{display:flex;align-items:center;gap:8px}" +
      "#chica-mark{display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;padding:0;border:0;border-radius:999px;background:transparent;cursor:pointer}" +
      "#chica-mark img,header a[data-chica-mark='1'] img{width:36px;height:36px;border-radius:999px;object-fit:cover;background:#121212}" +
      "header a[data-chica-mark='1']{cursor:pointer}" +
      
      "#chica-lang{display:inline-flex;height:52px;align-items:center;padding:4px;border-radius:999px;background:#1c1c1e;border:1px solid rgba(255,255,255,.12)}" +
      "#chica-lang button,#chica-theme{height:44px;min-width:44px;border:0;border-radius:999px;background:transparent;color:#f5f5f7;font:700 12px/1 Inter,system-ui,sans-serif;cursor:pointer}" +
      "#chica-lang button[aria-pressed='true']{background:#c513af;color:#fff}" +
      "#chica-theme{width:44px;background:#1c1c1e;border:1px solid rgba(255,255,255,.12)}" +
      "#chica-more{position:absolute;left:12px;top:58px;z-index:120}" +
      "#chica-more > summary{display:none}" +
      "#chica-more > div{min-width:232px;padding:6px;border-radius:14px;background:rgba(18,18,18,.94);color:#f5f5f7;border:1px solid rgba(255,255,255,.14);box-shadow:0 16px 40px rgba(0,0,0,.32);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}" +
      "#chica-more a{display:flex;align-items:center;min-height:44px;padding:0 12px;border-radius:10px;color:#f5f5f7;text-decoration:none;font:500 15px/1.2 Inter,system-ui,sans-serif}" +"button,summary,a[data-chica-keep='1'],.chica-glass{background-color:#c513af;background-image:linear-gradient(180deg,rgba(255,255,255,.46),rgba(255,255,255,.08) 46%,rgba(0,0,0,.2));border:1px solid rgba(255,255,255,.4);box-shadow:inset 0 1px 0 rgba(255,255,255,.62),inset 0 -2px 0 rgba(0,0,0,.28),0 8px 16px rgba(0,0,0,.28);color:#fff}" +"#chica-lang button,#chica-theme{background-color:#1c1c1e;color:#f5f5f7}" +"#chica-lang button[aria-pressed='true']{background-color:#c513af;color:#fff}" +
      "#chica-more a:hover,#chica-more a:focus-visible{background:rgba(255,255,255,.08);outline:2px solid #c513af;outline-offset:2px}" +"#chica-skip{position:absolute;left:8px;top:8px;z-index:300;transform:translateY(-160%);background:#c513af;color:#fff;padding:12px 16px;border-radius:999px;font:700 14px/1 Inter,system-ui,sans-serif;text-decoration:none}" +"#chica-skip:focus{transform:none}" +".chica-vh{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}" +"a:focus-visible,button:focus-visible,summary:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:2px solid #c513af;outline-offset:2px}" +
      "[data-chica-hide='1']{display:none!important}" +
      "#chica-more a[aria-current='page']{color:#fff;font-weight:650}" +
      "body.chica-map-menu #chica-site-bar{position:fixed;top:max(10px,env(safe-area-inset-top));left:10px;width:auto;height:auto;padding:0;background:transparent;border:0}" +
      "body.chica-map-menu #chica-more{position:fixed;left:10px;top:62px}" +
      "body.chica-map-menu #chica-mark{background:#121212;border:1px solid rgba(255,255,255,.14)}" +
      "";
  }

  function current(href) {
    var p = path();
    var h = String(href || "").replace(/\/+$/, "");
    if (h === BASE + "/map" && isMap()) return true;
    return p === h;
  }

  function fill(panel) {
    var want = items();
    var sig = (es() ? "es" : "en") + "|" + path();
    if (panel.getAttribute("data-sig") === sig && panel.children.length === want.length) return;
    panel.setAttribute("data-sig", sig);
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
      panel.setAttribute("role", "navigation");
      panel.setAttribute("aria-label", "Site");
      details.appendChild(summary);
      details.appendChild(panel);
      var closeMenu = function (focusMark) {
        details.open = false;
        var m = document.querySelector("[data-chica-mark='1'], #chica-mark");
        if (m) {
          m.setAttribute("aria-expanded", "false");
          if (focusMark) m.focus();
        }
      };
      document.addEventListener("keydown", function (ev) {
        if (details.open && (ev.key === "Escape" || ev.key === "Esc")) closeMenu(true);
      });
      panel.addEventListener("click", function (ev) {
        if (ev.target && ev.target.closest && ev.target.closest("a")) closeMenu(false);
      });
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
        if (span) span.setAttribute("data-chica-hide", "1");
        return;
      }
      el.setAttribute("data-chica-hide", "1");
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

  function realHeader() {
    var headers = document.querySelectorAll("header");
    for (var i = 0; i < headers.length; i++) {
      if (headers[i].id !== "chica-site-bar") return headers[i];
    }
    return null;
  }

  function dropInjectedBar() {
    var bar = document.getElementById("chica-site-bar");
    if (!bar || !bar.parentNode) return;
    if (realHeader() || brandLink()) bar.parentNode.removeChild(bar);
  }

  function injectBar() {
    if (realHeader()) {
      dropInjectedBar();
      return null;
    }
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
        b.setAttribute("aria-label", code === "es" ? "Español" : "English");
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

  function ensureSkip() {
    if (document.getElementById("chica-skip")) return;
    var target = document.getElementById("main") || document.querySelector("main") || document.getElementById("chica-live-map");
    if (!target) return;
    if (!target.id) target.id = "main";
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    var a = document.createElement("a");
    a.id = "chica-skip";
    a.href = "#" + target.id;
    a.textContent = es() ? "Saltar al contenido" : "Skip to content";
    document.body.insertBefore(a, document.body.firstChild);
  }

  function ensureMapHeading() {
    if (!isMap()) return;
    if (document.querySelector("h1")) return;
    var h = document.createElement("h1");
    h.className = "chica-vh";
    h.textContent = es() ? "Mapa de ventas de garage en San Antonio" : "San Antonio garage sale map";
    document.body.insertBefore(h, document.body.firstChild);
  }

  function run() {
    css();
    ensureSkip();
    ensureMapHeading();
    if (isMap()) document.body.classList.add("chica-map-menu");
    var mini = document.getElementById("chica-mini");
    if (mini && mini.parentNode) mini.parentNode.removeChild(mini);
    var details = menu();
    var brand = brandLink();
    var native = realHeader();
    if (brand || native) {
      dropInjectedBar();
      if (brand) {
        bind(brand, details);
        hideHeaderNoise();
        var header = brand.closest("header") || native;
        if (header && details.parentNode !== header) header.appendChild(details);
      } else if (native && details.parentNode !== native) {
        native.appendChild(details);
      }
      return;
    }
    var injected = injectBar();
    if (!injected) return;
    bind(document.getElementById("chica-mark"), details);
    if (details.parentNode !== injected) injected.appendChild(details);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
  setInterval(run, 800);
  window.addEventListener("popstate", function () { setTimeout(run, 60); });
})();

/* Form intake — email submissions. Attached here because this script loads on every page of the custom domain.
   Sponsor + sale-submit forms wait for FormSubmit before the page's own success state runs; others stay fire-and-forget.
   Forms with data-chica-own handle delivery themselves. */
(function () {
  var ENDPOINT = "https://formsubmit.co/ajax/mr.jsciaraffa@gmail.com";
  function cmEvt(p, t) { try { window.goatcounter && window.goatcounter.count && window.goatcounter.count({ path: "evt-" + p, title: t, event: true }); } catch (e) {} }
  window.chicaEvt = cmEvt;
  function isEs() {
    if ((document.documentElement.lang || "").slice(0, 2) === "es") return true;
    try { return localStorage.getItem("chicas-map-locale") === "es"; } catch (e) { return false; }
  }
  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href*="square.link"]') : null;
    if (!a) return;
    var h = a.href || "";
    if (/qjunxHoo/.test(h)) cmEvt("square-claim-5", "Square checkout: $5 Boost My Sale");
    else if (/vELzfnnD/.test(h)) cmEvt("square-sponsor-25", "Square checkout: $25 alert sponsor");
    else cmEvt("square-supporter", "Square checkout: supporter / other");
  }, true);
  function sponsorTier(form) {
    var s = form.querySelector("p span.font-semibold");
    var t = s ? (s.textContent || "").trim() : "";
    if (!t) { try { t = new URLSearchParams(location.search).get("tier") || ""; } catch (e) {} }
    return t || "unspecified";
  }
  function msg(form, text, bad) {
    var el = form.querySelector(".chica-form-msg");
    if (!text) { if (el) el.remove(); return; }
    if (!el) {
      el = document.createElement("p");
      el.className = "chica-form-msg";
      el.setAttribute("role", bad ? "alert" : "status");
      el.setAttribute("aria-live", "polite");
      form.appendChild(el);
    }
    el.style.cssText = "margin-top:12px;padding:12px 14px;border-radius:12px;font-weight:600;" + (bad ? "background:#fde8ec;color:#7a0b2a" : "background:#fff3fb;color:#4a0b41");
    el.textContent = text;
  }
  function failText() {
    return isEs()
      ? "¡Ay, guau! Chica no pudo enviar esto 🐾 Revisa tu conexión e inténtalo otra vez, o escríbenos a mr.jsciaraffa@gmail.com."
      : "Ruh-roh! Chica couldn't send that 🐾 Check your connection and try again, or email mr.jsciaraffa@gmail.com.";
  }
  function send(data) {
    return fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(data)
    }).then(function (r) {
      if (!r.ok) throw new Error("http " + r.status);
      return r.json().catch(function () { return {}; });
    }).then(function (j) {
      if (j && (j.success === false || j.success === "false")) throw new Error("formsubmit");
      return j;
    });
  }
  document.addEventListener("submit", function (e) {
    var form = e.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (form.hasAttribute("data-chica-own")) return;
    if (form.__chicaDelivered) { form.__chicaDelivered = false; return; }
    if (form.__chicaSending) { e.preventDefault(); e.stopImmediatePropagation(); return; }
    var titleInput = form.querySelector('[name="title"]');
    var emailInput = form.querySelector('[name="email"], [type="email"]');
    if (!titleInput && !emailInput) return;
    var path = location.pathname || "";
    var isSponsor = /\/sponsors?(\/|\.html|$)/.test(path) && !!form.querySelector('[name="business"]');
    var isSale = !!titleInput;
    var fd = new FormData(form);
    var data = {};
    fd.forEach(function (v, k) { data[k] = v; });
    if (isSponsor) {
      data.tier = sponsorTier(form);
      data._subject = "Chicas Map — Sponsor inquiry: " + data.tier + " — " + (String(data.business || "").trim() || String(data.name || "").trim() || "no business");
      cmEvt("sponsor-inquiry-submit", "Sponsor inquiry submit (" + data.tier + ")");
    } else if (isSale) {
      data._subject = "Chicas Map — New sale tip: " + (data.title || "untitled");
      cmEvt("sale-submit", "Sale submit");
    } else {
      data._subject = "Chicas Map — Pack email signup";
      cmEvt("email-signup-submit", "Pack email signup submit");
    }
    data._template = "table";
    data._captcha = "false";
    data.source_url = location.href;
    data.captured_at = new Date().toISOString();
    if (!isSponsor && !isSale) { send(data).catch(function () {}); return; }
    // Hold the page's own success state until FormSubmit confirms delivery.
    e.preventDefault();
    e.stopImmediatePropagation();
    var btn = e.submitter || form.querySelector('[type="submit"]');
    form.__chicaSending = true;
    if (btn) btn.disabled = true;
    msg(form, isEs() ? "Chica está enviando… 🐾" : "Chica is sending it… 🐾", false);
    send(data).then(function () {
      form.__chicaSending = false;
      if (btn) btn.disabled = false;
      msg(form, "");
      cmEvt(isSponsor ? "sponsor-inquiry-ok" : "sale-submit-ok", isSponsor ? "Sponsor inquiry delivered" : "Sale submit delivered");
      form.__chicaDelivered = true;
      if (form.requestSubmit) form.requestSubmit();
      else form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    }).catch(function () {
      form.__chicaSending = false;
      if (btn) btn.disabled = false;
      msg(form, failText(), true);
    });
  }, true);
})();
