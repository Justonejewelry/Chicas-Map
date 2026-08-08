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

  function trackMetric(kind) {
    if (kind === "click") metrics.clicks = (metrics.clicks || 0) + 1;
    else if (kind === "save") metrics.saves = (metrics.saves || 0) + 1;
    else if (kind === "route_open") metrics.route_opens = (metrics.route_opens || 0) + 1;
    const day = new Date().toISOString().slice(0, 10);
    if (!metrics.active_days) metrics.active_days = {};
    metrics.active_days[day] = (metrics.active_days[day] || 0) + 1;
    if (!metrics.first_seen) metrics.first_seen = day;
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
    const cut = cutoff.toISOString().slice(0, 10);
    Object.keys(metrics.active_days).forEach((d) => { if (d < cut) delete metrics.active_days[d]; });
    saveJson(METRICS_KEY, metrics);
    renderHardMetrics();
    if (kind === "click") trackEvent("pin_click", { city: city });
    else if (kind === "save") trackEvent("save", { city: city });
    else if (kind === "route_open") trackEvent("route_open", { city: city, stops: routeIds.length });
    else if (kind === "session") trackEvent("map_session", { city: city });
  }

  function weeklyActiveUsersApprox() {
    const days = metrics.active_days || {};
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7);
    const cut = cutoff.toISOString().slice(0, 10);
    return Object.keys(days).filter((d) => d >= cut).length;
  }

  function formatRelative(iso) {
    if (!iso) return "—";
    try {
      const t = new Date(iso);
      if (isNaN(t.getTime())) return String(iso).slice(0, 16);
      const diff = Math.round((Date.now() - t.getTime()) / 1000);
      if (diff < 60) return "just now";
      if (diff < 3600) return Math.floor(diff / 60) + "m ago";
      if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
      if (diff < 604800) return Math.floor(diff / 86400) + "d ago";
      return t.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    } catch (_) { return String(iso).slice(0, 19); }
  }

  function renderHardMetrics() {
    const el = document.getElementById("hardMetrics");
    if (!el) return;
    const live = feed ? allSales().length : 0;
    const total = (feed && (feed.total_locations || live)) || live;
    const last = (feed && (feed.last_refresh || feed.generated_at || feed.date)) || null;
    const purgeRate = (feed && feed.purge_rate != null) ? feed.purge_rate : null;
    const wau = weeklyActiveUsersApprox();
    el.innerHTML = `
      <div class="metrics-grid">
        <div class="m-item"><span class="m-val">${live || total}</span><span class="m-lbl">Live sales</span></div>
        <div class="m-item"><span class="m-val">${purgeRate != null ? (purgeRate * 100).toFixed(0) + "%" : "—"}</span><span class="m-lbl">Expired purge</span></div>
        <div class="m-item"><span class="m-val">${metrics.clicks || 0}</span><span class="m-lbl">Click-throughs</span></div>
        <div class="m-item"><span class="m-val">${metrics.saves || 0}</span><span class="m-lbl">Saves</span></div>
        <div class="m-item"><span class="m-val">${metrics.route_opens || 0}</span><span class="m-lbl">Route opens</span></div>
        <div class="m-item"><span class="m-val">${wau}</span><span class="m-lbl">WAU (device)</span></div>
      </div>
      <div class="m-updated">Map last updated · <strong>${formatRelative(last)}</strong>${last ? ` <span class="m-iso">(${String(last).slice(0, 16)})</span>` : ""}</div>
    `;
  }

  function saleKey(s) {
    return `${(s.address || "").toLowerCase()}|${s.lat}|${s.lon}|${s.title || ""}`;
  }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "\u0026amp;")
      .replace(/</g, "\u0026lt;")
      .replace(/>/g, "\u0026gt;")
      .replace(/"/g, "\u0026quot;");
  }
  function milesBetween(lat1, lon1, lat2, lon2) {
    const R = 3958.8; const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1); const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  function formatMiles(m) {
    if (m == null || isNaN(m)) return "";
    if (m < 0.1) return "< 0.1 mi";
    if (m < 10) return m.toFixed(1) + " mi";
    return Math.round(m) + " mi";
  }
  function toast(msg) {
    const el = document.getElementById("toast");
    if (!el) return;
    el.textContent = msg; el.classList.remove("hidden");
    clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.add("hidden"), 2200);
  }
  function normalizeFeed(raw) {
    if (!raw || typeof raw !== "object") return { public: [], permits: [], clusters: [], hot_zones: [], sources: [], total_locations: 0 };
    return {
      ...raw,
      public: Array.isArray(raw.public) ? raw.public : (raw.sales || []),
      permits: Array.isArray(raw.permits) ? raw.permits : [],
      clusters: raw.clusters || [],
      hot_zones: raw.hot_zones || [],
      sources: raw.sources || [],
      total_locations: raw.total_locations || 0,
    };
  }

  function invalidateSalesCache() {
    _salesCache = null;
    _salesCacheKey = "";
  }

  function saleMatchesDay(s) {
    const allOn = dayFilters.fri && dayFilters.sat && dayFilters.sun;
    if (allOn) return true;
    const blob = `${s.dates || ""} ${s.hours || ""} ${s.start_date || ""} ${s.end_date || ""} ${s.title || ""}`.toLowerCase();
    const hasFri = /\bfri(day)?\b|\bthurs?\b|weekend/.test(blob);
    const hasSat = /\bsat(urday)?\b|weekend/.test(blob);
    const hasSun = /\bsun(day)?\b|weekend/.test(blob);
    const anyDayMention = hasFri || hasSat || hasSun;
    if (!anyDayMention) return true;
    if (dayFilters.fri && hasFri) return true;
    if (dayFilters.sat && hasSat) return true;
    if (dayFilters.sun && hasSun) return true;
    return false;
  }

  function allSales() {
    if (!feed) return [];
    const key = `${city}|${userLoc ? userLoc.lat + "," + userLoc.lon : "noloc"}|${(feed.public || []).length}|${(feed.permits || []).length}`;
    if (_salesCache && _salesCacheKey === key) return _salesCache;
    const base = [...(feed.public || []), ...(feed.permits || [])];
    const hz = feed.hot_zones || [];
    const out = base.map((s) => {
      const copy = { ...s, _key: saleKey(s) };
      if (userLoc && s.lat != null && s.lon != null) copy._miles = milesBetween(userLoc.lat, userLoc.lon, s.lat, s.lon);
      if (window.ChicaFeatures) copy._sniff = ChicaFeatures.sniffScore(s, hz);
      return copy;
    });
    _salesCache = out;
    _salesCacheKey = key;
    return out;
  }

  function filtered() {
    let list = allSales();
    if (filter && filter !== "all") {
      if (filter === "photos") list = list.filter((s) => (s.photos || 0) > 0);
      else list = list.filter((s) => (s.type || "garage").toLowerCase() === filter);
    }
    if (query) {
      const q = query.toLowerCase();
      list = list.filter((s) => `${s.title || ""} ${s.address || ""} ${s.details || ""} ${(s.categories || []).join(" ")}`.toLowerCase().includes(q));
    }
    list = list.filter(saleMatchesDay);
    if (showFavOnly) list = list.filter((s) => favorites[s._key]);
    if (wishlistOnly && window.ChicaFeatures) list = list.filter((s) => ChicaFeatures.matchesWishlist(s));
    if (first30Only && window.ChicaFeatures) list = list.filter((s) => ChicaFeatures.isEarlyOpen(s) || (s._sniff || 0) >= 4);
    if (userLoc && maxMiles > 0) list = list.filter((s) => s._miles == null || s._miles <= maxMiles);
    list.sort((a, b) => (a._miles ?? 999) - (b._miles ?? 999));
    return list;
  }

  // RESTORE_MARKER_PARTIAL - full file continues in next push if needed
  console.error("Chica map app.js incomplete restore - contact maintainer");
})();
