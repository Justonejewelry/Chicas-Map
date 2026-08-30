/* First click must load Leaflet webapp/map/index.html.
   SPA /map is a second map. Refresh used to be the only way onto the real one. */
(function () {
  var BASE = "/Chicas-Map";
  var TARGET = BASE + "/map/";

  function path() {
    return location.pathname || "";
  }

  function isMapPath(p) {
    p = p || path();
    return /\/map\/?$/.test(p) || /map\.html$/.test(p);
  }

  function isLiveLeaflet() {
    return Boolean(
      document.getElementById("chica-live-map") ||
        document.querySelector("script[src*='chica-live-map.js']")
    );
  }

  function dest(search, hash) {
    return TARGET + (search != null ? search : location.search || "") + (hash != null ? hash : location.hash || "");
  }

  function bounce() {
    if (!isMapPath()) return false;
    if (isLiveLeaflet()) return false;
    var next = dest();
    if (location.href.replace(/\/?$/, "/") === (location.origin + next).replace(/\/?$/, "/") && isLiveLeaflet()) {
      return false;
    }
    location.replace(next);
    return true;
  }

  function mapUrlFromHref(href) {
    if (!href || href.charAt(0) === "#") return null;
    var abs;
    try {
      abs = new URL(href, location.href);
    } catch (e) {
      return null;
    }
    if (abs.origin !== location.origin) return null;
    if (!isMapPath(abs.pathname)) return null;
    return dest(abs.search, abs.hash);
  }

  function rewrite(a) {
    var next = mapUrlFromHref(a.getAttribute("href"));
    if (!next) return;
    a.setAttribute("href", next);
    a.setAttribute("data-chica-live-map", "1");
  }

  function scan() {
    var nodes = document.querySelectorAll("a[href]");
    for (var i = 0; i < nodes.length; i++) rewrite(nodes[i]);
  }

  document.addEventListener(
    "click",
    function (ev) {
      if (ev.defaultPrevented) return;
      if (ev.button !== 0) return;
      if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
      var a = ev.target && ev.target.closest ? ev.target.closest("a[href]") : null;
      if (!a) return;
      if (a.target && a.target !== "_self") return;
      var next = mapUrlFromHref(a.getAttribute("href"));
      if (!next) return;
      ev.preventDefault();
      ev.stopPropagation();
      if (typeof ev.stopImmediatePropagation === "function") ev.stopImmediatePropagation();
      location.assign(next);
    },
    true
  );

  window.addEventListener("popstate", function () {
    setTimeout(bounce, 0);
  });

  if (!bounce()) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", scan);
    else scan();
    setInterval(function () {
      bounce();
      scan();
    }, 250);
  }
})();
