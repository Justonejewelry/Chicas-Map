(function () {
  var TEL = "tel:+12108433299";
  var FILE = "/Chicas-Map/images/grounds-and-around.png";
  var CARD_CLASS = "mx-auto mt-6 overflow-hidden rounded-xl bg-paper ring-1 ring-line";

  function cardHTML(src) {
    return (
      '<a href="' + TEL + '" class="block">' +
        '<div class="flex items-end justify-between gap-2 px-3 pt-2">' +
          '<p class="text-[0.58rem] font-bold tracking-[0.14em] text-pine-mid uppercase">Pack leader</p>' +
          '<p class="text-[0.58rem] font-bold tracking-[0.12em] text-muted uppercase">Chica sent you</p>' +
        "</div>" +
        '<img src="' + src + '" alt="Grounds and Around wooden fence. Call William at (210) 843-3299." width="272" height="104" class="chica-grounds-photo mt-1 block">' +
        '<div class="px-3 py-2">' +
          '<p class="font-display text-base font-bold tracking-tight">Grounds &amp; Around</p>' +
          '<p class="mt-0.5 text-xs text-muted">Wooden fences. Get bids. Call William.</p>' +
          '<p class="mt-0.5 text-xs font-semibold text-pine-mid">(210) 843-3299</p>' +
        "</div>" +
      "</a>"
    );
  }

  function injectCss() {
    if (document.getElementById("chica-grounds-ad-css")) return;
    var s = document.createElement("style");
    s.id = "chica-grounds-ad-css";
    s.textContent =
      "#grounds-ad-home{max-width:17rem;width:17rem;margin:1.25rem auto 0}" +
      ".chica-grounds-photo{display:block;width:100%;height:6.5rem;object-fit:cover;object-position:center;opacity:1!important;filter:none!important}" +
      "img[src*='grounds-and-around']{max-height:6.5rem!important;width:100%;object-fit:cover;opacity:1!important;filter:none!important}";
    (document.head || document.documentElement).appendChild(s);
  }

  function isPackLabel(t) {
    t = String(t || "").toLowerCase();
    return t.indexOf("pack principle") !== -1 || t.indexOf("principio de la manada") !== -1;
  }

  function findPackCard() {
    var nodes = document.querySelectorAll("h1,h2,h3,p,span,div,section,article,header");
    for (var i = 0; i < nodes.length; i++) {
      var raw = nodes[i].textContent || "";
      if (!isPackLabel(raw) || raw.length > 240) continue;
      var cur = nodes[i];
      for (var d = 0; d < 10 && cur && cur.parentElement; d++) {
        var p = cur.parentElement;
        var cls = String(p.className || "");
        if (p.tagName === "SECTION") return p;
        if (cls.indexOf("rounded") !== -1) return p;
        cur = p;
      }
      return nodes[i].closest("section") || nodes[i].parentElement;
    }
    return null;
  }

  function paint(src) {
    injectCss();
    var existing = document.getElementById("grounds-ad-home");
    if (existing) {
      existing.className = CARD_CLASS;
      existing.style.maxWidth = "17rem";
      existing.style.width = "17rem";
      existing.innerHTML = cardHTML(src);
      return true;
    }
    var target = findPackCard();
    if (!target || !target.parentNode) return false;
    var s = document.createElement("section");
    s.id = "grounds-ad-home";
    s.className = CARD_CLASS;
    s.setAttribute("aria-label", "Pack leader \u2014 Grounds and Around");
    s.innerHTML = cardHTML(src);
    target.parentNode.insertBefore(s, target);
    return true;
  }

  function dressWall(src) {
    if (!src) return;
    var cards = document.querySelectorAll("a, article");
    for (var i = 0; i < cards.length; i++) {
      var el = cards[i];
      var txt = (el.textContent || "").toLowerCase();
      if (txt.indexOf("grounds") === -1 && txt.indexOf("pack leader") === -1) continue;
      if (el.id === "grounds-ad-home" || (el.closest && el.closest("#grounds-ad-home"))) continue;
      el.setAttribute("href", TEL);
      var imgs = el.querySelectorAll("img");
      for (var j = 0; j < imgs.length; j++) {
        var img = imgs[j];
        var isrc = String(img.getAttribute("src") || "");
        var cls = String(img.className || "");
        if (isrc.indexOf("grounds-and-around") !== -1 || cls.indexOf("absolute") !== -1) {
          img.src = src;
          img.style.opacity = "1";
          img.style.filter = "none";
          img.style.maxHeight = "6.5rem";
          img.style.width = "100%";
          img.style.objectFit = "cover";
          img.className = String(img.className || "").replace(/opacity-\d+/g, "").replace(/h-\d+/g, "");
        }
      }
    }
  }

  function run() {
    paint(FILE);
    dressWall(FILE);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
  var n = 0;
  var t = setInterval(function () {
    run();
    n++;
    if (n >= 6) clearInterval(t);
  }, 800);
})();
