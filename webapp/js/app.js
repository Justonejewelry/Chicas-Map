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

  let map, markers = [], userMarker = null;
  let feed = null;
  let city = localStorage.getItem("yb_city") || "san-antonio";
  let engine = localStorage.getItem("yb_map") || "liberty";
  let filter = "all", query = "";
  // User origin for distance sorting
  let userLoc = null; // { lat, lon, label }
  let maxMiles = 10;

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // Haversine distance in miles
  function milesBetween(lat1, lon1, lat2, lon2) {
    const R = 3958.8;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function formatMiles(m) {
    if (m == null || isNaN(m)) return "";
    if (m < 0.1) return "< 0.1 mi";
    if (m < 10) return m.toFixed(1) + " mi";
    return Math.round(m) + " mi";
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
      const copy = { ...s };
      if (userLoc && s.lat != null && s.lon != null) {
        copy._miles = milesBetween(userLoc.lat, userLoc.lon, s.lat, s.lon);
      } else {
        copy._miles = null;
      }
      out.push(copy);
    }
    return out;
  }

  function filtered() {
    const q = query.trim().toLowerCase();
    let items = allSales().filter((s) => {
      if (filter !== "all" && (s.type || "garage") !== filter) return false;
      if (userLoc && maxMiles > 0 && s._miles != null && s._miles > maxMiles) return false;
      if (!q) return true;
      return `${s.title || ""} ${s.address || ""} ${s.details || ""}`.toLowerCase().includes(q);
    });
    if (userLoc) {
      items.sort((a, b) => (a._miles ?? 9999) - (b._miles ?? 9999));
    }
    return items;
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

  function directionsUrl(s) {
    if (s.lat == null || s.lon == null) return null;
    const dest = encodeURIComponent(s.address || `${s.lat},${s.lon}`);
    // Google Maps directions — works on mobile + desktop
    return `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
  }

  function showDetail(s) {
    const drawer = document.getElementById("detailDrawer");
    const body = document.getElementById("detailBody");
    if (!drawer || !body) return;
    const dist = s._miles != null ? `<div class="d-meta"><strong>${formatMiles(s._miles)}</strong> away</div>` : "";
    const dirs = directionsUrl(s);
    body.innerHTML = `<h3>${esc(s.title || "Sale")}</h3>
      <div class="d-addr">${esc(s.address || "")}</div>
      ${dist}
      <div class="d-meta">${esc(s.dates || "")} ${esc(s.hours || "")}</div>
      <div class="d-meta">Type: ${esc(s.type || "garage")} · Confidence: ${s.confidence ?? "—"}</div>
      <div class="d-meta">Source: ${sourceLink(s)}</div>
      <div class="d-body">${esc(s.details || "No description.")}</div>
      ${s.photos ? `<div class="d-meta">📷 ${s.photos} photos noted at source</div>` : ""}
      <div class="action-row">
        ${dirs ? `<a class="action-btn dirs" href="${esc(dirs)}" target="_blank" rel="noopener">🧭 Directions</a>` : ""}
        ${s.address ? `<button type="button" class="action-btn" id="btnCopyAddr">📋 Copy address</button>` : ""}
        ${resolveSourceUrl(s) ? `<a class="action-btn" href="${esc(resolveSourceUrl(s))}" target="_blank" rel="noopener">Source ↗</a>` : ""}
      </div>`;
    drawer.classList.remove("hidden");
    const copyBtn = document.getElementById("btnCopyAddr");
    if (copyBtn && s.address) {
      copyBtn.onclick = async () => {
        try {
          await navigator.clipboard.writeText(s.address);
          copyBtn.textContent = "✓ Copied";
          setTimeout(() => (copyBtn.textContent = "📋 Copy address"), 1500);
        } catch (_) {}
      };
    }
  }

  function hideDetail() {
    const d = document.getElementById("detailDrawer");
    if (d) d.classList.add("hidden");
  }

  function popupHtml(s) {
    const dist = s._miles != null ? `<div class="popup-meta"><strong>${formatMiles(s._miles)}</strong> away</div>` : "";
    const dirs = directionsUrl(s);
    return `<div class="popup-title">${esc(s.title || s.address)}</div>
      <div>${esc(s.address || "")}</div>
      ${dist}
      <div class="popup-meta">${esc(s.dates || "")}</div>
      <div class="popup-meta">${sourceLink(s)}</div>
      ${s.photos ? `<div class="popup-meta">📷 ${s.photos} photos</div>` : ""}
      ${dirs ? `<div class="popup-meta" style="margin-top:6px"><a href="${esc(dirs)}" target="_blank" rel="noopener">🧭 Directions</a></div>` : ""}`;
  }

  function listSales(items, emptyMsg) {
    const ul = document.getElementById("saleList");
    const countEl = document.getElementById("listCount");
    const titleEl = document.getElementById("listTitle");
    if (countEl) countEl.textContent = String(items.length);
    if (titleEl) titleEl.textContent = userLoc ? "Closest first" : "Locations";
    if (!ul) return;
    if (!items.length) {
      ul.innerHTML = `<li class="empty"><div class="title">${esc(emptyMsg || "No sales in range")}</div><div class="addr">Try a larger radius or clear location</div></li>`;
      return;
    }
    ul.innerHTML = items
      .map(
        (s, i) => `<li data-i="${i}" class="${i === 0 && userLoc ? "closest" : ""}">
        <div class="title">
          <span>${esc(s.title || s.address)}</span>
          ${s._miles != null ? `<span class="dist-pill">${formatMiles(s._miles)}</span>` : ""}
        </div>
        <div class="addr">${esc(s.address || "")}</div>
        <div class="row">
          <span class="pill ${s.type || "garage"}">${s.type || "garage"}</span>
          ${s.photos ? `<span class="pill">${s.photos} photos</span>` : ""}
          ${resolveSourceUrl(s) ? `<a class="pill source" href="${esc(resolveSourceUrl(s))}" target="_blank" rel="noopener" onclick="event.stopPropagation()">Source ↗</a>` : ""}
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
    el.title = (s.title || s.address || "Sale") + (s._miles != null ? ` · ${formatMiles(s._miles)}` : "");
    return el;
  }

  function renderMarkers() {
    clearMarkers();
    filtered().forEach((s) => {
      if (s.lat == null || s.lon == null) return;
      const el = makeMarkerEl(s);
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([s.lon, s.lat])
        .setPopup(new maplibregl.Popup({ offset: 18, maxWidth: "280px" }).setHTML(popupHtml(s)))
        .addTo(map);
      el.addEventListener("click", () => showDetail(s));
      markers.push(marker);
    });
    renderUserMarker();
  }

  function renderUserMarker() {
    if (userMarker) {
      userMarker.remove();
      userMarker = null;
    }
    if (!userLoc) return;
    const el = document.createElement("div");
    el.className = "yb-user-dot";
    el.title = userLoc.label || "You are here";
    userMarker = new maplibregl.Marker({ element: el })
      .setLngLat([userLoc.lon, userLoc.lat])
      .setPopup(new maplibregl.Popup().setHTML(`<b>You</b><br/>${esc(userLoc.label || "Current location")}`))
      .addTo(map);
  }

  function renderList() {
    listSales(filtered(), userLoc ? "No sales within this radius" : "No matching sales");
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

  function setNearStatus(msg, kind) {
    const el = document.getElementById("nearStatus");
    if (!el) return;
    if (!msg) {
      el.hidden = true;
      el.innerHTML = "";
      return;
    }
    el.hidden = false;
    el.className = "near-status" + (kind ? " " + kind : "");
    el.innerHTML = `<span>${esc(msg)}</span><button type="button" class="near-btn clear-loc" id="btnClearLoc">Clear</button>`;
    document.getElementById("btnClearLoc")?.addEventListener("click", clearUserLoc);
  }

  function setUserLoc(lat, lon, label) {
    userLoc = { lat, lon, label: label || "Your location" };
    try {
      localStorage.setItem("yb_user_loc", JSON.stringify(userLoc));
    } catch (_) {}
    setNearStatus(`Sorted by distance from ${userLoc.label}`, "ok");
    const hint = document.getElementById("mapHint");
    if (hint) hint.textContent = "Closest sales listed first · blue dot = you";
    map.flyTo({ center: [lon, lat], zoom: 12 });
    refresh();
  }

  function clearUserLoc() {
    userLoc = null;
    try {
      localStorage.removeItem("yb_user_loc");
    } catch (_) {}
    if (userMarker) {
      userMarker.remove();
      userMarker = null;
    }
    setNearStatus("");
    const hint = document.getElementById("mapHint");
    if (hint) hint.textContent = "Tap 📍 Near me or enter a ZIP to sort by distance";
    refresh();
  }

  function useGeolocation() {
    const btn = document.getElementById("btnNearMe");
    if (!navigator.geolocation) {
      setNearStatus("Location not supported in this browser", "error");
      return;
    }
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Locating…";
    }
    setNearStatus("Getting your location…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (btn) {
          btn.disabled = false;
          btn.textContent = "📍 Near me";
        }
        setUserLoc(pos.coords.latitude, pos.coords.longitude, "My location");
      },
      (err) => {
        if (btn) {
          btn.disabled = false;
          btn.textContent = "📍 Near me";
        }
        const msg =
          err.code === 1
            ? "Location permission denied — try entering a ZIP instead"
            : "Could not get location — try an address or ZIP";
        setNearStatus(msg, "error");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  }

  async function geocodeAddress(q) {
    const query = q.trim();
    if (!query) return;
    setNearStatus("Looking up “" + query + "”…");
    const btn = document.getElementById("btnLocSearch");
    if (btn) btn.disabled = true;
    try {
      // Prefer Texas bias for short queries / ZIPs
      const isZip = /^\d{5}(-\d{4})?$/.test(query);
      const searchQ = isZip ? query + ", Texas, USA" : query.includes("TX") || query.includes("Texas") ? query : query + ", Texas, USA";
      const url =
        "https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=" +
        encodeURIComponent(searchQ);
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
      });
      const data = await res.json();
      if (!data || !data.length) {
        setNearStatus("No match for that address/ZIP — try again", "error");
        return;
      }
      const hit = data[0];
      const lat = parseFloat(hit.lat);
      const lon = parseFloat(hit.lon);
      const label = isZip ? query : hit.display_name.split(",").slice(0, 2).join(",");
      setUserLoc(lat, lon, label);
    } catch (e) {
      setNearStatus("Lookup failed — check connection and try again", "error");
    } finally {
      if (btn) btn.disabled = false;
    }
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
    if (!userLoc) map.flyTo({ center: meta.center, zoom: meta.zoom });
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

  function wireNearMe() {
    document.getElementById("btnNearMe")?.addEventListener("click", useGeolocation);
    document.getElementById("btnLocSearch")?.addEventListener("click", () => {
      const q = document.getElementById("locInput")?.value || "";
      geocodeAddress(q);
    });
    document.getElementById("locInput")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        geocodeAddress(e.target.value);
      }
    });
    document.getElementById("radiusSelect")?.addEventListener("change", (e) => {
      maxMiles = parseFloat(e.target.value) || 0;
      if (userLoc) refresh();
    });
    // Restore last location
    try {
      const saved = localStorage.getItem("yb_user_loc");
      if (saved) {
        const loc = JSON.parse(saved);
        if (loc && loc.lat && loc.lon) {
          userLoc = loc;
          setNearStatus(`Sorted by distance from ${loc.label || "saved location"}`, "ok");
        }
      }
    } catch (_) {}
  }

  async function boot() {
    const start = CITY_META[city] || TEXAS;
    map = new maplibregl.Map({
      container: "map",
      style: STYLES[engine] || STYLES.liberty,
      center: userLoc ? [userLoc.lon, userLoc.lat] : start.center,
      zoom: start.zoom || 11,
      attributionControl: true,
    });
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), "top-right");
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 120 }), "bottom-left");

    const sel = document.getElementById("citySelect");
    if (sel) {
      sel.value = city;
      sel.addEventListener("change", (e) => loadCity(e.target.value));
    }
    document.getElementById("mapEngine")?.addEventListener("change", (e) => {
      setStyle(e.target.value);
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
    wireNearMe();

    map.on("load", () => loadCity(city));
  }

  boot();
})();
