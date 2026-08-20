/**
 * Chica / Chicas Map public config
 * Keep secrets out of this file.
 */
(function (global) {
  global.ChicaConfig = {
    FORMSPREE_EMAIL_ID: "myegykrq",
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

  function loadProductPolish() {
    if (document.getElementById("chicaProductPolish")) return;
    var script = document.createElement("script");
    script.id = "chicaProductPolish";
    script.src = "js/product-polish.js?v=20260820";
    script.defer = true;
    document.head.appendChild(script);
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!document.body) return;
    loadProductPolish();

    if (document.body.classList.contains("grass-map")) {
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
        ".grass-map .topbar .brand h1 span{color:#c513b8}",
        "@media(max-width:700px){.grass-map .topbar .brand .logo-mark.img{width:38px;height:38px}.grass-map .topbar .brand h1{font-size:1rem}}"
      ].join("");
      document.head.appendChild(style);
    }

    /* Homepage: turn the three capability cards into clear next-step actions. */
    var cards = document.querySelectorAll(".trust-card");
    if (cards.length >= 3) {
      var copy = [
        {
          title: "Find the best sales",
          text: "See verified garage, yard, estate, and permit leads on one live map, with the details you need before you drive.",
          label: "Browse live sales"
        },
        {
          title: "Build your route",
          text: "Use Near Me, distance sorting, and multi-stop routing to turn a handful of good finds into an efficient Saturday hunt.",
          label: "Plan a route"
        },
        {
          title: "Use the useful layers",
          text: "Turn on practical map layers for school-zone awareness, food pantries, public Wi-Fi, parking, and emergency information when you need them.",
          label: "Explore map tools"
        }
      ];
      cards.forEach(function (card, i) {
        if (!copy[i]) return;
        var h = card.querySelector("h2");
        var p = card.querySelector("p");
        if (h) h.textContent = copy[i].title;
        if (p) p.textContent = copy[i].text;
        var a = card.querySelector("a.trust-action");
        if (!a) {
          a = document.createElement("a");
          a.className = "btn btn-ghost btn-sm trust-action";
          a.href = "map.html";
          card.appendChild(a);
        }
        a.textContent = copy[i].label;
      });
      var style = document.createElement("style");
      style.textContent = ".trust-card{display:flex;flex-direction:column;align-items:center}.trust-card p{margin:0 0 14px}.trust-card .trust-action{margin-top:auto}";
      document.head.appendChild(style);
    }
  });
})(window);
