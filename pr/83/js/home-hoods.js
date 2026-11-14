/* Homepage "Sales by neighborhood" links, placed under the mini-map. */
(function () {
  var B = "/Chicas-Map/preview/83/garage-sales/";
  var H = [
    ["stone-oak", "Stone Oak"],
    ["alamo-heights-midtown", "Alamo Heights & Midtown"],
    ["north-central", "North Central & Shavano Park"],
    ["medical-center", "Medical Center"],
    ["alamo-ranch-westover-hills", "Alamo Ranch & Westover Hills"],
    ["downtown-southtown", "Downtown & Southtown"],
    ["west-side", "West Side"],
    ["southwest-lackland", "Southwest San Antonio & Lackland"],
    ["south-side", "South Side"],
    ["east-side", "East Side"],
    ["northeast-live-oak-converse", "Live Oak, Converse & Universal City"],
    ["schertz-new-braunfels", "Schertz, Cibolo & New Braunfels"],
    ["boerne-hill-country", "Boerne & the Hill Country"]
  ];
  function isEs() { return String(document.documentElement.lang || "").toLowerCase().indexOf("es") === 0; }
  function css() {
    if (document.getElementById("chica-hoods-css")) return;
    var s = document.createElement("style");
    s.id = "chica-hoods-css";
    s.textContent =
      "#chica-hoods{width:calc(100% - 32px);max-width:960px;margin:8px auto 40px;font-family:Inter,system-ui,sans-serif}" +
      "#chica-hoods h2{font:800 22px/1.2 Syne,Inter,sans-serif;margin:0 0 14px;text-align:center}" +
      "#chica-hoods ul{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px}" +
      "#chica-hoods li a{display:block;padding:12px 14px;border-radius:12px;border:1px solid rgba(127,127,127,.28);color:inherit;text-decoration:none;font:600 14px/1.3 Inter,system-ui,sans-serif;background:rgba(127,127,127,.06)}" +
      "#chica-hoods li a:hover,#chica-hoods li a:focus-visible{border-color:#c513af;outline:none}" +
      "#chica-hoods .all{display:block;text-align:center;margin-top:14px;color:#c513af;font-weight:700;text-decoration:underline}";
    document.head.appendChild(s);
  }
  function build() {
    var es = isEs();
    var sec = document.createElement("section");
    sec.id = "chica-hoods";
    sec.setAttribute("aria-labelledby", "chica-hoods-h");
    sec.setAttribute("data-chica-keep", "1");
    var h = '<h2 id="chica-hoods-h">' + (es ? "Ventas por vecindario" : "Sales by neighborhood") + "</h2><ul>";
    H.forEach(function (x) { h += '<li><a href="' + B + x[0] + '/">' + x[1].replace(/&/g, "&amp;") + "</a></li>"; });
    h += '</ul><a class="all" href="' + B + '">' + (es ? "Ver todos los vecindarios" : "See all neighborhoods") + "</a>";
    h += '<a class="all" href="/Chicas-Map' + (es ? '/es' : '') + '/calendar/">' + (es ? 'Calendario de ventas y suscripción' : 'Sales calendar &amp; subscribe') + '</a>';
    sec.innerHTML = h;
    return sec;
  }
  function place() {
    var p = location.pathname;
    var base = "/Chicas-Map";
    if (base && p.indexOf(base) === 0) p = p.slice(base.length);
    if (p === "/es" || p.indexOf("/es/") === 0) p = p.slice(3);
    if (p !== "/" && p !== "" && p !== "/index.html") return;
    var main = document.querySelector("main");
    if (!main) return;
    css();
    var sec = document.getElementById("chica-hoods");
    var es = isEs();
    if (sec && sec.getAttribute("data-lang") !== (es ? "es" : "en")) { sec.remove(); sec = null; }
    if (!sec) { sec = build(); sec.setAttribute("data-lang", es ? "es" : "en"); }
    var anchor = document.getElementById("chica-home-mini-map") || main.querySelector("section");
    if (anchor && anchor.parentNode) {
      if (sec.previousElementSibling !== anchor) anchor.parentNode.insertBefore(sec, anchor.nextSibling);
    } else if (!sec.parentNode) main.appendChild(sec);
  }
  function boot() {
    place();
    var n = 0, t = setInterval(function () { place(); if (++n > 40) clearInterval(t); }, 500);
    new MutationObserver(function () { if (!document.getElementById("chica-hoods") || document.getElementById("chica-hoods").previousElementSibling !== document.getElementById("chica-home-mini-map")) place(); }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
