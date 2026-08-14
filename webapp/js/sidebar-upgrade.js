/** Runtime upgrade: details sidebar polish (mockup) without full HTML rewrite */
(function () {
  function upgrade() {
    if (!document.querySelector('link[href*="map-sidebar.css"]')) {
      var link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "css/map-sidebar.css?v=sidebar1";
      document.head.appendChild(link);
    }

    var cta = document.querySelector(".rail-cta");
    if (cta && !cta.querySelector(".rail-cta-copy")) {
      cta.innerHTML =
        '<span class="rail-cta-icon" aria-hidden="true">🏷</span>' +
        '<span class="rail-cta-copy"><strong>+ List your sale free</strong>' +
        "<span>Reach more shoppers in your area</span></span>" +
        '<span class="rail-cta-arrow" aria-hidden="true">→</span>';
    }

    var near = document.getElementById("btnNearMe");
    if (near && !near.querySelector(".near-sub")) {
      var sub = document.createElement("span");
      sub.className = "near-sub";
      sub.style.cssText =
        "display:block;font-size:0.72rem;font-weight:500;opacity:.85;margin-top:2px";
      sub.textContent = "See sales near your location";
      near.appendChild(sub);
    }

    if (!document.querySelector(".keyword-hint")) {
      var row = document.querySelector(".keyword-row");
      if (row && row.parentNode) {
        var hint = document.createElement("p");
        hint.className = "keyword-hint";
        hint.textContent = "Search tags: tools, furniture, kids";
        row.parentNode.insertBefore(hint, row);
      }
    }

    var title = document.getElementById("listTitle");
    if (title && title.textContent === "Sales") {
      title.textContent = "Sales nearby";
    }

    var route = document.getElementById("btnRoute");
    if (route && route.textContent.indexOf("Routes") === -1) {
      var count = document.getElementById("routeCount");
      var n = count ? count.textContent : "0";
      // Build with DOM APIs — never re-interpret textContent as HTML
      route.textContent = "";
      route.appendChild(document.createTextNode("🔗 Routes "));
      var span = document.createElement("span");
      span.id = "routeCount";
      span.textContent = n;
      route.appendChild(span);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", upgrade);
  } else {
    upgrade();
  }
  setTimeout(upgrade, 1500);
  setTimeout(upgrade, 4000);
})();
