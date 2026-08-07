/**
 * Chica / Chicas Map public config
 * Aurora Voss — keep secrets out of this file.
 * Formspree form IDs and reCAPTCHA *site* keys are public by design.
 * Never put the reCAPTCHA *secret* key here — only in Formspree dashboard.
 *
 * Formspree Friday list: https://formspree.io/f/myegykrq
 * Notification email: mr.jsciaraffa@gmail.com
 *
 * Analytics: Microsoft Clarity (free heatmaps + click rates)
 * Project ID is public by design (same as GA measurement IDs).
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

    /** Microsoft Clarity project ID (free heatmaps + click analytics) */
    CLARITY_PROJECT_ID: "xyurojj2kb",

    /** Optional Google Analytics 4 Measurement ID (e.g. G-XXXXXXXX). Leave empty to skip. */
    GA_MEASUREMENT_ID: "",

    formspreeUrl: function (id) {
      if (!id || !String(id).trim()) return null;
      return "https://formspree.io/f/" + String(id).trim();
    },
  };
})(window);
