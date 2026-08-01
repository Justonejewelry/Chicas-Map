(function () {
  const CITY_META = {
    "san-antonio": { name: "San Antonio", center: [29.4241, -98.4936], zoom: 11 },
    austin: { name: "Austin", center: [30.2672, -97.7431], zoom: 11 },
    houston: { name: "Houston", center: [29.7604, -95.3698], zoom: 10 },
    dallas: { name: "Dallas", center: [32.7767, -96.797], zoom: 11 },
    lubbock: { name: "Lubbock", center: [33.5779, -101.8552], zoom: 11 },
  };
  const TEXAS = { name: "Texas", center: [31.0, -99.5], zoom: 6 };
  const TILES = {
    "leaflet-voyager": {
      url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      attr: "© OSM © CARTO",
    },
    "leaflet-osm": {
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attr: "© OpenStreetMap",
    },
    "leaflet-carto": {
      url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      attr: "© OSM © CARTO",
    },
  };

  let map, tileLayer, layer, markers = [];
  let feed = null, registry = null;
  let city = localStorage.getItem("yb_city") || "san-antonio";
  let engine = localStorage.getItem("yb_map") || "leaflet-voyager";
  let filter = "all", query = "";

  const colorFor = (t) =>
    ({ estate: "#a855f7", fundraiser: "#f59e0b", permit: "#38bdf8", garage: "#22c55e", zone: "#f59e0b" }[t] || "#22c55e");

  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&")
      .replace(/</g, "<")
      .replace(/>/g, ">")
      .replace(/"/g, """);
  }

  function normalizeFeed(raw) {
    if (!raw) return { public: [], permits: [], clusters: [], hot_zones: [], sources: [], total_locations: 0 };
    return {
      ...raw,
      public: raw.public || raw.sales || [],
      permits: raw.permits || [],
      clusters: raw.clusters || [],
      hot_zones: raw.hot_zones || [],
      sources: raw.sources || [],
      total_locations: raw.total_locations || 0,
    };
  }

  function allSales() {
    if (!feed) return [];
    const base = [...(feed.public || []), ...(feed.permits || [])];
    const extra = [];
    for (const cl of feed.clusters || []) {
      for (const m of cl.members || []) extra.push(m);
    }
    const seen = new Set();
    const out = [];
    for (const s of [...base, ...extra]) {
      const key = `${(s.address || "").toLowerCase()}|${s.lat}|${s.lon}|${s.title || ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(s);
    }
    return out;
  }

  function filtered() {
    const q = query.trim().toLowerCase();
    return allSales().filter((s) => {
      if (filter !== "all" && (s.type || "garage") !== filter) return false;
      if (!q) return true;
      return `${s.title || ""} ${s.address || ""} ${s.details || ""}`.toLowerCase().includes(q);
    });
  }

  function resolveSourceUrl(s) {
    const direct = s.source_url || s.gallery || s.url || s.link;
    if (direct) return direct;
    const src = String(s.source || "").toLowerCase();
    const cityPages = {
      "san-antonio": "https://www.yardsalesearch.com/garage-sales-san-antonio-tx.html",
      austin: "https://www.yardsalesearch.com/garage-sales-austin-tx.html",
      houston: "https://www.yardsalesearch.com/garage-sales-houston-tx.html",
      dallas: "https://www.yardsalesearch.com/garage-sales-dallas-tx.html",
      lubbock: "https://www.yardsalesearch.com/garage-sales-lubbock-tx.html",
    };
    if (src.includes("permit") || src.includes("open data") || src.includes("city of sa"))
      return "https://data.sanantonio.gov/";
    if (src.includes("craigslist")) {
      const cl = {
        "san-antonio": "https://sanantonio.craigslist.org/search/gms",
        austin: "https://austin.craigslist.org/search/gms",
        houston: "https://houston.craigslist.org/search/gms",
        dallas: "https://dallas.craigslist.org/search/gms",
        lubbock: "https://lubbock.craigslist.org/search/gms",
      };
      return cl[city] || "https://www.craigslist.org/";
    }
    if (src.includes("garagesalefinder"))
      return "https://www.garagesalefinder.com/garage-sales/" + (city || "san-antonio") + "/tx/";
    if (src.includes("estatesales") || (src.includes("estate") && !src.includes("garage")))
      return "https://www.estatesales.net/TX";
    if (src.includes("facebook")) return "https://www.facebook.com/marketplace/";
    if (src.includes("nextdoor")) return "https://nextdoor.com/";
    if (src.includes("yardsale") || src.includes("garage"))
      return cityPages[city] || cityPages["san-antonio"];
    return cityPages[city] || "https://www.yardsalesearch.com/";
  }

  function sourceLink(s) {
    const url = resolveSourceUrl(s);
    const label = s.source || "Source";
    if (url) return `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(label)} ↗</a>`;
    return esc(label);
  }

  function showDetail(s) {
    const drawer = document.getElementById("detailDrawer");
    const body = document.getElementById("detailBody");
    if (!drawer || !body) return;
    body.innerHTML = `<h3>${esc(s.title || "Sale")}</h3>
      <div class="d-addr">${esc(s.address || "")}</div>
      <div class="d-meta">${esc(s.dates || "")} ${esc(s.hours || "")}</div>
      <div class="d-meta">Type: ${esc(s.type || "garage")} · Confidence: ${s.confidence ?? "—"}</div>
      <div class="d-meta">Source: ${sourceLink(s)}</div>
      <div class="d-body">${esc(s.details || "No description.")}</div>
      ${s.photos ? `<div class="d-meta">📷 ${s.photos} photos noted at source</div>` : ""}
      ${resolveSourceUrl(s) ? `<div class="d-meta"><a class="source-btn" href="${esc(resolveSourceUrl(s))}" target="_blank" rel="noopener">Open source listing ↗</a></div>` : ""}`;
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
      <div class="popup-meta">${sourceLink(s)}</div>
      ${s.photos ? `<div class="popup-meta">📷 ${s.photos} photos</div>` : ""}`;
  }

  function listSales(items, emptyMsg) {
    const ul = document.getElementById("saleList");
    const countEl = document.getElementById("listCount");
    if (countEl) countEl.textContent = String(items.length);
    if (!ul) return;
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
          ${resolveSourceUrl(s) ? `<a class="pill source" href="${esc(resolveSourceUrl(s))}" target="_blank" rel="noopener" onclick="event.stopPropagation()">Source ↗</a>` : (s.source ? `<span class="pill">${esc(s.source)}</span>` : "")}
        </div>
      </li>`
      )
      .join("");
    ul.querySelectorAll("li[data-i]").forEach((li) => {
      li.addEventListener("click", () => {
        const s = items[+li.dataset.i];
        showDetail(s);
        if (s.lat != null && s.lon != null) map.setView([s.lat, s.lon], 15);
      });
    });
  }

  function clearLayers() {
    markers = [];
    if (layer) layer.clearLayers();
    else layer = L.layerGroup().addTo(map);
  }

  function renderMarkers() {
    clearLayers();
    filtered().forEach((s) => {
      if (s.lat == null || s.lon == null) return;
      const m = L.circleMarker([s.lat, s.lon], {
        radius: s.type === "estate" ? 9 : s.type === "permit" ? 6 : 7,
        color: "#fff",
        weight: 2,
        fillColor: colorFor(s.type || "garage"),
        fillOpacity: 0.95,
      }).bindPopup(popupHtml(s));
      m.on("click", () => showDetail(s));
      m.addTo(layer);
      markers.push(m);
    });
  }

  function renderList() {
    listSales(filtered(), "No matching sales");
  }

  function renderForecast() {
    const el = document.getElementById("hotZones");
    if (!el) return;
    if (city === "texas") {
      el.innerHTML = Object.entries(CITY_META)
        .map(
          ([slug, m]) =>
            `<div class="zone" data-jump="${slug}" style="cursor:pointer"><span class="name">${esc(m.name)}</span><span class="badge ACTIVE">CITY</span></div>`
        )
        .join("");
      el.querySelectorAll("[data-jump]").forEach((n) =>
        n.addEventListener("click", () => {
          document.getElementById("citySelect").value = n.dataset.jump;
          loadCity(n.dataset.jump);
        })
      );
      return;
    }
    const items = feed.hot_zones || [];
    el.innerHTML = items.length
      ? items
          .map(
            (z, i) =>
              `<div class="zone" data-i="${i}" style="cursor:pointer">
            <span class="name">${esc(z.name)}${z.size ? " · " + z.size : ""}</span>
            <span class="badge ${esc(z.badge || "ACTIVE")}">${esc(z.badge || "ACTIVE")}</span>
          </div>`
          )
          .join("")
      : `<div class="zone"><span class="name">All sales on map</span><span class="badge ACTIVE">LIVE</span></div>`;
    el.querySelectorAll("[data-i]").forEach((n) => {
      n.addEventListener("click", () => {
        const z = items[+n.dataset.i];
        if (z && z.lat != null) map.setView([z.lat, z.lon], 13);
      });
    });
  }

  function renderTexasOverview() {
    clearLayers();
    Object.entries(CITY_META).forEach(([slug, m]) => {
      const pin = L.circleMarker(m.center, {
        radius: 11,
        color: "#fff",
        weight: 2,
        fillColor: "#f59e0b",
        fillOpacity: 0.95,
      }).bindPopup(`<b>${esc(m.name)}</b>`);
      pin.on("click", () => {
        document.getElementById("citySelect").value = slug;
        loadCity(slug);
      });
      pin.addTo(layer);
    });
  }

  function refresh() {
    hideDetail();
    if (city === "texas") {
      renderTexasOverview();
      listSales([], "Pick a city");
      renderForecast();
      return;
    }
    renderList();
    renderMarkers();
    renderForecast();
  }

  function setTiles(id) {
    engine = id;
    localStorage.setItem("yb_map", engine);
    const t = TILES[engine] || TILES["leaflet-voyager"];
    if (tileLayer) map.removeLayer(tileLayer);
    tileLayer = L.tileLayer(t.url, { attribution: t.attr, maxZoom: 19 }).addTo(map);
  }

  async function loadCity(slug) {
    city = slug;
    localStorage.setItem("yb_city", city);
    if (city === "texas") {
      map.setView(TEXAS.center, TEXAS.zoom);
      feed = normalizeFeed({ public: [], permits: [], total_locations: 5 });
      document.getElementById("editionMeta").innerHTML = "<strong>Texas</strong><br/>5 cities";
      const fs = document.getElementById("footerSources");
      if (fs) fs.textContent = "YardBird · multi-city";
      refresh();
      return;
    }
    const meta = CITY_META[city] || CITY_META["san-antonio"];
    map.setView(meta.center, meta.zoom);
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
    feed = normalizeFeed(raw || {});
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
    const n = allSales().length;
    document.getElementById("editionMeta").innerHTML = `<strong>${esc(meta.name)}</strong><br/>${
      feed.date || "—"
    } · ${n || feed.total_locations || 0} locations`;
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
      const text = "Howdy — Yowl Lawnda mapped this weekend's garage sales.";
      try {
        if (navigator.share) await navigator.share({ title: "Yowl Lawnda", text, url });
        else {
          await navigator.clipboard.writeText(url);
          alert("Link copied — share it with the neighborhood!");
        }
      } catch (_) {}
    });
    document.getElementById("yowlLike")?.addEventListener("click", (e) => {
      e.currentTarget.textContent = "♥ Liked";
      e.currentTarget.disabled = true;
    });
  }

  async function boot() {
    try {
      const rr = await fetch("data/cities.json");
      if (rr.ok) registry = await rr.json();
    } catch (_) {}
    const start = CITY_META[city] || TEXAS;
    map = L.map("map", { zoomControl: true }).setView(start.center, start.zoom || 11);
    setTiles(engine);
    layer = L.layerGroup().addTo(map);
    const sel = document.getElementById("citySelect");
    if (sel) {
      sel.value = city;
      sel.addEventListener("change", (e) => loadCity(e.target.value));
    }
    document.getElementById("mapEngine")?.addEventListener("change", (e) => setTiles(e.target.value));
    document.getElementById("search")?.addEventListener("input", (e) => {
      query = e.target.value;
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
        if (city !== "texas") {
          renderList();
          renderMarkers();
        }
      })
    );
    document.getElementById("detailClose")?.addEventListener("click", hideDetail);
    wireYowl();
    await loadCity(city);
  }

  boot();
})();
