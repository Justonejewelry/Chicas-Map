/**
 * Grass wind — dual-layer parallax, pointer gusts, device tilt
 * Refined: layered sine idle breeze, velocity gusts, low-pass tilt, no CSS transition fight
 */
(function () {
  if (document.querySelector(".grass-layer")) {
    // already booted
  } else {
    var far = document.createElement("div");
    far.className = "grass-layer";
    far.setAttribute("aria-hidden", "true");
    var near = document.createElement("div");
    near.className = "grass-layer-near";
    near.setAttribute("aria-hidden", "true");
    document.body.prepend(near);
    document.body.prepend(far);
  }

  var reduce =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return;

  var root = document.documentElement;

  // State
  var ptrX = 0,
    ptrY = 0; // pointer contribution
  var tiltX = 0,
    tiltY = 0; // device contribution
  var idleX = 0,
    idleY = 0,
    idleSkew = 0;
  var gust = 0; // 0..1 burst intensity

  var curX = 0,
    curY = 0,
    curX2 = 0,
    curY2 = 0,
    curSkew = 0,
    curScale = 1,
    curGust = 0;

  var lastPX = null,
    lastPY = null,
    lastPT = 0;
  var pointerActive = false;
  var tiltActive = false;
  var t0 = performance.now();

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function tick(now) {
    var t = (now - t0) / 1000;

    // Natural idle breeze — layered frequencies (not a single sine)
    if (!pointerActive && !tiltActive) {
      idleX =
        Math.sin(t * 0.55) * 10 +
        Math.sin(t * 1.3) * 4 +
        Math.sin(t * 0.21) * 6;
      idleY =
        Math.cos(t * 0.4) * 7 +
        Math.sin(t * 0.95) * 3 +
        Math.cos(t * 0.17) * 4;
      idleSkew =
        Math.sin(t * 0.48) * 0.45 + Math.sin(t * 1.1) * 0.2;
    } else {
      // Fade idle toward zero while interacting
      idleX *= 0.92;
      idleY *= 0.92;
      idleSkew *= 0.92;
    }

    // Decay gust
    gust *= 0.94;

    var targetX = idleX + ptrX + tiltX;
    var targetY = idleY + ptrY + tiltY;
    var targetSkew = idleSkew + (ptrX + tiltX) * 0.028;
    var targetScale = 1 + Math.abs(targetSkew) * 0.004 + gust * 0.012;
    var targetGust = gust;

    // Smooth follow (different rates = depth)
    curX = lerp(curX, targetX, 0.1);
    curY = lerp(curY, targetY, 0.1);
    curX2 = lerp(curX2, targetX * 1.65, 0.14); // near layer moves more
    curY2 = lerp(curY2, targetY * 1.45, 0.14);
    curSkew = lerp(curSkew, targetSkew, 0.12);
    curScale = lerp(curScale, targetScale, 0.08);
    curGust = lerp(curGust, targetGust, 0.15);

    root.style.setProperty("--wind-x", curX.toFixed(2) + "px");
    root.style.setProperty("--wind-y", curY.toFixed(2) + "px");
    root.style.setProperty("--wind-x2", curX2.toFixed(2) + "px");
    root.style.setProperty("--wind-y2", curY2.toFixed(2) + "px");
    root.style.setProperty("--wind-skew", curSkew.toFixed(3) + "deg");
    root.style.setProperty("--wind-scale", curScale.toFixed(4));
    root.style.setProperty("--gust", curGust.toFixed(3));

    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  // —— Pointer: grass leans away from cursor; fast moves = gust ——
  window.addEventListener(
    "pointermove",
    function (e) {
      pointerActive = true;
      var cx = window.innerWidth * 0.5;
      var cy = window.innerHeight * 0.5;
      var dx = (e.clientX - cx) / cx; // -1..1
      var dy = (e.clientY - cy) / cy;

      ptrX = clamp(dx * 42, -48, 48);
      ptrY = clamp(dy * 30, -36, 36);

      var now = performance.now();
      if (lastPX != null && now - lastPT > 0) {
        var vx = (e.clientX - lastPX) / (now - lastPT); // px/ms
        var vy = (e.clientY - lastPY) / (now - lastPT);
        var speed = Math.sqrt(vx * vx + vy * vy);
        // Fast swipe across the page → stronger gust
        if (speed > 0.8) {
          gust = clamp(gust + (speed - 0.8) * 0.35, 0, 1);
          ptrX += vx * 18;
          ptrY += vy * 14;
          ptrX = clamp(ptrX, -60, 60);
          ptrY = clamp(ptrY, -44, 44);
        }
      }
      lastPX = e.clientX;
      lastPY = e.clientY;
      lastPT = now;
    },
    { passive: true }
  );

  window.addEventListener(
    "pointerdown",
    function () {
      pointerActive = true;
      gust = clamp(gust + 0.25, 0, 1);
    },
    { passive: true }
  );

  function clearPointer() {
    pointerActive = false;
    ptrX = 0;
    ptrY = 0;
    lastPX = null;
  }
  window.addEventListener("pointerleave", clearPointer, { passive: true });
  window.addEventListener("blur", clearPointer, { passive: true });

  // —— Device orientation (phone tilt) with low-pass ——
  var rawGX = 0,
    rawGY = 0;
  function onOrient(e) {
    tiltActive = true;
    var g = typeof e.gamma === "number" ? e.gamma : 0;
    var b = typeof e.beta === "number" ? e.beta : 45;
    // Low-pass filter noisy sensors
    rawGX = lerp(rawGX, g, 0.12);
    rawGY = lerp(rawGY, b, 0.12);
    tiltX = clamp(rawGX * 0.85, -44, 44);
    tiltY = clamp((rawGY - 45) * 0.45, -32, 32);
  }

  function enableTilt() {
    window.addEventListener("deviceorientation", onOrient, true);
  }

  if (window.DeviceOrientationEvent) {
    if (typeof DeviceOrientationEvent.requestPermission === "function") {
      var asked = false;
      document.addEventListener(
        "click",
        function () {
          if (asked) return;
          asked = true;
          DeviceOrientationEvent.requestPermission()
            .then(function (state) {
              if (state === "granted") enableTilt();
            })
            .catch(function () {});
        },
        { once: true, passive: true }
      );
    } else {
      enableTilt();
    }
  }

  // If the phone sits still after tilt, slowly release tiltActive
  setInterval(function () {
    if (!tiltActive) return;
    // keep active while listening; idle blend handles rest
  }, 2000);
})();
