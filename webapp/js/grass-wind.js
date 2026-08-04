/** Grass wind — mouse hover + device tilt */
(function () {
  // Inject fixed grass layer once
  if (!document.querySelector(".grass-layer")) {
    var layer = document.createElement("div");
    layer.className = "grass-layer";
    layer.setAttribute("aria-hidden", "true");
    document.body.prepend(layer);
  }

  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return;

  var targetX = 0, targetY = 0, curX = 0, curY = 0, skew = 0;
  var raf = null;

  function tick() {
    curX += (targetX - curX) * 0.12;
    curY += (targetY - curY) * 0.12;
    root.style.setProperty("--wind-x", curX.toFixed(1) + "px");
    root.style.setProperty("--wind-y", curY.toFixed(1) + "px");
    root.style.setProperty("--wind-skew", skew.toFixed(2) + "deg");
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);

  // Mouse / pointer — grass “blows” away from cursor
  window.addEventListener(
    "pointermove",
    function (e) {
      var cx = window.innerWidth / 2;
      var cy = window.innerHeight / 2;
      var dx = (e.clientX - cx) / cx; // -1..1
      var dy = (e.clientY - cy) / cy;
      targetX = dx * 36;
      targetY = dy * 28;
      skew = dx * 1.2;
    },
    { passive: true }
  );

  window.addEventListener(
    "pointerleave",
    function () {
      targetX = 0;
      targetY = 0;
      skew = 0;
    },
    { passive: true }
  );

  // Phone tilt
  function onOrient(e) {
    // gamma: left-right (-90..90), beta: front-back (-180..180)
    var g = e.gamma || 0;
    var b = e.beta || 0;
    targetX = Math.max(-40, Math.min(40, g * 0.9));
    targetY = Math.max(-30, Math.min(30, (b - 45) * 0.5));
    skew = Math.max(-2, Math.min(2, g * 0.04));
  }

  if (window.DeviceOrientationEvent) {
    // iOS 13+ requires permission
    if (typeof DeviceOrientationEvent.requestPermission === "function") {
      // Request on first tap so we don't spam the prompt
      var asked = false;
      document.addEventListener(
        "click",
        function once() {
          if (asked) return;
          asked = true;
          DeviceOrientationEvent.requestPermission()
            .then(function (state) {
              if (state === "granted") {
                window.addEventListener("deviceorientation", onOrient, true);
              }
            })
            .catch(function () {});
        },
        { once: true, passive: true }
      );
    } else {
      window.addEventListener("deviceorientation", onOrient, true);
    }
  }

  // Soft idle sway when idle
  var t0 = performance.now();
  setInterval(function () {
    if (Math.abs(targetX) > 2 || Math.abs(targetY) > 2) return;
    var t = (performance.now() - t0) / 1000;
    targetX = Math.sin(t * 0.7) * 8;
    targetY = Math.cos(t * 0.5) * 5;
    skew = Math.sin(t * 0.6) * 0.35;
  }, 80);
})();
