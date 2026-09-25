/* Homepage Vegas promo: Like. Follow. Share. Get 1 free day Pack Pin. */
(function () {
  var ID = "chica-pack-promo";
  var CSS = "chica-pack-promo-css";
  var FB = "https://www.facebook.com/Justone.Jewelry.Justin/";
  var BOOST = "/Chicas-Map/boost/";
  var LOGO = "/Chicas-Map/images/chica-logo.png";

  function path() {
    return String(location.pathname || "").replace(/\/+$/, "") || "/";
  }
  function isHome() {
    var p = path();
    return p === "/Chicas-Map" || p === "/" || /\/index\.html$/i.test(p);
  }

  function css() {
    if (document.getElementById(CSS)) return;
    var s = document.createElement("style");
    s.id = CSS;
    s.textContent =
      "@keyframes chica-vegas-chase{0%{background-position:0 0}100%{background-position:56px 0}}" +
      "@keyframes chica-vegas-glow{0%,100%{filter:drop-shadow(0 0 8px #ffd76a) drop-shadow(0 0 18px #c513af)}50%{filter:drop-shadow(0 0 16px #fff3b0) drop-shadow(0 0 28px #c513af)}}" +
      "@keyframes chica-vegas-flash{0%,40%,100%{opacity:1}50%{opacity:.55}55%{opacity:1}}" +
      "@keyframes chica-vegas-spark{0%,100%{transform:scale(.7) rotate(0deg);opacity:.35}50%{transform:scale(1.15) rotate(20deg);opacity:1}}" +
      "#chica-pack-promo{position:relative;overflow:hidden;margin:0;padding:6px;background:#07040a;isolation:isolate}" +
      "#chica-pack-promo .chase{position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(90deg,#ffd76a 0 10px,#1a0a16 10px 18px,#fff6c2 18px 22px,#1a0a16 22px 28px);background-size:56px 100%;animation:chica-vegas-chase .55s linear infinite}" +
      "#chica-pack-promo .inner{position:relative;display:grid;gap:14px;align-items:center;margin:0 auto;max-width:72rem;padding:18px 16px 20px;background:radial-gradient(120% 140% at 12% 0%,#5a1038 0%,#12060f 42%,#07040a 100%);border:2px solid #f3c44a;box-shadow:inset 0 0 0 3px #7a0a6c,inset 0 0 40px rgba(197,19,175,.28)}" +
      "@media (min-width:720px){#chica-pack-promo .inner{grid-template-columns:88px 1fr auto;padding:20px 22px}}" +
      "#chica-pack-promo .face{width:88px;height:88px;border-radius:22px;overflow:hidden;border:3px solid #ffd76a;background:#c513af;justify-self:center;animation:chica-vegas-glow 1.6s ease-in-out infinite}" +
      "#chica-pack-promo .face img{width:100%;height:100%;object-fit:cover;object-position:center 28%;display:block}" +
      "#chica-pack-promo .kicker{margin:0;color:#ffd76a;font:800 11px/1 Inter,system-ui,sans-serif;letter-spacing:.22em;text-transform:uppercase;text-shadow:0 0 10px #c513af}" +
      "#chica-pack-promo h2{margin:6px 0 0;color:#fff6c2;font:800 clamp(26px,6vw,42px)/.95 Syne,Inter,sans-serif;letter-spacing:.01em;text-transform:uppercase;text-shadow:0 0 18px #c513af,0 2px 0 #7a0a6c;animation:chica-vegas-flash 2.4s ease-in-out infinite}" +
      "#chica-pack-promo .prize{margin:8px 0 0;color:#fff;font:800 clamp(16px,3.6vw,22px)/1.15 Inter,system-ui,sans-serif;letter-spacing:.04em;text-transform:uppercase}" +
      "#chica-pack-promo .prize b{color:#ffd76a;text-shadow:0 0 12px #ffd76a}" +
      "#chica-pack-promo .fine{margin:6px 0 0;color:#e7c9df;font:500 13px/1.35 Inter,system-ui,sans-serif}" +
      "#chica-pack-promo .acts{display:flex;flex-wrap:wrap;gap:8px}" +
      "#chica-pack-promo a.chip,#chica-pack-promo a.jackpot{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 14px;border-radius:999px;text-decoration:none;font:800 13px/1 Inter,system-ui,sans-serif;letter-spacing:.04em;text-transform:uppercase}" +
      "#chica-pack-promo a.chip{background:#1877f2;color:#fff;border:1px solid #8ab4ff}" +
      "#chica-pack-promo a.chip.share{background:#8ed500;color:#111;border-color:#d4ff7a}" +
      "#chica-pack-promo a.jackpot{background:linear-gradient(180deg,#ffe37a,#d4a017);color:#2a1600;border:2px solid #fff6c2;box-shadow:0 0 18px rgba(255,215,106,.55)}" +
      "#chica-pack-promo .spark{position:absolute;width:10px;height:10px;background:#fff6c2;clip-path:polygon(50% 0,61% 35%,100% 50%,61% 65%,50% 100%,39% 65%,0 50%,39% 35%);animation:chica-vegas-spark 1.4s ease-in-out infinite;pointer-events:none}" +
      "#chica-pack-promo .s1{top:10px;right:16px}" +
      "#chica-pack-promo .s2{bottom:14px;left:22%;animation-delay:.4s}" +
      "#chica-pack-promo .s3{top:18px;left:38%;animation-delay:.8s}" +
      "@media (prefers-reduced-motion:reduce){#chica-pack-promo .chase,#chica-pack-promo h2,#chica-pack-promo .face,#chica-pack-promo .spark{animation:none!important}}";
    (document.head || document.documentElement).appendChild(s);
  }

  function mount() {
    if (!isHome()) {
      var stale = document.getElementById(ID);
      if (stale && stale.parentNode) stale.parentNode.removeChild(stale);
      return;
    }
    css();
    if (document.getElementById(ID)) return;
    var main = document.querySelector("main");
    if (!main) return;
    var el = document.createElement("section");
    el.id = ID;
    el.setAttribute("aria-label", "Free Pack Pin promotion");
    el.innerHTML =
      '<div class="chase" aria-hidden="true"></div>' +
      '<div class="inner">' +
      '<div class="face"><img src="' + LOGO + '" width="88" height="88" alt="Chica" /></div>' +
      "<div>" +
      '<p class="kicker">Las Vegas lights · this weekend</p>' +
      "<h2>Like. Follow. Share.</h2>" +
      '<p class="prize">Get <b>1 free day</b> Chicas Pack Pin</p>' +
      '<p class="fine">Do the three taps on Facebook. Then claim the free light for one sale day.</p>' +
      "</div>" +
      '<div class="acts">' +
      '<a class="chip" href="' + FB + '" target="_blank" rel="noopener noreferrer">Like</a>' +
      '<a class="chip" href="' + FB + '" target="_blank" rel="noopener noreferrer">Follow</a>' +
      '<a class="chip share" href="https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent("https://justonejewelry.github.io/Chicas-Map/") + '" target="_blank" rel="noopener noreferrer">Share</a>' +
      '<a class="jackpot" href="' + BOOST + '">Claim free Pack Pin</a>' +
      "</div>" +
      '<span class="spark s1" aria-hidden="true"></span>' +
      '<span class="spark s2" aria-hidden="true"></span>' +
      '<span class="spark s3" aria-hidden="true"></span>' +
      "</div>";
    if (main.firstChild) main.insertBefore(el, main.firstChild);
    else main.appendChild(el);
  }

  function run() { mount(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
  setInterval(run, 900);
  window.addEventListener("popstate", function () { setTimeout(run, 50); });
})();
