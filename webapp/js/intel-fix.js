/* Style the sale card only after it has content. Never force an empty node open. */
(function () {
  function paint(el) {
    if (!el || !el.querySelector(".chica-opt, .near-label")) return;
    el.style.setProperty("position", "fixed", "important");
    el.style.setProperty("left", "12px", "important");
    el.style.setProperty("top", "58px", "important");
    el.style.setProperty("z-index", "2147483647", "important");
    el.style.setProperty("width", "min(340px, calc(100vw - 24px))", "important");
    el.style.setProperty("max-height", "min(74dvh, 560px)", "important");
    el.style.setProperty("overflow", "auto", "important");
    el.style.setProperty("background", "#fffdf8", "important");
    el.style.setProperty("color", "#1a1714", "important");
    el.style.setProperty("border", "2px solid #c513af", "important");
    el.style.setProperty("border-radius", "14px", "important");
    el.style.setProperty("padding", "14px", "important");
  }
  function watch() {
    var el = document.getElementById("chica-intel-card");
    if (el && el.style.display !== "none" && el.querySelector(".near-label, .chica-opt")) paint(el);
  }
  document.addEventListener("click", function () { setTimeout(watch, 40); }, true);
})();
