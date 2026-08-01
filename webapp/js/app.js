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
    "leaflet-carto": { url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", attr: "&copy; OpenStreetMap &copy; CARTO" },
    "leaflet-osm": { url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", attr: "&copy; OpenStreetMap contributors" },
    "leaflet-voyager": { url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", attr: "&copy; OpenStreetMap &copy; CARTO" },
  };
  let feed = null, filter = "all", query = "", markers = [], map, layer, tileLayer, cityLayer;
  let city = localStorage.getItem("yb_city") || "texas";
  let engine = localStorage.getItem("yb_map") || "leaflet-carto";
  let registry = null;
  const colorFor = (type) => ({ estate: "#a855f7", fundraiser: "#eab308", permit: "#60a5fa", garage: "#22c55e", city: "#38bdf8", zone: "#f97316" }[type] || "#22c55e");
  function allSales() { return feed ? [...(feed.public || []), ...(feed.permits || [])] : []; }
  function filtered() {
    const q = query.trim().toLowerCase();
    return allSales().filter((s) => {
      const t = s.type || "garage";
      if (filter !== "all" && t !== filter) return false;
      if (!q) return true;
      return `${s.title || ""} ${s.address || ""} ${s.details || ""}`.toLowerCase().includes(q);
    });
  }
  function esc(str) { return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function popupHtml(s) {
    return `<div class="popup-title">${esc(s.title || s.address)}</div><div>${esc(s.address || "")}</div><div class="popup-meta">${esc(s.dates || "")} ${esc(s.hours || "")}</div><div class="popup-meta">${esc((s.details || "").slice(0, 180))}</div><div class="popup-meta">Source: ${esc(s.source || "")} · conf ${s.confidence ?? "—"}</div>`;
  }
  function renderList() {
    const ul = document.getElementById("saleList");
    if (city === "texas") {
      const cities = (registry && registry.cities) || Object.keys(CITY_META).map((slug) => ({ slug, name: CITY_META[slug].name }));
      document.getElementById("listCount").textContent = String(cities.length);
      ul.innerHTML = cities.map((c) => `<li data-city="${c.slug}"><div class="title">${esc(c.name)}</div><div class="addr">Texas · click to open city map</div><div class="row"><span class="pill garage">city</span></div></li>`).join("");
      ul.querySelectorAll("li").forEach((li) => li.addEventListener("click", () => { document.getElementById("citySelect").value = li.dataset.city; loadCity(li.dataset.city); }));
      return;
    }
    const items = filtered();
    document.getElementById("listCount").textContent = String(items.length);
    if (!items.length) {
      const zones = (feed && feed.hot_zones) || [];
      ul.innerHTML = `<li class="empty"><div class="title">No sale pins yet</div><div class="addr">${feed && feed.status ? esc(feed.status) : "Discovery pending"}</div></li>` + zones.map((z) => `<li data-lat="${z.lat}" data-lon="${z.lon}"><div class="title">${esc(z.name)}</div><div class="addr">Hot zone · ${esc(z.badge || "")}</div></li>`).join("");
      ul.querySelectorAll("li[data-lat]").forEach((li) => li.addEventListener("click", () => map.setView([parseFloat(li.dataset.lat), parseFloat(li.dataset.lon)], 13)));
      return;
    }
    ul.innerHTML = items.map((s, i) => { const t = s.type || "garage"; return `<li data-lat="${s.lat}" data-lon="${s.lon}"><div class="title">${esc(s.title || s.address)}</div><div class="addr">${esc(s.address || "")}</div><div class="row"><span class="pill ${t}">${t}</span></div></li>`; }).join("");
    ul.querySelectorAll("li[data-lat]").forEach((li) => li.addEventListener("click", () => { const lat = parseFloat(li.dataset.lat), lon = parseFloat(li.dataset.lon); map.setView([lat, lon], 14); }));
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
      const m = L.circleMarker(center, { radius: 12, color: "#0b1220", weight: 2, fillColor: colorFor("city"), fillOpacity: 0.95 }).bindPopup(`<div class="popup-title">${esc(c.name)}</div><div class="popup-meta">YardBird coverage city</div>`);
      m.on("click", () => { document.getElementById("citySelect").value = c.slug; loadCity(c.slug); });
      m.addTo(cityLayer); markers.push(m);
    });
  }
  function renderMarkers() {
    clearLayers();
    ((feed && feed.hot_zones) || []).forEach((z) => {
      if (z.lat == null) return;
      L.circleMarker([z.lat, z.lon], { radius: 8, color: "#0b1220", weight: 1, fillColor: colorFor("zone"), fillOpacity: 0.75 }).bindPopup(`<div class="popup-title">${esc(z.name)}</div><div class="popup-meta">Hot zone · ${esc(z.badge || "")}</div>`).addTo(layer);
    });
    filtered().forEach((s) => {
      if (s.lat == null) return;
      const m = L.circleMarker([s.lat, s.lon], { radius: s.type === "estate" ? 9 : 7, color: "#0b1220", weight: 1, fillColor: colorFor(s.type || "garage"), fillOpacity: 0.9 }).bindPopup(popupHtml(s));
      m.addTo(layer); markers.push(m);
    });
  }
  function renderForecast() {
    const el = document.getElementById("hotZones");
    if (city === "texas") {
      const cities = (registry && registry.cities) || Object.entries(CITY_META).map(([slug, m]) => ({ slug, name: m.name }));
      el.innerHTML = cities.map((c) => `<div class="zone" data-jump="${c.slug}" style="cursor:pointer"><span class="name">${esc(c.name)}</span><span class="badge ACTIVE">CITY</span></div>`).join("");
      el.querySelectorAll("[data-jump]").forEach((node) => node.addEventListener("click", () => { document.getElementById("citySelect").value = node.dataset.jump; loadCity(node.dataset.jump); }));
      return;
    }
    el.innerHTML = ((feed && feed.hot_zones) || []).map((z) => `<div class="zone"><span class="name">${esc(z.name)}${z.size ? " · " + z.size : ""}</span><span class="badge ${esc(z.badge || "")}">${esc(z.badge || "ZONE")}</span></div>`).join("");
  }
  function refresh() {
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
      feed = { date: "multi-city", total_locations: Object.keys(CITY_META).length, sources: ["Texas coverage"] };
      document.getElementById("editionMeta").innerHTML = `<strong>Texas</strong><br/>${Object.keys(CITY_META).length} cities on map`;
      document.getElementById("footerSources").textContent = "San Antonio · Austin · Houston · Dallas · Lubbock";
      refresh(); return;
    }
    const meta = CITY_META[city] || CITY_META["san-antonio"];
    map.setView(meta.center, meta.zoom);
    try {
      const r = await fetch(`data/cities/${city}.json`);
      if (!r.ok) throw new Error("missing");
      feed = await r.json();
    } catch {
      if (city === "san-antonio") { feed = await (await fetch("data/feed.json")).json(); }
      else { feed = { status: "seed — discovery pending", date: "—", total_locations: 0, public: [], permits: [], hot_zones: [], sources: [] }; }
    }
    document.getElementById("editionMeta").innerHTML = `<strong>${esc(meta.name)}</strong><br/>${feed.date || "—"} · ${feed.total_locations || 0} locations`;
    document.getElementById("footerSources").textContent = (feed.sources || []).join(" · ") || "YardBird Texas";
    refresh();
  }
  async function boot() {
    try { const rr = await fetch("data/cities.json"); if (rr.ok) registry = await rr.json(); } catch (_) {}
    const start = city === "texas" ? TEXAS : CITY_META[city] || TEXAS;
    map = L.map("map", { zoomControl: true }).setView(start.center, start.zoom);
    setTiles(engine);
    const sel = document.getElementById("citySelect");
    Object.entries(CITY_META).forEach(([slug, m]) => {
      if ([...sel.options].some((o) => o.value === slug)) return;
      const opt = document.createElement("option"); opt.value = slug; opt.textContent = m.name; sel.appendChild(opt);
    });
    if (![...sel.options].some((o) => o.value === "texas")) {
      const opt = document.createElement("option"); opt.value = "texas"; opt.textContent = "Texas (all cities)"; sel.insertBefore(opt, sel.firstChild);
    }
    sel.value = city;
    sel.addEventListener("change", (e) => loadCity(e.target.value));
    document.getElementById("mapEngine").addEventListener("change", (e) => setTiles(e.target.value));
    document.getElementById("search").addEventListener("input", (e) => { query = e.target.value; if (city !== "texas") refresh(); });
    document.querySelectorAll(".chip").forEach((btn) => btn.addEventListener("click", () => {
      document.querySelectorAll(".chip").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active"); filter = btn.dataset.filter; if (city !== "texas") refresh();
    }));
    await loadCity(city);
  }
  boot();
})();
