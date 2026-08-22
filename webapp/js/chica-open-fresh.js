/**
 * Chica Map — open to all fresh live pins.
 * Closest-with-no-location was painting 0 even when Saturday data is live.
 */
(function () {
  "use strict";

  var ran = false;

  function setCityWide() {
    var city = document.getElementById("scopeCity");
    var near = document.getElementById("scopeNear");
    if (!city) return false;
    if (near) near.classList.remove("active");
    city.classList.add("active");
    try {
      city.click();
    } catch (_) {}
    return true;
  }

  function apply() {
    setCityWide();
    try {
      window.dispatchEvent(new Event("resize"));
    } catch (_) {}
  }

  function boot() {
    if (ran) return;
    ran = true;
    apply();
    [250, 700, 1400, 2400].forEach(function (ms) {
      setTimeout(apply, ms);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
  window.addEventListener("yb-map-ready", function () {
    setTimeout(apply, 80);
    setTimeout(apply, 500);
  });
})();
