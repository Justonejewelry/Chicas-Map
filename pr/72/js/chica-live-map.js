/* Standalone Leaflet boot. Pin card is owned by pin-details.js (GPS-gated pack notes, 200 ft). */
(function (w) {
  var BASE = "/Chicas-Map";
  var START = [29.50, -98.49];
  var mtDead = true; // MapTiler off until probe proves the key works
  var probed = false;
  var decided = false; // add exactly one base layer once we know which provider works (no Esri->MapTiler swap = no tile double-load, no attribution shift)
  var MT_CACHE = "chica-mt-ok";
  try {
    var cached = String(localStorage.getItem(MT_CACHE) || "").split("|");
    if (cached.length === 2 && Date.now() - Number(cached[1]) < 864e5) { mtDead = cached[0] !== "1"; decided = true; }
  } catch (e) {}
  var PIN = 40;
  var HALF = PIN / 2;
  var bootHidden = false;
  var markers = [];

  function onMapPath() {
    var p = location.pathname || "";
    return /\/map\/?$/.test(p) || p.indexOf("/map/") !== -1 || /map\.html$/.test(p);
  }
  if (!onMapPath()) return;

  try {
    if (localStorage.getItem("chicas-map-permit-on") === "1") {
      document.documentElement.classList.remove("chica-hide-permit");
    } else {
      document.documentElement.classList.add("chica-hide-permit");
    }
  } catch (e) {
    document.documentElement.classList.add("chica-hide-permit");
  }

  function hideBoot() {
    if (bootHidden) return;
    var el = document.getElementById("chica-map-boot");
    if (!el) {
      bootHidden = true;
      return;
    }
    bootHidden = true;
    el.classList.add("is-done");
    el.setAttribute("aria-hidden", "true");
    setTimeout(function () {
      if (el && el.parentNode) el.parentNode.removeChild(el);
    }, 320);
  }

  function key() {
    var cfg = (w.CHICA_CONFIG && w.CHICA_CONFIG.MAPTILER_KEY) || "";
    return String(cfg || "").trim();
  }
  function streetUrl() {
    return "https://api.maptiler.com/maps/outdoor-v2/256/{z}/{x}/{y}.png?key=" + encodeURIComponent(key());
  }
  function satUrl() {
    return "https://api.maptiler.com/maps/hybrid/256/{z}/{x}/{y}.jpg?key=" + encodeURIComponent(key());
  }
  var ESRI_STREET = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}";
  var ESRI_SAT = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

  function isPack(s) {
    if (!s) return false;
    if (s.pack || s.preferred || s.boost || s.gold_pulse) return true;
    var cat = Array.isArray(s.categories) ? s.categories.join(" ") : String(s.categories || "");
    var blob = (cat + " " + (s.source || "") + " " + (s.title || "") + " " + (s.external_id || "")).toLowerCase();
    return /pack[\s-]?point/.test(blob) || blob.indexOf("pack-point") !== -1;
  }

  function isGold(s) {
    if (!s) return false;
    if (s.gold_pulse || s.boost || s.preferred) return true;
    var cat = Array.isArray(s.categories) ? s.categories.join(" ") : String(s.categories || "");
    return /\bgold\b|preferred|boost/.test(cat.toLowerCase());
  }

  function iconFor(type, pack, gold, L) {
    var kind = type === "estate" || type === "permit" ? type : "garage";
    var html;
    var fill = gold ? "#f4c430" : "#c513af";
    if (kind === "estate") {
      html = '<svg class="chica-sym" viewBox="0 0 28 28" width="28" height="28" aria-hidden="true"><polygon points="14,2.2 25.4,14 14,25.8 2.6,14" fill="' + (gold ? "#f4c430" : "#f4f4f4") + '" stroke="#121212" stroke-width="2.2"/></svg>';
    } else if (kind === "permit") {
      html = '<svg class="chica-sym" viewBox="0 0 28 28" width="28" height="28" aria-hidden="true"><polygon points="14,2.4 25.6,24.8 2.4,24.8" fill="' + (gold ? "#f4c430" : "#8a8a8a") + '" stroke="#121212" stroke-width="2.2"/></svg>';
    } else {
      html = '<svg class="chica-sym" viewBox="0 0 28 28" width="28" height="28" aria-hidden="true"><circle cx="14" cy="14" r="10" fill="' + fill + '" stroke="#fffdf8" stroke-width="2.4"/></svg>';
    }
    if (gold) {
      html = '<span class="chica-gold-halo" aria-hidden="true"></span><span class="chica-gold-ring" aria-hidden="true"></span>' + html;
    } else if (pack) {
      html = '<span class="chica-pack-halo" aria-hidden="true"></span><span class="chica-pack-ring" aria-hidden="true"></span>' + html;
    }
    return L.divIcon({
      className: "chica-pin chica-type-" + kind + (pack ? " chica-pack-pin" : "") + (gold ? " chica-gold-pin" : ""),
      html: html,
      iconSize: [PIN, PIN],
      iconAnchor: [HALF, HALF]
    });
  }

  function salesFrom(data) {
    var out = [];
    if (!data) return out;
    if (data.status === "empty") return out;
    if (Array.isArray(data)) return data;
    var bags = [data.public, data.permits, data.sales, data.listings];
    for (var i = 0; i < bags.length; i++) {
      if (Array.isArray(bags[i])) out = out.concat(bags[i]);
    }
    if (!out.length && Array.isArray(data.features)) {
      out = data.features.map(function (f) {
        var p = f.properties || {};
        var c = (f.geometry && f.geometry.coordinates) || [];
        return { title: p.title || p.name, type: p.type || p.kind, address: p.address, lat: c[1], lon: c[0], dates: p.dates, hours: p.hours, pack: p.pack, preferred: p.preferred, source: p.source, categories: p.categories };
      });
    }
    return out;
  }

  function zipOf(address) {
    var m = String(address || "").match(/\b78\d{3}\b/);
    return m ? m[0] : "";
  }

  function saleKey(s, lat, lon) {
    return s.external_id || s.id || s.sale_id || (lat.toFixed(5) + "," + lon.toFixed(5) + "|" + (s.title || s.address || ""));
  }

  function normalize(s) {
    var lat = Number(s.lat != null ? s.lat : s.latitude);
    var lon = Number(s.lon != null ? s.lon : s.lng != null ? s.lng : s.longitude);
    if (!isFinite(lat) || !isFinite(lon)) return null;
    var gold = isGold(s);
    var pack = isPack(s);
    return {
      id: saleKey(s, lat, lon),
      title: s.title || s.address || "Sale",
      address: s.address || "",
      dates: s.dates || "",
      hours: s.hours || "",
      details: s.details || s.description || "",
      type: (function () { var t = String(s.type || s.kind || "garage").toLowerCase().replace(/[\s_-]+/g, ""); return t === "yard" || t === "yardsale" || t === "garagesale" ? "garage" : (t || "garage"); })(),
      lat: lat,
      lon: lon,
      pack: pack,
      boost: !!(s.boost || gold),
      preferred: !!s.preferred,
      gold: gold,
      source: s.source || "",
      sourceUrl: s.url || s.original_url || "",
      aliases: Array.isArray(s.aliases) ? s.aliases : [],
      source_urls: s.source_urls || [],
      confidence: s.confidence,
      confidence_label: s.confidence_label || "unconfirmed",
      confidence_note: s.confidence_note || "No confidence information is available.",
      posted_at: s.posted_at || "",
      sources: Array.isArray(s.sources) ? s.sources : [],
      status: s.status || "",
      date_start: s.date_start || s.date_from || "",
      date_end: s.date_end || s.date_to || s.end_date || s.date_start || s.date_from || "",
      zip: s.zip || zipOf(s.address),
      categories: Array.isArray(s.categories) ? s.categories : []
    };
  }

  /* Shared calendar-day policy: hide only dates before today in America/Chicago. */
  function ctNow() {
    try {
      var parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
      var o = {};
      for (var i = 0; i < parts.length; i++) o[parts[i].type] = parts[i].value;
      return { ymd: o.year + "-" + o.month + "-" + o.day, mins: (Number(o.hour) % 24) * 60 + Number(o.minute) };
    } catch (e) {
      var d = new Date();
      var m = d.getMonth() + 1, dd = d.getDate();
      return { ymd: d.getFullYear() + "-" + (m < 10 ? "0" : "") + m + "-" + (dd < 10 ? "0" : "") + dd, mins: d.getHours() * 60 + d.getMinutes() };
    }
  }
  w.__chicaCtNow = ctNow;
  function isEnded(s, now) {
    var end = String(s.date_end || s.end_date || s.date_to || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(end)) return false;
    now = now || ctNow();
    if (end < now.ymd) return true;
    // Calendar dates, not closing-hour guesses, define the shared daily count.
    return false;
  }
  w.__chicaIsEnded = isEnded;

  function addPins(map, L, sales) {
    var now = ctNow();
    w.__chicaHiddenEnded = 0;
    var seen = {};
    var published = [];
    markers = [];
    var n = 0;
    for (var i = 0; i < sales.length; i++) {
      var item = normalize(sales[i]);
      if (!item || seen[item.id]) continue;
      if (isEnded(item, now)) { w.__chicaHiddenEnded += 1; continue; }
      seen[item.id] = 1;
      published.push(item);
      (function (sale) {
        var mk = L.marker([sale.lat, sale.lon], {
          icon: iconFor(sale.type, sale.pack, sale.gold, L),
          title: sale.gold ? "Gold pulse \u00b7 " + sale.title : (sale.pack ? "Pack point \u00b7 " + sale.title : sale.title),
          alt: sale.title + " \u2014 tap for details",
          keyboard: true,
          riseOnHover: true,
          zIndexOffset: sale.gold ? 800 : (sale.pack ? 600 : 0)
        });
        mk.__chicaSale = sale;
        mk.on("click", function () {
          if (typeof w.__chicaOpenIntel === "function") w.__chicaOpenIntel(sale);
        });
        mk.addTo(map);
        if (mk._icon) mk._icon.setAttribute("data-chica-id", sale.id);
        markers.push(mk);
      })(item);
      n += 1;
    }
    w.__chicaSales = published;
    w.__chicaMarkers = markers;
    w.__chicaSalesReady = true;
    try { w.dispatchEvent(new Event("chica-sales")); } catch (e) {}
    return n;
  }

  function milesBetween(a, b, c, d) {
    var R = 3958.8;
    var p1 = a * Math.PI / 180, p2 = c * Math.PI / 180;
    var dp = (c - a) * Math.PI / 180, dl = (d - b) * Math.PI / 180;
    var h = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  function searchWords(value, queryMode) {
    var text = String(value || "").toLowerCase();
    try { text = text.normalize("NFD"); } catch (e) {}
    var words = text.replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean);
    if (queryMode) {
      // Ignore conversational wording so phrases like "garage sales near me" still match.
      var filler = { near: 1, nearby: 1, around: 1, me: 1, my: 1, area: 1, in: 1, the: 1, find: 1, show: 1, looking: 1, for: 1, please: 1, at: 1, on: 1, with: 1 };
      words = words.filter(function (word) { return !filler[word]; }).map(function (word) {
        return word.length > 4 && /s$/.test(word) ? word.slice(0, -1) : word;
      });
    }
    return words;
  }

  function searchText(s) {
    return searchWords([
      s.title, s.address, s.source_address, s.zip, s.zip_code, s.zipcode, s.postal_code,
      s.neighborhood, s.city, s.locality, s.type, s.source, s.seller, s.company, s.poster,
      s.details, s.description, s.items, "garage sale yard sale",
      (s.categories || []).join(" "), (s.aliases || []).join(" ")
    ].join(" ")).join(" ");
  }

  w.__chicaMiles = function (lat, lon) {
    var here = w.__chicaHere;
    if (!here || !isFinite(lat) || !isFinite(lon)) return null;
    return milesBetween(here.lat, here.lon, lat, lon);
  };

  w.__chicaVisibleSales = function (filter) {
    var sales = w.__chicaSales || [];
    var f = filter || w.__chicaFilter || {};
    var query = searchWords(f.q, true);
    var out = [];
    for (var i = 0; i < sales.length; i++) {
      var s = sales[i];
      if (f.type && s.type !== f.type) continue;
      if (f.day && s.date_start && ((f.dayTo || f.day) < s.date_start || f.day > (s.date_end || s.date_start))) continue;
      if (f.verified && String(s.status).toLowerCase() !== "verified") continue;
      if (f.miles && w.__chicaHere) {
        var mi = milesBetween(w.__chicaHere.lat, w.__chicaHere.lon, s.lat, s.lon);
        if (mi > f.miles) continue;
      }
      if (query.length) {
        var blob = searchText(s);
        if (!query.every(function (word) { return blob.indexOf(word) !== -1; })) continue;
      }
      out.push(s);
    }
    if (w.__chicaHere) {
      out.sort(function (a, b) {
        return milesBetween(w.__chicaHere.lat, w.__chicaHere.lon, a.lat, a.lon) - milesBetween(w.__chicaHere.lat, w.__chicaHere.lon, b.lat, b.lon);
      });
    }
    return out;
  };

  w.__chicaApplyFilter = function (filter) {
    w.__chicaFilter = filter || {};
    var visible = {};
    var rows = w.__chicaVisibleSales(w.__chicaFilter);
    for (var i = 0; i < rows.length; i++) visible[rows[i].id] = 1;
    for (var j = 0; j < markers.length; j++) {
      var mk = markers[j];
      var show = !!(mk.__chicaSale && visible[mk.__chicaSale.id]);
      if (mk._icon) mk._icon.style.opacity = show ? "1" : "0.15";
      if (typeof mk.setOpacity === "function") mk.setOpacity(show ? 1 : 0.15);
    }
    return rows;
  };

  function injectCss() {
    if (document.getElementById("chica-live-intel-css")) return;
    var s = document.createElement("style");
    s.id = "chica-live-intel-css";
    s.textContent =
      ".leaflet-container{width:100%!important;height:100%!important}" +
      /* full-width bottom-right box: attribution text arriving later no longer moves the zoom/attribution (CLS) */
      "#chica-live-map .leaflet-bottom.leaflet-right{left:0}" +
      ".leaflet-marker-icon.chica-pin,.leaflet-div-icon.chica-pin{width:40px!important;height:40px!important;margin-left:-20px!important;margin-top:-20px!important;padding:0!important;border:0!important;background:transparent!important;display:flex;align-items:center;justify-content:center;overflow:visible!important;box-sizing:border-box}" +
      ".chica-pin .chica-sym{display:block;width:28px;height:28px;flex:0 0 28px;position:relative;z-index:2}" +
      ".chica-pack-halo,.chica-pack-ring{position:absolute;left:20px;top:20px;width:24px;height:24px;margin:0;border-radius:50%;pointer-events:none;transform:translate3d(-50%,-50%,0);backface-visibility:hidden}" +
      ".chica-pack-halo{background:#ff3ad1;opacity:.35}" +
      ".chica-pack-ring{background:#ff3ad1;opacity:.9;will-change:transform,opacity;animation:chica-pack-pulse 1.4s ease-out infinite}" +
      ".chica-gold-halo,.chica-gold-ring{position:absolute;left:20px;top:20px;width:24px;height:24px;margin:0;border-radius:50%;pointer-events:none;transform:translate3d(-50%,-50%,0);backface-visibility:hidden}" +
      ".chica-gold-halo{background:#f4c430;opacity:.42}" +
      ".chica-gold-ring{background:#f4c430;opacity:.95;will-change:transform,opacity;animation:chica-gold-pulse 1.35s ease-out infinite}" +
      "@keyframes chica-pack-pulse{0%{transform:translate3d(-50%,-50%,0) scale(.7);opacity:.85}100%{transform:translate3d(-50%,-50%,0) scale(2.2);opacity:0}}" +
      "@keyframes chica-gold-pulse{0%{transform:translate3d(-50%,-50%,0) scale(.7);opacity:.9}100%{transform:translate3d(-50%,-50%,0) scale(2.35);opacity:0}}" +
      "@media (prefers-reduced-motion:reduce){.chica-pack-ring,.chica-gold-ring{animation:none;opacity:.45;transform:translate3d(-50%,-50%,0) scale(1.55)}}" +
      ".chica-hide-permit .leaflet-marker-icon.chica-type-permit{display:none!important}";
    (document.head || document.documentElement).appendChild(s);
  }

  function armTiles(root) {
    var imgs = (root || document).querySelectorAll(".leaflet-tile-pane img, img.leaflet-tile");
    for (var i = 0; i < imgs.length; i++) {
      try { imgs[i].referrerPolicy = "origin"; imgs[i].setAttribute("referrerpolicy", "origin"); } catch (e) {}
    }
  }

  function layersOf(map) {
    return [map._chicaStreet, map._chicaSat, map._chicaEsriStreet, map._chicaEsriSat];
  }

  function only(map, keep) {
    layersOf(map).forEach(function (ly) {
      if (!ly) return;
      if (ly === keep) {
        if (!map.hasLayer(ly)) ly.addTo(map);
      } else if (map.hasLayer(ly)) {
        try { map.removeLayer(ly); } catch (e) {}
      }
    });
  }

  function showBase() {
    var map = w.__chicaLeaflet;
    if (!map || !decided) return;
    var satOn = document.documentElement.classList.contains("chica-sat-on");
    var useMt = !mtDead && key().length > 8;
    var keep = useMt ? (satOn ? map._chicaSat : map._chicaStreet) : (satOn ? map._chicaEsriSat : map._chicaEsriStreet);
    only(map, keep);
    w.__chicaMtDead = mtDead;
    try { map.invalidateSize({ animate: false, pan: false }); } catch (e) {}
    armTiles(map.getContainer && map.getContainer());
  }

  function remember() { try { localStorage.setItem(MT_CACHE, (mtDead ? "0" : "1") + "|" + Date.now()); } catch (e) {} }
  function markDead() {
    if (mtDead) return;
    mtDead = true;
    decided = true;
    remember();
    w.__chicaMtDead = true;
    showBase();
  }

  function probeMapTiler() {
    if (probed) return;
    probed = true;
    if (key().length < 8) {
      mtDead = true;
      decided = true;
      w.__chicaMtDead = true;
      showBase();
      return;
    }
    var url = streetUrl().replace("{z}", "12").replace("{x}", "963").replace("{y}", "1695");
    fetch(url, { mode: "cors", referrerPolicy: "origin", cache: "no-store" })
      .then(function (r) {
        // 403 still returns a PNG that says "API KEY REQUIRED" — only trust 2xx
        mtDead = !(r.ok && r.status === 200);
        w.__chicaMtDead = mtDead;
        decided = true; remember();
        showBase();
      })
      .catch(function () {
        mtDead = true;
        w.__chicaMtDead = true;
        decided = true; remember();
        showBase();
      });
  }

  function boot() {
    var L = w.L;
    if (!L || !L.map) return false;
    if (w.__chicaLeaflet && w.__chicaLeaflet._chicaLive) {
      try { w.__chicaLeaflet.invalidateSize({ animate: false }); } catch (e) {}
      return true;
    }
    injectCss();
    var el = document.getElementById("chica-live-map");
    if (!el) {
      el = document.createElement("div");
      el.id = "chica-live-map";
      el.className = "chica-map";
      (document.body || document.documentElement).appendChild(el);
    }
    el.setAttribute("role", "application");
    el.setAttribute("aria-label", "San Antonio garage sale map");
    el.style.cssText = "position:fixed;inset:0;width:100%;height:100%;z-index:1;background:#121212";
    var map = L.map(el, {
      zoomControl: false,
      maxZoom: 19,
      attributionControl: true,
      keyboard: true
    }).setView(START, 10);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    var tileOpts = { referrerPolicy: "origin", updateWhenIdle: false, keepBuffer: 6, maxZoom: 19 };
    var street = L.tileLayer(streetUrl(), Object.assign({ attribution: "\u00a9 MapTiler \u00a9 OpenStreetMap contributors" }, tileOpts));
    var sat = L.tileLayer(satUrl(), Object.assign({ attribution: "\u00a9 MapTiler \u00a9 OpenStreetMap contributors" }, tileOpts));
    var esriStreet = L.tileLayer(ESRI_STREET, Object.assign({ attribution: "Tiles \u00a9 Esri" }, tileOpts));
    var esriSat = L.tileLayer(ESRI_SAT, Object.assign({ attribution: "Tiles \u00a9 Esri" }, tileOpts));
    map._chicaStreet = street; map._chicaSat = sat; map._chicaEsriStreet = esriStreet; map._chicaEsriSat = esriSat;
    // Last-resort keyless fallback: if Esri also fails, use OpenStreetMap standard tiles
    // (attribution required; light use per https://operations.osmfoundation.org/policies/tiles/).
    var esriFails = 0;
    esriStreet.on("tileerror", function () {
      esriFails += 1;
      if (esriFails < 4 || map._chicaOsm) return;
      map._chicaOsm = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "\u00a9 OpenStreetMap contributors", maxZoom: 19 });
      map._chicaEsriStreet = map._chicaOsm;
      try { map.removeLayer(esriStreet); } catch (e) {}
      showBase();
    });
    street.on("tileerror", markDead);
    sat.on("tileerror", markDead);
    map.on("tileload", function () { armTiles(el); hideBoot(); });
    map._chicaLive = true;
    w.__chicaLeaflet = map;
    showBase();
    probeMapTiler();
    // Never leave the map blank if the probe hangs.
    setTimeout(function () { if (!decided) { decided = true; showBase(); } }, 1500);
    el.__chicaMap = map;
    function size() {
      try {
        el.style.width = window.innerWidth + "px";
        el.style.height = window.innerHeight + "px";
        map.invalidateSize({ animate: false, pan: false });
        armTiles(el);
      } catch (e) {}
    }
    size();
    w.addEventListener("resize", size);
    w.addEventListener("orientationchange", size);
    w.addEventListener("chica-sat", showBase);
    map.whenReady(size);
    map.on("load", size);
    map.on("click", function (ev) {
      var tgt = ev.originalEvent && ev.originalEvent.target;
      if (tgt && tgt.closest && tgt.closest(".leaflet-marker-icon, .chica-pin, .leaflet-popup, #chica-intel-card, #chica-hunt-bar, #chica-sale-sheet")) return;
      if (typeof w.__chicaHideIntel === "function") w.__chicaHideIntel();
    });
    // The 9 AM Facebook ingest bumps this marker; it remains a raw input, not a browser feed.
    var OVERLAY_VERSION = "san-antonio-user.json?v=56";
    var feedUrl = BASE + "/data/sales-clean.json?v=" + OVERLAY_VERSION.split("?v=")[1] + "&t=" + Date.now();
    function showFeedStatus(message, retry) {
      var status = document.getElementById("chica-map-feed-status");
      if (!status) {
        status = document.createElement("div");
        status.id = "chica-map-feed-status";
        status.setAttribute("role", "status");
        status.setAttribute("aria-live", "polite");
        status.style.cssText = "position:fixed;z-index:2147482999;left:50%;bottom:max(18px,env(safe-area-inset-bottom));transform:translateX(-50%);max-width:calc(100vw - 32px);box-sizing:border-box;padding:12px 14px;border:1px solid #55445a;border-radius:12px;background:#211b24;color:#fff;font:600 13px/1.4 Inter,system-ui,sans-serif;text-align:center;box-shadow:0 4px 20px #0008";
        document.body.appendChild(status);
      }
      status.textContent = message;
      if (retry) {
        var button = document.createElement("button");
        button.type = "button";
        button.textContent = "Retry";
        button.style.cssText = "margin-left:12px;padding:7px 12px;border:0;border-radius:8px;background:#c513af;color:#fff;font:800 12px Inter,system-ui,sans-serif;cursor:pointer";
        button.addEventListener("click", function () { w.location.reload(); });
        status.appendChild(button);
      }
    }
    function isRecognizedFeed(data) {
      return !!data && (data.status === "empty" || Array.isArray(data) ||
        Array.isArray(data.public) || Array.isArray(data.permits) ||
        Array.isArray(data.sales) || Array.isArray(data.listings) ||
        Array.isArray(data.features));
    }
    fetch(feedUrl, { cache: "no-store" }).then(function (response) {
      if (!response.ok) throw new Error("Feed request failed: " + response.status);
      return response.json();
    }).then(function (data) {
      if (!isRecognizedFeed(data)) throw new Error("Unexpected feed format");
      var sales = salesFrom(data);
      var nPins = addPins(map, L, sales);
      if (!nPins) showFeedStatus("No garage or estate sales are currently available on the map.", false);
      size();
      hideBoot();
      if (typeof w.__chicaApplyFilter === "function" && w.__chicaFilter) w.__chicaApplyFilter(w.__chicaFilter);
    }).catch(function () {
      showFeedStatus("Live sales couldn't load. Check your connection and try again.", true);
      hideBoot();
    });
    setTimeout(hideBoot, 6000);
    var k = 0;
    var sid = setInterval(function () { size(); k += 1; if (k > 24) clearInterval(sid); }, 150);
    return true;
  }

  // Start the MapTiler key check right away, in parallel with Leaflet + pin scripts.
  try { probeMapTiler(); } catch (e) {}
  var n = 0;
  var id = setInterval(function () {
    n += 1;
    if (boot() || n > 80) clearInterval(id);
  }, 80);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(window);
