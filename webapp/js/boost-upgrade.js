/** Upgrade featured checkbox UI to Boost $9 card */
(function () {
  function run() {
    var old = document.querySelector(".submit-featured");
    if (!old || document.querySelector(".submit-boost")) return;
    var wrap = document.createElement("div");
    wrap.className = "submit-boost";
    wrap.setAttribute("role", "group");
    wrap.setAttribute("aria-labelledby", "boost-heading");
    wrap.innerHTML =
      '<div class="submit-boost-head">' +
      '<h4 id="boost-heading">Get found faster <span>(optional)</span></h4>' +
      "<p>Free listings always go on the map after review. Boost is for the weekend you want extra visibility.</p>" +
      "</div>" +
      '<label class="submit-boost-card">' +
      '<input type="checkbox" id="saleFeatured" name="featured" />' +
      '<span class="submit-boost-body">' +
      '<span class="submit-boost-top"><strong>Boost this weekend</strong><span class="submit-boost-price">$9</span></span>' +
      "<ul><li>Gold pin on the map</li><li>Priority in Closest & list</li><li>“Boosted” badge on your card</li></ul>" +
      "<small>Payment instructions emailed after review. Listing stays free if you skip this.</small>" +
      "</span></label>" +
      '<p class="submit-boost-sponsor">Local business? See <a href="sponsor.html">weekend sponsorship packages</a> from $100.</p>';
    old.replaceWith(wrap);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})();

/* Patch mailto copy: $5 Featured → $9 Boost */
(function () {
  var orig = window.encodeURIComponent;
  window.encodeURIComponent = function (s) {
    if (typeof s === "string") {
      s = s
        .replace("FEATURED sale listing for review ($5)", "BOOSTED sale listing for review ($9)")
        .replace(
          "FEATURED REQUESTED — send $5 payment instructions.",
          "BOOST REQUESTED — send $9 Venmo/payment instructions for weekend boost."
        );
    }
    return orig(s);
  };
})();
