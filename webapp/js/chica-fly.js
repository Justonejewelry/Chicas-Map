/* Occasional Chica flyby. Decorative. Never steals taps. */
(function () {
  var p = location.pathname || "";
  if (!(/\/map\/?$/.test(p) || p.indexOf("/map/") !== -1 || /map\.html$/.test(p))) return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var SRC = "/Chicas-Map/images/chica-logo.png";
  var MIN_MS = 42000;
  var MAX_MS = 90000;

  function css() {
    if (document.getElementById("chica-fly-css")) return;
    var s = document.createElement("style");
    s.id = "chica-fly-css";
    s.textContent =
      "#chica-fly{position:fixed;top:18%;z-index:40;width:88px;height:88px;pointer-events:none!important;border:0;background:transparent;opacity:0;will-change:transform,opacity}" +
      "#chica-fly img{width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 8px 12px rgba(18,18,18,.45));pointer-events:none}" +
      "@keyframes chica-fly-ltr{0%{transform:translate3d(-120px,0,0) rotate(-8deg);opacity:0}8%{opacity:1}92%{opacity:1}100%{transform:translate3d(calc(100vw + 120px),-24px,0) rotate(10deg);opacity:0}}" +
      "@keyframes chica-fly-rtl{0%{transform:translate3d(calc(100vw + 120px),0,0) rotate(8deg) scaleX(-1);opacity:0}8%{opacity:1}92%{opacity:1}100%{transform:translate3d(-120px,-18px,0) rotate(-6deg) scaleX(-1);opacity:0}}";
    (document.head || document.documentElement).appendChild(s);
  }

  function el() {
    var n = document.getElementById("chica-fly");
    if (n) return n;
    n = document.createElement("div");
    n.id = "chica-fly";
    n.setAttribute("aria-hidden", "true");
    n.innerHTML = '<img src="' + SRC + '" alt="" width="88" height="88" />';
    document.documentElement.appendChild(n);
    return n;
  }

  function busy() {
    var card = document.getElementById("chica-intel-card");
    if (card && card.style.display && card.style.display !== "none") return true;
    return false;
  }

  function fly() {
    if (busy() || document.hidden) {
      arm();
      return;
    }
    var n = el();
    var rtl = Math.random() < 0.5;
    n.style.top = (12 + Math.floor(Math.random() * 38)) + "%";
    n.style.animation = "none";
    void n.offsetWidth;
    n.style.animation = (rtl ? "chica-fly-rtl" : "chica-fly-ltr") + " 4.8s ease-in-out 1 both";
    arm();
  }

  function arm() {
    var wait = MIN_MS + Math.floor(Math.random() * (MAX_MS - MIN_MS));
    setTimeout(fly, wait);
  }

  css();
  setTimeout(fly, 9000);
})();
