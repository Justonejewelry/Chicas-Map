/* Homepage promo: Like · Follow · Share → 1 free day Pack Pin. */
(function () {
  var ID = "chica-pack-promo";
  var CSS = "chica-pack-promo-css";
  var FB = "https://www.facebook.com/Justone.Jewelry.Justin/";
  var BOOST = "/Chicas-Map/boost/";
  var LOGO = "/Chicas-Map/images/chica-logo.png";
  var SHARE =
    "https://www.facebook.com/sharer/sharer.php?u=" +
    encodeURIComponent("https://justonejewelry.github.io/Chicas-Map/");

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
      "@keyframes chica-promo-bulbs{0%,100%{opacity:.35}50%{opacity:1}}" +
      "@keyframes chica-promo-glow{0%,100%{box-shadow:0 0 0 0 rgba(197,19,175,.0),0 0 24px rgba(255,215,106,.18)}50%{box-shadow:0 0 0 6px rgba(197,19,175,.18),0 0 32px rgba(255,215,106,.32)}}" +
      "#chica-pack-promo{position:relative;margin:12px 12px 0;isolation:isolate}" +
      "#chica-pack-promo .frame{position:relative;border-radius:22px;padding:10px;background:linear-gradient(180deg,#2a1608,#12060f)}" +
      "#chica-pack-promo .bulbs{position:absolute;inset:0;pointer-events:none;border-radius:22px;background:" +
        "radial-gradient(circle at 8px 8px,#ffe37a 0 3px,transparent 4px) 0 0/28px 28px," +
        "radial-gradient(circle at calc(100% - 8px) 8px,#ffe37a 0 3px,transparent 4px) 0 0/28px 28px;" +
        "opacity:.85;animation:chica-promo-bulbs 2.8s ease-in-out infinite}" +
      "#chica-pack-promo .inner{position:relative;z-index:1;display:grid;gap:16px;padding:18px 16px 16px;" +
        "border-radius:14px;background:radial-gradient(120% 90% at 50% -10%,#5a1038 0%,#16060f 46%,#07040a 100%);" +
        "border:1px solid rgba(243,196,74,.45)}" +
      "#chica-pack-promo .top{display:grid;grid-template-columns:64px 1fr;gap:12px;align-items:center}" +
      "#chica-pack-promo .face{width:64px;height:64px;border-radius:16px;overflow:hidden;border:2px solid #ffd76a;background:#c513af;animation:chica-promo-glow 2.4s ease-in-out infinite}" +
      "#chica-pack-promo .face img{width:100%;height:100%;object-fit:cover;object-position:center 28%;display:block}" +
      "#chica-pack-promo .kicker{margin:0;color:#ffd76a;font:800 10px/1 Inter,system-ui,sans-serif;letter-spacing:.18em;text-transform:uppercase}" +
      "#chica-pack-promo h2{margin:6px 0 0;color:#fff8d6;font:800 clamp(22px,6.2vw,34px)/.95 Syne,Inter,sans-serif;letter-spacing:.01em;text-transform:uppercase}" +
      "#chica-pack-promo h2 b{color:#ffd76a;text-shadow:0 0 14px rgba(255,215,106,.55)}" +
      "#chica-pack-promo .live{margin:8px 0 0;color:#f3c9e8;font:600 13px/1.35 Inter,system-ui,sans-serif}" +
      "#chica-pack-promo .live strong{color:#fff}" +
      "#chica-pack-promo .steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}" +
      "#chica-pack-promo a.step{display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:4px;min-height:64px;padding:10px 10px 10px 12px;border-radius:14px;text-decoration:none;border:1px solid transparent}" +
      "#chica-pack-promo a.step .n{font:800 10px/1 Inter,system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;opacity:.8}" +
      "#chica-pack-promo a.step .l{font:800 13px/1 Inter,system-ui,sans-serif;letter-spacing:.04em;text-transform:uppercase}" +
      "#chica-pack-promo a.step.like{background:#1877f2;color:#fff;border-color:#8ab4ff}" +
      "#chica-pack-promo a.step.follow{background:#24101c;color:#fff6c2;border-color:#c513af}" +
      "#chica-pack-promo a.step.share{background:#8ed500;color:#111;border-color:#d4ff7a}" +
      "#chica-pack-promo a.jackpot{display:flex;align-items:center;justify-content:center;width:100%;min-height:48px;padding:0 16px;border-radius:999px;text-decoration:none;font:800 14px/1 Inter,system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;background:linear-gradient(180deg,#ffe37a,#d4a017);color:#2a1600;border:2px solid #fff6c2;box-shadow:0 8px 22px rgba(212,160,23,.28)}" +
      "#chica-pack-promo .fine{margin:0;color:#cbb3c4;font:500 12px/1.4 Inter,system-ui,sans-serif;text-align:center}" +
      "@media (min-width:720px){#chica-pack-promo{margin:16px auto 0;max-width:72rem}#chica-pack-promo .inner{padding:22px 24px}#chica-pack-promo .top{grid-template-columns:72px 1fr}#chica-pack-promo .face{width:72px;height:72px}}" +
      "@media (prefers-reduced-motion:reduce){#chica-pack-promo .bulbs,#chica-pack-promo .face{animation:none!important}}";
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
      '<div class="frame">' +
      '<div class="bulbs" aria-hidden="true"></div>' +
      '<div class="inner">' +
      '<div class="top">' +
      '<div class="face"><img src="' + LOGO + '" width="72" height="72" alt="Chica" /></div>' +
      "<div>" +
      '<p class="kicker">This weekend · one sale day</p>' +
      "<h2>Get <b>1 free day</b> Pack Pin</h2>" +
      '<p class="live">Chica is at <strong>1207 Fulton Ave</strong> this afternoon. Gold pin on the map.</p>' +
      "</div></div>" +
      '<div class="steps" role="list">' +
      '<a class="step like" role="listitem" href="' + FB + '" target="_blank" rel="noopener noreferrer"><span class="n">1</span><span class="l">Like</span></a>' +
      '<a class="step follow" role="listitem" href="' + FB + '" target="_blank" rel="noopener noreferrer"><span class="n">2</span><span class="l">Follow</span></a>' +
      '<a class="step share" role="listitem" href="' + SHARE + '" target="_blank" rel="noopener noreferrer"><span class="n">3</span><span class="l">Share</span></a>' +
      "</div>" +
      '<a class="jackpot" href="' + BOOST + '">Claim free Pack Pin</a>' +
      '<p class="fine">Three taps on Facebook. Then claim the gold light for one sale day.</p>' +
      "</div></div>";
    if (main.firstChild) main.insertBefore(el, main.firstChild);
    else main.appendChild(el);
  }

  function run() {
    mount();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
  setInterval(run, 900);
  window.addEventListener("popstate", function () {
    setTimeout(run, 50);
  });
})();
