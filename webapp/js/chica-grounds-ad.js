/* Home screen only: strip the Grounds & Around pack-leader card from home. Never touch /sponsors/. */
(function () {
  var path = (location.pathname || "").toLowerCase();
  if (path.indexOf("/sponsors") !== -1 || path.indexOf("/sponsor") !== -1) return;

  function wipe() {
    var el = document.getElementById("grounds-ad-home");
    if (el && el.parentNode) el.parentNode.removeChild(el);
    var css = document.getElementById("chica-grounds-ad-css");
    if (css && css.parentNode) css.parentNode.removeChild(css);
    var nodes = document.querySelectorAll("#grounds-ad-home");
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].parentNode) nodes[i].parentNode.removeChild(nodes[i]);
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wipe);
  else wipe();
})();
