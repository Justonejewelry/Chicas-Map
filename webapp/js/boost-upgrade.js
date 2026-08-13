/** Upgrade featured checkbox UI to Boost 6-month pass + Square pay link */
(function () {
  var PAY =
    (window.ChicaConfig && window.ChicaConfig.BOOST_PAYMENT_URL) ||
    "https://square.link/u/xiJuZ66C";

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
      "<small>Listing stays free and reviewed. If you check Boost, you’ll pay $9 securely via Square after submit. Boost activates after payment <em>and</em> approval.</small>" +
      "</span></label>" +
      '<p class="submit-boost-pay" style="margin:10px 0 0;font-size:.85rem">' +
      '<a href="' +
      PAY +
      '" target="_blank" rel="noopener noreferrer">Pay Boost $9 now (Square)</a>' +
      " · or check the box above and pay right after you submit." +
      "</p>" +
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
          "6-MONTH BOOST PASS REQUESTED — Square Payment Link: https://square.link/u/xiJuZ66C"
        )
        .replace(
          "BOOST REQUESTED — send $9 Venmo/payment instructions for weekend boost.",
          "6-MONTH BOOST PASS REQUESTED — Square Payment Link: https://square.link/u/xiJuZ66C"
        )
        .replace(
          "6-MONTH BOOST PASS REQUESTED — send $9 payment instructions. Covers all sales from this submitter for 6 months from approval date.",
          "6-MONTH BOOST PASS REQUESTED — payer sent to Square: https://square.link/u/xiJuZ66C — activate Boost after payment + listing approval."
        );
    }
    return orig(s);
  };
})();
