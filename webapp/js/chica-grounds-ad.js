(function () {
  var TEL = "tel:+12108433299";
  var PREFIX = "/Chicas-Map/js/grounds-ad/";
  var PARTS = 4;
  var EMBED = null;

  function cardHTML(src) {
    return (
      '<a href="' + TEL + '" class="block">' +
        '<div class="flex items-end justify-between gap-3 px-4 pt-3">' +
          '<p class="text-[0.65rem] font-bold tracking-[0.16em] text-pine-mid uppercase">Pack leader</p>' +
          '<p class="text-[0.65rem] font-bold tracking-[0.16em] text-muted uppercase">Tell him Chica sent you</p>' +
        "</div>" +
        '<img src="' + src + '" alt="Grounds and Around wooden fence. Call William at (210) 843-3299." width="720" height="252" class="chica-grounds-photo mt-2 block h-36 w-full object-cover object-center sm:h-40">' +
        '<div class="px-4 py-3">' +
          '<p class="font-display text-xl font-bold tracking-tight">Grounds &amp; Around</p>' +
          '<p class="mt-0.5 text-sm text-muted">Wooden fences built right. Get your bids. Then call William.</p>' +
          '<p class="mt-1 text-sm font-semibold text-pine-mid">(210) 843-3299</p>' +
        "</div>" +
      "</a>"
    );
  }

  function injectCss() {
    if (document.getElementById("chica-grounds-ad-css")) return;
    var s = document.createElement("style");
    s.id = "chica-grounds-ad-css";
    s.textContent =
      "#grounds-ad-home{max-width:72rem;margin:2rem auto 0}" +
      ".chica-grounds-photo{opacity:1!important;filter:none!important;display:block}" +
      "img[src*='grounds-and-around']{opacity:1!important;filter:none!important}";
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
      var img = existing.querySelector("img");
      if (img && src && img.getAttribute("src") !== src) img.src = src;
      var a = existing.querySelector("a");
      if (a) a.setAttribute("href", TEL);
      return true;
    }
    var target = findPackCard();
    if (!target || !target.parentNode) return false;
    var s = document.createElement("section");
    s.id = "grounds-ad-home";
    s.className = "mx-auto mt-8 max-w-6xl overflow-hidden rounded-xl bg-paper ring-1 ring-line";
    s.setAttribute("aria-label", "Pack leader \u2014 Grounds and Around");
    s.innerHTML = cardHTML(src || "");
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
          img.className = String(img.className || "").replace(/opacity-\d+/g, "");
        }
      }
    }
  }

  function run() {
    paint(EMBED);
    dressWall(EMBED);
  }

  function loadParts() {
    var acc = [];
    var left = PARTS;
    for (var i = 1; i <= PARTS; i++) {
      (function (n) {
        fetch(PREFIX + n + ".txt?v=6", { cache: "force-cache" })
          .then(function (r) { return r.ok ? r.text() : Promise.reject(); })
          .then(function (t) {
            acc[n - 1] = String(t || "").replace(/\s+/g, "");
            left--;
            if (left === 0) {
              EMBED = "data:image/jpeg;base64," + acc.join("");
              run();
            }
          })
          .catch(function () { left--; });
      })(i);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { run(); loadParts(); });
  else { run(); loadParts(); }
  setInterval(run, 2000);
})();
