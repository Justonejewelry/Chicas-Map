/**
 * Chicas Map — lightweight analytics loader
 * Microsoft Clarity (primary) + optional GA4
 * Fires only when IDs are present in ChicaConfig.
 * Also exposes window.ChicaAnalytics.track() for custom map events.
 */
(function () {
  "use strict";

  function getConfig() {
    return (window.ChicaConfig) || {};
  }

  // ---------- Microsoft Clarity ----------
  function loadClarity(projectId) {
    if (!projectId || typeof projectId !== "string") return;
    if (window.clarity) return; // already loaded

    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1;
      t.src = "https://www.clarity.ms/tag/" + i;
      y = l.getElementsByTagName(r)[0];
      y.parentNode.insertBefore(t, y);
    })(window, document, "clarity", "script", projectId.trim());
  }

  // ---------- Optional Google Analytics 4 ----------
  function loadGA(measurementId) {
    if (!measurementId || typeof measurementId !== "string") return;
    if (window.gtag) return;

    var id = measurementId.trim();
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + id;
    document.head.appendChild(s);

    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag("js", new Date());
    gtag("config", id, { send_page_view: true });
  }

  // ---------- Public API ----------
  window.ChicaAnalytics = {
    /**
     * Fire a named event to Clarity (and GA4 if configured).
     * @param {string} name  e.g. "near_me", "pin_click", "route_open", "save"
     * @param {object} [props] optional key/value data
     */
    track: function (name, props) {
      if (!name) return;
      try {
        if (typeof window.clarity === "function") {
          window.clarity("event", name);
          if (props && typeof props === "object") {
            // Clarity also accepts set for session tags
            Object.keys(props).forEach(function (k) {
              try { window.clarity("set", k, String(props[k])); } catch (_) {}
            });
          }
        }
      } catch (_) {}

      try {
        if (typeof window.gtag === "function") {
          window.gtag("event", name, props || {});
        }
      } catch (_) {}
    },
  };

  // Boot
  var cfg = getConfig();
  if (cfg.CLARITY_PROJECT_ID) loadClarity(cfg.CLARITY_PROJECT_ID);
  if (cfg.GA_MEASUREMENT_ID) loadGA(cfg.GA_MEASUREMENT_ID);
})();
