/* Pack Pin promo removed. Strip a leftover mount if an old page still loads this file. */
(function () {
  function kill() {
    var el = document.getElementById("chica-pack-promo");
    if (el && el.parentNode) el.parentNode.removeChild(el);
    var css = document.getElementById("chica-pack-promo-css");
    if (css && css.parentNode) css.parentNode.removeChild(css);
  }
  kill();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", kill);
  setTimeout(kill, 400);
  setTimeout(kill, 1600);
})();
