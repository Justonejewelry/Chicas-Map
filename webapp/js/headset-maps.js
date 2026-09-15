/* Homepage headset: Come hunt → Sales Map, plus Crime Map → Alamo Atlas. SPA-safe. */
(function () {
  var CRIME_HREF = "https://chicas-alamo-atlas.grok.me/";
  var SALES_HREF = "/Chicas-Map/map/";
  var CRIME_ID = "chica-crime-map-btn";

  function isEs() {
    return String(document.documentElement.lang || "").toLowerCase().indexOf("es") === 0;
  }

  function copy() {
    if (isEs()) return { sales: "Mapa de ventas", crime: "Mapa del crimen" };
    return { sales: "Sales Map", crime: "Crime Map" };
  }

  function inHeadset(el) {
    if (!el) return false;
    if (el.closest && el.closest("header, [role='banner']")) return true;
    if (!el.getBoundingClientRect) return false;
    var r = el.getBoundingClientRect();
    return r.top >= 0 && r.top < 90 && r.height > 0 && r.left > (window.innerWidth || 800) * 0.35;
  }

  function textOf(el) {
    return String(el.textContent || "").replace(/\s+/g, " ").trim();
  }

  function hrefOf(el) {
    return String(el.getAttribute("href") || "");
  }

  function isHuntCta(el) {
    if (!inHeadset(el)) return false;
    if (el.id === CRIME_ID) return false;
    var t = textOf(el).toLowerCase();
    var href = hrefOf(el);
    if (t === "come hunt" || t.indexOf("come hunt") !== -1) return true;
    if (t === "ven a cazar" || t.indexOf("cazar") !== -1) return true;
    if ((t === "sales map" || t === "mapa de ventas") && href.indexOf("/map") !== -1) return true;
    return false;
  }

  function findHunt() {
    var nodes = document.querySelectorAll("header a, header button, [role='banner'] a");
    for (var i = 0; i < nodes.length; i++) {
      if (isHuntCta(nodes[i])) return nodes[i];
    }
    return null;
  }

  function relabel(el, label) {
    if (textOf(el) === label) return;
    var kids = el.childNodes;
    if (kids.length === 1 && kids[0].nodeType === 3) {
      kids[0].nodeValue = label;
      return;
    }
    for (var i = 0; i < kids.length; i++) {
      if (kids[i].nodeType === 3 && String(kids[i].nodeValue).trim()) {
        kids[i].nodeValue = label;
        return;
      }
    }
    el.textContent = label;
  }

  function addCrime(hunt) {
    if (document.getElementById(CRIME_ID)) return;
    var parent = hunt.parentNode;
    if (!parent) return;
    var a = document.createElement("a");
    a.id = CRIME_ID;
    a.href = CRIME_HREF;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = copy().crime;
    a.setAttribute("aria-label", copy().crime);
    a.className = hunt.className || "inline-flex items-center justify-center rounded-full px-3 py-2 text-sm font-semibold";
    parent.insertBefore(a, hunt.nextSibling);
  }

  function run() {
    var hunt = findHunt();
    if (!hunt) return;
    var c = copy();
    relabel(hunt, c.sales);
    if (hrefOf(hunt).indexOf("/map") !== -1) hunt.setAttribute("href", SALES_HREF);
    hunt.setAttribute("aria-label", c.sales);
    addCrime(hunt);
    var crime = document.getElementById(CRIME_ID);
    if (crime) {
      crime.setAttribute("href", CRIME_HREF);
      if (textOf(crime) !== c.crime) crime.textContent = c.crime;
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
  setInterval(run, 700);
  window.addEventListener("popstate", function () {
    setTimeout(run, 50);
  });
})();
