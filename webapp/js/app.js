(function () {
  const CITY_META = {
    "san-antonio": { name: "San Antonio", center: [29.4241, -98.4936], zoom: 11 },
    austin: { name: "Austin", center: [30.2672, -97.7431], zoom: 11 },
    houston: { name: "Houston", center: [29.7604, -95.3698], zoom: 10 },
    dallas: { name: "Dallas", center: [32.7767, -96.797], zoom: 10 },
    lubbock: { name: "Lubbock", center: [33.5779, -101.8552], zoom: 12 },
  };
  const TEXAS = { name: "Texas", center: [31.0, -99.5], zoom: 6 };
  const TILES = {
    "leaflet-carto": { url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", attr: "&copy; OSM &copy; CARTO" },
    "leaflet-osm": { url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", attr: "&copy; OSM" },
    "leaflet-voyager": { url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", attr: "&copy; OSM &copy; CARTO" },
  };
  let feed = null, filter = "all", query = "", markers = [], map, layer, tileLayer, cityLayer;
  let city = localStorage.getItem("yb_city") || "san-antonio";
  let engine = localStorage.getItem("yb_map") || "leaflet-carto";
  let registry = null;
  const colorFor = (t) => ({ estate: "#a855f7", fundraiser: "#eab308", permit: "#60a5fa", garage: "#22c55e", city: "#38bdf8", zone: "#f97316" }[t] || "#22c55e");
  function normalizeFeed(raw) {
    if (!raw) return { public: [], permits: [], hot_zones: [], total_locations: 0 };
    let public = raw.public || [];
    let permits = raw.permits || [];
    if (!public.length && !permits.length && Array.isArray(raw.sales)) {
      public = raw.sales.filter((s) => s.type !== "permit");
      permits = raw.sales.filter((s) => s.type === "permit");
    }
    return { ...raw, public, permits, hot_zones: raw.hot_zones || [], total_locations: raw.total_locations || public.length + permits.length };
  }
  function allSales() { return feed ? [...(feed.public || []), ...(feed.permits || [])] : []; }
  function filtered() {
    const q = query.trim().toLowerCase();
    return allSales().filter((s) => {
      if (filter !== "all" && (s.type || "garage") !== filter) return false;
      if (!q) return true;
      return `${s.title || ""} ${s.address || ""} ${s.details || ""}`.toLowerCase().includes(q);
    });
  }
  function esc(s) { return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function showDetail(s) {
    const drawer = document.getElementById("detailDrawer");
    const body = document.getElementById("detailBody");
    if (!drawer || !body) return;
    const gallery = s.gallery || null;
    body.innerHTML = `<h3>${esc(s.title || "Sale")}</h3>
      <div class="d-addr">${esc(s.address || "")}</div>
      <div class="d-meta">${esc(s.dates || "")} ${esc(s.hours || "")}</div>
      <div class="d-meta">Type: ${esc(s.type || "garage")} · Confidence: ${s.confidence ?? "—"}</div>
      <div class="d-meta">Source: ${esc(s.source || "")}</div>
      <div class="d-body">${esc(s.details || "No description.")}</div>
      ${s.photos ? `<div class="d-meta">📷 ${s.photos} photos noted at source</div>` : ""}
      ${gallery ? `<div class="d-meta"><a href="${esc(gallery)}" target="_blank" rel="noopener">Open listing / photos</a></div>` : ""}`;
    drawer.classList.remove("hidden");
  }
  function hideDetail() { const d = document.getElementById("detailDrawer"); if (d) d.classList.add("hidden"); }
  function popupHtml(s) {
    return `<div class="popup-title">${esc(s.title || s.address)}</div><div>${esc(s.address || "")}</div>
      <div class="popup-meta">${esc(s.dates || "")} ${esc(s.hours || "")}</div>
      ${s.photos ? `<div class="popup-meta">📷 ${s.photos} photos</div>` : ""}
      <div class="popup-meta"><em>Click list for full detail</em></div>`;
  }
  function focusZone(z) {
    if (!z || z.lat == null) return;
    map.setView([z.lat, z.lon], 13);
    const nearby = allSales().filter((s) => s.lat != null && Math.hypot(s.lat - z.lat, s.lon - z.lon) < 0.12);
    const ul = document.getElementById("saleList");
    document.getElementById("listCount").textContent = String(nearby.length);
    ul.innerHTML = nearby.length
      ? nearby.map((s, i) => `<li data-ni="${i}"><div class="title">${esc(s.title || s.address)}</div><div class="addr">${esc(s.address || "")}</div>${s.photos ? `<div class="row"><span class="pill">${s.photos} photos</span></div>` : ""}</li>`).join("")
      : `<li class="empty"><div class="title">${esc(z.name)}</div><div class="addr">No geocoded sales in radius — try All filter</div></li>`;
    ul.querySelectorAll("li[data-ni]").forEach((li) => li.addEventListener("click", () => showDetail(nearby[+li.dataset.ni])));
  }
  function renderList() {
    const ul = document.getElementById("saleList");
    if (city === "texas") {
      const cities = (registry && registry.cities) || Object.keys(CITY_META).map((slug) => ({ slug, name: CITY_META[slug].name }));
      document.getElementById("listCount").textContent = String(cities.length);
      ul.innerHTML = cities.map((c) => `<li data-city="${c.slug}"><div class="title">${esc(c.name)}</div><div class="addr">Open city map</div></li>`).join("");
      ul.querySelectorAll("li").forEach((li) => li.addEventListener("click", () => { document.getElementById("citySelect").value = li.dataset.city; loadCity(li.dataset.city); }));
      return;
    }
    const items = filtered();
    document.getElementById("listCount").textContent = String(items.length);
    if (!items.length) {
      ul.innerHTML = `<li class="empty"><div class="title">No matching sales</div><div class="addr">Clear filters or switch city</div></li>`;
      return;
    }
    ul.innerHTML = items.map((s, i) => `<li data-i="${i}"><div class="title">${esc(s.title || s.address)}</div><div class="addr">${esc(s.address || "")}</div>
      <div class="row"><span class="pill ${s.type || "garage"}">${s.type || "garage"}</span>${s.photos ? `<span class="pill">${s.photos} photos</span>` : ""}</div></li>`).join("");
    ul.querySelectorAll("li[data-i]").forEach((li) => li.addEventListener("click", () => {
      const s = items[+li.dataset.i]; showDetail(s);
      if (s.lat != null) map.setView([s.lat, s.lon], 14);
    }));
  }
  function clearLayers() {
    if (layer) layer.clearLayers(); else layer = L.layerGroup().addTo(map);
    if (cityLayer) cityLayer.clearLayers(); else cityLayer = L.layerGroup().addTo(map);
    markers = [];
  }
  function renderTexasOverview() {
    clearLayers();
    const cities = (registry && registry.cities) || Object.entries(CITY_META).map(([slug, m]) => ({ slug, name: m.name, center: m.center }));
    cities.forEach((c) => {
      const center = c.center || CITY_META[c.slug].center;
      const m = L.circleMarker(center, { radius: 12, color: "#0b1220", weight: 2, fillColor: colorFor("city"), fillOpacity: 0.95 }).bindPopup(`<b>${esc(c.name)}</b>`);
      m.on("click", () => { document.getElementById("citySelect").value = c.slug; loadCity(c.slug); });
      m.addTo(cityLayer);
    });
  }
  function renderMarkers() {
    clearLayers();
    (feed.hot_zones || []).forEach((z) => {
      if (z.lat == null) return;
      const m = L.circleMarker([z.lat, z.lon], { radius: 10, color: "#0b1220", weight: 2, fillColor: colorFor("zone"), fillOpacity: 0.85 })
        .bindPopup(`<b>${esc(z.name)}</b><br/>${esc(z.badge || "")}${z.size ? " · " + z.size : ""}`);
      m.on("click", () => focusZone(z));
      m.addTo(layer);
    });
    filtered().forEach((s) => {
      if (s.lat == null) return;
      const m = L.circleMarker([s.lat, s.lon], { radius: s.type === "estate" ? 9 : 7, color: "#0b1220", weight: 1, fillColor: colorFor(s.type || "garage"), fillOpacity: 0.9 }).bindPopup(popupHtml(s));
      m.on("click", () => showDetail(s));
      m.addTo(layer); markers.push(m);
    });
  }
  function renderForecast() {
    const el = document.getElementById("hotZones");
    if (city === "texas") {
      const cities = (registry && registry.cities) || Object.entries(CITY_META).map(([slug, m]) => ({ slug, name: m.name }));
      el.innerHTML = cities.map((c) => `<div class="zone" data-jump="${c.slug}" style="cursor:pointer"><span class="name">${esc(c.name)}</span><span class="badge ACTIVE">CITY</span></div>`).join("");
      el.querySelectorAll("[data-jump]").forEach((n) => n.addEventListener("click", () => { document.getElementById("citySelect").value = n.dataset.jump; loadCity(n.dataset.jump); }));
      return;
    }
    el.innerHTML = (feed.hot_zones || []).map((z, i) => `<div class="zone" data-z="${i}" style="cursor:pointer"><span class="name">${esc(z.name)}${z.size ? " · " + z.size : ""}</span><span class="badge ${esc(z.badge || "")}">${esc(z.badge || "ZONE")}</span></div>`).join("");
    el.querySelectorAll("[data-z]").forEach((n) => n.addEventListener("click", () => focusZone(feed.hot_zones[+n.dataset.z])));
  }
  function refresh() {
    hideDetail();
    if (city === "texas") { renderTexasOverview(); renderList(); renderForecast(); return; }
    renderList(); renderMarkers(); renderForecast();
  }
  function setTiles(id) {
    engine = id; localStorage.setItem("yb_map", engine);
    const t = TILES[engine] || TILES["leaflet-carto"];
    if (tileLayer) map.removeLayer(tileLayer);
    tileLayer = L.tileLayer(t.url, { attribution: t.attr, maxZoom: 19 }).addTo(map);
  }
  async function loadCity(slug) {
    city = slug; localStorage.setItem("yb_city", city);
    if (city === "texas") {
      map.setView(TEXAS.center, TEXAS.zoom);
      feed = normalizeFeed({ public: [], permits: [], total_locations: 5 });
      document.getElementById("editionMeta").innerHTML = "<strong>Texas</strong><br/>5 cities";
      refresh(); return;
    }
    const meta = CITY_META[city];
    map.setView(meta.center, meta.zoom);
    let raw = null;
    try { const r = await fetch(`data/cities/${city}.json`); if (r.ok) raw = await r.json(); } catch (_) {}
    if (!raw && city === "san-antonio") { try { raw = await (await fetch("data/feed.json")).json(); } catch (_) {} }
    feed = normalizeFeed(raw || { public: [], permits: [], hot_zones: [] });
    document.getElementById("editionMeta").innerHTML = `<strong>${esc(meta.name)}</strong><br/>${feed.date || "—"} · ${feed.total_locations || 0} locations`;
    document.getElementById("footerSources").textContent = (feed.sources || []).join(" · ") || "YardBird";
    refresh();
  }
  async function boot() {
    try { const rr = await fetch("data/cities.json"); if (rr.ok) registry = await rr.json(); } catch (_) {}
    const start = CITY_META[city] || TEXAS;
    map = L.map("map", { zoomControl: true }).setView(start.center, start.zoom || 11);
    setTiles(engine);
    const sel = document.getElementById("citySelect");
    Object.entries(CITY_META).forEach(([slug, m]) => {
      if ([...sel.options].some((o) => o.value === slug)) return;
      const o = document.createElement("option"); o.value = slug; o.textContent = m.name; sel.appendChild(o);
    });
    sel.value = city;
    sel.addEventListener("change", (e) => loadCity(e.target.value));
    document.getElementById("mapEngine").addEventListener("change", (e) => setTiles(e.target.value));
    document.getElementById("search").addEventListener("input", (e) => { query = e.target.value; if (city !== "texas") { renderList(); renderMarkers(); } });
    document.querySelectorAll(".chip").forEach((btn) => btn.addEventListener("click", () => {
      document.querySelectorAll(".chip").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active"); filter = btn.dataset.filter; if (city !== "texas") { renderList(); renderMarkers(); }
    }));
    const closeBtn = document.getElementById("detailClose");
    if (closeBtn) closeBtn.addEventListener("click", hideDetail);
    await loadCity(city);
  }
  boot();
})();
