/* Homepage + nav: Alamo Atlas civic layer. SPA-safe; re-inserts if React wipes it. */
(function () {
  var ID = "chica-atlas-home";
  var NAV_ID = "chica-atlas-nav";
  var HREF = "/Chicas-Map/atlas/";

  function path() {
    return String(location.pathname || "").replace(/\/+$/, "") || "/";
  }

  function isHome() {
    var p = path();
    return p === "/Chicas-Map" || p === "/" || /\/index\.html$/i.test(p);
  }

  function isEs() {
    return String(document.documentElement.lang || "").toLowerCase().indexOf("es") === 0;
  }

  function copy() {
    if (isEs()) {
      return {
        kicker: "Capa civica · prueba Grok Build",
        title: "Alamo Atlas",
        body: "Despacho SAPD en vivo y reportes de delitos por vecindario, con datos publicos de la ciudad. La misma manada. Otro trabajo. No es el 911.",
        cta: "Abrir Atlas",
        nav: "Atlas",
      };
    }
    return {
      kicker: "Civic layer · Grok Build POC",
      title: "Alamo Atlas",
      body: "Live SAPD on-scene calls and neighborhood offense reports from public city data. Same pack. Different job. Not 911.",
      cta: "Open Atlas",
      nav: "Atlas",
    };
  }

  function addNav() {
    if (document.getElementById(NAV_ID)) return;
    var navs = document.querySelectorAll("header nav, nav[aria-label='Primary'], nav[aria-label='Mobile']");
    if (!navs.length) return;
    var c = copy();
    for (var i = 0; i < navs.length; i++) {
      var nav = navs[i];
      var a = document.createElement("a");
      a.id = i === 0 ? NAV_ID : NAV_ID + "-" + i;
      a.href = HREF;
      a.textContent = c.nav;
      a.className = "rounded-full px-3 py-1.5 text-sm font-semibold text-pine-mid hover:bg-pine-soft hover:text-pine-deep";
      nav.appendChild(a);
    }
  }

  function addCard() {
    if (!isHome()) {
      var stale = document.getElementById(ID);
      if (stale && stale.parentNode) stale.parentNode.removeChild(stale);
      return;
    }
    if (document.getElementById(ID)) return;
    var main = document.querySelector("main");
    if (!main) return;
    var c = copy();
    var section = document.createElement("section");
    section.id = ID;
    section.setAttribute("aria-label", "Alamo Atlas");
    section.className = "border-y border-line bg-paper";
    section.innerHTML =
      '<div class="mx-auto grid max-w-6xl items-center gap-6 px-4 py-8 sm:grid-cols-[minmax(0,1.2fr)_auto] sm:py-10">' +
      '<div>' +
      '<p class="text-xs font-bold tracking-[0.16em] text-pine-mid uppercase">' +
      c.kicker +
      "</p>" +
      '<h2 class="mt-1 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">' +
      c.title +
      "</h2>" +
      '<p class="mt-2 max-w-xl text-sm leading-relaxed text-muted">' +
      c.body +
      "</p>" +
      "</div>" +
      '<a href="' +
      HREF +
      '" class="inline-flex h-12 min-h-12 items-center justify-center rounded-full bg-pine px-6 text-sm font-semibold text-cream">' +
      c.cta +
      "</a>" +
      "</div>";
    var hero = main.children[0];
    if (hero && hero.nextSibling) main.insertBefore(section, hero.nextSibling);
    else main.appendChild(section);
  }

  function run() {
    addNav();
    addCard();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
  setInterval(run, 900);
  window.addEventListener("popstate", function () {
    setTimeout(run, 50);
  });
})();
