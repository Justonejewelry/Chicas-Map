/* Chica's Map — Community Events / What's Happening layer
 * Safe, additive feature: reads approved events from data/community-events.json,
 * renders MapLibre HTML markers, adds a filter card, and provides an event
 * submission form that can be reviewed before publication.
 */
(function () {
  "use strict";

  var state = {
    enabled: true,
    events: [],
    markers: [],
    map: null,
  };

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
  }

  function injectCss() {
    if (document.getElementById("chicaEventsCss")) return;
    var s = document.createElement("style");
    s.id = "chicaEventsCss";
    s.textContent = `
      .chica-events-card{margin:10px 12px 12px;padding:12px;border:1px solid #e8e1d9;border-radius:14px;background:#fff;box-shadow:0 5px 18px rgba(20,17,15,.06)}
      .chica-events-head{display:flex;align-items:center;justify-content:space-between;gap:8px}
      .chica-events-title{font-weight:800;font-size:14px;display:flex;align-items:center;gap:7px}
      .chica-events-toggle{border:0;border-radius:999px;padding:5px 10px;font-weight:800;font-size:11px;cursor:pointer;background:#c513b8;color:#fff}
      .chica-events-toggle.off{background:#e8e3dd;color:#5d554d}
      .chica-events-sub{font-size:12px;color:#716961;margin:5px 0 9px}
      .chica-events-filters{display:flex;flex-wrap:wrap;gap:5px}
      .chica-event-filter{border:1px solid #ddd5cc;background:#faf8f5;border-radius:999px;padding:5px 8px;font-size:11px;font-weight:700;cursor:pointer}
      .chica-event-filter.active{background:#f8d8f2;border-color:#c513b8;color:#7d0b72}
      .chica-event-count{font-size:11px;color:#756d65;margin-top:8px}
      .chica-event-pin{width:38px;height:38px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#c513b8;border:3px solid #fff;box-shadow:0 4px 12px rgba(20,17,15,.28);display:flex;align-items:center;justify-content:center;cursor:pointer}
      .chica-event-pin span{transform:rotate(45deg);font-size:19px}
      .chica-event-popup{min-width:240px;max-width:300px;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      .chica-event-popup h3{margin:0 0 5px;font-size:16px;line-height:1.2}
      .chica-event-meta{font-size:12px;color:#625b54;margin:3px 0}
      .chica-event-cat{display:inline-block;margin:0 0 7px;padding:3px 7px;border-radius:999px;background:#f8d8f2;color:#7d0b72;font-size:10px;font-weight:800;text-transform:uppercase}
      .chica-event-desc{font-size:12px;line-height:1.45;margin:7px 0}
      .chica-event-actions{display:flex;gap:6px;margin-top:9px}
      .chica-event-actions a,.chica-event-actions button{border:0;border-radius:9px;padding:7px 9px;background:#14110f;color:#fff;text-decoration:none;font-size:11px;font-weight:800;cursor:pointer}
      .chica-events-form{display:none;margin-top:10px;padding-top:10px;border-top:1px solid #eee8e1}
      .chica-events-form.open{display:block}
      .chica-events-form label{display:block;font-size:11px;font-weight:800;margin:7px 0 3px}
      .chica-events-form input,.chica-events-form select,.chica-events-form textarea{width:100%;box-sizing:border-box;border:1px solid #d9d1c8;border-radius:8px;padding:7px;font:inherit;font-size:12px;background:#fff}
      .chica-events-form textarea{min-height:64px;resize:vertical}
      .chica-events-form button{margin-top:8px;width:100%;border:0;border-radius:9px;padding:9px;background:#c513b8;color:#fff;font-weight:800;cursor:pointer}
      .chica-events-note{font-size:10px;line-height:1.4;color:#756d65;margin-top:7px}
      .chica-events-mobile{margin:8px 12px}
    `;
    document.head.appendChild(s);
  }

  function getMap() {
    return window.__YB_MAP || window.map || null;
  }

  function formatDate(value) {
    if (!value) return "Date TBA";
    var d = new Date(value + (value.length === 10 ? "T00:00:00" : ""));
    if (isNaN(d.getTime())) return value;
    return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  }

  function directions(lat, lng) {
    return "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(lat + "," + lng);
  }

  function popupHtml(ev) {
    return '<div class="chica-event-popup">' +
      '<div class="chica-event-cat">' + esc(ev.category || "Community") + '</div>' +
      '<h3>' + esc(ev.title) + '</h3>' +
      '<div class="chica-event-meta">📅 ' + esc(formatDate(ev.date)) + (ev.time ? ' · ⏰ ' + esc(ev.time) : '') + '</div>' +
      '<div class="chica-event-meta">📍 ' + esc(ev.address || "Location provided by organizer") + '</div>' +
      (ev.price ? '<div class="chica-event-meta">💰 ' + esc(ev.price) + '</div>' : '') +
      (ev.description ? '<div class="chica-event-desc">' + esc(ev.description) + '</div>' : '') +
      '<div class="chica-event-actions"><a target="_blank" rel="noopener" href="' + directions(ev.lat, ev.lng) + '">Get directions</a>' +
      (ev.url ? '<a target="_blank" rel="noopener" href="' + esc(ev.url) + '">Event details</a>' : '') + '</div>' +
      '</div>';
  }

  function clearMarkers() {
    state.markers.forEach(function (m) { try { m.remove(); } catch (_) {} });
    state.markers = [];
  }

  function renderMarkers(category) {
    var map = state.map || getMap();
    if (!map || !window.maplibregl) return;
    state.map = map;
    clearMarkers();
    if (!state.enabled) return;
    state.events.filter(function (ev) {
      return !category || category === "all" || String(ev.category || "").toLowerCase() === category;
    }).forEach(function (ev) {
      if (typeof ev.lat !== "number" || typeof ev.lng !== "number") return;
      var el = document.createElement("div");
      el.className = "chica-event-pin";
      el.title = ev.title || "Community event";
      el.innerHTML = '<span>🎉</span>';
      var marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([ev.lng, ev.lat])
        .setPopup(new maplibregl.Popup({ offset: 24, closeButton: true }).setHTML(popupHtml(ev)))
        .addTo(map);
      state.markers.push(marker);
    });
    var count = document.getElementById("chicaEventCount");
    if (count) count.textContent = state.events.length ? (state.markers.length + " event" + (state.markers.length === 1 ? "" : "s") + " on the map") : "No approved events yet — be the first to list one.";
  }

  function addPanel() {
    if (document.getElementById("chicaEventsCard")) return;
    var rail = document.getElementById("sideRail");
    if (!rail) return;
    var card = document.createElement("section");
    card.id = "chicaEventsCard";
    card.className = "chica-events-card";
    card.innerHTML = `
      <div class="chica-events-head">
        <div class="chica-events-title">🎉 What's Happening</div>
        <button type="button" class="chica-events-toggle" id="chicaEventsToggle" aria-pressed="true">ON</button>
      </div>
      <div class="chica-events-sub">Community events near you — turn this layer on or off.</div>
      <div class="chica-events-filters" id="chicaEventFilters">
        <button class="chica-event-filter active" data-event-cat="all">All</button>
        <button class="chica-event-filter" data-event-cat="festival">Festivals</button>
        <button class="chica-event-filter" data-event-cat="music">Music</button>
        <button class="chica-event-filter" data-event-cat="family">Family</button>
        <button class="chica-event-filter" data-event-cat="food">Food</button>
        <button class="chica-event-filter" data-event-cat="market">Markets</button>
        <button class="chica-event-filter" data-event-cat="nonprofit">Community</button>
      </div>
      <div class="chica-event-count" id="chicaEventCount">Loading events…</div>
      <button type="button" id="chicaListEvent" class="chica-event-filter" style="margin-top:8px;width:100%">＋ List an event</button>
      <form class="chica-events-form" id="chicaEventsForm">
        <label for="ceTitle">Event name *</label><input id="ceTitle" required maxlength="100">
        <label for="ceDate">Date *</label><input id="ceDate" type="date" required>
        <label for="ceTime">Time</label><input id="ceTime" placeholder="11 AM–3 PM" maxlength="40">
        <label for="ceCategory">Category *</label><select id="ceCategory" required><option value="festival">Festival / Fair</option><option value="music">Music</option><option value="family">Family</option><option value="food">Food</option><option value="market">Market / Pop-up</option><option value="nonprofit">Community / Nonprofit</option><option value="outdoor">Outdoor / Sports</option><option value="other">Other</option></select>
        <label for="ceAddress">Address *</label><input id="ceAddress" required maxlength="180" autocomplete="street-address">
        <label for="ceUrl">Event website</label><input id="ceUrl" type="url" maxlength="250" placeholder="https://…">
        <label for="ceDescription">Description</label><textarea id="ceDescription" maxlength="500" placeholder="What should neighbors know?"></textarea>
        <button type="submit">Submit Event for Review</button>
        <div class="chica-events-note">Events are reviewed before publication. This form opens your email client with the submission details so no unapproved event is automatically placed on the public map.</div>
      </form>`;
    var list = rail.querySelector(".list-wrap");
    rail.insertBefore(card, list || rail.firstChild);

    document.getElementById("chicaEventsToggle").addEventListener("click", function () {
      state.enabled = !state.enabled;
      this.textContent = state.enabled ? "ON" : "OFF";
      this.classList.toggle("off", !state.enabled);
      this.setAttribute("aria-pressed", state.enabled ? "true" : "false");
      renderMarkers(document.querySelector(".chica-event-filter.active")?.dataset.eventCat || "all");
    });

    document.getElementById("chicaEventFilters").addEventListener("click", function (e) {
      var b = e.target.closest("[data-event-cat]");
      if (!b) return;
      document.querySelectorAll(".chica-event-filter[data-event-cat]").forEach(function (x) { x.classList.remove("active"); });
      b.classList.add("active");
      renderMarkers(b.dataset.eventCat);
    });

    document.getElementById("chicaListEvent").addEventListener("click", function () {
      document.getElementById("chicaEventsForm").classList.toggle("open");
    });

    document.getElementById("chicaEventsForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var title = document.getElementById("ceTitle").value.trim();
      var date = document.getElementById("ceDate").value;
      var time = document.getElementById("ceTime").value.trim();
      var category = document.getElementById("ceCategory").value;
      var address = document.getElementById("ceAddress").value.trim();
      var url = document.getElementById("ceUrl").value.trim();
      var description = document.getElementById("ceDescription").value.trim();
      var subject = encodeURIComponent("Chica's Map Community Event Submission: " + title);
      var body = encodeURIComponent(["Event: " + title, "Date: " + date, "Time: " + time, "Category: " + category, "Address: " + address, "Website: " + url, "Description: " + description, "", "Please review and publish if approved."].join("\n"));
      window.location.href = "mailto:" + ((window.ChicaConfig && window.ChicaConfig.REVIEW_EMAIL) || "") + "?subject=" + subject + "&body=" + body;
    });
  }

  async function loadEvents() {
    try {
      var res = await fetch("data/community-events.json?v=1", { cache: "no-store" });
      if (!res.ok) throw new Error("events feed unavailable");
      var data = await res.json();
      state.events = Array.isArray(data) ? data : (Array.isArray(data.events) ? data.events : []);
    } catch (_) {
      state.events = [];
    }
    renderMarkers("all");
  }

  function start() {
    injectCss();
    addPanel();
    var ready = getMap();
    if (ready) { state.map = ready; loadEvents(); return; }
    window.addEventListener("yb-map-ready", function (e) {
      state.map = (e.detail && e.detail.map) || getMap();
      loadEvents();
    }, { once: true });
    setTimeout(function () { if (!state.map) { state.map = getMap(); if (state.map) loadEvents(); } }, 2500);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
