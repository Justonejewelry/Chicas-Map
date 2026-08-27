/* Chicas Map — header dock: fullscreen + Sale Intel brain pill.
   Buttons live on document.body (React cannot steal them).
   Immersive mode uses html.chica-fs-on (React never overwrites that).
   iOS has no native Fullscreen API — CSS is the real path. */
(function () {
  var CHROME_ID = "chica-map-chrome";
  var BTN_ID = "chica-fs-btn";
  var INTEL_ID = "chica-intel-btn";
  var STYLE_ID = "chica-fs-inline-style";
  var HTML_ON = "chica-fs-on";
  var INTEL_HREF = "/Chicas-Map/intel/";
  var INTEL_ICON = "/Chicas-Map/images/intel-brain.svg?v=1";
  var FS_GLYPH = "\u26F6";
  var ready = false;

  function intelMark() {
    var img = document.createElement("img");
    img.className = "chica-intel-mark";
    img.src = INTEL_ICON;
    img.alt = "";
    img.width = 28;
    img.height = 28;
    return img;
  }

  function fillIntel(a) {
    while (a.firstChild) a.removeChild(a.firstChild);
    a.appendChild(intelMark());
    var labelEl = document.createElement("span");
    labelEl.textContent = "Intel";
    a.appendChild(labelEl);
  }

  function cssText() {
    return [
      "#" + CHROME_ID + "{",
      "position:fixed!important;top:max(10px,env(safe-area-inset-top))!important;right:12px!important;left:auto!important;bottom:auto!important;",
      "z-index:2147483647!important;display:flex!important;align-items:center;gap:8px;height:48px;pointer-events:none;",
      "}",
      "#" + CHROME_ID + ">*{pointer-events:auto}",
      "#" + BTN_ID + "{",
      "position:relative!important;top:auto!important;right:auto!important;left:auto!important;bottom:auto!important;",
      "z-index:1!important;width:48px;min-width:48px;height:48px;padding:0;",
      "border:2px solid #fffdf8;border-radius:16px;background:#1a1a1e;color:#fffdf8;",
      "font:700 22px/1 \"Segoe UI Symbol\",\"Noto Sans Symbols 2\",\"Apple Symbols\",system-ui,sans-serif;",
      "cursor:pointer;display:flex!important;align-items:center;justify-content:center;",
      "visibility:visible!important;opacity:1!important;pointer-events:auto!important;",
      "box-shadow:0 8px 22px rgb(0 0 0 / .38),0 0 0 3px rgb(197 19 175 / .28);",
      "}",
      "#" + BTN_ID + "[aria-pressed=\"true\"]{background:#c513af;box-shadow:0 10px 28px rgb(197 19 175 / .55),0 0 0 3px rgb(197 19 175 / .28)}",
      "#" + BTN_ID + ":hover{filter:brightness(1.08)}",
      "#" + INTEL_ID + "{",
      "position:relative!important;top:auto!important;right:auto!important;left:auto!important;bottom:auto!important;",
      "z-index:1!important;height:48px;min-width:118px;padding:0 16px 0 10px;",
      "border:2px solid #fffdf8;border-radius:999px;background:#c513af;color:#fffdf8;",
      "font:800 14px/1 Inter,system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;",
      "text-decoration:none;display:flex!important;align-items:center;justify-content:center;gap:8px;",
      "visibility:visible!important;opacity:1!important;pointer-events:auto!important;",
      "box-shadow:0 10px 28px rgb(197 19 175 / .55),0 0 0 3px rgb(197 19 175 / .28);",
      "}",
      "#" + INTEL_ID + " .chica-intel-mark{width:28px;height:28px;flex:0 0 28px;color:#fffdf8;display:block;object-fit:contain}",
      "#" + INTEL_ID + ":hover{filter:brightness(1.06)}",
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

  function onIntelPath() {
    var p = location.pathname || "";
    return /\/intel\/?$/.test(p) || p.indexOf("/intel/") !== -1;
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
    setTimeout(function () {
      window.dispatchEvent(new Event("resize"));
    }, 80);
    setTimeout(function () {
      window.dispatchEvent(new Event("resize"));
    }, 280);
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
      try {
        exit.call(document);
      } catch (e) {}
    }
    resize();
  }

  function label(btn) {
    if (!btn) return;
    if (btn.textContent !== FS_GLYPH) btn.textContent = FS_GLYPH;
    var on = isOn();
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

  function ensureIntel() {
    if (onIntelPath()) {
      var leftover = document.getElementById(INTEL_ID);
      if (leftover) leftover.remove();
      return null;
    }
    if (!onMapPath()) {
      var off = document.getElementById(INTEL_ID);
      if (off) off.remove();
      return null;
    }
    var chrome = ensureChrome();
    var a = document.getElementById(INTEL_ID);
    if (!a) {
      a = document.createElement("a");
      a.id = INTEL_ID;
      a.href = INTEL_HREF;
      a.setAttribute("aria-label", "Chicas Sale Intel");
      fillIntel(a);
      chrome.appendChild(a);
    } else if (a.parentNode !== chrome) {
      chrome.appendChild(a);
    }
    a.classList.add("on-map");
    if (!a.querySelector(".chica-intel-mark")) fillIntel(a);
    return a;
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
    btn.textContent = FS_GLYPH;
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
      true,
    );
    document.addEventListener("fullscreenchange", function () {
      label(btn);
    });
    document.addEventListener("webkitfullscreenchange", function () {
      label(btn);
    });
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
    var chrome = document.getElementById(CHROME_ID);
    if (chrome && !document.getElementById(INTEL_ID)) chrome.remove();
    document.documentElement.classList.remove(HTML_ON);
    document.body.style.overflow = "";
    ready = false;
  }

  function mount() {
    ensureStyle();
    ensureIntel();
    if (!onMapPath()) {
      teardownFs();
      var chrome = document.getElementById(CHROME_ID);
      if (chrome && !chrome.children.length) chrome.remove();
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
