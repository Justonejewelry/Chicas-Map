/* Home promo card for Chica's Deal Finder (bilingual). */
(function () {
  var es = String(document.documentElement.lang || "").indexOf("es") === 0;
  var anchor = document.getElementById("chica-hoods"); if (!anchor || document.getElementById("home-flip")) return;
  var a = document.createElement("a"); a.id = "home-flip"; a.href = "/Chicas-Map/preview/75/deals/"; a.setAttribute("data-chica-keep", "1");
  a.innerHTML = '<img src="/Chicas-Map/preview/75/images/chica-logo.png" width="56" height="56" alt=""/><span><em>' + (es ? "NUEVO · BETA" : "NEW · BETA") + "</em><b>" +
    (es ? "Buscador de Gangas de Chica 📸" : "Chica's Deal Finder 📸") + "</b><small>" +
    (es ? "Toma una foto y Chica te dice si es ganga o no. Qué ofrecer y frases para regatear en inglés y español." : "Snap a photo and Chica tells you if it's a deal or not. What to offer, plus haggle lines in English & Spanish.") +
    "</small></span><i>→</i>";
  var st = document.createElement("style");
  st.textContent = "#home-flip{display:flex;align-items:center;gap:14px;max-width:560px;margin:0 auto 28px;padding:14px 16px;border-radius:22px;text-decoration:none;color:#fff;background:linear-gradient(135deg,#c513af,#7b3fe4);box-shadow:0 10px 30px #c513af44;text-align:left}" +
    "#home-flip img{border-radius:50%;flex:none;background:#fff2;animation:hfbob 2.6s ease-in-out infinite}#home-flip span{display:grid;gap:2px;flex:1}#home-flip em{font:800 11px Inter,system-ui,sans-serif;letter-spacing:.1em;color:#ffe08a;font-style:normal}" +
    "#home-flip b{font:800 19px/1.15 Syne,system-ui,sans-serif}#home-flip small{font-size:13px;opacity:.92;line-height:1.35}#home-flip i{font-style:normal;font-size:24px;font-weight:800}" +
    "@keyframes hfbob{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-3px) rotate(-6deg)}}@media(prefers-reduced-motion:reduce){#home-flip img{animation:none}}";
  document.head.appendChild(st);
  anchor.parentNode.insertBefore(a, anchor);
})();
