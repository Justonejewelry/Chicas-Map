/**
 * Chica Map — Go / Near Me UX patch
 * Ensures search returns to the map and pins redraw after layout settles.
 * Safe to load after app.js.
 */
(function () {
  "use strict";

  function whenReady(fn) {
    var tries = 0;
    (function tick() {
      if (document.getElementById("btnLocSearch") && typeof window.__YB_returnToMap === "function") {
        fn();
        return;
      }
      if (++tries > 100) return;
      setTimeout(tick, 50);
    })();
  }

  function closeToMap() {
    try {
      if (typeof window.__YB_returnToMap === "function") window.__YB_returnToMap();
    } catch (_) {}
    // Extra closes in case rail was reopened
    try {
      document.getElementById("sideRail")?.classList.remove("open");
      var bd = document.getElementById("railBackdrop");
      if (bd) { bd.classList.remove("open"); bd.hidden = true; }
      document.getElementById("dockList")?.classList.remove("active");
      document.getElementById("popNear")?.classList.remove("open");
      document.getElementById("popSearch")?.classList.remove("open");
    } catch (_) {}
  }

  function afterSearchSettle() {
    closeToMap();
    // Give the map a moment to expand, then force resize so pins paint correctly
    requestAnimationFrame(function () {
      try { window.dispatchEvent(new Event("resize")); } catch (_) {}
    });
    setTimeout(function () {
      closeToMap();
      try { window.dispatchEvent(new Event("resize")); } catch (_) {}
    }, 350);
  }

  whenReady(function () {
    var go = document.getElementById("btnLocSearch");
    if (!go || go.dataset.chicaGoPatch) return;
    go.dataset.chicaGoPatch = "1";

    // Listen on capture so we run after app.js sets location, then force map view
    go.addEventListener(
      "click",
      function () {
        // App handler is async (nominatim). Poll briefly then force map return.
        var n = 0;
        var timer = setInterval(function () {
          n++;
          // Once toast appears or after ~1.5s, settle the map UI
          var toast = document.getElementById("toast");
          var toastVisible = toast && !toast.classList.contains("hidden");
          if (toastVisible || n >= 15) {
            clearInterval(timer);
            afterSearchSettle();
          }
        }, 100);
      },
      true
    );

    // Same for Near Me
    var near = document.getElementById("btnNearMe");
    if (near && !near.dataset.chicaGoPatch) {
      near.dataset.chicaGoPatch = "1";
      near.addEventListener(
        "click",
        function () {
          var n = 0;
          var timer = setInterval(function () {
            n++;
            var toast = document.getElementById("toast");
            var toastVisible = toast && !toast.classList.contains("hidden");
            if (toastVisible || n >= 30) {
              clearInterval(timer);
              afterSearchSettle();
            }
          }, 100);
        },
        true
      );
    }

    // Enter key on location input
    var input = document.getElementById("locInput");
    if (input && !input.dataset.chicaGoPatch) {
      input.dataset.chicaGoPatch = "1";
      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          setTimeout(afterSearchSettle, 800);
        }
      });
    }
  });
})();
