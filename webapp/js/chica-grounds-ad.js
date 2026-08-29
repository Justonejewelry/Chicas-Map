(function () {
  var TEL = "tel:+12108433299";
  var FILE = "/Chicas-Map/images/grounds-and-around.jpg?v=5";

  function cardHTML() {
    return (
      '<a href="' + TEL + '" class="block">' +
        '<div class="flex items-end justify-between gap-3 px-4 pt-3">' +
          '<p class="text-[0.65rem] font-bold tracking-[0.16em] text-pine-mid uppercase">Pack leader</p>' +
          '<p class="text-[0.65rem] font-bold tracking-[0.16em] text-muted uppercase">Tell him Chica sent you</p>' +
        "</div>" +
        '<div class="chica-grounds-banner relative mx-4 mt-2 overflow-hidden rounded-lg">' +
          '<img src="' + FILE + '" alt="" class="chica-grounds-photo absolute inset-0 h-full w-full object-cover object-center" onerror="this.style.display=\'none\'">' +
          '<div class="relative px-4 py-6 sm:py-7">' +
            '<p class="font-display text-2xl font-bold tracking-tight text-white drop-shadow">Grounds & Around</p>' +
            '<p class="mt-1 text-sm font-semibold text-white/90">Wooden fences built right. Call William.</p>' +
            '<p class="mt-2 text-sm font-bold text-white">(210) 843-3299</p>' +
          "</div>" +
        "</div>" +
        '<div class="px-4 py-3">' +
          '<p class="text-sm text-muted">Get your bids. Then call and tell him Chica sent you.</p>' +
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
      ".chica-grounds-banner{min-height:9.5rem;background:linear-gradient(115deg,#7a3b12 0%,#c513af 42%,#5a2a10 100%)}" +
      ".chica-grounds-banner::after{content:'';position:absolute;inset:0;background:linear-gradient(to top,rgba(18,18,18,.55),rgba(18,18,18,.12));pointer-events:none}" +
      ".chica-grounds-photo{opacity:.88}";
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

  function insertHome() {
    injectCss();
    var existing = document.getElementById("grounds-ad-home");
    if (existing) return true;
    var target = findPackCard();
    if (!target || !target.parentNode) return false;
    var s = document.createElement("section");
    s.id = "grounds-ad-home";
    s.className = "mx-auto mt-8 max-w-6xl overflow-hidden rounded-xl bg-paper ring-1 ring-line";
    s.setAttribute("aria-label", "Pack leader \u2014 Grounds and Around");
    s.innerHTML = cardHTML();
    target.parentNode.insertBefore(s, target);
    return true;
  }

  function fillLeaderCard(el) {
    if (!el) return;
    el.setAttribute("href", TEL);
    try { el.style.position = "relative"; } catch (e) {}
    var overlay = el.querySelector("img.absolute, img.object-cover");
    if (overlay) {
      overlay.style.opacity = "0.78";
      overlay.style.objectFit = "cover";
      overlay.addEventListener("error", function () { overlay.style.display = "none"; }, { once: true });
    }
    el.setAttribute("data-grounds", "1");
    var ps = el.querySelectorAll("p");
    for (var j = 0; j < ps.length; j++) {
      var low = ((ps[j].textContent || "").trim()).toLowerCase();
      if (low.indexOf("your shop here") !== -1 || low.indexOf("grounds") !== -1) {
        ps[j].textContent = "Grounds & Around";
      } else if (low.indexOf("featured local") !== -1 || low.indexOf("from $200") !== -1 || low.indexOf("call william") !== -1) {
        ps[j].textContent = "Call William \u00b7 tell him Chica sent you \u00b7 (210) 843-3299";
      }
    }
  }

  function dressWall() {
    var cards = document.querySelectorAll("a, article");
    for (var i = 0; i < cards.length; i++) {
      var txt = (cards[i].textContent || "").toLowerCase();
      if (txt.indexOf("pack leader") === -1 && txt.indexOf("grounds") === -1) continue;
      fillLeaderCard(cards[i]);
    }
  }

  function run() {
    insertHome();
    dressWall();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
  setInterval(run, 1500);
})();
