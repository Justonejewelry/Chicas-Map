/* Intel is not a map layer. Details live on the pin-click card. */
(function () {
  var p = location.pathname || "";
  if (!(/\/map\/?$/.test(p) || p.indexOf("/map/") !== -1 || /map\.html$/.test(p))) return;
  function wipe() {
    document.documentElement.classList.remove("chica-intel-on", "chica-intel-off");
    var badges = document.querySelectorAll(".chica-intel-badge");
    for (var i = 0; i < badges.length; i++) badges[i].remove();
    var rows = document.querySelectorAll('[data-chica-layer="intel"]');
    for (var j = 0; j < rows.length; j++) rows[j].remove();
  }
  window.__chicaStampIntel = function () { wipe(); return 0; };
  wipe();
  setInterval(wipe, 800);
})();
