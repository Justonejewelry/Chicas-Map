/**
 * Chica Map — Boost gold pins
 *
 * Works with the CDN-pinned core app.js without forking it:
 * 1) Tags sales from city JSON when boost && boost_until >= today
 * 2) Rewrites yb-pins GeoJSON so kind === "boost"
 * 3) Updates circle paint so boost = gold
 * 4) Adds “Boosted” badge on list rows + detail drawer when possible
 *
 * Public listing fields (ops stamps these on approve):
 *   { "boost": true, "boost_until": "2027-02-13" }
 */
(function (global) {
  var GOLD = "#eab308";
  var LAYER = "yb-pins-layer";
  var SOURCE = "yb-pins";
  var boostByKey = Object.create(null);
  var paintReady = false;
  var watching = false;

  function todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  function isBoostActive(s) {
    if (!s || typeof s !== "object") return false;
    var flag = s.boost === true || s.boost === 1 || s.boost === "true" || s.boosted === true;
    if (!flag) return false;
    var until = s.boost_until || s.boostUntil || s.boost_expires || null;
    if (!until) return true;
    return String(until).slice(0, 10) >= todayStr();
  }

  function saleKey(s) {
    if (!s) return "";
    if (s._key) return String(s._key);
    if (s.id) return String(s.id);
    var lat = s.lat != null ? Number(s.lat).toFixed(5) : "";
    var lon = s.lon != null ? Number(s.lon).toFixed(5) : "";
    return (s.address || s.title || "") + "|" + lat + "," + lon;
  }

  function rememberSale(s) {
    if (!isBoostActive(s)) return;
    var k = saleKey(s);
    if (!k) return;
    boostByKey[k] = {
      boost_until: (s.boost_until || s.boostUntil || "").toString().slice(0, 10) || null,
    };
    // Common core key shapes
    if (s._key) boostByKey[String(s._key)] = boostByKey[k];
    if (s.id) boostByKey[String(s.id)] = boostByKey[k];
  }

  function ingestFeed(data) {
    if (!data) return data;
    var lists = [];
    if (Array.isArray(data)) lists.push(data);
    ["public", "permits", "sales", "listings", "items"].forEach(function (k) {
      if (Array.isArray(data[k])) lists.push(data[k]);
    });
    if (data.feed && typeof data.feed === "object") {
      ["public", "permits", "sales"].forEach(function (k) {
        if (Array.isArray(data.feed[k])) lists.push(data.feed[k]);
      });
    }
    lists.forEach(function (arr) {
      for (var i = 0; i < arr.length; i++) {
        var s = arr[i];
        if (!s || typeof s !== "object") continue;
        if (isBoostActive(s)) {
          s.boost = true;
          if (s.boost_until || s.boostUntil) s.boost_until = String(s.boost_until || s.boostUntil).slice(0, 10);
          s._boost = true;
          rememberSale(s);
        } else if (s.boost === true || s.boosted === true) {
          // Explicitly expired — strip so UI does not show gold
          s._boost = false;
        }
      }
    });
    return data;
  }

  function keyIsBoosted(key) {
    if (key == null) return false;
    return !!boostByKey[String(key)];
  }

  function enhanceCollection(data) {
    if (!data || !Array.isArray(data.features)) return data;
    var changed = false;
    var features = data.features.map(function (f) {
      if (!f || !f.properties) return f;
      var key = f.properties.key;
      if (!keyIsBoosted(key)) return f;
      if (f.properties.kind === "boost") return f;
      changed = true;
      return {
        type: f.type,
        properties: Object.assign({}, f.properties, { kind: "boost", boost: true }),
        geometry: f.geometry,
      };
    });
    if (!changed) return data;
    return { type: "FeatureCollection", features: features };
  }

  function applyBoostPaint(map) {
    if (!map || !map.getLayer || !map.getLayer(LAYER)) return false;
    try {
      map.setPaintProperty(LAYER, "circle-color", [
        "match",
        ["get", "kind"],
        "boost",
        GOLD,
        "estate",
        "#a855f7",
        "permit",
        "#38bdf8",
        "fundraiser",
        "#f59e0b",
        "top",
        "#c45c26",
        "#22c55e",
      ]);
      map.setPaintProperty(LAYER, "circle-radius", [
        "interpolate",
        ["linear"],
        ["zoom"],
        9,
        ["case", ["any", ["==", ["get", "kind"], "top"], ["==", ["get", "kind"], "boost"]], 7.5, 6],
        12,
        ["case", ["any", ["==", ["get", "kind"], "top"], ["==", ["get", "kind"], "boost"]], 12, 9],
        15,
        ["case", ["any", ["==", ["get", "kind"], "top"], ["==", ["get", "kind"], "boost"]], 15, 12],
      ]);
      map.setPaintProperty(LAYER, "circle-stroke-color", [
        "match",
        ["get", "kind"],
        "boost",
        "#713f12",
        "#ffffff",
      ]);
      paintReady = true;
      return true;
    } catch (e) {
      console.warn("boost paint", e);
      return false;
    }
  }

  function findMap() {
    // Prefer maplibre instance attached to #map canvas container
    var el = document.getElementById("map");
    if (!el) return null;
    if (el._map) return el._map;
    // MapLibre stores the map on the container in some builds
    if (global.maplibregl && global.maplibregl.Map) {
      // Heuristic: walk known global hooks some enhancers set
      if (global.__ybMap) return global.__ybMap;
    }
    return global.__ybMap || null;
  }

  function recolorAndRewrite() {
    var map = findMap();
    if (!map || !map.getSource) return;
    if (!paintReady) applyBoostPaint(map);
    var src = map.getSource(SOURCE);
    if (!src || typeof src.setData !== "function") return;
    try {
      var raw = src._data || (src.serialize && src.serialize().data);
      if (!raw) return;
      var next = enhanceCollection(typeof raw === "string" ? JSON.parse(raw) : raw);
      if (next && next !== raw) src.setData(next);
    } catch (_) {}
  }

  function patchGeoJSONSetData() {
    if (!global.maplibregl) return;
    var Src = global.maplibregl.GeoJSONSource;
    if (!Src || !Src.prototype || Src.prototype.__chicaBoostPatched) return;
    var orig = Src.prototype.setData;
    Src.prototype.setData = function (data) {
      var enhanced = data;
      try {
        // Only rewrite the sales pin source (id not always available; detect by caller layer usage)
        enhanced = enhanceCollection(data);
      } catch (_) {
        enhanced = data;
      }
      var ret = orig.call(this, enhanced);
      try {
        var map = this.map || findMap();
        if (map) applyBoostPaint(map);
      } catch (_) {}
      return ret;
    };
    Src.prototype.__chicaBoostPatched = true;
  }

  function patchFetch() {
    if (global.__chicaBoostFetchPatched) return;
    global.__chicaBoostFetchPatched = true;
    var orig = global.fetch;
    if (typeof orig !== "function") return;
    global.fetch = async function (input, init) {
      var res = await orig.apply(this, arguments);
      try {
        var url = typeof input === "string" ? input : (input && input.url) || "";
        if (
          (/data\/cities\/[a-z0-9-]+\.json/.test(url) || /data\/feed\.json/.test(url)) &&
          !/-user\.json/.test(url)
        ) {
          var data = await res.clone().json();
          ingestFeed(data);
          return new Response(JSON.stringify(data), {
            status: res.status,
            statusText: res.statusText,
            headers: { "Content-Type": "application/json" },
          });
        }
      } catch (_) {}
      return res;
    };
  }

  function badgeListRows() {
    var ul = document.getElementById("saleList");
    if (!ul) return;
    ul.querySelectorAll("li[data-key]").forEach(function (li) {
      var key = li.getAttribute("data-key");
      if (!keyIsBoosted(key)) return;
      if (li.querySelector(".boost-badge")) return;
      var title = li.querySelector(".sale-title, strong, h3, .title") || li;
      var span = document.createElement("span");
      span.className = "boost-badge";
      span.textContent = "Boosted";
      span.title = "Boost pass active";
      if (title && title !== li) title.appendChild(document.createTextNode(" ")), title.appendChild(span);
      else li.insertBefore(span, li.firstChild);
      li.classList.add("is-boosted");
    });
  }

  function badgeDetail() {
    var body = document.getElementById("detailBody");
    if (!body || body.querySelector(".boost-badge")) return;
    var sale = global.__YB_LAST_SALE;
    if (!sale || !isBoostActive(sale)) return;
    var el = document.createElement("div");
    el.className = "boost-banner";
    el.innerHTML =
      '<span class="boost-badge">Boosted</span> Gold pin through <strong>' +
      String(sale.boost_until || sale.boostUntil || "this pass").slice(0, 10) +
      "</strong>";
    body.insertBefore(el, body.firstChild);
  }

  function ensureLegend() {
    var legend = document.querySelector(".map-legend");
    if (!legend || legend.querySelector(".pin.boost")) return;
    var span = document.createElement("span");
    span.innerHTML = '<i class="pin boost"></i> Boost';
    legend.insertBefore(span, legend.firstChild);
  }

  function startWatch() {
    if (watching) return;
    watching = true;
    ensureLegend();
    var tries = 0;
    var t = setInterval(function () {
      tries++;
      patchGeoJSONSetData();
      recolorAndRewrite();
      badgeListRows();
      badgeDetail();
      if (paintReady && tries > 40) clearInterval(t);
      if (tries > 120) clearInterval(t);
    }, 500);

    var list = document.getElementById("saleList");
    if (list && global.MutationObserver) {
      new MutationObserver(function () {
        badgeListRows();
      }).observe(list, { childList: true, subtree: true });
    }
    var detail = document.getElementById("detailBody");
    if (detail && global.MutationObserver) {
      new MutationObserver(function () {
        badgeDetail();
      }).observe(detail, { childList: true, subtree: true });
    }
  }

  // Public helpers for approve tooling / console
  global.ChicaBoostPins = {
    isBoostActive: isBoostActive,
    ingestFeed: ingestFeed,
    rememberSale: rememberSale,
    keyIsBoosted: keyIsBoosted,
    recolorAndRewrite: recolorAndRewrite,
    GOLD: GOLD,
  };

  patchFetch();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      patchGeoJSONSetData();
      startWatch();
    });
  } else {
    patchGeoJSONSetData();
    startWatch();
  }
})(window);
