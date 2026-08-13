/** Upgrade featured checkbox UI to Boost 6-month pass */
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
      "<p>Free listings always go on the map after review. Boost covers <strong>every sale you list for the next 6 months</strong>.</p>" +
      "</div>" +
      '<label class="submit-boost-card">' +
      '<input type="checkbox" id="saleFeatured" name="featured" />' +
      '<span class="submit-boost-body">' +
      '<span class="submit-boost-top"><strong>6-month Boost pass</strong><span class="submit-boost-price">$9</span></span>' +
      "<ul>" +
      "<li>Gold pin on every sale you submit for 6 months</li>" +
      "<li>Priority in Closest & list</li>" +
      "<li>“Boosted” badge on each card</li>" +
      "<li>One payment — covers all your garage sales this season</li>" +
      "</ul>" +
      "<small>Payment instructions emailed after review. Your first listing and any later ones in the next 6 months stay boosted.</small>" +
      "</span></label>" +
      '<p class="submit-boost-sponsor">Local business? See <a href="sponsor.html">weekend sponsorship packages</a> from $100.</p>';
    old.replaceWith(wrap);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})();

/* Patch mailto copy for older page caches */
(function () {
  var orig = window.encodeURIComponent;
  window.encodeURIComponent = function (s) {
    if (typeof s === "string") {
      s = s
        .replace("FEATURED sale listing for review ($5)", "BOOST 6-MONTH PASS ($9)")
        .replace("BOOSTED sale listing for review ($9)", "BOOST 6-MONTH PASS ($9)")
        .replace(
          "FEATURED REQUESTED — send $5 payment instructions.",
          "6-MONTH BOOST PASS REQUESTED — send $9 payment instructions. Covers all sales from this submitter for 6 months."
        )
        .replace(
          "BOOST REQUESTED — send $9 Venmo/payment instructions for weekend boost.",
          "6-MONTH BOOST PASS REQUESTED — send $9 payment instructions. Covers all sales from this submitter for 6 months."
        );
    }
    return orig(s);
  };
})();
