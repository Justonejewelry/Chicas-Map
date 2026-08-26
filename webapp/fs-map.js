/* Chicas Map — viewport Full screen. Button is on document.body so React
   cannot steal it. Immersive mode uses html.chica-fs-on (React never
   overwrites that). iOS has no native Fullscreen API — CSS is the real path. */
(function () {
  var BTN_ID = "chica-fs-btn";
  var STYLE_ID = "chica-fs-inline-style";
  var HTML_ON = "chica-fs-on";
  var AUTO = "chicaFsAuto";

  function cssText() {
    return [
      "#" + BTN_ID + "{",
      "position:fixed!important;top:max(12px,env(safe-area-inset-top))!important;right:12px!important;left:auto!important;bottom:auto!important;",
      "z-index:2147483647!important;height:48px;min-width:158px;padding:0 18px;",
      "border:2px solid #fffdf8;border-radius:999px;background:#c513af;color:#fffdf8;",
      "font:800 14px/1 Inter,system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;",
      "cursor:pointer;display:flex!important;align-items:center;justify-content:center;",
      "visibility:visible!important;opacity:1!important;pointer-events:auto!important;",
      "box-shadow:0 10px 28px rgb(197 19 175 / .55),0 0 0 4px rgb(197 19 175 / .28);",
      "}",
      "#" + BTN_ID + ":hover{filter:brightness(1.06)}",
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

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent = cssText();
    document.head.appendChild(s);
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
    setTimeout(function () {
      window.dispatchEvent(new Event("resize"));
    }, 80);
    setTimeout(function () {
      window.dispatchEvent(new Event("resize"));
    }, 280);
  }

  function enterCss() {
    document.documentElement.classList.add(HTML_ON);
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
    var on = isOn();
    btn.textContent = on ? "Exit" : "Full screen";
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  }

  function ensureBtn() {
    var btn = document.getElementById(BTN_ID);
    if (btn) return btn;
    btn = document.createElement("button");
    btn.id = BTN_ID;
    btn.type = "button";
    btn.textContent = "Full screen";
    btn.setAttribute("aria-label", "Full screen map");
    document.body.appendChild(btn);
    btn.addEventListener(
      "click",
      function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        if (isOn()) {
          exitAll();
          label(btn);
          return;
        }
        enterCss();
        var host = hostEl() || document.documentElement;
        var req = host.requestFullscreen || host.webkitRequestFullscreen;
        if (req) {
          Promise.resolve(req.call(host, { navigationUI: "hide" })).catch(function () {});
        }
        label(btn);
      },
      true,
    );
    document.addEventListener("fullscreenchange", function () {
      if (!fsEl() && document.documentElement.classList.contains(HTML_ON) === false) {
        /* native exit only */
      }
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

  function mount() {
    ensureStyle();
    if (!onMapPath()) {
      var leftover = document.getElementById(BTN_ID);
      if (leftover) leftover.remove();
      document.documentElement.classList.remove(HTML_ON);
      return;
    }
    if (!mapEl()) return;
    var btn = ensureBtn();
    if (!document.documentElement.dataset[AUTO]) {
      document.documentElement.dataset[AUTO] = "1";
      enterCss();
    }
    label(btn);
  }

  var mo = new MutationObserver(function () {
    mount();
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
  window.addEventListener("popstate", function () {
    setTimeout(mount, 40);
  });
  var n = 0;
  var tick = setInterval(function () {
    n += 1;
    mount();
    if (mapEl() || n > 48) clearInterval(tick);
  }, 250);
})();
