/**
 * Chicas Map app bootstrap
 * Loads the last known-good full app.js from a pinned commit via jsDelivr,
 * then local chica-go-fix.js (included from map.html) enhances Go/Near Me.
 *
 * To update the core app: change the commit SHA below after verifying a new build.
 */
(function () {
  var PINNED =
    "https://cdn.jsdelivr.net/gh/Justonejewelry/Chicas-Map@bede2cc27d72df9effd1952c2f6a7bf47516646b/webapp/js/app.js";

  var s = document.createElement("script");
  s.src = PINNED;
  s.async = false;
  s.onerror = function () {
    // Fallback: raw GitHub
    var s2 = document.createElement("script");
    s2.src =
      "https://raw.githubusercontent.com/Justonejewelry/Chicas-Map/bede2cc27d72df9effd1952c2f6a7bf47516646b/webapp/js/app.js";
    s2.onerror = function () {
      var el = document.createElement("div");
      el.setAttribute(
        "style",
        "position:fixed;bottom:12px;left:12px;right:12px;z-index:99999;background:#7f1d1d;color:#fff;padding:12px 14px;border-radius:12px;font:600 14px/1.4 system-ui,sans-serif"
      );
      el.textContent =
        "Map script failed to load. Hard-refresh, or check your connection.";
      document.body.appendChild(el);
    };
    document.head.appendChild(s2);
  };
  document.head.appendChild(s);
})();
