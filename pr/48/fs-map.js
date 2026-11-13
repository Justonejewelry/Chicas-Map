/* Chicas Map — header dock: fullscreen only. Corner CTA is map-cta.js. */
(function () {
  var CHROME_ID = "chica-map-chrome";
  var BTN_ID = "chica-fs-btn";
  var LIST_ID = "chica-listit-btn";
  var INTEL_ID = "chica-intel-btn";
  var STYLE_ID = "chica-fs-inline-style";
  var HTML_ON = "chica-fs-on";
  var SVG_NS = "http://www.w3.org/2000/svg";
  var ready = false;

  function fsMark(compress) {
    var svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("class", "chica-fs-mark");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "26");
    svg.setAttribute("height", "26");
    svg.setAttribute("aria-hidden", "true");
    var path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "#ffffff");
    path.setAttribute("stroke-width", "3.25");
    path.setAttribute("stroke-linecap", "square");
    path.setAttribute("stroke-linejoin", "miter");
    path.setAttribute(
      "d",
      compress
        ? "M9.5 4v5.5H4M20 9.5h-5.5V4M14.5 20v-5.5H20M4 14.5h5.5V20"
        : "M4 9.5V4h5.5M14.5 4H20v5.5M20 14.5V20h-5.5M9.5 20H4v-5.5"
    );
    svg.appendChild(path);
    return svg;
  }

  function cssText() {
    return [
      "#" + CHROME_ID + "{",
      "position:fixed!important;top:max(10px,env(safe-area-inset-top))!important;right:12px!important;left:auto!important;bottom:auto!important;",
      "z-index:2147483646!important;display:flex!important;align-items:flex-start;gap:8px;height:auto;pointer-events:none;",
      "}",
      "#" + CHROME_ID + ">*{pointer-events:auto}",
      "#" + BTN_ID + "{",
      "position:relative!important;top:auto!important;right:auto!important;left:auto!important;bottom:auto!important;",
      "z-index:1!important;width:48px;min-width:48px;height:48px;padding:0;",
      "border:2px solid #fffdf8;border-radius:16px;color:#fff;",
      "cursor:pointer;display:flex!important;align-items:center;justify-content:center;",
      "visibility:visible!important;opacity:1!important;pointer-events:auto!important;text-decoration:none;",
      "background:#1a1a1e;box-shadow:0 8px 22px rgb(0 0 0 / .38),0 0 0 3px rgb(197 19 175 / .28)}",
      "#" + BTN_ID + "[aria-pressed=\"true\"]{background:#c513af;box-shadow:0 10px 28px rgb(197 19 175 / .55),0 0 0 3px rgb(197 19 175 / .28)}",
      "#" + BTN_ID + ":hover{filter:brightness(1.08)}",
      "#" + BTN_ID + " .chica-fs-mark{width:26px;height:26px;display:block}",
      "#" + INTEL_ID + "{display:none!important;visibility:hidden!important;pointer-events:none!important}",
      "html." + HTML_ON + ",html." + HTML_ON + " body{overflow:hidden!important;height:100dvh!important;overscroll-behavior:none}",
      "html." + HTML_ON + " :has(> .chica-map),html." + HTML_ON + " :has(> .leaflet-container){",
      "position:fixed!important;inset:0!important;z-index:99990!important;",
      "width:100vw!important;height:100dvh!important;min-height:100dvh!important;",
      "max-width:none!important;max-height:none!important;margin:0!important;",
      "border-radius:0!important;overflow:hidden!important;background:#0e0e10!important;",
      "}",
      "html." + HTML_ON + " .chica-map,html." + HTML_ON + " .leaflet-container{",
      "position:absolute!important;inset:0!important;width:100%!important;height:100%!important;",
      "min-height:100%!important;max-width:none!important;border-radius:0!important;",
      "}",
      "html." + HTML_ON + " .leaflet-container{z-index:0}",
    ].join("");
  }

  function onMapPath() {
    var p = location.pathname || "";
    return /\/map\/?$/.test(p) || p.indexOf("/map/") !== -1;
  }

  function mapEl() {
    return document.querySelector(".chica-map") || document.querySelector(".leaflet-container");
  }

  function hostEl() {
    var map = mapEl();
    return map && map.parentElement ? map.parentElement : map;
  }

  function fsEl() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }

  function isOn() {
    return Boolean(fsEl()) || document.documentElement.classList.contains(HTML_ON);
  }

  function resize() {
    window.dispatchEvent(new Event("resize"));
    setTimeout(function () { window.dispatchEvent(new Event("resize")); }, 80);
    setTimeout(function () { window.dispatchEvent(new Event("resize")); }, 280);
  }

  function enterCss() {
    if (!document.documentElement.classList.contains(HTML_ON)) {
      document.documentElement.classList.add(HTML_ON);
    }
    document.body.style.overflow = "hidden";
    resize();
  }

  function exitAll() {
    document.documentElement.classList.remove(HTML_ON);
    document.body.style.overflow = "";
    var exit = document.exitFullscreen || document.webkitExitFullscreen;
    if (exit && fsEl()) {
      try { exit.call(document); } catch (e) {}
    }
    resize();
  }

  function label(btn) {
    if (!btn) return;
    var on = isOn();
    var flag = on ? "1" : "0";
    if (btn.getAttribute("data-fs") !== flag || !btn.querySelector(".chica-fs-mark")) {
      while (btn.firstChild) btn.removeChild(btn.firstChild);
      btn.appendChild(fsMark(on));
      btn.setAttribute("data-fs", flag);
    }
    var pressed = on ? "true" : "false";
    if (btn.getAttribute("aria-pressed") !== pressed) btn.setAttribute("aria-pressed", pressed);
    btn.setAttribute("aria-label", on ? "Exit full screen map" : "Full screen map");
    btn.title = on ? "Exit full screen" : "Full screen";
  }

  function ensureStyle() {
    var s = document.getElementById(STYLE_ID);
    if (!s) {
      s = document.createElement("style");
      s.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(s);
    }
    if (s.textContent !== cssText()) s.textContent = cssText();
  }

  function ensureChrome() {
    var chrome = document.getElementById(CHROME_ID);
    if (!chrome) {
      chrome = document.createElement("div");
      chrome.id = CHROME_ID;
      chrome.setAttribute("role", "toolbar");
      chrome.setAttribute("aria-label", "Map header");
      document.body.appendChild(chrome);
    }
    return chrome;
  }

  function killIntelIcon() {
    var a = document.getElementById(INTEL_ID);
    if (a) a.remove();
  }

  function detachListIt() {
    var a = document.getElementById(LIST_ID);
    if (a && a.parentNode && a.parentNode.id === CHROME_ID) {
      document.documentElement.appendChild(a);
    }
  }

  function ensureBtn() {
    var chrome = ensureChrome();
    var btn = document.getElementById(BTN_ID);
    if (btn) {
      if (btn.parentNode !== chrome) chrome.insertBefore(btn, chrome.firstChild);
      return btn;
    }
    btn = document.createElement("button");
    btn.id = BTN_ID;
    btn.type = "button";
    btn.setAttribute("aria-label", "Full screen map");
    chrome.insertBefore(btn, chrome.firstChild);
    btn.addEventListener(
      "click",
      function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        if (isOn()) {
          exitAll();
        } else {
          enterCss();
          var host = hostEl() || document.documentElement;
          var req = host.requestFullscreen || host.webkitRequestFullscreen;
          if (req) {
            Promise.resolve(req.call(host, { navigationUI: "hide" })).catch(function () {});
          }
        }
        label(btn);
      },
      true
    );
    document.addEventListener("fullscreenchange", function () { label(btn); });
    document.addEventListener("webkitfullscreenchange", function () { label(btn); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && isOn()) {
        exitAll();
        label(btn);
      }
    });
    return btn;
  }

  function teardownFs() {
    var leftover = document.getElementById(BTN_ID);
    if (leftover) leftover.remove();
    killIntelIcon();
    var chrome = document.getElementById(CHROME_ID);
    if (chrome && !chrome.children.length) chrome.remove();
    document.documentElement.classList.remove(HTML_ON);
    document.body.style.overflow = "";
    ready = false;
  }

  function mount() {
    ensureStyle();
    killIntelIcon();
    detachListIt();
    if (!onMapPath()) {
      teardownFs();
      return Boolean(mapEl()) || true;
    }
    if (!mapEl()) return false;
    var btn = ensureBtn();
    enterCss();
    label(btn);
    ready = true;
    return true;
  }

  function boot() {
    if (mount()) return;
    var n = 0;
    var tick = setInterval(function () {
      n += 1;
      if (mount() || n > 60) clearInterval(tick);
    }, 200);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  window.addEventListener("popstate", function () {
    ready = false;
    setTimeout(boot, 40);
  });
})();
