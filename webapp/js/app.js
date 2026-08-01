(function () {
  const SA_CENTER = [29.4241, -98.4936];
  let feed = null;
  let filter = "all";
  let query = "";
  let markers = [];
  let map, layer;

  const colorFor = (type) => ({
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

  function popupHtml(s) {
    return `<div class="popup-title">${esc(s.title || s.address)}</div>
      <div>${esc(s.address || "")}</div>
      <div class="popup-meta">${esc(s.dates || "")} ${esc(s.hours || "")}</div>
      <div class="popup-meta">${esc((s.details || "").slice(0, 180))}</div>
      <div class="popup-meta">Source: ${esc(s.source || "")} · conf ${s.confidence ?? "—"}</div>`;
  }

  function esc(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function renderList() {
    const items = filtered();
    const ul = document.getElementById("saleList");
    document.getElementById("listCount").textContent = String(items.length);
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
    const zones = feed.hot_zones || [];
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

  async function boot() {
    map = L.map("map", { zoomControl: true }).setView(SA_CENTER, 11);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: "&copy; OpenStreetMap &copy; CARTO",
      maxZoom: 19,
    }).addTo(map);

    const res = await fetch("data/feed.json");
    feed = await res.json();
    document.getElementById("editionMeta").innerHTML =
      `<strong>${esc(feed.date)}</strong><br/>${feed.total_locations} locations · ${
        (feed.public || []).length
      } public · ${feed.permit_total || 0} permits`;

    renderForecast();
    refresh();

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
  }

  boot();
})();
