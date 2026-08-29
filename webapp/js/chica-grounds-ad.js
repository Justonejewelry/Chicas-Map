/* Home screen: do not inject the Grounds & Around pack-leader card. */
(function () {
  function wipe() {
    var el = document.getElementById("grounds-ad-home");
    if (el && el.parentNode) el.parentNode.removeChild(el);
    var css = document.getElementById("chica-grounds-ad-css");
    if (css && css.parentNode) css.parentNode.removeChild(css);
    var nodes = document.querySelectorAll("section, article, a");
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (n.id === "grounds-ad-home") {
        if (n.parentNode) n.parentNode.removeChild(n);
        continue;
      }
      var t = String(n.textContent || "").toLowerCase();
      if (t.indexOf("pack leader") === -1) continue;
      if (t.indexOf("grounds") === -1) continue;
      if (n.closest && n.closest("header, nav")) continue;
      if (n.parentNode) n.parentNode.removeChild(n);
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wipe);
  else wipe();
  var k = 0;
  var id = setInterval(function () {
    wipe();
    k += 1;
    if (k > 8) clearInterval(id);
  }, 400);
})();
