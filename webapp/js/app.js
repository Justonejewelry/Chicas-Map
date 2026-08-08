(function () {
  const CITY_META = {
    "san-antonio": { name: "San Antonio", center: [-98.4936, 29.4241], zoom: 11 },
    austin: { name: "Austin", center: [-97.7431, 30.2672], zoom: 11 },
    houston: { name: "Houston", center: [-95.3698, 29.7604], zoom: 10 },
    dallas: { name: "Dallas", center: [-96.797, 32.7767], zoom: 11 },
    lubbock: { name: "Lubbock", center: [-101.8552, 33.5779], zoom: 11 },
  };
  const TEXAS = { name: "Texas", center: [-99.5, 31.0], zoom: 5.5 };
  const STYLES = {
    liberty: "https://tiles.openfreemap.org/styles/liberty",
    bright: "https://tiles.openfreemap.org/styles/bright",
    dark: "https://tiles.openfreemap.org/styles/dark",
  };
  const PIN_COLORS = {
    garage: "#22c55e",
    estate: "#a855f7",
    fundraiser: "#f59e0b",
    permit: "#38bdf8",
    top: "#c45c26",
  };

  let map, userMarker = null;
  let feed = null;
  let city = localStorage.getItem("yb_city") || "san-antonio";
  let engine = localStorage.getItem("yb_map") || "liberty";
  let filter = "all", query = "";
  let dayFilters = { fri: true, sat: true, sun: true };
  let userLoc = null;
  let maxMiles = 10;
  let showFavOnly = false;
  let favorites = loadJson("yb_favorites", {});
  let routeIds = loadJson("yb_route", []);
  let first30Only = false;
  let dnaHeatOn = localStorage.getItem("yb_dna_heat") === "1";
  let wishlistOnly = false;
  let _salesCache = null;
  let _salesCacheKey = "";
  let _refreshTimer = null;
  let _pinSourceReady = false;

  const METRICS_KEY = "yb_hard_metrics";
  let metrics = loadJson(METRICS_KEY, { clicks: 0, saves: 0, route_opens: 0, active_days: {}, first_seen: null });

  function loadJson(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (_) { return fallback; }
  }
  function saveJson(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (_) {}
  }

  function trackEvent(name, props) {
    try {
      if (window.ChicaAnalytics && typeof window.ChicaAnalytics.track === "function") {
        window.ChicaAnalytics.track(name, props || {});
      }
    } catch (_) {}
  }

  function returnToMap() {
    const rail = document.getElementById("sideRail");
    const backdrop = document.getElementById("railBackdrop");
    if (rail) rail.classList.remove("open");
    if (backdrop) {
      backdrop.classList.remove("open");
      backdrop.hidden = true;
    }
    document.getElementById("dockList")?.classList.remove("active");
    document.getElementById("popNear")?.classList.remove("open");
    document.getElementById("popSearch")?.classList.remove("open");
    document.getElementById("fabNear")?.classList.remove("active");
    document.getElementById("fabSearch")?.classList.remove("active");
    requestAnimationFrame(() => {
      try { map && map.resize(); } catch (_) {}
    });
  }

  // NOTE: Full app continues - this is incomplete marker, will fix
  console.error("INCOMPLETE APP - DO NOT USE");
})();
