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
  let feed = null, filter = "all", query = "", markers = [];
  let map, layer, tileLayer, cityLayer, clusterLayer, expandLayer;
  let city = localStorage.getItem("yb_city") || "san-antonio";
  let engine = localStorage.getItem("yb_map") || "leaflet-carto";
  let registry = null;
  let expandedClusterId = null;

  const colorFor = (t) => ({ estate: "#a855f7", fundraiser: "#eab308", permit: "#60a5fa", garage: "#22c55e", city: "#38bdf8", zone: "#f97316", cluster: "#ef4444" }[t] || "#22c55e");

  function normalizeFeed(raw) {
    if (!raw) return { public: [], permits: [], hot_zones: [], clusters: [], total_locations: 0 };
    let public = raw.public || [];
    let permits = raw.permits || [];
    if (!public.length && !permits.length && Array.isArray(raw.sales)) {
      public = raw.sales.filter((s) => s.type !== "permit");
      permits = raw.sales.filter((s) => s.type === "permit");
    }
    return { ...raw, public, permits, hot_zones: raw.hot_zones || [], clusters: raw.clusters || [], total_locations: raw.total_locations || public.length + permits.length };
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
    body.innerHTML = `<h3>${esc(s.title || "Sale")}</h3><div class="d-addr">${esc(s.address || "")}</div>
      <div class="d-meta">${esc(s.dates || "")} ${esc(s.hours || "")}</div>
      <div class="d-meta">Type: ${esc(s.type || "garage")} · Confidence: ${s.confidence ?? "—"}</div>
      <div class="d-meta">Source: ${esc(s.source || "")}</div>
      <div class="d-body">${esc(s.details || "No description.")}</div>
      ${s.cluster_id ? `<div class="d-meta">Cluster: ${esc(s.cluster_id)}</div>` : ""}`;
    drawer.classList.remove("hidden");
  }
  function hideDetail() { const d = document.getElementById("detailDrawer"); if (d) d.classList.add("hidden"); }
  function popupHtml(s) {
    return `<div class="popup-title">${esc(s.title || s.address)}</div><div>${esc(s.address || "")}</div><div class="popup-meta">${esc(s.dates || "")}</div>`;
  }
  function listSales(items, emptyMsg) {
    const ul = document.getElementById("saleList");
    document.getElementById("listCount").textContent = String(items.length);
    if (!items.length) { ul.innerHTML = `<li class="empty"><div class="title">${esc(emptyMsg || "No sales")}</div></li>`; return; }
    ul.innerHTML = items.map((s, i) => `<li data-i="${i}"><div class="title">${esc(s.title || s.address)}</div><div class="addr">${esc(s.address || "")}</div>
      <div class="row"><span class="pill ${s.type || "garage"}">${s.type || "garage"}</span></div></li>`).join("");
    ul.querySelectorAll("li[data-i]").forEach((li) => li.addEventListener("click", () => {
      const s = items[+li.dataset.i]; showDetail(s);
      if (s.lat != null) map.setView([s.lat, s.lon], 15);
    }));
  }
  function clearExpand() { expandedClusterId = null; if (expandLayer) expandLayer.clearLayers(); }

  function expandCluster(cluster) {
    if (!cluster) return;
    expandedClusterId = cluster.cluster_id;
    if (!expandLayer) expandLayer = L.layerGroup().addTo(map);
    expandLayer.clearLayers();
    const members = cluster.members || [];
    const bounds = [];
    members.forEach((s) => {
      if (s.lat == null) return;
      bounds.push([s.lat, s.lon]);
      const m = L.circleMarker([s.lat, s.lon], { radius: 7, color: "#fff", weight: 2, fillColor: colorFor("permit"), fillOpacity: 0.95 }).bindPopup(popupHtml(s));
      m.on("click", () => showDetail(s));
      m.addTo(expandLayer);
    });
    if (bounds.length) { try { map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 }); } catch (_) { map.setView([cluster.lat, cluster.lon], 14); } }
    listSales(members, "Cluster has no members");
    hideDetail();
    const el = document.getElementById("hotZones");
    if (el) {
      const back = document.createElement("div");
      back.className = "zone"; back.style.cursor = "pointer"; back.style.border = "1px solid #38bdf8";
      back.innerHTML = `<span class="name">← ${esc(cluster.name)} · ${members.length} sales expanded</span><span class="badge ACTIVE">BACK</span>`;
      back.addEventListener("click", () => { clearExpand(); refresh(); });
      el.insertBefore(back, el.firstChild);
    }
  }

  function renderList() {
    if (city === "texas") {
      const cities = (registry && registry.cities) || Object.keys(CITY_META).map((slug) => ({ slug, name: CITY_META[slug].name }));
      listSales(cities.map((c) => ({ title: c.name, address: "Texas city", type: "garage" })), "No cities");
      document.querySelectorAll("#saleList li").forEach((li, idx) => { li.onclick = () => { document.getElementById("citySelect").value = cities[idx].slug; loadCity(cities[idx].slug); }; });
      return;
    }
    if (expandedClusterId) return;
    listSales(filtered(), "No matching sales");
  }
  function clearLayers() {
    if (layer) layer.clearLayers(); else layer = L.layerGroup().addTo(map);
    if (cityLayer) cityLayer.clearLayers(); else cityLayer = L.layerGroup().addTo(map);
    if (clusterLayer) clusterLayer.clearLayers(); else clusterLayer = L.layerGroup().addTo(map);
    markers = [];
  }
  function renderTexasOverview() {
    clearExpand(); clearLayers();
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
    (feed.clusters || []).forEach((c) => {
      if (c.lat == null) return;
      if (expandedClusterId && expandedClusterId !== c.cluster_id) return;
      const r = Math.min(22, 8 + Math.sqrt(c.size || 1) * 2.5);
      const m = L.circleMarker([c.lat, c.lon], { radius: r, color: "#fff", weight: 2, fillColor: colorFor("cluster"), fillOpacity: 0.75 })
        .bindPopup(`<div class="popup-title">${esc(c.name)}</div><div class="popup-meta"><b>${c.size}</b> garage sales</div><div class="popup-meta">Click to expand all addresses</div>`);
      m.on("click", () => expandCluster(c));
      m.addTo(clusterLayer);
    });
    if (!(feed.clusters || []).length) {
      (feed.hot_zones || []).forEach((z) => {
        if (z.lat == null) return;
        const m = L.circleMarker([z.lat, z.lon], { radius: 10, color: "#0b1220", weight: 2, fillColor: colorFor("zone"), fillOpacity: 0.85 }).bindPopup(`<b>${esc(z.name)}</b>`);
        m.on("click", () => {
          map.setView([z.lat, z.lon], 13);
          listSales(allSales().filter((s) => s.lat != null && Math.hypot(s.lat - z.lat, s.lon - z.lon) < 0.12), "No sales in zone");
        });
        m.addTo(layer);
      });
    }
    filtered().forEach((s) => {
      if (s.lat == null) return;
      if (expandedClusterId && s.cluster_id === expandedClusterId) return;
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
    const items = (feed.clusters || []).length
      ? feed.clusters.map((c) => ({ name: c.name, badge: c.badge, size: c.size, cluster: c }))
      : (feed.hot_zones || []).map((z) => ({ name: z.name, badge: z.badge, size: z.size, zone: z }));
    el.innerHTML = items.map((it, i) => `<div class="zone" data-i="${i}" style="cursor:pointer"><span class="name">${esc(it.name)}${it.size ? " · " + it.size : ""}</span><span class="badge ${esc(it.badge || "")}">${esc(it.badge || "ZONE")}</span></div>`).join("");
    el.querySelectorAll("[data-i]").forEach((n) => n.addEventListener("click", () => {
      const it = items[+n.dataset.i];
      if (it.cluster) expandCluster(it.cluster);
      else if (it.zone && it.zone.lat != null) {
        map.setView([it.zone.lat, it.zone.lon], 13);
        listSales(allSales().filter((s) => s.lat != null && Math.hypot(s.lat - it.zone.lat, s.lon - it.zone.lon) < 0.12), "No sales in zone");
      }
    }));
  }
  function refresh() {
    hideDetail();
    if (!expandedClusterId) clearExpand();
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
    clearExpand();
    city = slug; localStorage.setItem("yb_city", city);
    if (city === "texas") {
      map.setView(TEXAS.center, TEXAS.zoom);
      feed = normalizeFeed({ public: [], permits: [], clusters: [], total_locations: 5 });
      document.getElementById("editionMeta").innerHTML = "<strong>Texas</strong><br/>5 cities";
      refresh(); return;
    }
    const meta = CITY_META[city];
    map.setView(meta.center, meta.zoom);
    let raw = null;
    try { const r = await fetch(`data/cities/${city}.json`); if (r.ok) raw = await r.json(); } catch (_) {}
    if (!raw && city === "san-antonio") { try { raw = await (await fetch("data/feed.json")).json(); } catch (_) {} }
    feed = normalizeFeed(raw || { public: [], permits: [], clusters: [], hot_zones: [] });
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
    document.getElementById("search").addEventListener("input", (e) => { query = e.target.value; clearExpand(); if (city !== "texas") { renderList(); renderMarkers(); } });
    document.querySelectorAll(".chip").forEach((btn) => btn.addEventListener("click", () => {
      document.querySelectorAll(".chip").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active"); filter = btn.dataset.filter; clearExpand();
      if (city !== "texas") { renderList(); renderMarkers(); }
    }));
    const closeBtn = document.getElementById("detailClose");
    if (closeBtn) closeBtn.addEventListener("click", hideDetail);
    await loadCity(city);
  }
  boot();
})();
