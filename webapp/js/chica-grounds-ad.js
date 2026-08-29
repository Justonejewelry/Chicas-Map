(function () {
  var PREFIX = "/Chicas-Map";
  var TEL = "tel:+12108433299";
  var FILE = PREFIX + "/images/grounds-and-around.jpg";
  var CHUNK_DIR = PREFIX + "/js/grounds-ad/";
  var assembled = null;

  function cardHTML(src) {
    var img = src
      ? '<img src="' + src + '" alt="Grounds & Around — wooden fences. Call William and tell him Chica sent you. (210) 843-3299" width="1500" height="1000" class="w-full object-cover">'
      : "";
    return (
      '<a href="' + TEL + '" class="block">' +
        '<div class="flex items-end justify-between gap-3 px-5 pt-4">' +
          '<p class="text-[0.65rem] font-bold tracking-[0.16em] text-pine-mid uppercase">On the wall · Pack leader</p>' +
          '<p class="text-[0.65rem] font-bold tracking-[0.16em] text-muted uppercase">Tell him Chica sent you</p>' +
        "</div>" +
        img +
        '<div class="px-5 py-4">' +
          '<p class="font-display text-2xl font-bold tracking-tight">Grounds & Around</p>' +
          '<p class="mt-1 text-sm text-muted">Wooden fences built right. Get your bids. Then call William.</p>' +
          '<p class="mt-2 text-sm font-semibold text-pine-mid">(210) 843-3299</p>' +
        "</div>" +
      "</a>"
    );
  }

  function insertHome(src) {
    if (document.getElementById("grounds-ad-home")) return true;
    var nodes = document.querySelectorAll("h2, p, span");
    var target = null;
    for (var i = 0; i < nodes.length; i++) {
      var t = (nodes[i].textContent || "").toLowerCase();
      if (t.indexOf("pack principle") !== -1 || t.indexOf("principio de la manada") !== -1) {
        target = nodes[i].closest("section");
        break;
      }
    }
    if (!target || !target.parentNode) return false;
    var s = document.createElement("section");
    s.id = "grounds-ad-home";
    s.className = "mt-10 overflow-hidden rounded-xl bg-paper ring-1 ring-line";
    s.setAttribute("aria-label", "Pack leader — Grounds and Around");
    s.innerHTML = cardHTML(src);
    target.parentNode.insertBefore(s, target);
    return true;
  }

  function dressWall(src) {
    var cards = document.querySelectorAll("a");
    for (var i = 0; i < cards.length; i++) {
      var el = cards[i];
      var txt = (el.textContent || "").toLowerCase();
      if (txt.indexOf("grounds") === -1) continue;
      if (el.getAttribute("data-grounds") === "1") continue;
      if (src) {
        var existing = el.querySelector("img");
        if (existing) {
          existing.src = src;
          existing.alt = "Grounds & Around";
          existing.className = "pointer-events-none absolute inset-0 h-full w-full object-cover opacity-35";
        }
      }
      el.setAttribute("href", TEL);
      el.setAttribute("data-grounds", "1");
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
          done(parts.length ? "data:image/jpeg;base64," + parts.join("") : null);
        });
    }
    next();
  }

  function resolveSrc(cb) {
    var probe = new Image();
    probe.onload = function () { cb(FILE); };
    probe.onerror = function () { loadChunks(cb); };
    probe.src = FILE + "?v=1";
  }

  function boot() {
    resolveSrc(function (src) {
      insertHome(src);
      dressWall(src);
      setInterval(function () {
        insertHome(src);
        dressWall(src);
      }, 1200);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
