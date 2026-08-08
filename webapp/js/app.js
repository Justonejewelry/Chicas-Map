(function () {
  var s = document.createElement("script");
  s.src = "https://cdn.jsdelivr.net/gh/Justonejewelry/Chicas-Map@bede2cc27d72df9effd1952c2f6a7bf47516646b/webapp/js/app.js";
  s.onerror = function () {
    document.body.insertAdjacentHTML(
      "beforeend",
      "<div style='position:fixed;bottom:12px;left:12px;right:12px;background:#7f1d1d;color:#fff;padding:12px;border-radius:10px;z-index:9999;font:14px system-ui'>Map script failed to load. Please hard-refresh in a moment.</div>"
    );
  };
  document.head.appendChild(s);
})();
