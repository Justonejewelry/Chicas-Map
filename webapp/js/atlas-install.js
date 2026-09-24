/* Register Atlas SW + install prompt. */
(function () {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("/Chicas-Map/atlas/sw.js", { scope: "/Chicas-Map/atlas/" }).catch(function () {});
  var deferred = null;
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferred = e;
    var btn = document.getElementById("atlas-install-btn");
    if (btn) btn.hidden = false;
  });
  document.addEventListener("click", function (e) {
    var t = e.target && e.target.closest && e.target.closest("#atlas-install-btn");
    if (!t || !deferred) return;
    deferred.prompt();
    deferred = null;
    t.hidden = true;
  });
})();
