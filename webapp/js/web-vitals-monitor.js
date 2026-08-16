/**
 * Chica Map — Core Web Vitals monitoring
 * Collects LCP, INP, CLS, FCP, TTFB and reports to Clarity + GA4 (via ChicaAnalytics).
 * Loads the official web-vitals library from jsDelivr (no bundle bloat on critical path).
 */
(function () {
  "use strict";

  var STORE_KEY = "chica_cwv_v1";
  var reported = {};
  var latest = {};

  function ratingThresholds(name, value) {
    var t = {
      LCP: [2500, 4000],
      INP: [200, 500],
      CLS: [0.1, 0.25],
      FCP: [1800, 3000],
      TTFB: [800, 1800],
    };
    var b = t[name];
    if (!b) return "unknown";
    if (value <= b[0]) return "good";
    if (value <= b[1]) return "needs-improvement";
    return "poor";
  }

  function roundMetric(name, value) {
    if (name === "CLS") return Math.round(value * 1000) / 1000;
    return Math.round(value);
  }

  function persist(metric) {
    try {
      latest[metric.name] = {
        value: metric.value,
        rating: metric.rating,
        id: metric.id,
        navigationType: metric.navigationType,
        ts: Date.now(),
      };
      sessionStorage.setItem(STORE_KEY, JSON.stringify(latest));
    } catch (_) {}
  }

  function send(metric) {
    if (!metric || !metric.name) return;
    var key = metric.name + ":" + (metric.id || "");
    if (reported[key] && metric.entries && metric.entries.length === 0) return;
    reported[key] = true;

    var name = metric.name;
    var value = roundMetric(name, metric.value);
    var rating = metric.rating || ratingThresholds(name, metric.value);

    persist({
      name: name,
      value: value,
      rating: rating,
      id: metric.id,
      navigationType: metric.navigationType,
    });

    var props = {
      event_category: "Web Vitals",
      metric_name: name,
      metric_id: metric.id || "",
      metric_value: value,
      metric_rating: rating,
      metric_delta: typeof metric.delta === "number" ? roundMetric(name, metric.delta) : undefined,
      navigation_type: metric.navigationType || "",
      page_path: (location.pathname || "") + (location.search || ""),
      value: value,
      non_interaction: true,
    };

    try {
      if (window.ChicaAnalytics && typeof window.ChicaAnalytics.track === "function") {
        window.ChicaAnalytics.track("web_vital_" + name.toLowerCase(), props);
        window.ChicaAnalytics.track("web_vitals", props);
      }
    } catch (_) {}

    try {
      if (typeof window.gtag === "function") {
        window.gtag("event", name, {
          event_category: "Web Vitals",
          value: value,
          metric_id: metric.id,
          metric_value: value,
          metric_rating: rating,
          metric_delta: props.metric_delta,
          non_interaction: true,
        });
      }
    } catch (_) {}

    try {
      if (typeof window.clarity === "function") {
        window.clarity("set", "cwv_" + name.toLowerCase(), String(value));
        window.clarity("set", "cwv_" + name.toLowerCase() + "_rating", rating);
      }
    } catch (_) {}

    try {
      if (location.search.indexOf("cwv_debug=1") >= 0 || localStorage.getItem("chica_cwv_debug") === "1") {
        console.info("[Chica CWV]", name, value, rating, metric);
      }
    } catch (_) {}
  }

  function onReport(metric) {
    send(metric);
  }

  function bind(lib) {
    if (!lib) return;
    try {
      if (lib.onLCP) lib.onLCP(onReport, { reportAllChanges: false });
      if (lib.onINP) lib.onINP(onReport, { reportAllChanges: false });
      if (lib.onCLS) lib.onCLS(onReport, { reportAllChanges: false });
      if (lib.onFCP) lib.onFCP(onReport);
      if (lib.onTTFB) lib.onTTFB(onReport);
    } catch (err) {
      console.warn("[Chica CWV] bind failed", err);
    }
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error("load failed " + src)); };
      document.head.appendChild(s);
    });
  }

  async function boot() {
    try {
      if (typeof PerformanceObserver === "undefined") return;
    } catch (_) {
      return;
    }

    var urls = [
      "https://cdn.jsdelivr.net/npm/web-vitals@4/dist/web-vitals.iife.js",
      "https://unpkg.com/web-vitals@4/dist/web-vitals.iife.js",
    ];

    for (var i = 0; i < urls.length; i++) {
      try {
        await loadScript(urls[i]);
        if (window.webVitals) {
          bind(window.webVitals);
          return;
        }
      } catch (_) {}
    }

    try {
      fallbackObservers();
    } catch (_) {}
  }

  function fallbackObservers() {
    try {
      var lcp = 0;
      var po = new PerformanceObserver(function (list) {
        var entries = list.getEntries();
        var last = entries[entries.length - 1];
        if (last) lcp = last.startTime;
      });
      po.observe({ type: "largest-contentful-paint", buffered: true });
      document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "hidden" && lcp) {
          send({ name: "LCP", value: lcp, id: "fallback-lcp", rating: ratingThresholds("LCP", lcp) });
        }
      });
    } catch (_) {}

    try {
      var cls = 0;
      var po2 = new PerformanceObserver(function (list) {
        list.getEntries().forEach(function (e) {
          if (!e.hadRecentInput) cls += e.value;
        });
      });
      po2.observe({ type: "layout-shift", buffered: true });
      document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "hidden") {
          send({ name: "CLS", value: cls, id: "fallback-cls", rating: ratingThresholds("CLS", cls) });
        }
      });
    } catch (_) {}
  }

  window.ChicaWebVitals = {
    getLatest: function () {
      try {
        return JSON.parse(sessionStorage.getItem(STORE_KEY) || "{}");
      } catch (_) {
        return Object.assign({}, latest);
      }
    },
    debug: function (on) {
      try {
        localStorage.setItem("chica_cwv_debug", on === false ? "0" : "1");
      } catch (_) {}
    },
  };

  if (document.readyState === "complete") {
    setTimeout(boot, 0);
  } else {
    window.addEventListener("load", function () {
      setTimeout(boot, 0);
    });
  }
})();
