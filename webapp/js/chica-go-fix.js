/**
 * Chica Map — Go / Near Me / Closest UX patch
 * - Ensures search returns to the map and pins redraw after layout settles.
 * - Makes "Closest" actually request geolocation when no location is set.
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
    try {
      document.getElementById("sideRail")?.classList.remove("open");
      var bd = document.getElementById("railBackdrop");
      if (bd) {
        bd.classList.remove("open");
        bd.hidden = true;
      }
      document.getElementById("dockList")?.classList.remove("active");
      document.getElementById("popNear")?.classList.remove("open");
      document.getElementById("fabNear")?.classList.remove("active");
      document.getElementById("fabNear")?.setAttribute("aria-expanded", "false");
    } catch (_) {}
  }

  function afterSearchSettle() {
    closeToMap();
    requestAnimationFrame(function () {
      try {
        window.dispatchEvent(new Event("resize"));
      } catch (_) {}
    });
    setTimeout(function () {
      closeToMap();
      try {
        window.dispatchEvent(new Event("resize"));
      } catch (_) {}
    }, 350);
  }

  function hasUserDot() {
    return !!document.querySelector(".yb-user-dot");
  }

  function triggerNearMe() {
    var btn = document.getElementById("btnNearMe");
    if (btn) btn.click();
  }

  function setScopeNear() {
    var near = document.getElementById("scopeNear");
    var city = document.getElementById("scopeCity");
    if (near) near.classList.add("active");
    if (city) city.classList.remove("active");
  }

  whenReady(function () {
    // --- Go / location search settle ---
    var go = document.getElementById("btnLocSearch");
    if (go && !go.dataset.chicaGoPatch) {
      go.dataset.chicaGoPatch = "1";
      go.addEventListener(
        "click",
        function () {
          var n = 0;
          var timer = setInterval(function () {
            n++;
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
    }

    // --- Near Me button settle ---
    var nearBtn = document.getElementById("btnNearMe");
    if (nearBtn && !nearBtn.dataset.chicaGoPatch) {
      nearBtn.dataset.chicaGoPatch = "1";
      nearBtn.addEventListener(
        "click",
        function () {
          setScopeNear();
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

    // --- Enter key on location input ---
    var input = document.getElementById("locInput");
    if (input && !input.dataset.chicaGoPatch) {
      input.dataset.chicaGoPatch = "1";
      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          setTimeout(afterSearchSettle, 800);
        }
      });
    }

    // --- FIX: Closest scope button must request location if none yet ---
    var scopeNear = document.getElementById("scopeNear");
    if (scopeNear && !scopeNear.dataset.chicaClosestPatch) {
      scopeNear.dataset.chicaClosestPatch = "1";
      scopeNear.addEventListener(
        "click",
        function () {
          setScopeNear();
          if (!hasUserDot()) {
            // No location yet → actually request it
            triggerNearMe();
          } else {
            // Already located → just settle UI
            afterSearchSettle();
          }
        },
        true
      );
    }

    // --- FIX: Mobile dock "Closest" should request location, not just open popup ---
    var dockNear = document.getElementById("dockNear");
    if (dockNear && !dockNear.dataset.chicaClosestPatch) {
      dockNear.dataset.chicaClosestPatch = "1";
      // Capture phase so we override the map.html handler that only opens fab
      dockNear.addEventListener(
        "click",
        function (e) {
          e.stopPropagation();
          e.preventDefault();
          setScopeNear();
          // Directly request location (same as Near me)
          triggerNearMe();
          // Also close any open pop
          document.getElementById("popNear")?.classList.remove("open");
          document.getElementById("fabNear")?.classList.remove("active");
        },
        true
      );
    }

    // --- FAB "Use my location" already wires to btnNearMe; ensure scope flips ---
    var fabNearMe = document.getElementById("btnNearMeFab");
    if (fabNearMe && !fabNearMe.dataset.chicaClosestPatch) {
      fabNearMe.dataset.chicaClosestPatch = "1";
      fabNearMe.addEventListener(
        "click",
        function () {
          setScopeNear();
        },
        true
      );
    }
  });
})();
