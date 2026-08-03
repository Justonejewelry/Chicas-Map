(function () {
  const CITY_META = {
    "san-antonio": { name: "San Antonio", center: [-98.4936, 29.4241], zoom: 11 },
    austin: { name: "Austin", center: [-97.7431, 30.2672], zoom: 11 },
    houston: { name: "Houston", center: [-95.3698, 29.7604], zoom: 10 },
    dallas: { name: "Dallas", center: [-96.797, 32.7767], zoom: 11 },
    lubbock: { name: "Lubbock", center: [-101.8552, 33.5779], zoom: 11 },
  };
  const TEXAS = { name: "Texas", center: [-99.5, 31.0], zoom: 5.5 };

  // Free MapLibre-compatible styles (no API key required)
  const STYLES = {
    liberty: "https://tiles.openfreemap.org/styles/liberty",
    bright: "https://tiles.openfreemap.org/styles/bright",
    dark: "https://tiles.openfreemap.org/styles/dark",
  };

  let map, markers = [];
  let feed = null;
  let city = localStorage.getItem("yb_city") || "san-antonio";
  let engine = localStorage.getItem("yb_map") || "liberty";
  let filter = "all", query = "";

  const colorFor = (t) =>
    ({ estate: "#a855f7", fundraiser: "#f59e0b", permit: "#38bdf8", garage: "#22c55e", zone: "#f59e0b" }[t] || "#22c55e");

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
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
    if (src.includes("estatesales") || (src.includes("estate") && !src.includes("garage")))
      return "https://www.estatesales.net/TX";
    if (src.includes("garagesalefinder"))
      return "https://www.garagesalefinder.com/garage-sales/san-antonio/tx/";
    if (src.includes("yardsale"))
      return "https://www.yardsalesearch.com/garage-sales-san-antonio-tx.html";
    return "https://www.estatesales.net/TX";
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
        if (s.lat != null && s.lon != null) {
          map.flyTo({ center: [s.lon, s.lat], zoom: 14, essential: true });
        }
      });
    });
  }

  function clearMarkers() {
    markers.forEach((m) => m.remove());
    markers = [];
  }

  function makeMarkerEl(s) {
    const el = document.createElement("div");
    el.className = `yb-marker ${s.type || "garage"}`;
    if (s.confidence >= 0.9) el.classList.add("top");
    el.title = s.title || s.address || "Sale";
    return el;
  }

  function renderMarkers() {
    clearMarkers();
    filtered().forEach((s) => {
      if (s.lat == null || s.lon == null) return;
      const el = makeMarkerEl(s);
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([s.lon, s.lat])
        .setPopup(new maplibregl.Popup({ offset: 18, maxWidth: "260px" }).setHTML(popupHtml(s)))
        .addTo(map);
      el.addEventListener("click", () => showDetail(s));
      markers.push(marker);
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
    const items = (feed && feed.hot_zones) || [];
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
        if (z && z.lat != null) map.flyTo({ center: [z.lon, z.lat], zoom: 12.5 });
      });
    });
  }

  function renderTexasOverview() {
    clearMarkers();
    Object.entries(CITY_META).forEach(([slug, m]) => {
      const el = document.createElement("div");
      el.className = "yb-marker top";
      el.title = m.name;
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(m.center)
        .setPopup(new maplibregl.Popup().setHTML(`<b>${esc(m.name)}</b>`))
        .addTo(map);
      el.addEventListener("click", () => {
        document.getElementById("citySelect").value = slug;
        loadCity(slug);
      });
      markers.push(marker);
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

  function setStyle(id) {
    engine = id;
    localStorage.setItem("yb_map", engine);
    const styleUrl = STYLES[engine] || STYLES.liberty;
    if (map) map.setStyle(styleUrl);
  }

  async function loadCity(slug) {
    city = slug;
    localStorage.setItem("yb_city", city);
    if (city === "texas") {
      map.flyTo({ center: TEXAS.center, zoom: TEXAS.zoom });
      feed = normalizeFeed({ public: [], permits: [], total_locations: 5 });
      document.getElementById("editionMeta").innerHTML = "<strong>Texas</strong><br/>5 cities";
      const fs = document.getElementById("footerSources");
      if (fs) fs.textContent = "YardBird · multi-city · MapLibre";
      refresh();
      return;
    }
    const meta = CITY_META[city] || CITY_META["san-antonio"];
    map.flyTo({ center: meta.center, zoom: meta.zoom });
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
    const srcs = (feed.sources || []).map((s) => String(s).trim());
    const short = [...new Set(srcs)].slice(0, 3).join(" · ") || "YardBird · GSIN";
    const fs = document.getElementById("footerSources");
    if (fs) {
      fs.textContent = short + " · MapLibre";
      fs.title = (feed.sources || []).join(" · ") || short;
    }
    // Wait a tick so style can settle if needed
    setTimeout(refresh, 80);
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
    const start = CITY_META[city] || TEXAS;
    map = new maplibregl.Map({
      container: "map",
      style: STYLES[engine] || STYLES.liberty,
      center: start.center,
      zoom: start.zoom || 11,
      attributionControl: true,
    });
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), "top-right");
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 120 }), "bottom-left");

    map.on("load", () => {
      // Style loaded — safe to add markers
    });

    const sel = document.getElementById("citySelect");
    if (sel) {
      sel.value = city;
      sel.addEventListener("change", (e) => loadCity(e.target.value));
    }
    document.getElementById("mapEngine")?.addEventListener("change", (e) => {
      setStyle(e.target.value);
      // Re-add markers after style change
      map.once("styledata", () => setTimeout(refresh, 100));
    });
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

    // Initial load after map is ready
    map.on("load", () => loadCity(city));
  }

  boot();
})();
