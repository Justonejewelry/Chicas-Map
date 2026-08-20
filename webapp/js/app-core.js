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

  function toggleFavorite(s) {
    const k = s._key || saleKey(s);
    if (favorites[k]) {
      delete favorites[k];
      toast("Removed from saved");
      trackEvent("unsave", { city: city });
    } else {
      favorites[k] = { title: s.title, address: s.address, lat: s.lat, lon: s.lon, type: s.type, dates: s.dates };
      toast("Saved ★");
      trackMetric("save");
    }
    saveJson("yb_favorites", favorites);
    updateToolCounts();
    renderList();
  }
  function toggleRouteStop(s) {
    const k = s._key || saleKey(s);
    const idx = routeIds.indexOf(k);
    if (idx >= 0) {
      routeIds.splice(idx, 1);
      toast("Removed from route");
      trackEvent("route_remove", { city: city });
    } else {
      if (routeIds.length >= 8) { toast("Max 8 stops"); return; }
      routeIds.push(k);
      toast("Added to route");
      trackEvent("route_add", { city: city, stops: routeIds.length });
    }
    saveJson("yb_route", routeIds);
    updateToolCounts();
    renderRouteTray();
    renderList();
  }
  function updateToolCounts() {
    const fc = document.getElementById("favCount");
    const rc = document.getElementById("routeCount");
    if (fc) fc.textContent = String(Object.keys(favorites).length);
    if (rc) rc.textContent = String(routeIds.length);
    const favBtn = document.getElementById("btnFavorites");
    if (favBtn) favBtn.classList.toggle("active", showFavOnly);
  }
  function renderRouteTray() {
    const tray = document.getElementById("routeTray");
    const list = document.getElementById("routeStops");
    if (!tray || !list) return;
    if (!routeIds.length) { tray.classList.add("hidden"); return; }
    tray.classList.remove("hidden");
    const byKey = {};
    allSales().forEach((s) => (byKey[s._key] = s));
    routeIds.forEach((k) => { if (!byKey[k] && favorites[k]) byKey[k] = { ...favorites[k], _key: k }; });
    list.innerHTML = routeIds.map((k, i) => {
      const s = byKey[k] || { title: "Saved stop", address: k };
      return `<li><span class="num">${i + 1}</span> <span>${esc(s.title || s.address || "Stop")}</span></li>`;
    }).join("");
  }

  function buildNavUrls(stops) {
    if (!stops || !stops.length) return null;
    const origin = userLoc ? `${userLoc.lat},${userLoc.lon}` : (stops[0].lat != null ? `${stops[0].lat},${stops[0].lon}` : encodeURIComponent(stops[0].address || ""));
    const destStop = stops[stops.length - 1];
    const destination = destStop.lat != null ? `${destStop.lat},${destStop.lon}` : encodeURIComponent(destStop.address || "");
    const middle = stops.slice(userLoc ? 0 : 1, -1);
    const waypoints = middle.map((s) => (s.lat != null ? `${s.lat},${s.lon}` : encodeURIComponent(s.address || ""))).join("|");
    let google = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
    if (waypoints) google += `&waypoints=${waypoints}`;
    const apple = destStop.lat != null
      ? `https://maps.apple.com/?daddr=${destStop.lat},${destStop.lon}`
      : `https://maps.apple.com/?daddr=${encodeURIComponent(destStop.address || "")}`;
    const waze = destStop.lat != null
      ? `https://waze.com/ul?ll=${destStop.lat},${destStop.lon}&navigate=yes`
      : `https://waze.com/ul?q=${encodeURIComponent(destStop.address || "")}&navigate=yes`;
    return { google, apple, waze };
  }

  function openMultiRoute(app) {
    const byKey = {};
    allSales().forEach((s) => (byKey[s._key] = s));
    routeIds.forEach((k) => { if (!byKey[k] && favorites[k]) byKey[k] = favorites[k]; });
    const stops = routeIds.map((k) => byKey[k]).filter((s) => s && (s.lat != null || s.address));
    if (stops.length < 1) { toast("Add at least one stop"); return; }
    const urls = buildNavUrls(stops);
    if (!urls) return;
    trackMetric("route_open");
    const target = app === "apple" ? urls.apple : app === "waze" ? urls.waze : urls.google;
    window.open(target, "_blank", "noopener");
  }

  function directionsUrls(s) {
    if (s.lat != null && s.lon != null) {
      return {
        google: `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lon}`,
        apple: `https://maps.apple.com/?daddr=${s.lat},${s.lon}`,
        waze: `https://waze.com/ul?ll=${s.lat},${s.lon}&navigate=yes`,
      };
    }
    if (s.address) {
      const q = encodeURIComponent(s.address);
      return {
        google: `https://www.google.com/maps/dir/?api=1&destination=${q}`,
        apple: `https://maps.apple.com/?daddr=${q}`,
        waze: `https://waze.com/ul?q=${q}&navigate=yes`,
      };
    }
    return null;
  }

  function sourceLink(s) {
    if (s.source_url || s.url) return `<a href="${esc(s.source_url || s.url)}" target="_blank" rel="noopener">${esc(s.source || "source")}</a>`;
    return esc(s.source || "Chicas Map");
  }

  function reportSale(s, reason) {
    const subject = encodeURIComponent(`Chica Map — ${reason}: ${s.title || s.address || "sale"}`);
    const body = encodeURIComponent(
      `Report type: ${reason}\n\nTitle: ${s.title || ""}\nAddress: ${s.address || ""}\nLat/Lon: ${s.lat},${s.lon}\nDates: ${s.dates || ""}\nSource: ${s.source || ""}\n\nReported from map at ${new Date().toISOString()}`
    );
    trackEvent("report_sale", { city: city, reason });
    window.location.href = `mailto:mr.jsciaraffa@gmail.com?subject=${subject}&body=${body}`;
    toast("Report email opened — thank you");
  }

  function showDetail(s) {
    const drawer = document.getElementById("detailDrawer");
    const body = document.getElementById("detailBody");
    if (!drawer || !body) return;
    trackMetric("click");
    const k = s._key || saleKey(s);
    const isFav = !!favorites[k];
    const onRoute = routeIds.includes(k);
    const dist = s._miles != null ? `<div class="d-meta"><strong>${formatMiles(s._miles)}</strong> away</div>` : "";
    const dirs = directionsUrls(s);
    body.innerHTML = `<h3>${esc(s.title || "Sale")}</h3>
      <div class="d-addr">${esc(s.address || "")}</div>
      ${dist}
      <div class="d-meta">${esc(s.dates || "")} ${esc(s.hours || "")}</div>
      <div class="d-meta">Type: ${esc(s.type || "garage")} · Confidence: ${s.confidence ?? "—"} · Sniff: ${s._sniff != null ? s._sniff + "/5 🦴" : "—"}</div>
      <div class="d-meta">Source: ${sourceLink(s)}</div>
      <div class="d-body">${esc(s.details || "No description.")}</div>
      ${s.photos ? `<div class="d-meta">📷 ${s.photos} photos noted at source</div>` : ""}
      <div class="action-row">
        <button type="button" class="action-btn" id="btnFav">${isFav ? "★ Saved" : "☆ Save"}</button>
        <button type="button" class="action-btn" id="btnAddRoute">${onRoute ? "✓ On route" : "＋ Route"}</button>
        <button type="button" class="action-btn" id="btnShareSale">↗ Share</button>
      </div>
      ${dirs ? `<div class="nav-apps">
        <a class="nav-app-btn google" href="${esc(dirs.google)}" target="_blank" rel="noopener">Google</a>
        <a class="nav-app-btn apple" href="${esc(dirs.apple)}" target="_blank" rel="noopener">Apple</a>
        <a class="nav-app-btn waze" href="${esc(dirs.waze)}" target="_blank" rel="noopener">Waze</a>
      </div>` : ""}
      <div class="report-row">
        <button type="button" class="report-btn" id="btnReportClosed">Report Closed</button>
        <button type="button" class="report-btn" id="btnReportWrong">Wrong Address</button>
      </div>`;
    drawer.classList.remove("hidden");
    drawer.classList.add("open");
    document.getElementById("sideRail")?.classList.add("open");
    const bd = document.getElementById("railBackdrop");
    if (bd) { bd.hidden = false; bd.classList.add("open"); }
    document.getElementById("dockList")?.classList.add("active");
    requestAnimationFrame(() => {
      try {
        drawer.scrollIntoView({ behavior: "smooth", block: "nearest" });
        const sc = document.querySelector(".rail-scroll");
        if (sc) {
          const target = drawer.offsetTop - Math.max(0, sc.clientHeight - drawer.offsetHeight - 24);
          sc.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
        }
      } catch (_) {}
    });
    document.getElementById("btnFav")?.addEventListener("click", () => { toggleFavorite(s); showDetail({ ...s, _key: k }); });
    document.getElementById("btnAddRoute")?.addEventListener("click", () => { toggleRouteStop(s); showDetail({ ...s, _key: k }); });
    document.getElementById("btnShareSale")?.addEventListener("click", async () => {
      const text = `${s.title || "Sale"} — ${s.address || ""}\n${s.dates || ""} ${s.hours || ""}\nhttps://justonejewelry.github.io/Chicas-Map/map.html`;
      trackEvent("share_sale", { city: city });
      try {
        if (navigator.share) await navigator.share({ title: s.title || "Chica sale", text });
        else { await navigator.clipboard.writeText(text); toast("Copied"); }
      } catch (_) {}
    });
    document.getElementById("btnReportClosed")?.addEventListener("click", () => reportSale(s, "Sale Closed / Ended"));
    document.getElementById("btnReportWrong")?.addEventListener("click", () => reportSale(s, "Wrong Address"));
    window.__YB_LAST_SALE = s;
    const tipBtn = document.getElementById("btnOpenTipForm");
    if (tipBtn) tipBtn.hidden = !(s.type === "permit" || (s.source || "").toLowerCase().includes("permit"));
  }
  function hideDetail() {
    const drawer = document.getElementById("detailDrawer");
    if (drawer) {
      drawer.classList.add("hidden");
      drawer.classList.remove("open");
    }
  }
  function renderList() {
    const ul = document.getElementById("saleList");
    const countEl = document.getElementById("listCount");
    const titleEl = document.getElementById("listTitle");
    if (!ul) return;
    const items = filtered();
    if (countEl) countEl.textContent = String(items.length);
    if (titleEl) titleEl.textContent = showFavOnly ? "Saved" : (userLoc ? "Closest" : "Sales");
    ul.innerHTML = items.map((s) => {
      const fav = favorites[s._key] ? "★" : "☆";
      const dist = s._miles != null ? `<span class="dist">${formatMiles(s._miles)}</span>` : "";
      const sniff = s._sniff != null ? `<span class="sniff">${"🦴".repeat(Math.min(5, s._sniff))}</span>` : "";
      return `<li class="sale-item" data-key="${esc(s._key)}">
        <button type="button" class="sale-main">
          <span class="sale-title">${esc(s.title || "Sale")}</span>
          <span class="sale-meta">${esc(s.address || "")} ${dist} ${sniff}</span>
        </button>
        <button type="button" class="sale-fav" title="Save">${fav}</button>
      </li>`;
    }).join("") || `<li class="empty">No sales match. Try City-wide, clear search, or widen days.</li>`;
    ul.querySelectorAll(".sale-main").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.closest("li")?.dataset.key;
        const s = allSales().find((x) => x._key === key);
        if (s) showDetail(s);
      });
    });
    ul.querySelectorAll(".sale-fav").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const key = btn.closest("li")?.dataset.key;
        const s = allSales().find((x) => x._key === key) || favorites[key];
        if (s) toggleFavorite({ ...s, _key: key });
      });
    });
  }

  function ensurePinLayers() {
    if (!map || _pinSourceReady) return;
    if (!map.getSource) return;
    try {
      if (!map.getSource("yb-pins")) {
        map.addSource("yb-pins", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        map.addLayer({
          id: "yb-pins-layer",
          type: "circle",
          source: "yb-pins",
          paint: {
            "circle-color": [
              "match",
              ["get", "kind"],
              "estate", PIN_COLORS.estate,
              "permit", PIN_COLORS.permit,
              "fundraiser", PIN_COLORS.fundraiser,
              "top", PIN_COLORS.top,
              PIN_COLORS.garage,
            ],
            "circle-radius": [
              "interpolate", ["linear"], ["zoom"],
              9, ["case", ["==", ["get", "kind"], "top"], 7, 6],
              12, ["case", ["==", ["get", "kind"], "top"], 11, 9],
              15, ["case", ["==", ["get", "kind"], "top"], 14, 12],
            ],
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
            "circle-opacity": 0.95,
          },
        });

        map.on("click", "yb-pins-layer", (e) => {
          e.preventDefault();
          const f = e.features && e.features[0];
          if (!f) return;
          const key = f.properties && f.properties.key;
          let s = allSales().find((x) => x._key === key);
          if (!s && f.properties) {
            s = { _key: key, title: f.properties.title, lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0], type: f.properties.kind === "top" ? "garage" : f.properties.kind };
          }
          if (!s) return;
          try {
            if (window.__ybPinPopup) { window.__ybPinPopup.remove(); window.__ybPinPopup = null; }
            const html = `<div class="popup-title">${esc(s.title || "Sale")}</div>
              <div class="popup-meta">${esc(s.address || "")}</div>
              <div class="popup-meta" style="margin-top:6px;font-weight:700;color:#1a6b3c">Tap List for full details →</div>`;
            window.__ybPinPopup = new maplibregl.Popup({ offset: 14, closeButton: true, maxWidth: "260px", className: "yb-pin-popup" })
              .setLngLat(e.lngLat)
              .setHTML(html)
              .addTo(map);
          } catch (_) {}
          showDetail(s);
        });
        map.on("mouseenter", "yb-pins-layer", () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", "yb-pins-layer", () => { map.getCanvas().style.cursor = ""; });
      }
      _pinSourceReady = true;
    } catch (err) {
      console.warn("pin layers", err);
    }
  }

  function renderMarkers() {
    if (!map) return;
    ensurePinLayers();
    const items = filtered();
    const features = [];
    for (let i = 0; i < items.length; i++) {
      const s = items[i];
      if (s.lat == null || s.lon == null) continue;
      let kind = (s.type || "garage").toLowerCase();
      if (s.confidence >= 0.9 || favorites[s._key] || (s._sniff && s._sniff >= 5)) kind = "top";
      features.push({
        type: "Feature",
        properties: { key: s._key, kind, title: s.title || "Sale" },
        geometry: { type: "Point", coordinates: [s.lon, s.lat] },
      });
    }
    const src = map.getSource("yb-pins");
    if (src) src.setData({ type: "FeatureCollection", features });

    if (window.ChicaFeatures && dnaHeatOn) {
      const geo = ChicaFeatures.heatFeatures(items, feed?.hot_zones || []);
      ChicaFeatures.ensureHeatLayer(map, geo);
    } else if (window.ChicaFeatures) {
      ChicaFeatures.removeHeatLayer(map);
    }
  }

  function renderForecast() {
    const hz = document.getElementById("hotZones");
    const qa = document.getElementById("quickAreas");
    if (!hz) return;
    const zones = (feed && feed.hot_zones) || [];
    hz.innerHTML = zones.map((z) => `<div class="hz"><strong>${esc(z.name)}</strong> <span class="badge">${esc(z.badge || "ACTIVE")}</span></div>`).join("") || "<p class=\"muted\">No hot zones this pass.</p>";
    if (qa) qa.innerHTML = zones.slice(0, 4).map((z) => `<button type="button" class="chip" data-jump="${z.lat},${z.lon}">${esc(z.name)}</button>`).join("");
    qa?.querySelectorAll("[data-jump]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const [lat, lon] = btn.dataset.jump.split(",").map(Number);
        if (map && !isNaN(lat)) {
          map.flyTo({ center: [lon, lat], zoom: 12 });
          trackEvent("hot_zone_jump", { city: city });
          returnToMap();
        }
      });
    });
  }

  function refresh() {
    renderList();
    renderMarkers();
    renderForecast();
    renderRouteTray();
    updateToolCounts();
    renderHardMetrics();
  }

  function scheduleRefresh() {
    clearTimeout(_refreshTimer);
    _refreshTimer = setTimeout(refresh, 40);
  }

  async function loadCity(slug) {
    const prev = city;
    city = slug;
    localStorage.setItem("yb_city", city);
    if (prev !== city) trackEvent("city_change", { city: city, from: prev });
    showFavOnly = false;
    invalidateSalesCache();
    _pinSourceReady = false;
    if (city === "texas") {
      map.flyTo({ center: TEXAS.center, zoom: TEXAS.zoom });
      feed = normalizeFeed({ public: [], permits: [], total_locations: 5, last_refresh: new Date().toISOString() });
      const texasEditionMeta = document.getElementById("editionMeta");
      if (texasEditionMeta) texasEditionMeta.innerHTML = "<strong>Texas</strong><br/>overview";
      renderHardMetrics();
      refresh();
      returnToMap();
      return;
    }
    const meta = CITY_META[city] || CITY_META["san-antonio"];
    if (!userLoc) map.flyTo({ center: meta.center, zoom: meta.zoom });
    let raw = null;
    try {
      const r = await fetch(`data/cities/${city}.json`);
      if (r.ok) {
        const text = await r.text();
        if (text && text.trim() !== "PLACEHOLDER" && text.trim()[0] === "{") raw = JSON.parse(text);
      }
    } catch (_) {}
    if (!raw) {
      try { raw = await (await fetch("data/feed.json")).json(); } catch (_) {}
    }
    feed = normalizeFeed(raw || {});
    invalidateSalesCache();
    if (!(feed.clusters || []).length) {
      try {
        const cr = await fetch(`data/cities/${city}-clusters.json`);
        if (cr.ok) feed.clusters = (await cr.json()).clusters || [];
      } catch (_) {}
    }
    const n = allSales().length;
    const last = feed.last_refresh || feed.generated_at || feed.date || null;
    const editionMeta = document.getElementById("editionMeta");
    if (editionMeta) {
      editionMeta.innerHTML = `<strong>${esc(meta.name)}</strong><br/>${formatRelative(last)} · ${n || feed.total_locations || 0} live`;
      editionMeta.title = last ? `Last refresh: ${last}` : "";
    }
    const srcs = (feed.sources || []).map((s) => String(s).trim());
    const short = [...new Set(srcs)].slice(0, 3).join(" · ") || "Chicas Map · GSIN";
    const fs = document.getElementById("footerSources");
    if (fs) { fs.textContent = short + " · Chica"; fs.title = (feed.sources || []).join(" · ") || short; }
    renderHardMetrics();
    if (map.isStyleLoaded()) {
      _pinSourceReady = false;
      scheduleRefresh();
    } else {
      map.once("idle", () => { _pinSourceReady = false; scheduleRefresh(); });
    }
    returnToMap();
  }

  function wireNearMe() {
    document.getElementById("btnNearMe")?.addEventListener("click", () => {
      if (!navigator.geolocation) { toast("Geolocation unavailable"); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          userLoc = { lat: pos.coords.latitude, lon: pos.coords.longitude };
          invalidateSalesCache();
          if (userMarker) userMarker.remove();
          const el = document.createElement("div");
          el.className = "yb-user-dot";
          userMarker = new maplibregl.Marker({ element: el }).setLngLat([userLoc.lon, userLoc.lat]).addTo(map);
          map.flyTo({ center: [userLoc.lon, userLoc.lat], zoom: 12 });
          toast("Located — sorting by distance");
          trackEvent("near_me", { city: city });
          refresh();
          returnToMap();
        },
        () => {
          toast("Location permission denied");
          trackEvent("near_me_denied", { city: city });
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
    document.getElementById("radiusSelect")?.addEventListener("change", (e) => {
      maxMiles = Number(e.target.value) || 10;
      trackEvent("radius_change", { city: city, miles: maxMiles });
      refresh();
      returnToMap();
    });
    document.getElementById("radiusSelectFab")?.addEventListener("change", (e) => {
      maxMiles = Number(e.target.value) || 10;
      const r = document.getElementById("radiusSelect");
      if (r) r.value = e.target.value;
      trackEvent("radius_change", { city: city, miles: maxMiles });
      refresh();
      returnToMap();
    });
    document.getElementById("btnLocSearch")?.addEventListener("click", async () => {
      const q = (document.getElementById("locInput")?.value || "").trim();
      if (!q) return;
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q + " Texas")}`);
        const data = await r.json();
        if (data[0]) {
          userLoc = { lat: +data[0].lat, lon: +data[0].lon };
          invalidateSalesCache();
          map.flyTo({ center: [userLoc.lon, userLoc.lat], zoom: 12 });
          toast("Centered on " + q);
          trackEvent("loc_search", { city: city, query: q });
          refresh();
          returnToMap();
        } else toast("Not found");
      } catch (_) { toast("Search failed"); }
    });
    document.getElementById("locInput")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") document.getElementById("btnLocSearch")?.click();
    });
  }

  function wireTools() {
    document.getElementById("btnFavorites")?.addEventListener("click", () => {
      showFavOnly = !showFavOnly;
      trackEvent("filter_saved", { city: city, on: showFavOnly });
      updateToolCounts();
      refresh();
    });
    document.getElementById("btnRoute")?.addEventListener("click", () => {
      document.getElementById("routeTray")?.classList.toggle("hidden");
    });
    document.getElementById("btnOpenRoute")?.addEventListener("click", () => openMultiRoute("google"));
    document.getElementById("btnOpenRouteApple")?.addEventListener("click", () => openMultiRoute("apple"));
    document.getElementById("btnOpenRouteWaze")?.addEventListener("click", () => openMultiRoute("waze"));
    document.getElementById("btnClearRoute")?.addEventListener("click", () => {
      routeIds = []; saveJson("yb_route", routeIds); renderRouteTray(); updateToolCounts(); toast("Route cleared");
      trackEvent("route_clear", { city: city });
    });
    document.getElementById("btnShareRoute")?.addEventListener("click", async () => {
      if (!window.ChicaFeatures) return;
      const byKey = {}; allSales().forEach((s) => (byKey[s._key] = s));
      const stops = routeIds.map((k) => byKey[k] || favorites[k]).filter(Boolean);
      const text = ChicaFeatures.buildRouteStory(stops, CITY_META[city]?.name);
      const ok = await ChicaFeatures.shareRouteStory(text);
      trackEvent("share_route", { city: city, stops: stops.length });
      toast(ok ? "Route shared / copied" : "Could not share");
    });
    document.getElementById("btnRadar")?.addEventListener("click", async () => {
      if (!window.ChicaFeatures) return;
      const r = await ChicaFeatures.enableRadar();
      trackEvent("radar", { city: city });
      toast(r.msg);
    });
    document.getElementById("btnDnaHeat")?.addEventListener("click", () => {
      dnaHeatOn = !dnaHeatOn;
      localStorage.setItem("yb_dna_heat", dnaHeatOn ? "1" : "0");
      document.getElementById("btnDnaHeat")?.classList.toggle("active", dnaHeatOn);
      trackEvent("dna_heat", { city: city, on: dnaHeatOn });
      refresh();
      toast(dnaHeatOn ? "Neighborhood DNA on" : "DNA heat off");
    });
    document.getElementById("btnFirst30")?.addEventListener("click", () => {
      first30Only = !first30Only;
      document.getElementById("btnFirst30")?.classList.toggle("active", first30Only);
      trackEvent("first30", { city: city, on: first30Only });
      refresh();
    });
    document.getElementById("btnWishlist")?.addEventListener("click", () => {
      document.getElementById("wishlistPanel")?.classList.toggle("hidden");
    });
    document.getElementById("btnWishAdd")?.addEventListener("click", () => {
      if (!window.ChicaFeatures) return;
      const v = document.getElementById("wishInput")?.value;
      ChicaFeatures.addWishlistItem(v);
      document.getElementById("wishInput").value = "";
      trackEvent("wishlist_add", { city: city });
      toast("Added to hunt list");
    });
    document.getElementById("btnWishFilter")?.addEventListener("click", () => {
      wishlistOnly = !wishlistOnly;
      trackEvent("wishlist_filter", { city: city, on: wishlistOnly });
      refresh();
    });

    document.querySelectorAll(".chip[data-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        filter = btn.dataset.filter || "all";
        document.querySelectorAll(".chip[data-filter]").forEach((chip) => {
          const selected = chip === btn;
          chip.classList.toggle("active", selected);
          chip.setAttribute("aria-pressed", selected ? "true" : "false");
        });
        trackEvent("type_filter", { city: city, type: filter });
        scheduleRefresh();
      });
    });

    const kw = document.getElementById("keywordInput");
    if (kw) {
      let t;
      kw.addEventListener("input", () => {
        clearTimeout(t);
        t = setTimeout(() => {
          query = (kw.value || "").trim();
          trackEvent("keyword_search", { city: city, q: query });
          scheduleRefresh();
        }, 180);
      });
    }

    document.querySelectorAll(".day-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const d = btn.dataset.day;
        if (!d) return;
        dayFilters[d] = !dayFilters[d];
        btn.classList.toggle("active", dayFilters[d]);
        if (!dayFilters.fri && !dayFilters.sat && !dayFilters.sun) {
          dayFilters[d] = true;
          btn.classList.add("active");
          toast("Keep at least one day");
          return;
        }
        trackEvent("day_filter", { city: city, days: dayFilters });
        scheduleRefresh();
      });
    });
  }

  async function boot() {
    trackMetric("session");
    const start = CITY_META[city] || TEXAS;
    map = new maplibregl.Map({
      container: "map",
      style: STYLES[engine] || STYLES.liberty,
      center: userLoc ? [userLoc.lon, userLoc.lat] : start.center,
      zoom: start.zoom || 11,
      attributionControl: true,
      fadeDuration: 0,
      maxPitch: 0,
      dragRotate: false,
      pitchWithRotate: false,
    });
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: false, showCompass: false }), "top-right");
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 100 }), "bottom-left");

    window.__YB_returnToMap = returnToMap;

    const sel = document.getElementById("citySelect");
    if (sel) {
      sel.value = city;
      sel.addEventListener("change", (e) => {
        loadCity(e.target.value);
      });
    }
    document.getElementById("mapEngine")?.addEventListener("change", (e) => {
      engine = e.target.value;
      localStorage.setItem("yb_map", engine);
      trackEvent("map_style", { style: engine });
      _pinSourceReady = false;
      map.setStyle(STYLES[engine] || STYLES.liberty);
      map.once("idle", () => {
        _pinSourceReady = false;
        scheduleRefresh();
      });
    });
    document.querySelectorAll(".chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".chip").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        filter = btn.dataset.filter;
        trackEvent("filter_type", { city: city, filter: filter });
        scheduleRefresh();
        returnToMap();
      });
    });
    document.getElementById("detailClose")?.addEventListener("click", () => {
      hideDetail();
      returnToMap();
    });
    document.getElementById("scopeNear")?.addEventListener("click", () => {
      document.getElementById("scopeNear")?.classList.add("active");
      document.getElementById("scopeCity")?.classList.remove("active");
      maxMiles = Number(document.getElementById("radiusSelect")?.value) || 10;
      trackEvent("scope_near", { city: city });
      refresh();
      returnToMap();
    });
    document.getElementById("scopeCity")?.addEventListener("click", () => {
      document.getElementById("scopeCity")?.classList.add("active");
      document.getElementById("scopeNear")?.classList.remove("active");
      maxMiles = 0;
      trackEvent("scope_city", { city: city });
      refresh();
      returnToMap();
    });
    wireNearMe();
    wireTools();
    updateToolCounts();

    window.addEventListener("resize", () => {
      try { map.resize(); } catch (_) {}
    }, { passive: true });

    map.on("load", () => loadCity(city));
  }
  boot();
})();
