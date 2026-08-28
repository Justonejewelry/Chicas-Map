/* Hide Intel from the site header. Intel lives on /intel and in the map KEY. */
(function () {
  function inTopBar(el) {
    if (!el || !el.getBoundingClientRect) return false;
    var r = el.getBoundingClientRect();
    return r.top >= 0 && r.top < 96 && r.width > 0 && r.height > 0;
  }
  function label(el) {
    return String((el.getAttribute("aria-label") || "") + " " + (el.textContent || ""))
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }
  function run() {
    var nodes = document.querySelectorAll("a, button");
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.id === "chica-listit-btn" || el.id === "chica-fs-btn" || el.id === "chica-near-btn") continue;
      if (!inTopBar(el)) continue;
      var t = label(el);
      if (t === "intel" || t.indexOf("sale intel") !== -1) {
        el.style.setProperty("display", "none", "important");
        el.setAttribute("hidden", "");
        el.setAttribute("aria-hidden", "true");
      }
    }
    var floatBtn = document.getElementById("chica-intel-btn");
    if (floatBtn) floatBtn.remove();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
  setInterval(run, 800);
})();
