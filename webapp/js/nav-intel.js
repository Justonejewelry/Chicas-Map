/* Hide Intel from site headers. Intel stays on /intel and in the map KEY. */
(function () {
  function inHeader(el) {
    if (!el) return false;
    if (el.closest && el.closest("header, nav, [role='banner'], [aria-label='Primary'], [aria-label='Mobile']")) return true;
    if (!el.getBoundingClientRect) return false;
    var r = el.getBoundingClientRect();
    return r.top >= 0 && r.top < 120 && r.width > 0 && r.height > 0 && r.left < (window.innerWidth || 800);
  }
  function label(el) {
    return String((el.getAttribute("aria-label") || "") + " " + (el.textContent || ""))
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }
  function hrefOf(el) {
    return String(el.getAttribute("href") || el.getAttribute("to") || "").toLowerCase();
  }
  function hide(el) {
    el.style.setProperty("display", "none", "important");
    el.setAttribute("hidden", "");
    el.setAttribute("aria-hidden", "true");
  }
  function run() {
    var nodes = document.querySelectorAll("a, button");
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.id === "chica-listit-btn" || el.id === "chica-fs-btn" || el.id === "chica-near-btn") continue;
      if (el.closest && el.closest("#chica-force-key, #chica-key, #chica-listit-btn")) continue;
      var t = label(el);
      var href = hrefOf(el);
      var intelish = t === "intel" || t.indexOf("sale intel") !== -1 || /\/intel\/?$/.test(href) || href.indexOf("/intel/") !== -1;
      if (!intelish) continue;
      if (inHeader(el) || href.indexOf("/intel") !== -1 && inHeader(el.parentElement || el)) hide(el);
      if (inHeader(el)) hide(el);
    }
    var floatBtn = document.getElementById("chica-intel-btn");
    if (floatBtn) floatBtn.remove();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
  setInterval(run, 600);
})();
