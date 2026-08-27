(function () {
  var HREF = "/Chicas-Map/preview/11/intel/";
  var MARK = "data-intel-nav";

  function norm(s) {
    return String(s || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function isHuntLabel(t) {
    return (
      t === "come hunt" ||
      t === "come hunt with me" ||
      t.indexOf("come hunt") !== -1 ||
      t === "ven a cazar" ||
      t === "a cazar" ||
      t.indexOf("ven a cazar") !== -1
    );
  }

  function inTopBar(el) {
    if (!el || !el.getBoundingClientRect) return false;
    var r = el.getBoundingClientRect();
    return r.top >= 0 && r.top < 88 && r.width > 0 && r.height > 0;
  }

  function apply(el) {
    el.setAttribute(MARK, "1");
    el.setAttribute("aria-label", "Chicas Sale Intel");
    if (el.tagName === "A") {
      el.setAttribute("href", HREF);
    } else if (!el.getAttribute("data-intel-click")) {
      el.setAttribute("data-intel-click", "1");
      el.addEventListener(
        "click",
        function (e) {
          e.preventDefault();
          e.stopPropagation();
          location.href = HREF;
        },
        true,
      );
    }
    if (norm(el.textContent) !== "intel") el.textContent = "Intel";
  }

  function run() {
    var nodes = document.querySelectorAll("a,button");
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.id === "chica-intel-btn" || el.id === "chica-fs-btn") continue;
      if (el.getAttribute(MARK) === "1") {
        apply(el);
        continue;
      }
      if (!isHuntLabel(norm(el.textContent))) continue;
      if (!inTopBar(el)) continue;
      apply(el);
    }
    var floating = document.getElementById("chica-intel-btn");
    var onMap = /\/map\/?$/.test(location.pathname || "") || (location.pathname || "").indexOf("/map/") !== -1;
    if (floating && !onMap) floating.style.setProperty("display", "none", "important");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
  setInterval(run, 700);
  window.addEventListener("popstate", function () {
    setTimeout(run, 50);
  });
})();
