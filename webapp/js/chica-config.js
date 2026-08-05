/**
 * Chica / YardBird public config
 * Aurora Voss — keep secrets out of this file.
 * Formspree form IDs and reCAPTCHA *site* keys are public by design.
 * Never put the reCAPTCHA *secret* key here — only in Formspree dashboard.
 *
 * Formspree Friday list: https://formspree.io/f/myegykrq
 * Notification email: mr.jsciaraffa@gmail.com
 *
 * reCAPTCHA setup:
 * 1. https://www.google.com/recaptcha/admin → Create (v3)
 * 2. Domains: justonejewelry.github.io  (+ localhost for local test)
 * 3. Paste SITE key below as RECAPTCHA_SITE_KEY
 * 4. In Formspree form Settings → CAPTCHA on → Custom reCAPTCHA → paste SECRET key
 */
(function (global) {
  global.ChicaConfig = {
    /** Friday email list */
    FORMSPREE_EMAIL_ID: "myegykrq",

    /** Free sale submissions (optional; falls back to mailto if empty) */
    FORMSPREE_SALE_ID: "",

    /** Google reCAPTCHA v3 site key (public). Leave empty to skip client captcha. */
    RECAPTCHA_SITE_KEY: "",

    /** reCAPTCHA v3 action name sent with token */
    RECAPTCHA_ACTION: "chica_friday_signup",

    /** Review / notification address (mailto fallback) */
    REVIEW_EMAIL: "mr.jsciaraffa@gmail.com",

    formspreeUrl: function (id) {
      if (!id || !String(id).trim()) return null;
      return "https://formspree.io/f/" + String(id).trim();
    },
  };
})(window);
