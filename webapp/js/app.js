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
  let userLoc = null;
  let maxMiles = 10;
  let showFavOnly = false;
  let favorites = loadJson("yb_favorites", {});
  let routeIds = loadJson("yb_route", []);

  function loadJson(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch (_) {
      return fallback;
    }
  }
  function saveJson(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (_) {}
  }

  function saleKey(s) {
    return `${(s.address || "").toLowerCase()}|${s.lat}|${s.lon}|${s.title || ""}`;
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

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

  function toast(msg) {
    const el = document.getElementById("toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.remove("hidden");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.add("hidden"), 2200);
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
      const key = saleKey(s);
      if (seen.has(key)) continue;
      seen.add(key);
      const copy = { ...s, _key: key };
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
      if (showFavOnly && !favorites[s._key]) return false;
      if (filter === "photos") {
        if (!(s.photos > 0)) return false;
      } else if (filter !== "all" && (s.type || "garage") !== filter) {
        return false;
      }
      if (userLoc && maxMiles > 0 && s._miles != null && s._miles > maxMiles) return false;
      if (!q) return true;
      return `${s.title || ""} ${s.address || ""} ${s.details || ""}`.toLowerCase().includes(q);
    });
    if (userLoc) items.sort((a, b) => (a._miles ?? 9999) - (b._miles ?? 9999));
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
    return `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
  }

  function toggleFavorite(s) {
    const k = s._key || saleKey(s);
    if (favorites[k]) {
      delete favorites[k];
      toast("Removed from saved");
    } else {
      favorites[k] = {
        title: s.title,
        address: s.address,
        lat: s.lat,
        lon: s.lon,
        type: s.type,
        dates: s.dates,
      };
      toast("Saved ★");
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
    } else {
      if (routeIds.length >= 8) {
        toast("Max 8 stops — remove one first");
        return;
      }
      routeIds.push(k);
      toast("Added to route");
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
    if (!routeIds.length) {
      tray.classList.add("hidden");
      return;
    }
    tray.classList.remove("hidden");
    const byKey = {};
    allSales().forEach((s) => (byKey[s._key] = s));
    // also pull from favorites store if not in current feed
    routeIds.forEach((k) => {
      if (!byKey[k] && favorites[k]) byKey[k] = { ...favorites[k], _key: k };
    });
    list.innerHTML = routeIds
      .map((k, i) => {
        const s = byKey[k] || { title: "Saved stop", address: k };
        return `<li><span class="num">${i + 1}</span> <span>${esc(s.title || s.address || "Stop")}</span></li>`;
      })
      .join("");
  }

  function openMultiRoute() {
    const byKey = {};
    allSales().forEach((s) => (byKey[s._key] = s));
    routeIds.forEach((k) => {
      if (!byKey[k] && favorites[k]) byKey[k] = favorites[k];
    });
    const stops = routeIds.map((k) => byKey[k]).filter((s) => s && (s.lat != null || s.address));
    if (stops.length < 1) {
      toast("Add at least one stop");
      return;
    }
    // Google Maps: origin optional, waypoints, destination
    const origin = userLoc
      ? `${userLoc.lat},${userLoc.lon}`
      : stops[0].lat != null
        ? `${stops[0].lat},${stops[0].lon}`
        : encodeURIComponent(stops[0].address || "");
    const destStop = stops[stops.length - 1];
    const destination =
      destStop.lat != null ? `${destStop.lat},${destStop.lon}` : encodeURIComponent(destStop.address || "");
    const middle = stops.slice(userLoc ? 0 : 1, -1);
    const waypoints = middle
      .map((s) => (s.lat != null ? `${s.lat},${s.lon}` : encodeURIComponent(s.address || "")))
      .join("|");
    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
    if (waypoints) url += `&waypoints=${waypoints}`;
    window.open(url, "_blank", "noopener");
  }

  function exportList() {
    const items = filtered();
    if (!items.length) {
      toast("Nothing to export");
      return;
    }
    const lines = items.map((s, i) => {
      const dist = s._miles != null ? ` (${formatMiles(s._miles)})` : "";
      return `${i + 1}. ${s.title || "Sale"}${dist}\n   ${s.address || ""}\n   ${s.dates || ""} ${s.hours || ""}`.trim();
    });
    const text = `Chica Map — ${CITY_META[city]?.name || city}\n${new Date().toLocaleDateString()}\n\n${lines.join("\n\n")}\n\nhttps://justonejewelry.github.io/Project-YardBird/`;
    navigator.clipboard.writeText(text).then(
      () => toast("List copied to clipboard"),
      () => toast("Could not copy — select manually")
    );
  }

  function shareSale(s) {
    const text = `${s.title || "Garage sale"}\n${s.address || ""}\n${s.dates || ""}\nVia Chica Map`;
    const url = location.href;
    if (navigator.share) {
      navigator.share({ title: s.title || "Sale", text, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text + "\n" + url).then(() => toast("Sale details copied"));
    }
  }

  function showDetail(s) {
    const drawer = document.getElementById("detailDrawer");
    const body = document.getElementById("detailBody");
    if (!drawer || !body) return;
    const k = s._key || saleKey(s);
    const isFav = !!favorites[k];
    const onRoute = routeIds.includes(k);
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
        <button type="button" class="action-btn" id="btnFav">${isFav ? "★ Saved" : "☆ Save"}</button>
        <button type="button" class="action-btn" id="btnAddRoute">${onRoute ? "✓ On route" : "＋ Route"}</button>
        ${dirs ? `<a class="action-btn dirs" href="${esc(dirs)}" target="_blank" rel="noopener">🧭 Go</a>` : ""}
        <button type="button" class="action-btn" id="btnShareSale">↗ Share</button>
        ${s.address ? `<button type="button" class="action-btn" id="btnCopyAddr">📋 Address</button>` : ""}
      </div>`;
    drawer.classList.remove("hidden");
    document.getElementById("btnFav")?.addEventListener("click", () => {
      toggleFavorite(s);
      showDetail({ ...s, _key: k });
    });
    document.getElementById("btnAddRoute")?.addEventListener("click", () => {
      toggleRouteStop(s);
      showDetail({ ...s, _key: k });
    });
    document.getElementById("btnShareSale")?.addEventListener("click", () => shareSale(s));
    document.getElementById("btnCopyAddr")?.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(s.address);
        toast("Address copied");
      } catch (_) {}
    });
  }

  function hideDetail() {
    document.getElementById("detailDrawer")?.classList.add("hidden");
  }

  function popupHtml(s) {
    const dist = s._miles != null ? `<div class="popup-meta"><strong>${formatMiles(s._miles)}</strong> away</div>` : "";
    const dirs = directionsUrl(s);
    return `<div class="popup-title">${esc(s.title || s.address)}</div>
      <div>${esc(s.address || "")}</div>
      ${dist}
      <div class="popup-meta">${esc(s.dates || "")}</div>
      <div class="popup-meta">${sourceLink(s)}</div>
      ${dirs ? `<div class="popup-meta" style="margin-top:6px"><a href="${esc(dirs)}" target="_blank" rel="noopener">🧭 Directions</a></div>` : ""}`;
  }

  function listSales(items, emptyMsg) {
    const ul = document.getElementById("saleList");
    const countEl = document.getElementById("listCount");
    const titleEl = document.getElementById("listTitle");
    if (countEl) countEl.textContent = String(items.length);
    if (titleEl) {
      titleEl.textContent = showFavOnly ? "Saved sales" : userLoc ? "Closest first" : "Locations";
    }
    if (!ul) return;
    if (!items.length) {
      ul.innerHTML = `<li class="empty"><div class="title">${esc(emptyMsg || "No sales")}</div><div class="addr">Try clearing filters or expanding radius</div></li>`;
      return;
    }
    ul.innerHTML = items
      .map((s, i) => {
        const fav = favorites[s._key] ? "★" : "☆";
        const onR = routeIds.includes(s._key);
        return `<li data-i="${i}" class="${i === 0 && userLoc && !showFavOnly ? "closest" : ""}">
        <div class="title">
          <span>${esc(s.title || s.address)}</span>
          <span class="title-actions">
            ${s._miles != null ? `<span class="dist-pill">${formatMiles(s._miles)}</span>` : ""}
            <button type="button" class="icon-btn fav" data-fav="${i}" title="Save">${fav}</button>
            <button type="button" class="icon-btn route ${onR ? "on" : ""}" data-route="${i}" title="Add to route">＋</button>
          </span>
        </div>
        <div class="addr">${esc(s.address || "")}</div>
        <div class="row">
          <span class="pill ${s.type || "garage"}">${s.type || "garage"}</span>
          ${s.photos ? `<span class="pill">${s.photos} photos</span>` : ""}
        </div>
      </li>`;
      })
      .join("");
    ul.querySelectorAll("li[data-i]").forEach((li) => {
      li.addEventListener("click", (e) => {
        if (e.target.closest(".icon-btn")) return;
        const s = items[+li.dataset.i];
        showDetail(s);
        if (s.lat != null && s.lon != null) map.flyTo({ center: [s.lon, s.lat], zoom: 14, essential: true });
      });
    });
    ul.querySelectorAll("[data-fav]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleFavorite(items[+btn.dataset.fav]);
      });
    });
    ul.querySelectorAll("[data-route]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleRouteStop(items[+btn.dataset.route]);
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
    if (s.confidence >= 0.9 || favorites[s._key]) el.classList.add("top");
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
    listSales(
      filtered(),
      showFavOnly ? "No saved sales yet — tap ☆ on a listing" : userLoc ? "No sales within this radius" : "No matching sales"
    );
  }

  function renderForecast() {
    const el = document.getElementById("hotZones");
    const qa = document.getElementById("quickAreas");
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
      if (qa) qa.innerHTML = "";
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
    if (qa) {
      qa.innerHTML = items
        .slice(0, 5)
        .map(
          (z, i) =>
            `<button type="button" class="area-chip" data-ai="${i}">${esc(z.name.split("/")[0].trim())}</button>`
        )
        .join("");
      qa.querySelectorAll("[data-ai]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const z = items[+btn.dataset.ai];
          if (z && z.lat != null) map.flyTo({ center: [z.lon, z.lat], zoom: 12.5 });
        });
      });
    }
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
    renderRouteTray();
    updateToolCounts();
  }

  async function loadWeather() {
    const strip = document.getElementById("weatherStrip");
    const text = document.getElementById("weatherText");
    if (!strip || !text) return;
    const meta = CITY_META[city];
    if (!meta || city === "texas") {
      strip.hidden = true;
      return;
    }
    const [lon, lat] = meta.center;
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max&temperature_unit=fahrenheit&timezone=America/Chicago&forecast_days=3`;
      const res = await fetch(url);
      const data = await res.json();
      const d = data.daily;
      if (!d || !d.time) {
        strip.hidden = true;
        return;
      }
      // Pick today + next
      const parts = d.time.slice(0, 3).map((t, i) => {
        const day = new Date(t + "T12:00:00").toLocaleDateString(undefined, { weekday: "short" });
        const hi = Math.round(d.temperature_2m_max[i]);
        const lo = Math.round(d.temperature_2m_min[i]);
        const pop = d.precipitation_probability_max[i];
        const rain = pop >= 40 ? ` · ${pop}% rain` : "";
        return `${day} ${hi}°/${lo}°${rain}`;
      });
      text.textContent = `🌤 ${meta.name}: ${parts.join(" · ")}`;
      strip.hidden = false;
    } catch (_) {
      strip.hidden = true;
    }
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
    saveJson("yb_user_loc", userLoc);
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
        setNearStatus(
          err.code === 1
            ? "Location permission denied — try entering a ZIP instead"
            : "Could not get location — try an address or ZIP",
          "error"
        );
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
      const isZip = /^\d{5}(-\d{4})?$/.test(query);
      const searchQ = isZip
        ? query + ", Texas, USA"
        : query.includes("TX") || query.includes("Texas")
          ? query
          : query + ", Texas, USA";
      const url =
        "https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=" +
        encodeURIComponent(searchQ);
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      const data = await res.json();
      if (!data || !data.length) {
        setNearStatus("No match for that address/ZIP — try again", "error");
        return;
      }
      const hit = data[0];
      setUserLoc(
        parseFloat(hit.lat),
        parseFloat(hit.lon),
        isZip ? query : hit.display_name.split(",").slice(0, 2).join(",")
      );
    } catch (e) {
      setNearStatus("Lookup failed — check connection and try again", "error");
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function setStyle(id) {
    engine = id;
    localStorage.setItem("yb_map", engine);
    if (map) map.setStyle(STYLES[engine] || STYLES.liberty);
  }

  async function loadCity(slug) {
    city = slug;
    localStorage.setItem("yb_city", city);
    showFavOnly = false;
    if (city === "texas") {
      map.flyTo({ center: TEXAS.center, zoom: TEXAS.zoom });
      feed = normalizeFeed({ public: [], permits: [], total_locations: 5 });
      document.getElementById("editionMeta").innerHTML = "<strong>Texas</strong><br/>5 cities";
      const fs = document.getElementById("footerSources");
      if (fs) fs.textContent = "YardBird · multi-city · Chica";
      document.getElementById("weatherStrip").hidden = true;
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
        if (cr.ok) feed.clusters = (await cr.json()).clusters || [];
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
      fs.textContent = short + " · Chica";
      fs.title = (feed.sources || []).join(" · ") || short;
    }
    loadWeather();
    setTimeout(refresh, 80);
  }

  function wireChica() {
    const root = document.getElementById("chicaAmbassador");
    if (!root) return;
    if (sessionStorage.getItem("chica_dismissed") === "1") {
      root.style.display = "none";
      return;
    }
    document.getElementById("chicaDismiss")?.addEventListener("click", () => {
      root.style.display = "none";
      sessionStorage.setItem("chica_dismissed", "1");
    });
    document.getElementById("chicaShare")?.addEventListener("click", async () => {
      const url = location.href;
      const text = "Howdy — Chica mapped this weekend's garage sales in Texas.";
      try {
        if (navigator.share) await navigator.share({ title: "Chica Map", text, url });
        else {
          await navigator.clipboard.writeText(url);
          toast("Link copied");
        }
      } catch (_) {}
    });
  }

  function wireTools() {
    document.getElementById("btnFavorites")?.addEventListener("click", () => {
      showFavOnly = !showFavOnly;
      updateToolCounts();
      renderList();
      renderMarkers();
      toast(showFavOnly ? "Showing saved only" : "Showing all sales");
    });
    document.getElementById("btnRoute")?.addEventListener("click", () => {
      const tray = document.getElementById("routeTray");
      if (!routeIds.length) {
        toast("Tap ＋ on listings to build a route");
        return;
      }
      tray?.classList.toggle("hidden");
      renderRouteTray();
    });
    document.getElementById("btnExport")?.addEventListener("click", exportList);
    document.getElementById("btnClearRoute")?.addEventListener("click", () => {
      routeIds = [];
      saveJson("yb_route", routeIds);
      updateToolCounts();
      renderRouteTray();
      renderList();
      toast("Route cleared");
    });
    document.getElementById("btnOpenRoute")?.addEventListener("click", openMultiRoute);
  }

  function wireNearMe() {
    document.getElementById("btnNearMe")?.addEventListener("click", useGeolocation);
    document.getElementById("btnLocSearch")?.addEventListener("click", () => {
      geocodeAddress(document.getElementById("locInput")?.value || "");
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
    wireChica();
    wireNearMe();
    wireTools();
    updateToolCounts();

    map.on("load", () => loadCity(city));
  }

  boot();
})();
