/**
 * Chica / Chicas Map public config
 * Keep secrets out of this file.
 */
(function (global) {
  global.ChicaConfig = {
    FORMSPREE_EMAIL_ID: "myegykrq",
    FORMSPREE_SALE_ID: "",
    RECAPTCHA_SITE_KEY: "",
    RECAPTCHA_ACTION: "chica_friday_signup",
    REVIEW_EMAIL: "mr.jsciaraffa@gmail.com",
    CLARITY_PROJECT_ID: "xyurojj2kb",
    GA_MEASUREMENT_ID: "",
    /** Optional direct donation link. Leave empty to use sponsor.html */
    DONATION_URL: "",
    /** Square Payment Link — 6-month Boost pass ($9) */
    BOOST_PAYMENT_URL: "https://square.link/u/xiJuZ66C",
    BOOST_PRICE_USD: 9,
    BOOST_MONTHS: 6,
    /**
     * Public WiFi realtime WebSocket (Cloudflare Worker).
     * After `cd workers/wifi-realtime && npx wrangler deploy`, set to:
     *   wss://chicas-wifi-realtime.<your-subdomain>.workers.dev/ws?city=san-antonio
     * Leave empty to run offline-only (localStorage reports).
     */
    WIFI_WS_URL: "",
    formspreeUrl: function (id) {
      if (!id || !String(id).trim()) return null;
      return "https://formspree.io/f/" + String(id).trim();
    },
  };

  /*
   * Brand normalization for the map shell. The map predates the current
   * master logo, so keep the HTML fallback intact while upgrading the
   * rendered mark to the official Chicas Garage Sale Map artwork.
   */
  document.addEventListener("DOMContentLoaded", function () {
    if (!document.body || !document.body.classList.contains("grass-map")) return;

    var logo = document.querySelector(".topbar .brand .logo-mark.img");
    if (logo) {
      logo.src = "assets/chica/chica-logo.svg";
      logo.alt = "Chicas Garage Sale Map";
      logo.removeAttribute("onerror");
      logo.style.objectFit = "contain";
      logo.style.background = "#fff";
      logo.style.borderRadius = "10px";
      logo.style.padding = "1px";
    }

    var style = document.createElement("style");
    style.textContent = [
      ".grass-map .topbar .brand .logo-mark.img{width:42px;height:42px;border:1px solid #e6e1d8;box-shadow:0 3px 12px rgba(20,17,15,.12);object-fit:contain;background:#fff;padding:1px}",
      ".grass-map .topbar .brand{gap:10px}",
      ".grass-map .topbar .brand h1{letter-spacing:-.035em}",
      ".grass-map .topbar .brand h1 span{color:#1a6b3c}",
      "@media(max-width:700px){.grass-map .topbar .brand .logo-mark.img{width:38px;height:38px}.grass-map .topbar .brand h1{font-size:1rem}}"
    ].join("");
    document.head.appendChild(style);
  });
})(window);
