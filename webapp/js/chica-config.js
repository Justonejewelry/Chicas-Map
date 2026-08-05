/**
 * Chica / YardBird public config
 * Aurora Voss — keep secrets out of this file. Formspree form IDs are public by design.
 *
 * Formspree Friday list: https://formspree.io/f/myegykrq
 * Notification email should be mr.jsciaraffa@gmail.com in the Formspree dashboard.
 */
(function (global) {
  global.ChicaConfig = {
    /** Friday email list */
    FORMSPREE_EMAIL_ID: "myegykrq",

    /** Free sale submissions (optional; falls back to mailto if empty) */
    FORMSPREE_SALE_ID: "",

    /** Review / notification address (mailto fallback + Formspree target) */
    REVIEW_EMAIL: "mr.jsciaraffa@gmail.com",

    formspreeUrl: function (id) {
      if (!id || !String(id).trim()) return null;
      return "https://formspree.io/f/" + String(id).trim();
    },
  };
})(window);
