/**
 * Chicas Map app bootstrap — loads local type-colored pin core.
 */
(function () {
  var s = document.createElement("script");
  s.src = "js/app-full.js?v=pincolors1";
  s.async = false;
  s.onerror = function () {
    var el = document.createElement("div");
    el.setAttribute("style","position:fixed;bottom:12px;left:12px;right:12px;z-index:99999;background:#7f1d1d;color:#fff;padding:12px 14px;border-radius:12px;font:600 14px/1.4 system-ui,sans-serif");
    el.textContent = "Map script failed to load. Hard-refresh, or check your connection.";
    document.body.appendChild(el);
  };
  document.head.appendChild(s);
})();
