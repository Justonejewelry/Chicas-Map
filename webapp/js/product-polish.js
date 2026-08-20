/* Chica Map — focused page-level product polish for Home + Map. */
(function () {
  "use strict";

  function addStyle(id, css) {
    if (document.getElementById(id)) return;
    var style = document.createElement("style");
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
  }

  function loadSharedChrome() {
    if (document.getElementById("chicaSiteNavJs") || document.getElementById("chica-standard-nav")) return;
    var script = document.createElement("script");
    script.id = "chicaSiteNavJs";
    script.src = "js/site-nav.js?v=20260820-product";
    script.defer = true;
    document.body.appendChild(script);
  }

  function homePolish() {
    document.body.classList.add("chica-home-product");
    var eyebrow = document.querySelector(".eyebrow");
    if (eyebrow) eyebrow.innerHTML = '<span class="pulse"></span> San Antonio · Live sale intelligence';
    var title = document.querySelector(".hero-inner h1");
    if (title) title.innerHTML = 'Find the sale.<br><em>Plan the hunt.</em>';
    var lead = document.querySelector(".hero-inner .lead");
    if (lead) lead.textContent = 'Verified garage, yard, and estate sales with the tools to find nearby deals and build a smarter route.';
    var primary = document.querySelector(".hero-cta .btn-primary");
    if (primary) primary.textContent = 'Open live map →';
    var secondary = document.querySelector(".hero-cta .btn-ghost");
    if (secondary) secondary.textContent = 'List a sale — free';

    addStyle("chicaHomeProductPolish", [
      ":root{--chica:#c513b8;--chica-deep:#8f0b85;--chica-soft:#fae7f8}",
      ".chica-home-product{background:#f7f7f5}",
      ".chica-home-product .hero-stage{min-height:min(76vh,760px);background:radial-gradient(circle at 50% 20%,#fff 0,#f8f8f6 46%,#eee 100%)}",
      ".chica-home-product .hero-map-bg{opacity:.11;filter:grayscale(.28) contrast(1.08)}",
      ".chica-home-product .hero-map-veil{background:radial-gradient(ellipse 75% 66% at 50% 34%,rgba(255,255,255,.48),rgba(247,247,245,.88) 64%,rgba(242,242,240,.98))}",
      ".chica-home-product .hero-video-card{max-width:290px;border-radius:28px;background:#111;border:5px solid #fff;box-shadow:0 24px 70px -28px rgba(20,17,15,.42)}",
      ".chica-home-product .hero-caption{font-size:.78rem;letter-spacing:.04em;text-transform:uppercase;color:#777}",
      ".chica-home-product .eyebrow{color:var(--chica-deep);background:var(--chica-soft);border-color:#f0c8eb;box-shadow:none}",
      ".chica-home-product .eyebrow .pulse{background:var(--chica);box-shadow:0 0 0 4px rgba(197,19,184,.13)}",
      ".chica-home-product .hero-inner h1{font-size:clamp(2.45rem,6.2vw,4.65rem);line-height:.98;max-width:760px;margin-inline:auto;text-wrap:balance}",
      ".chica-home-product .hero-inner h1 em{color:var(--chica);text-decoration:none}",
      ".chica-home-product .lead{font-size:1.08rem;max-width:52ch;color:#5d5b58}",
      ".chica-home-product .btn-primary{background:#111;box-shadow:0 14px 32px -14px rgba(0,0,0,.45)}",
      ".chica-home-product .btn-primary:hover{background:var(--chica-deep)}",
      ".chica-home-product .btn-ghost:hover{background:var(--chica-soft);border-color:var(--chica)}",
      ".chica-home-product .cm-live{background:linear-gradient(135deg,#111,#282127);border:1px solid rgba(197,19,184,.42);box-shadow:0 18px 44px -20px rgba(0,0,0,.48)}",
      ".chica-home-product .live-stat b{color:#ffb6f7}.chica-home-product .zone-chip:hover{background:var(--chica);color:#fff}",
      ".chica-home-product .trust-card{border-color:#e9e7e4;border-radius:22px;padding:28px 22px;box-shadow:0 14px 34px -24px rgba(20,17,15,.32)}",
      ".chica-home-product .trust-card:hover{border-color:#efb6e8;transform:translateY(-5px);box-shadow:0 24px 48px -28px rgba(197,19,184,.26)}",
      ".chica-home-product .trust-card h2{font-size:1.28rem}.chica-home-product .trust-card .trust-action{border-color:#e5b7df}.chica-home-product .trust-card .trust-action:hover{color:var(--chica-deep)}",
      ".chica-home-product .email-card{border-radius:24px;border-color:#ead6e7;background:linear-gradient(135deg,#fff,#fff9fe);box-shadow:0 20px 46px -30px rgba(197,19,184,.28)}",
      ".chica-home-product .email-copy h2{font-size:1.45rem}.chica-home-product .email-form input[type=email]:focus{outline:3px solid rgba(197,19,184,.16);border-color:var(--chica)}",
      ".chica-home-product .foot-bottom{border-color:#e9e6e3}",
      "@media(max-width:700px){.chica-home-product .hero-stage{min-height:auto}.chica-home-product .hero-video-card{max-width:220px;margin-bottom:18px}.chica-home-product .hero-inner{padding-top:26px}.chica-home-product .hero-inner h1{font-size:clamp(2.3rem,11vw,3.3rem)}.chica-home-product .btn-lg{width:100%}.chica-home-product .cm-live-wrap{padding-inline:14px}.chica-home-product .email-card{padding:20px}.chica-home-product .email-form{width:100%}.chica-home-product .email-form input[type=email],.chica-home-product .email-form button{width:100%;min-width:0}}"
    ].join("\n"));
  }

  function mapPolish() {
    document.body.classList.add("chica-map-product");
    addStyle("chicaMapProductPolish", [
      ":root{--chica:#c513b8;--chica-soft:#fae7f8}",
      ".chica-map-product .rail-cta{background:#111!important;border-color:#111!important}.chica-map-product .rail-cta:hover{background:var(--chica-deep,#8f0b85)!important}",
      ".chica-map-product .near-btn.primary,.chica-map-product .scope-btn.active,.chica-map-product .day-btn.active{background:var(--chica)!important;border-color:var(--chica)!important;color:#fff!important}",
      ".chica-map-product .tool-btn:hover,.chica-map-product .near-btn:hover{border-color:var(--chica)!important;box-shadow:0 8px 22px -14px rgba(197,19,184,.55)}",
      ".chica-map-product .panel,.chica-map-product .rail-section{border-radius:16px}",
      ".chica-map-product .keyword-input:focus,.chica-map-product .loc-input:focus,.chica-map-product input:focus,.chica-map-product select:focus{outline:3px solid rgba(197,19,184,.15);border-color:var(--chica)!important}",
      ".chica-map-product .maplibregl-popup-content{border-color:#edc7e9;box-shadow:0 18px 44px rgba(20,17,15,.18)}",
      ".chica-map-product .sale-list>*{scroll-margin-top:110px}",
      ".chica-map-product #mapProductHud{position:fixed;right:18px;top:82px;z-index:45;display:flex;align-items:center;gap:9px;padding:9px 12px;background:rgba(17,17,17,.92);color:#fff;border:1px solid rgba(255,255,255,.12);border-radius:999px;box-shadow:0 12px 32px rgba(0,0,0,.22);font-size:.78rem;font-weight:800;backdrop-filter:blur(14px);pointer-events:none}",
      ".chica-map-product #mapProductHud b{color:#ffb6f7}.chica-map-product #mapProductHud .dot{width:8px;height:8px;border-radius:50%;background:#ff45df;box-shadow:0 0 0 4px rgba(255,69,223,.13)}",
      "@media(max-width:760px){.chica-map-product #mapProductHud{top:74px;right:12px;font-size:.72rem;padding:8px 10px}.chica-map-product #mapProductHud .hud-copy{display:none}}"
    ].join("\n"));

    if (!document.getElementById("mapProductHud")) {
      var hud = document.createElement("div");
      hud.id = "mapProductHud";
      hud.setAttribute("aria-live", "polite");
      hud.innerHTML = '<span class="dot"></span><span class="hud-copy">Live map</span><b id="mapProductCount">0 sales</b>';
      document.body.appendChild(hud);
      var source = document.getElementById("listCount");
      var target = document.getElementById("mapProductCount");
      function sync() { if (source && target) target.textContent = (source.textContent || "0") + " sales"; }
      sync();
      if (source && window.MutationObserver) new MutationObserver(sync).observe(source, { childList:true, characterData:true, subtree:true });
    }
  }

  function init() {
    var page = location.pathname.split("/").pop() || "index.html";
    if (page === "index.html" || location.pathname.endsWith("/")) homePolish();
    if (page === "map.html" || page.indexOf("map-full") === 0) mapPolish();
    loadSharedChrome();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
