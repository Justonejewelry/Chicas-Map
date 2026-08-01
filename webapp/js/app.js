(function () {
  const CITY_META = {
    "san-antonio": { name: "San Antonio", center: [29.4241, -98.4936], zoom: 11 },
    austin: { name: "Austin", center: [30.2672, -97.7431], zoom: 11 },
    houston: { name: "Houston", center: [29.7604, -95.3698], zoom: 11 },
    dallas: { name: "Dallas", center: [32.7767, -96.797], zoom: 11 },
    lubbock: { name: "Lubbock", center: [33.5779, -101.8552], zoom: 11 },
  };
  const TEXAS = { name: "Texas", center: [31.0, -99.5], zoom: 6 };
  let map, layerGroup, feed = null, registry = null;
  let city = localStorage.getItem("yb_city") || "san-antonio";
  let engine = localStorage.getItem("yb_map") || "leaflet-voyager";
  let filter = "all", query = "", expandedCluster = null;

  const esc = (s) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const colorFor = (t) =>
    ({ estate: "#a855f7", fundraiser: "#f59e0b", permit: "#ef4444", garage: "#22c55e", city: "#38bdf8", zone: "#f59e0b", cluster: "#ef4444", top: "#f59e0b", new: "#22c55e" }[t] ||
    "#22c55e");

  function normalizeFeed(raw) {
    if (!raw) return { public: [], permits: [], clusters: [], hot_zones: [], sources: [], total_locations: 0 };
    const public = raw.public || raw.sales || [];
    const permits = raw.permits || [];
    const clusters = raw.clusters || [];
    return {
      ...raw,
      public,
      permits,
      clusters,
      hot_zones: raw.hot_zones || [],
      sources: raw.sources || [],
      total_locations: raw.total_locations || public.length + permits.length,
    };
  }

  function allSales() {
    if (!feed) return [];
    if (expandedCluster && expandedCluster.members) return expandedCluster.members;
    const base = [...(feed.public || []), ...(feed.permits || [])];
    return base;
  }

  function filtered() {
    let items = allSales();
    if (filter && filter !== "all") items = items.filter((s) => (s.type || "garage") === filter);
    if (query) {
      const q = query.toLowerCase();
      items = items.filter(
        (s) =>
          (s.address || "").toLowerCase().includes(q) ||
          (s.title || "").toLowerCase().includes(q) ||
          (s.neighborhood || "").toLowerCase().includes(q)
      );
    }
    return items;
  }

  function showDetail(s) {
    const drawer = document.getElementById("detailDrawer");
    const body = document.getElementById("detailBody");
    if (!drawer || !body) return;
    body.innerHTML = `<h3>${esc(s.title || "Sale")}</h3>
      <div class="d-addr">${esc(s.address || "")}</div>
      <div class="d-meta">${esc(s.dates || "")} ${esc(s.hours || "")}</div>
      <div class="d-meta">Type: ${esc(s.type || "garage")} · Confidence: ${s.confidence ?? "—"}</div>
      <div class="d-meta">Source: ${esc(s.source || "")}</div>
      <div class="d-body">${esc(s.details || "No description.")}</div>
      ${s.photos ? `<div class="d-meta">📷 ${s.photos} photos noted at source</div>` : ""}
      ${s.gallery ? `<div class="d-meta"><a href="${esc(s.gallery)}" target="_blank" rel="noopener">Open listing / photos</a></div>` : ""}
      ${s.cluster_id ? `<div class="d-meta">Cluster: ${esc(s.cluster_id)}</div>` : ""}`;
    drawer.classList.remove("hidden");
  }

  function hideDetail() {
    const d = document.getElementById("detailDrawer");
    if (d) d.classList.add("hidden");
  }

  function popupHtml(s) {
    return `<div class="popup-title">${esc(s.title || s.address)}</div>
      <div>${esc(s.address || "")}</div>
      <div class="popup-meta">${esc(s.dates || "")}</div>
      ${s.photos ? `<div class="popup-meta">📷 ${s.photos} photos</div>` : ""}`;
  }

  function listSales(items, emptyMsg) {
    const ul = document.getElementById("saleList");
    document.getElementById("listCount").textContent = String(items.length);
    if (!items.length) {
      ul.innerHTML = `<li class="empty"><div class="title">${esc(emptyMsg || "No sales")}</div></li>`;
      return;
    }
    ul.innerHTML = items
      .map(
        (s, i) => `<li data-i="${i}">
        <div class="title">${esc(s.title || s.address)}</div>
        <div class="addr">${esc(s.address || "")}</div>
        <div class="row">
          <span class="pill ${s.type || "garage"}">${s.type || "garage"}</span>
          ${s.photos ? `<span class="pill">${s.photos} photos</span>` : ""}
        </div>
      </li>`
      )
      .join("");
    ul.querySelectorAll("li[data-i]").forEach((li) => {
      li.addEventListener("click", () => {
        const s = items[+li.dataset.i];
        showDetail(s);
        if (s.lat && s.lon) map.setView([s.lat, s.lon], 15);
      });
    });
  }

  function clearExpand() {
    expandedCluster = null;
  }

  function expandCluster(cluster) {
    if (!cluster) return;
    const members = cluster.members || [];
    expandedCluster = { ...cluster, members };
    listSales(members, "No members in cluster");
    renderMarkers(members);
    if (members.length) {
      const b = L.latLngBounds(members.filter((m) => m.lat && m.lon).map((m) => [m.lat, m.lon]));
      if (b.isValid()) map.fitBounds(b.pad(0.2));
    }
    showDetail({ ...cluster, title: cluster.name || "Cluster", address: `${members.length} sales`, type: "cluster", details: members.map((m) => m.address).filter(Boolean).slice(0, 12).join(" · ") });
    renderHotZones(true);
  }

  function renderHotZones(expanded) {
    const el = document.getElementById("hotZones");
    if (!el || !feed) return;
    if (expanded && expandedCluster) {
      const members = expandedCluster.members || [];
      const back = document.createElement("div");
      back.className = "zone";
      back.innerHTML = `<span class="name">← ${esc(expandedCluster.name)} · ${members.length} sales expanded</span><span class="badge ACTIVE">BACK</span>`;
      back.onclick = () => {
        clearExpand();
        hideDetail();
        refresh();
      };
      el.innerHTML = "";
      el.appendChild(back);
      return;
    }
    const items = feed.hot_zones || feed.clusters || [];
    if (!items.length) {
      el.innerHTML = `<div class="zone"><span class="name">No hot zones yet</span></div>`;
      return;
    }
    el.innerHTML = items
      .map((z, i) => {
        const count = z.count || (z.members && z.members.length) || z.size || "";
        const badge = z.status || (z.members ? "CLUSTER" : "ACTIVE");
        return `<div class="zone" data-z="${i}"><span class="name">${esc(z.name || z.id)}</span><span class="badge ${badge}">${esc(badge)}${count ? " · " + count : ""}</span></div>`;
      })
      .join("");
    el.querySelectorAll(".zone[data-z]").forEach((node) => {
      node.addEventListener("click", () => {
        const z = items[+node.dataset.z];
        if (z.members && z.members.length) expandCluster(z);
        else if (z.lat && z.lon) map.setView([z.lat, z.lon], 13);
      });
    });
  }

  function renderList() {
    listSales(filtered(), "No matching sales");
  }

  function renderMarkers(items) {
    if (layerGroup) layerGroup.clearLayers();
    else layerGroup = L.layerGroup().addTo(map);
    const list = items || filtered();
    list.forEach((s) => {
      if (!s.lat || !s.lon) return;
      const c = colorFor(s.type || "garage");
      const m = L.circleMarker([s.lat, s.lon], {
        radius: 8,
        color: "#fff",
        weight: 2,
        fillColor: c,
        fillOpacity: 0.95,
      });
      m.bindPopup(popupHtml(s));
      m.on("click", () => showDetail(s));
      m.addTo(layerGroup);
    });
    (feed.clusters || []).forEach((cl) => {
      if (!cl.lat || !cl.lon) return;
      if (expandedCluster && expandedCluster.id === cl.id) return;
      const m = L.circleMarker([cl.lat, cl.lon], {
        radius: 14,
        color: "#fff",
        weight: 3,
        fillColor: "#ef4444",
        fillOpacity: 0.9,
      });
      m.bindTooltip(`${cl.name || "Cluster"} (${(cl.members || []).length || cl.count || "?"})`);
      m.on("click", () => expandCluster(cl));
      m.addTo(layerGroup);
    });
  }

  function refresh() {
    renderHotZones(false);
    renderList();
    renderMarkers();
  }

  function setTiles(name) {
    engine = name;
    localStorage.setItem("yb_map", engine);
    if (map._ybTiles) map.removeLayer(map._ybTiles);
    let url, attr;
    if (name === "leaflet-carto") {
      url = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
      attr = "© OSM © CARTO";
    } else if (name === "leaflet-osm") {
      url = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
      attr = "© OpenStreetMap";
    } else {
      url = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
      attr = "© OSM © CARTO";
    }
    map._ybTiles = L.tileLayer(url, { attribution: attr, maxZoom: 19 }).addTo(map);
  }

  async function loadCity(slug) {
    city = slug;
    localStorage.setItem("yb_city", city);
    clearExpand();
    hideDetail();
    if (city === "texas") {
      document.getElementById("editionMeta").innerHTML = "<strong>Texas</strong><br/>5 cities";
      const fs = document.getElementById("footerSources");
      if (fs) fs.textContent = "YardBird · multi-city";
      map.setView(TEXAS.center, TEXAS.zoom);
      feed = { public: [], permits: [], clusters: [], hot_zones: [], sources: [] };
      // plot city centers as stubs
      if (layerGroup) layerGroup.clearLayers();
      else layerGroup = L.layerGroup().addTo(map);
      Object.entries(CITY_META).forEach(([k, m]) => {
        L.circleMarker(m.center, { radius: 10, fillColor: "#f59e0b", color: "#fff", weight: 2, fillOpacity: 0.9 })
          .bindTooltip(m.name)
          .on("click", () => loadCity(k))
          .addTo(layerGroup);
      });
      listSales([], "Pick a city");
      document.getElementById("hotZones").innerHTML = Object.entries(CITY_META)
        .map(([k, m]) => `<div class="zone" data-city="${k}"><span class="name">${esc(m.name)}</span><span class="badge ACTIVE">OPEN</span></div>`)
        .join("");
      document.querySelectorAll("#hotZones .zone[data-city]").forEach((n) =>
        n.addEventListener("click", () => loadCity(n.dataset.city))
      );
      return;
    }
    const meta = CITY_META[city] || CITY_META["san-antonio"];
    map.setView(meta.center, meta.zoom || 11);
    let raw = null;
    try {
      const r = await fetch(`data/cities/${city}.json`);
      if (r.ok) raw = await r.json();
    } catch (_) {}
    if (!raw) {
      try {
        raw = await (await fetch("data/feed.json")).json();
      } catch (_) {}
    }
    feed = normalizeFeed(raw || { public: [], permits: [], clusters: [], hot_zones: [] });
    if (!(feed.clusters || []).length) {
      try {
        const cu = (raw && raw.clusters_url) || `data/cities/${city}-clusters.json`;
        const cr = await fetch(cu);
        if (cr.ok) {
          const cd = await cr.json();
          feed.clusters = cd.clusters || [];
        }
      } catch (_) {}
    }
    document.getElementById("editionMeta").innerHTML = `<strong>${esc(meta.name)}</strong><br/>${
      feed.date || "—"
    } · ${feed.total_locations || 0} locations`;
    const srcs = (feed.sources || []).map((s) =>
      String(s)
        .replace(/\s*(Austin|Houston|Dallas|Lubbock|San Antonio)\s*/gi, " ")
        .replace(/\s+/g, " ")
        .trim()
    );
    const short = [...new Set(srcs)].slice(0, 3).join(" · ") || "YardBird · GSIN";
    const fs = document.getElementById("footerSources");
    if (fs) {
      fs.textContent = short;
      fs.title = (feed.sources || []).join(" · ") || short;
    }
    refresh();
  }

  async function boot() {
    try {
      const rr = await fetch("data/cities.json");
      if (rr.ok) registry = await rr.json();
    } catch (_) {}
    const start = CITY_META[city] || TEXAS;
    map = L.map("map", { zoomControl: true }).setView(start.center, start.zoom || 11);
    setTiles(engine);
    const sel = document.getElementById("citySelect");
    Object.entries(CITY_META).forEach(([slug, m]) => {
      if ([...sel.options].some((o) => o.value === slug)) return;
      const o = document.createElement("option");
      o.value = slug;
      o.textContent = m.name;
      sel.appendChild(o);
    });
    sel.value = city;
    sel.addEventListener("change", (e) => loadCity(e.target.value));
    document.getElementById("mapEngine").addEventListener("change", (e) => setTiles(e.target.value));
    document.getElementById("search").addEventListener("input", (e) => {
      query = e.target.value;
      clearExpand();
      if (city !== "texas") {
        renderList();
        renderMarkers();
      }
    });
    document.querySelectorAll(".chip").forEach((btn) =>
      btn.addEventListener("click", () => {
        document.querySelectorAll(".chip").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        filter = btn.dataset.filter;
        clearExpand();
        if (city !== "texas") {
          renderList();
          renderMarkers();
        }
      })
    );
    const closeBtn = document.getElementById("detailClose");
    if (closeBtn) closeBtn.addEventListener("click", hideDetail);
    await loadCity(city);
  }

  function wireYowl() {
    const root = document.getElementById("yowlAmbassador");
    if (!root) return;
    if (sessionStorage.getItem("yowl_dismissed") === "1") {
      root.style.display = "none";
      return;
    }
    document.getElementById("yowlDismiss")?.addEventListener("click", () => {
      root.style.display = "none";
      sessionStorage.setItem("yowl_dismissed", "1");
    });
    document.getElementById("yowlShare")?.addEventListener("click", async () => {
      const url = location.href;
      const text = "Howdy — Yowl Lawnda mapped this weekend's garage sales. Tap a cluster, get every address.";
      try {
        if (navigator.share) await navigator.share({ title: "Yowl Lawnda", text, url });
        else {
          await navigator.clipboard.writeText(url);
          alert("Link copied — share it with the neighborhood!");
        }
      } catch (_) {}
    });
    document.getElementById("yowlLike")?.addEventListener("click", (e) => {
      const btn = e.currentTarget;
      btn.textContent = "♥ Liked";
      btn.disabled = true;
    });
  }
  wireYowl();
  boot();
})();
