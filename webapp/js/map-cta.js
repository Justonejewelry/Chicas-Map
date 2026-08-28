/* Corner CTA: Chica face + CLICK ME. No peek, no cramped slogan. */
(function () {
  var p = location.pathname || "";
  if (!(/\/map\/?$/.test(p) || p.indexOf("/map/") !== -1)) return;
  var FACE = "/Chicas-Map/images/chica-logo.png";
  function paint() {
    var a = document.getElementById("chica-listit-btn");
    if (!a) return;
    if (a.getAttribute("data-cta") === "clickme") return;
    a.setAttribute("data-cta", "clickme");
    a.setAttribute("href", "/Chicas-Map/claim");
    a.setAttribute("aria-label", "Click me. Pin it for $5");
    a.title = "Click me · $5 pin";
    a.innerHTML =
      '<img src="' + FACE + '" alt="" width="88" height="88" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:14px">' +
      '<span style="position:absolute;left:4px;right:4px;bottom:6px;z-index:2;font:900 11px/1 Inter,system-ui,sans-serif;letter-spacing:.04em;text-transform:uppercase;text-align:center;color:#fff;text-shadow:0 1px 3px #000">Click me</span>';
    a.style.cssText =
      "position:relative!important;display:block!important;width:92px!important;height:92px!important;min-width:92px!important;padding:0!important;" +
      "border:3px solid #fffdf8!important;border-radius:18px!important;overflow:hidden!important;background:#c513af!important;" +
      "box-shadow:0 0 0 4px #c513af,0 12px 28px rgba(197,19,175,.7)!important;" +
      "animation:chica-pop 1.4s ease-in-out infinite!important;text-decoration:none!important;z-index:2147483647!important";
    if (!document.getElementById("chica-cta-pop")) {
      var s = document.createElement("style");
      s.id = "chica-cta-pop";
      s.textContent = "@keyframes chica-pop{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}";
      (document.head || document.documentElement).appendChild(s);
    }
  }
  paint();
  setInterval(paint, 600);
})();
