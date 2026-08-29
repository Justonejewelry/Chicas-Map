(function () {
  var PREFIX = "/Chicas-Map";
  var TEL = "tel:+12108433299";
  var FILE = PREFIX + "/images/grounds-and-around.jpg";
  var CHUNK_DIR = PREFIX + "/js/grounds-ad/";
  var src = FILE + "?v=2";

  function cardHTML() {
    return (
      '<a href="' + TEL + '" class="block">' +
        '<div class="flex items-end justify-between gap-3 px-5 pt-4">' +
          '<p class="text-[0.65rem] font-bold tracking-[0.16em] text-pine-mid uppercase">Pack leader</p>' +
          '<p class="text-[0.65rem] font-bold tracking-[0.16em] text-muted uppercase">Tell him Chica sent you</p>' +
        "</div>" +
        '<img src="' + src + '" alt="Grounds &amp; Around \u2014 wooden fences. Call William and tell him Chica sent you. (210) 843-3299" width="1500" height="1000" class="mt-3 w-full object-cover">' +
        '<div class="px-5 py-4">' +
          '<p class="font-display text-2xl font-bold tracking-tight">Grounds &amp; Around</p>' +
          '<p class="mt-1 text-sm text-muted">Wooden fences built right. Get your bids. Then call William.</p>' +
          '<p class="mt-2 text-sm font-semibold text-pine-mid">(210) 843-3299</p>' +
        "</div>" +
      "</a>"
    );
  }

  function isPackLabel(t) {
    t = String(t || "").toLowerCase();
    return t.indexOf("pack principle") !== -1 || t.indexOf("principio de la manada") !== -1;
  }

  function findPackCard() {
    var nodes = document.querySelectorAll("h1,h2,h3,p,span,div,section,article,header");
    var hit = null;
    for (var i = 0; i < nodes.length; i++) {
      var raw = nodes[i].textContent || "";
      if (!isPackLabel(raw)) continue;
      if (raw.length > 240) continue;
      hit = nodes[i];
      break;
    }
    if (!hit) return null;
    var cur = hit;
    for (var d = 0; d < 10 && cur && cur.parentElement; d++) {
      var p = cur.parentElement;
      var cls = String(p.className || "");
      if (p.tagName === "SECTION") return p;
      if (cls.indexOf("rounded") !== -1 && p.querySelector("img")) return p;
      if (cls.indexOf("rounded") !== -1 && cls.indexOf("ring") !== -1) return p;
      cur = p;
    }
    return hit.closest("section") || hit.parentElement;
  }

  function insertHome() {
    if (document.getElementById("grounds-ad-home")) {
      var img = document.querySelector("#grounds-ad-home img");
      if (img && src && img.getAttribute("src") !== src) img.src = src;
      return true;
    }
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
    if (!el || el.getAttribute("data-grounds") === "1") return;
    el.setAttribute("data-grounds", "1");
    el.setAttribute("href", TEL);
    try { el.style.position = "relative"; } catch (e) {}
    var overlay = null;
    var imgs = el.querySelectorAll("img");
    for (var i = 0; i < imgs.length; i++) {
      var cls = String(imgs[i].className || "");
      if (cls.indexOf("absolute") !== -1 || cls.indexOf("object-cover") !== -1) overlay = imgs[i];
    }
    if (!overlay) {
      overlay = document.createElement("img");
      overlay.alt = "Grounds & Around";
      overlay.className = "pointer-events-none absolute inset-0 h-full w-full object-cover opacity-35";
      el.insertBefore(overlay, el.firstChild);
    }
    overlay.src = src;
    var ps = el.querySelectorAll("p");
    for (var j = 0; j < ps.length; j++) {
      var low = ((ps[j].textContent || "").trim()).toLowerCase();
      if (low.indexOf("your shop here") !== -1 || low.indexOf("grounds") !== -1) {
        ps[j].textContent = "Grounds & Around";
      } else if (low.indexOf("featured local") !== -1 || low.indexOf("from $200") !== -1 || low.indexOf("call william") !== -1) {
        ps[j].textContent = "Call William \u00b7 tell him Chica sent you \u00b7 (210) 843-3299";
      } else if (low.indexOf("open \u00b7") !== -1 || low.indexOf("on the wall") !== -1) {
        ps[j].textContent = "On the wall \u00b7 Pack leader";
      }
    }
    var claim = el.querySelector("span");
    if (claim && /claim/i.test(claim.textContent || "")) claim.remove();
  }

  function dressWall() {
    var cards = document.querySelectorAll("a, article");
    for (var i = 0; i < cards.length; i++) {
      var el = cards[i];
      var txt = (el.textContent || "").toLowerCase();
      if (txt.indexOf("pack leader") === -1 && txt.indexOf("grounds") === -1 && txt.indexOf("lider de la manada") === -1 && txt.indexOf("l\u00edder de la manada") === -1) continue;
      fillLeaderCard(el);
    }
  }

  function loadChunks(done) {
    var parts = [];
    var n = 1;
    function next() {
      fetch(CHUNK_DIR + n + ".b64", { cache: "force-cache" })
        .then(function (r) {
          if (!r.ok) throw new Error("done");
          return r.text();
        })
        .then(function (t) {
          parts.push(String(t || "").replace(/\s+/g, ""));
          n += 1;
          if (n > 8) throw new Error("done");
          next();
        })
        .catch(function () {
          done(parts.length ? "data:image/jpeg;base64," + parts.join("") : FILE + "?v=2");
        });
    }
    next();
  }

  function resolveSrc(cb) {
    var probe = new Image();
    probe.onload = function () { cb(FILE + "?v=2"); };
    probe.onerror = function () { loadChunks(cb); };
    probe.src = FILE + "?v=2";
  }

  function run() {
    insertHome();
    dressWall();
  }

  function boot() {
    resolveSrc(function (resolved) {
      src = resolved;
      run();
      setInterval(run, 900);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
