/* Bottom-right CTA: Chica face + Boost my Garage Sale. Uses hosted logo — never a broken "?". */
(function () {
  var p = location.pathname || "";
  if (!(/\/map\/?$/.test(p) || p.indexOf("/map/") !== -1 || /map\.html$/.test(p))) return;
  var LOGO = "/Chicas-Map/images/chica-logo.png";
  var HERO = "/Chicas-Map/images/chica-hero.jpg";
  var HREF = "/Chicas-Map/boost/";

  function css() {
    if (document.getElementById("chica-cta-pop")) return;
    var s = document.createElement("style");
    s.id = "chica-cta-pop";
    s.textContent =
      "@keyframes chica-pop{0%,100%{transform:scale(1) rotate(-2deg)}50%{transform:scale(1.08) rotate(2deg)}}" +
      "@keyframes chica-ring{0%{box-shadow:0 0 0 0 rgba(197,19,175,.75),0 14px 32px rgba(197,19,175,.55)}70%{box-shadow:0 0 0 16px rgba(197,19,175,0),0 14px 32px rgba(197,19,175,.55)}100%{box-shadow:0 0 0 0 rgba(197,19,175,0),0 14px 32px rgba(197,19,175,.55)}}" +
      "#chica-listit-btn{position:fixed!important;right:12px!important;bottom:calc(14px + env(safe-area-inset-bottom,0px))!important;left:auto!important;top:auto!important;" +
      "z-index:2147483647!important;display:block!important;width:128px!important;height:132px!important;min-width:128px!important;padding:0!important;" +
      "border:4px solid #fffdf8!important;border-radius:24px!important;overflow:hidden!important;" +
      "background:#c513af url(/Chicas-Map/images/chica-logo.png) center 36%/cover no-repeat!important;" +
      "animation:chica-pop 1.15s ease-in-out infinite,chica-ring 1.6s ease-out infinite!important;text-decoration:none!important;pointer-events:auto!important}" +
      "#chica-listit-btn img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 24%;pointer-events:none;background:transparent}" +
      "#chica-listit-btn .chica-cta-label{position:absolute;left:0;right:0;bottom:0;z-index:2;padding:7px 6px 8px;background:linear-gradient(transparent,#7a0a6c 48%);" +
      "font:800 11px/1.15 Inter,system-ui,sans-serif;letter-spacing:.01em;text-transform:none;text-align:center;color:#fff;text-shadow:0 1px 3px #000}" +
      "@media (prefers-reduced-motion:reduce){#chica-listit-btn{animation:none!important}}";
    (document.head || document.documentElement).appendChild(s);
  }

  function paint() {
    css();
    var a = document.getElementById("chica-listit-btn");
    if (!a) {
      a = document.createElement("a");
      a.id = "chica-listit-btn";
      document.documentElement.appendChild(a);
    } else if (a.parentNode !== document.documentElement) {
      document.documentElement.appendChild(a);
    }
    a.setAttribute("href", HREF);
    a.setAttribute("data-cta", "boost");
    a.setAttribute("aria-label", "Boost my Garage Sale");
    a.title = "Boost my Garage Sale";
    if (a.getAttribute("data-painted") !== "10") {
      a.setAttribute("data-painted", "10");
      a.innerHTML =
        '<img alt="Chica" width="128" height="132" src="' + LOGO + '">' +
        '<span class="chica-cta-label">Boost my Garage Sale</span>';
      var img = a.querySelector("img");
      img.onerror = function () {
        if (img.getAttribute("src") !== HERO) img.src = HERO;
      };
    }
  }

  paint();
  setInterval(paint, 1200);
})();
