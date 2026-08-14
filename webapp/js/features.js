/**
 * Chica Map — Aurora feature pack (1–10)
 * 1 Sale Radar  2 Sniff Score  3 Wishlist  4 DNA Heat
 * 5 Route Card  6 Sponsor Pins  7 First 30  8 Cheeks Cameo
 * 9 Offline     10 City franchise (YAML loaded separately)
 */
(function (global) {
  const FAV_KEY = "yb_wishlist";
  const RADAR_KEY = "yb_radar_on";

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

  /** 2 — Cheeks' Sniff Score (1–5) */
  function sniffScore(s, hotZones) {
    let pts = 0;
    const conf = Number(s.confidence) || 0.5;
    pts += conf * 2.2;
    const photos = Number(s.photos) || 0;
    if (photos >= 100) pts += 1.4;
    else if (photos >= 30) pts += 1.0;
    else if (photos >= 8) pts += 0.5;
    const t = (s.type || "garage").toLowerCase();
    if (t === "estate") pts += 0.8;
    else if (t === "permit") pts += 0.3;
    else if (t === "fundraiser") pts += 0.2;
    // Early open bonus
    const hrs = String(s.hours || "").toLowerCase();
    if (/\b6\s*am\b|\b7\s*am\b|\b8\s*am\b/.test(hrs)) pts += 0.4;
    // Near a hot zone
    if (hotZones && s.lat != null) {
      for (const z of hotZones) {
        if (z.lat == null) continue;
        const dlat = Math.abs(z.lat - s.lat);
        const dlon = Math.abs(z.lon - s.lon);
        if (dlat < 0.04 && dlon < 0.05) {
          pts += 0.5;
          break;
        }
      }
    }
    const score = Math.max(1, Math.min(5, Math.round(pts)));
    return score;
  }

  function sniffLabel(n) {
    return "🦴".repeat(n) + "·".repeat(5 - n);
  }

  /** 7 — First 30 minutes: early open + high sniff */
  function isEarlyOpen(s) {
    const hrs = String(s.hours || "").toLowerCase();
    const dates = String(s.dates || "").toLowerCase();
    if (/\b6\s*am\b|\b7\s*am\b|\b8\s*am\b/.test(hrs)) return true;
    if (/early|dawn|sunrise/.test(hrs + dates)) return true;
    // Estate often queues early
    if ((s.type || "") === "estate" && (Number(s.photos) || 0) >= 50) return true;
    return false;
  }

  /** 3 — Wishlist ("I'm hunting for…") */
  function getWishlist() {
    return loadJson(FAV_KEY, []);
  }
  function addWishlistItem(text) {
    const t = String(text || "").trim().slice(0, 80);
    if (!t) return getWishlist();
    const list = getWishlist().filter((x) => x.toLowerCase() !== t.toLowerCase());
    list.unshift(t);
    saveJson(FAV_KEY, list.slice(0, 20));
    return list;
  }
  function removeWishlistItem(text) {
    const list = getWishlist().filter((x) => x !== text);
    saveJson(FAV_KEY, list);
    return list;
  }
  function matchesWishlist(s) {
    const list = getWishlist();
    if (!list.length) return false;
    const blob = `${s.title || ""} ${s.details || ""} ${s.address || ""}`.toLowerCase();
    return list.some((w) => blob.includes(w.toLowerCase()));
  }

  /** 1 — Sale Radar (permission + local Thursday reminder) */
  async function enableRadar() {
    if (!("Notification" in window)) return { ok: false, msg: "Notifications not supported" };
    let perm = Notification.permission;
    if (perm === "default") perm = await Notification.requestPermission();
    if (perm !== "granted") return { ok: false, msg: "Permission denied" };
    localStorage.setItem(RADAR_KEY, "1");
    // Register SW if possible
    if ("serviceWorker" in navigator) {
      try {
        await navigator.serviceWorker.register("sw.js");
      } catch (_) {}
    }
    scheduleThursdayCheck();
    return { ok: true, msg: "Radar on — we'll nudge you before the weekend" };
  }

  function scheduleThursdayCheck() {
    // On every load: if Thursday and radar on, show a local notification once per day
    if (localStorage.getItem(RADAR_KEY) !== "1") return;
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const now = new Date();
    const day = now.getDay(); // 4 = Thursday
    const key = "yb_radar_fired_" + now.toISOString().slice(0, 10);
    if (localStorage.getItem(key)) return;
    if (day === 4 || day === 5) {
      try {
        new Notification("Cheeks Radar 🐕", {
          body: "Weekend sales are live on Chica Map — open Near Me and plan your route.",
          icon: "favicon-48.png",
          tag: "chica-radar",
        });
        localStorage.setItem(key, "1");
      } catch (_) {}
    }
  }

  /** 5 — Route as shareable story card (text + optional canvas) */
  function buildRouteStory(stops, cityName) {
    const lines = stops.map((s, i) => {
      const sniff = s._sniff != null ? ` · sniff ${s._sniff}/5` : "";
      return `${i + 1}. ${s.title || s.address || "Stop"}${sniff}\n   ${s.address || ""}`;
    });
    const text = `🦴 Chica Route — ${cityName || "Texas"}\n${new Date().toLocaleDateString()}\n\n${lines.join("\n\n")}\n\nMapped by Cheeks\nhttps://justonejewelry.github.io/Chicas-Map/map.html`;
    return text;
  }

  async function shareRouteStory(text) {
    if (navigator.share) {
      try {
        await navigator.share({ title: "My Chica Route", text });
        return true;
      } catch (_) {}
    }
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      return false;
    }
  }

  /** 4 — Neighborhood DNA heat points from sales + hot zones */
  function heatFeatures(sales, hotZones) {
    const feats = [];
    (sales || []).forEach((s) => {
      if (s.lat == null || s.lon == null) return;
      const w = Math.max(0.3, (Number(s.confidence) || 0.5) * (1 + Math.min(2, (Number(s.photos) || 0) / 80)));
      feats.push({
        type: "Feature",
        properties: { weight: w },
        geometry: { type: "Point", coordinates: [s.lon, s.lat] },
      });
    });
    (hotZones || []).forEach((z) => {
      if (z.lat == null || z.lon == null) return;
      feats.push({
        type: "Feature",
        properties: { weight: 2 + Math.min(3, Number(z.size) || 1) / 10 },
        geometry: { type: "Point", coordinates: [z.lon, z.lat] },
      });
    });
    return { type: "FeatureCollection", features: feats };
  }

  function ensureHeatLayer(map, geojson) {
    if (!map || !map.getStyle) return;
    const srcId = "yb-dna-heat";
    const layerId = "yb-dna-heat-layer";
    if (map.getSource(srcId)) {
      map.getSource(srcId).setData(geojson);
    } else {
      map.addSource(srcId, { type: "geojson", data: geojson });
      map.addLayer({
        id: layerId,
        type: "heatmap",
        source: srcId,
        maxzoom: 15,
        paint: {
          "heatmap-weight": ["get", "weight"],
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 8, 0.6, 14, 1.4],
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0, "rgba(26,107,60,0)",
            0.2, "rgba(26,107,60,0.25)",
            0.5, "rgba(196,92,38,0.45)",
            0.8, "rgba(196,92,38,0.75)",
            1, "rgba(180,40,20,0.9)",
          ],
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 8, 18, 14, 36],
          "heatmap-opacity": 0.55,
        },
      });
    }
  }

  function removeHeatLayer(map) {
    if (!map) return;
    if (map.getLayer("yb-dna-heat-layer")) map.removeLayer("yb-dna-heat-layer");
    if (map.getSource("yb-dna-heat")) map.removeSource("yb-dna-heat");
  }

  /** 8 — Cheeks cameo: top sniff sale this weekend */
  function pickCameo(sales) {
    if (!sales || !sales.length) return null;
    const ranked = sales
      .filter((s) => s.lat != null)
      .map((s) => ({ s, score: s._sniff || sniffScore(s) }))
      .sort((a, b) => b.score - a.score);
    return ranked[0] ? ranked[0].s : null;
  }

  /** 6 — Sponsor pins from data/sponsors.json */
  async function loadSponsors(city) {
    try {
      const r = await fetch("data/sponsors.json");
      if (!r.ok) return [];
      const data = await r.json();
      const all = data.sponsors || [];
      return all.filter((s) => !s.cities || s.cities.includes(city) || s.cities.includes("texas"));
    } catch (_) {
      return [];
    }
  }

  global.ChicaFeatures = {
    sniffScore,
    sniffLabel,
    isEarlyOpen,
    getWishlist,
    addWishlistItem,
    removeWishlistItem,
    matchesWishlist,
    enableRadar,
    scheduleThursdayCheck,
    buildRouteStory,
    shareRouteStory,
    heatFeatures,
    ensureHeatLayer,
    removeHeatLayer,
    pickCameo,
    loadSponsors,
  };

  // Fire radar check on load
  scheduleThursdayCheck();
})(window);
