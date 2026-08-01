(function () {
  const CITY_META = {
    "san-antonio": { name: "San Antonio", center: [29.4241, -98.4936], zoom: 11 },
    austin: { name: "Austin", center: [30.2672, -97.7431], zoom: 11 },
    houston: { name: "Houston", center: [29.7604, -95.3698], zoom: 10 },
    dallas: { name: "Dallas", center: [32.7767, -96.797], zoom: 10 },
    lubbock: { name: "Lubbock", center: [33.5779, -101.8552], zoom: 12 },
  };

  const TILES = {
    "leaflet-carto": {
      url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      attr: "&copy; OpenStreetMap &copy; CARTO",
    },
    "leaflet-osm": {
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attr: "&copy; OpenStreetMap contributors",
    },
    "leaflet-voyager": {
      url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      attr: "&copy; OpenStreetMap &copy; CARTO",
    },
  };

  let feed = null;
  let filter = "all";
  let query = "";
  let markers = [];
  let map, layer, tileLayer;
  let city = localStorage.getItem("yb_city") || "san-antonio";
  let engine = localStorage.getItem("yb_map") || "leaflet-carto";

  const colorFor = (type) =>
    ({
      estate: "#a855f7",
      fundraiser: "#eab308",
      permit: "#60a5fa",
      garage: "#22c55e",
      moving: "#22c55e",
    }[type] || "#22c55e");

  function allSales() {
    if (!feed) return [];
    return [...(feed.public || []), ...(feed.permits || [])];
  }

  function filtered() {
    const q = query.trim().toLowerCase();
    return allSales().filter((s) => {
      const t = s.type || "garage";
      if (filter !== "all" && t !== filter) return false;
      if (!q) return true;
      const blob = `${s.title || ""} ${s.address || ""} ${s.details || ""}`.toLowerCase();
      return blob.includes(q);
    });
  }

  function esc(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function popupHtml(s) {
    return `<div class="popup-title">${esc(s.title || s.address)}</div>
      <div>${esc(s.address || "")}</div>
      <div class="popup-meta">${esc(s.dates || "")} ${esc(s.hours || "")}</div>
      <div class="popup-meta">${esc((s.details || "").slice(0, 180))}</div>
      <div class="popup-meta">Source: ${esc(s.source || "")} · conf ${s.confidence ?? "—"}</div>`;
  }

  function renderList() {
    const items = filtered();
    const ul = document.getElementById("saleList");
    document.getElementById("listCount").textContent = String(items.length);
    if (!items.length) {
      ul.innerHTML = `<li class="empty"><div class="title">No pins yet</div><div class="addr">${
        feed && feed.status ? esc(feed.status) : "Discovery pending for this city"
      }</div></li>`;
      return;
    }
    ul.innerHTML = items
      .map((s, i) => {
        const t = s.type || "garage";
        return `<li data-idx="${i}" data-lat="${s.lat}" data-lon="${s.lon}">
          <div class="title">${esc(s.title || s.address)}</div>
          <div class="addr">${esc(s.address || "")}</div>
          <div class="row">
            <span class="pill ${t}">${t}</span>
            ${s.photos ? `<span class="pill">${s.photos} photos</span>` : ""}
            ${s.dates ? `<span class="pill">${esc(s.dates)}</span>` : ""}
          </div>
        </li>`;
      })
      .join("");

    ul.querySelectorAll("li").forEach((li) => {
      li.addEventListener("click", () => {
        ul.querySelectorAll("li").forEach((x) => x.classList.remove("active"));
        li.classList.add("active");
        const lat = parseFloat(li.dataset.lat);
        const lon = parseFloat(li.dataset.lon);
        if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
          map.setView([lat, lon], 14);
          const m = markers.find(
            (mk) =>
              Math.abs(mk.getLatLng().lat - lat) < 1e-6 &&
              Math.abs(mk.getLatLng().lng - lon) < 1e-6
          );
          if (m) m.openPopup();
        }
      });
    });
  }

  function renderMarkers() {
    if (layer) layer.clearLayers();
    else layer = L.layerGroup().addTo(map);
    markers = [];
    filtered().forEach((s) => {
      if (s.lat == null || s.lon == null) return;
      const c = colorFor(s.type || "garage");
      const m = L.circleMarker([s.lat, s.lon], {
        radius: s.type === "estate" ? 9 : s.type === "permit" ? 5 : 7,
        color: "#0b1220",
        weight: 1,
        fillColor: c,
        fillOpacity: 0.9,
      }).bindPopup(popupHtml(s));
      m.addTo(layer);
      markers.push(m);
    });
  }

  function renderForecast() {
    const el = document.getElementById("hotZones");
    const zones = (feed && feed.hot_zones) || [];
    el.innerHTML = zones
      .map(
        (z) => `<div class="zone">
        <span class="name">${esc(z.name)}${z.size ? ` · ${z.size}` : ""}</span>
        <span class="badge ${esc(z.badge || "")}">${esc(z.badge || "ZONE")}</span>
      </div>`
      )
      .join("");
  }

  function refresh() {
    renderList();
    renderMarkers();
  }

  function setTiles(id) {
    engine = id;
    localStorage.setItem("yb_map", engine);
    const t = TILES[engine] || TILES["leaflet-carto"];
    if (tileLayer) map.removeLayer(tileLayer);
    tileLayer = L.tileLayer(t.url, { attribution: t.attr, maxZoom: 19 }).addTo(map);
  }

  async function loadCity(slug) {
    city = slug;
    localStorage.setItem("yb_city", city);
    const meta = CITY_META[city] || CITY_META["san-antonio"];
    map.setView(meta.center, meta.zoom);

    let url = `data/cities/${city}.json`;
    if (city === "san-antonio") {
      try {
        const r = await fetch(url);
        if (r.ok) feed = await r.json();
        else throw new Error("no city feed");
      } catch {
        const r2 = await fetch("data/feed.json");
        feed = await r2.json();
      }
    } else {
      const r = await fetch(url);
      feed = await r.json();
    }

    document.getElementById("editionMeta").innerHTML = `<strong>${esc(
      meta.name
    )}</strong><br/>${feed.date || "—"} · ${feed.total_locations || 0} locations`;
    document.getElementById("footerSources").textContent = (
      feed.sources || []
    ).join(" · ") || "YardBird Texas";
    renderForecast();
    refresh();
  }

  async function boot() {
    const meta = CITY_META[city] || CITY_META["san-antonio"];
    map = L.map("map", { zoomControl: true }).setView(meta.center, meta.zoom);
    setTiles(engine);

    const sel = document.getElementById("citySelect");
    Object.entries(CITY_META).forEach(([slug, m]) => {
      const opt = document.createElement("option");
      opt.value = slug;
      opt.textContent = m.name;
      if (slug === city) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener("change", (e) => loadCity(e.target.value));

    const eng = document.getElementById("mapEngine");
    eng.value = engine;
    eng.addEventListener("change", (e) => setTiles(e.target.value));

    document.getElementById("search").addEventListener("input", (e) => {
      query = e.target.value;
      refresh();
    });
    document.querySelectorAll(".chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".chip").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        filter = btn.dataset.filter;
        refresh();
      });
    });

    await loadCity(city);
  }

  boot();
})();
