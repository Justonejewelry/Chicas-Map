(function () {
  "use strict";

  var NAV_ID = "chica-standard-nav";
  var script = document.currentScript || Array.from(document.scripts).find(function (s) {
    return /(?:^|\/)site-nav\.js(?:\?|$)/.test(s.src || "");
  });
  var WEBAPP_ROOT = script && script.src ? new URL("../", script.src) : new URL("./", location.href);
  var ICON = new URL("chica-favicon.svg", WEBAPP_ROOT).href;
  var GLOBAL_CSS = new URL("css/chica-global-polish.css", WEBAPP_ROOT).href;
  var NAV_CSS = new URL("css/site-nav.css", WEBAPP_ROOT).href;
  var BUILD = "20260819";

  function ensureStyles() {
    if (!document.querySelector('link[data-chica-global-polish]')) {
      var global = document.createElement("link");
      global.rel = "stylesheet";
      global.href = GLOBAL_CSS + "?v=" + BUILD;
      global.setAttribute("data-chica-global-polish", "true");
      document.head.appendChild(global);
    }
    if (!document.querySelector('link[data-chica-site-nav]')) {
      var navCss = document.createElement("link");
      navCss.rel = "stylesheet";
      navCss.href = NAV_CSS + "?v=" + BUILD;
      navCss.setAttribute("data-chica-site-nav", "true");
      document.head.appendChild(navCss);
    }
  }

  function setThemeColor() {
    var meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    meta.content = "#c513b8";
  }

  function item(href, icon, label, note, external) {
    var target = external ? ' target="_blank" rel="noopener noreferrer"' : "";
    return '<a class="chica-nav-item" role="menuitem" href="' + href + '"' + target + '>' +
      '<span class="chica-nav-item-icon" aria-hidden="true">' + icon + '</span>' +
      '<span class="chica-nav-item-copy"><strong>' + label + '</strong>' + (note ? '<small>' + note + '</small>' : '') + '</span>' +
      '</a>';
  }

  function section(label, content) {
    return '<div class="chica-nav-section"><div class="chica-nav-section-label">' + label + '</div>' + content + '</div>';
  }

  function currentPath() {
    var path = location.pathname.split("/").pop();
    return path || "index.html";
  }

  function markCurrent(nav) {
    var current = currentPath();
    nav.querySelectorAll(".chica-nav-item").forEach(function (a) {
      if (a.target === "_blank") return;
      var href = a.getAttribute("href") || "";
      var target = href.split("#")[0].split("?")[0];
      if (target === current || (current === "" && target === "index.html")) {
        a.setAttribute("aria-current", "page");
        a.classList.add("current");
      }
    });
  }

  function build() {
    if (document.getElementById(NAV_ID)) return;

    var old = document.querySelector("header");
    var nav = document.createElement("header");
    nav.id = NAV_ID;
    nav.className = "chica-site-nav";
    nav.setAttribute("role", "banner");
    nav.innerHTML =
      '<div class="chica-site-nav-inner">' +
        '<div class="chica-nav-menu">' +
          '<button class="chica-nav-logo" id="chicaNavLogo" type="button" aria-haspopup="true" aria-expanded="false" aria-controls="chicaNavDrop" aria-label="Open Chica Map menu" title="Open Chica Map menu">' +
            '<img src="' + ICON + '" alt="" width="42" height="42">' +
            '<span class="chica-nav-caret" aria-hidden="true">⌄</span>' +
          '</button>' +
          '<div class="chica-nav-drop" id="chicaNavDrop" role="menu" aria-label="Chica Map menu" hidden>' +
            section("Explore", item("map.html", "🗺️", "Open the Map", "Live sales, routes & map tools") +
              item("index.html", "🏠", "Home", "Chica Map overview") +
              item("backyard.html", "🌿", "The Backyard", "Community posts, updates & local stories") +\n              item("archive.html", "📦", "Archive", "Past notes and finds from Chica")) +
            section("Find & Share", item("submit.html", "📍", "List a Sale", "Add a garage, yard or estate sale") +
              item("sponsor.html", "🤝", "Sponsor Chica Map", "Partnerships & promotion")) +
            section("Stay Connected", item("https://www.facebook.com/61593215043603/", "f", "Follow on Facebook", "Updates and new finds", true)) +
            section("Help & Legal", item("disclaimer.html", "ⓘ", "Disclaimer", "Map accuracy & source notes") +
              item("privacy.html", "🔒", "Privacy", "How information is handled") +
              item("terms.html", "📄", "Terms", "Use of Chica Map")) +
            '<div class="chica-nav-footer"><span>Chica Map</span><span>San Antonio · Texas</span></div>' +
          '</div>' +
        '</div>' +
        '<a class="chica-nav-title" href="index.html" aria-label="Chica Map home"><strong>Chica\'s Map</strong><span>Garage Sale Intelligence Network</span></a>' +
        '<div class="chica-nav-actions"><a class="chica-nav-open" href="map.html">Open Map</a></div>' +
      '</div>';

    if (old) old.replaceWith(nav);
    else if (document.body) document.body.insertBefore(nav, document.body.firstChild);

    document.body.classList.add("chica-product");
    markCurrent(nav);

    var menu = nav.querySelector(".chica-nav-menu");
    var btn = nav.querySelector("#chicaNavLogo");
    var drop = nav.querySelector("#chicaNavDrop");
    var links = Array.from(drop.querySelectorAll('a[role="menuitem"]'));

    function close(restoreFocus) {
      if (!drop || !btn || !menu) return;
      drop.hidden = true;
      btn.setAttribute("aria-expanded", "false");
      menu.classList.remove("open");
      if (restoreFocus) btn.focus();
    }

    function open() {
      if (!drop || !btn || !menu) return;
      drop.hidden = false;
      btn.setAttribute("aria-expanded", "true");
      menu.classList.add("open");
    }

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      drop.hidden ? open() : close(false);
    });

    btn.addEventListener("keydown", function (e) {
      if ((e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") && drop.hidden) {
        e.preventDefault();
        open();
        if (links[0]) links[0].focus();
      }
    });

    drop.addEventListener("keydown", function (e) {
      var index = links.indexOf(document.activeElement);
      if (e.key === "Escape") {
        e.preventDefault();
        close(true);
      } else if (e.key === "ArrowDown" && index > -1) {
        e.preventDefault();
        links[(index + 1) % links.length].focus();
      } else if (e.key === "ArrowUp" && index > -1) {
        e.preventDefault();
        links[(index - 1 + links.length) % links.length].focus();
      }
    });

    links.forEach(function (a) { a.addEventListener("click", function () { close(false); }); });
    document.addEventListener("pointerdown", function (e) { if (!menu.contains(e.target)) close(false); });
  }

  function standardizeFavicon() {
    document.querySelectorAll('link[rel~="icon"], link[rel="apple-touch-icon"]').forEach(function (link) {
      link.href = ICON;
      if (link.rel.indexOf("icon") !== -1 && link.rel !== "apple-touch-icon") link.type = "image/svg+xml";
    });
    if (!document.querySelector('link[rel~="icon"]')) {
      var link = document.createElement("link");
      link.rel = "icon";
      link.type = "image/svg+xml";
      link.href = ICON;
      document.head.appendChild(link);
    }
  }

  function emergencyPreview() {
    var params = new URLSearchParams(location.search || "");
    if (params.get("emergency-preview") !== "1") return;
    var previousDeploy = null;
    try { previousDeploy = localStorage.getItem("chica_emergency_deploy"); } catch (_) {}
    try { window.CHICA_EMERGENCY_DEPLOY = true; } catch (_) {}
    var tries = 0;
    var timer = setInterval(function () {
      tries++;
      if (window.ChicaEmergencyInfo && typeof window.ChicaEmergencyInfo.toggle === "function") {
        clearInterval(timer);
        try { window.ChicaEmergencyInfo.toggle(); } catch (_) {}
        setTimeout(function () {
          try { window.ChicaEmergencyInfo.toggle(); } catch (_) {}
          try {
            if (previousDeploy === null) localStorage.removeItem("chica_emergency_deploy");
            else localStorage.setItem("chica_emergency_deploy", previousDeploy);
            history.replaceState({}, document.title, location.pathname + location.hash);
          } catch (_) {}
        }, 5000);
      } else if (tries > 70) clearInterval(timer);
    }, 100);
  }

  function init() {
    ensureStyles();
    setThemeColor();
    standardizeFavicon();
    build();
    emergencyPreview();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
