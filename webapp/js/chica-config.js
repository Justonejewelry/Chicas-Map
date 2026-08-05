/**
 * Chica / YardBird public config
 * Aurora Voss — keep secrets out of this file. Formspree form IDs are public by design.
 *
 * Setup (2 minutes):
 * 1. https://formspree.io → New Form
 * 2. Name: "Chica Friday Email Updates"
 * 3. Notification email: mr.jsciaraffa@gmail.com
 * 4. Copy the form ID from the endpoint (https://formspree.io/f/XXXXXX)
 * 5. Paste XXXXXX below as FORMSPREE_EMAIL_ID
 *
 * Optional second form for free sale listings → FORMSPREE_SALE_ID
 */
(function (global) {
  global.ChicaConfig = {
    /** Friday email list — required for AJAX signup */
    FORMSPREE_EMAIL_ID: "",

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
