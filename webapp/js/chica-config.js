/**
 * Chica / Chicas Map public config
 * Keep secrets out of this file.
 */
(function (global) {
  global.ChicaConfig = {
    /* Friday email list */
    FORMSPREE_EMAIL_ID: "myegykrq",
    /* List-a-sale reviews — same Formspree form until a dedicated one is created.
       Filter in Formspree by subject: "Chica Map — free sale listing" */
    FORMSPREE_SALE_ID: "myegykrq",
    RECAPTCHA_SITE_KEY: "",
    RECAPTCHA_ACTION: "chica_friday_signup",
    REVIEW_EMAIL: "mr.jsciaraffa@gmail.com",
    CLARITY_PROJECT_ID: "xyurojj2kb",
    GA_MEASUREMENT_ID: "",
    DONATION_URL: "",
    BOOST_PAYMENT_URL: "https://square.link/u/xiJuZ66C",
    BOOST_PRICE_USD: 9,
    BOOST_MONTHS: 6,
    WIFI_WS_URL: "",
    formspreeUrl: function (id) {
      if (!id || !String(id).trim()) return null;
      return "https://formspree.io/f/" + String(id).trim();
    },
  };

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
