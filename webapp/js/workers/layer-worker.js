/**
 * Chica Map — Layer Worker
 * Off-main-thread: fetch GeoJSON, enrich features (WiFi status, filters).
 * MapLibre stays on the main thread; this only returns pure data.
 */
/* eslint-disable no-restricted-globals */

var CACHE = Object.create(null);

function reply(id, ok, payload, error) {
  self.postMessage({ id: id, ok: ok, payload: payload, error: error || null });
}

function computeWifiStatus(props, reports, nowHour) {
  var report = reports && props && props.name ? reports[props.name] : null;
  var hours = String((props && props.hours) || "").toLowerCase();
  var isOpen = null;
  if (hours.indexOf("7:30") >= 0 && hours.indexOf("10:30") >= 0) isOpen = nowHour >= 7.5 && nowHour < 22.5;
  else if (hours.indexOf("5am") >= 0 || hours.indexOf("5 a.m") >= 0) isOpen = nowHour >= 5 && nowHour < 23;
  else if (hours.indexOf("sunrise") >= 0 || hours.indexOf("sunset") >= 0) isOpen = nowHour >= 6.5 && nowHour < 20.5;
  else if (hours.indexOf("9am") >= 0 || hours.indexOf("9 a.m") >= 0) isOpen = nowHour >= 9 && nowHour < 17;
  else if (hours.indexOf("business hours") >= 0) isOpen = nowHour >= 8 && nowHour < 21;

  if (report && report.kind === "down") return "down";
  if (isOpen === false) return "closed";
  if (isOpen === true && report && report.kind === "ok") return "open_confirmed";
  if (isOpen === true) return "open";
  if (report && report.kind === "ok") return "open_confirmed";
  return "unknown";
}

function enrichWifi(fc, reports) {
  var now = new Date();
  var nowHour = now.getHours() + now.getMinutes() / 60;
  var features = (fc && fc.features) || [];
  var out = new Array(features.length);
  for (var i = 0; i < features.length; i++) {
    var f = features[i];
    var props = Object.assign({}, (f && f.properties) || {});
    props._status = computeWifiStatus(props, reports || {}, nowHour);
    out[i] = {
      type: "Feature",
      geometry: f.geometry,
      properties: props,
    };
  }
  return { type: "FeatureCollection", features: out };
}

function filterByBbox(fc, bbox) {
  if (!bbox || bbox.length !== 4) return fc;
  var west = bbox[0],
    south = bbox[1],
    east = bbox[2],
    north = bbox[3];
  var features = (fc && fc.features) || [];
  var out = [];
  for (var i = 0; i < features.length; i++) {
    var g = features[i].geometry;
    if (!g || g.type !== "Point" || !g.coordinates) continue;
    var lng = g.coordinates[0];
    var lat = g.coordinates[1];
    if (lng >= west && lng <= east && lat >= south && lat <= north) out.push(features[i]);
  }
  return { type: "FeatureCollection", features: out };
}

async function fetchJson(url) {
  if (CACHE[url] && Date.now() - CACHE[url].ts < 10 * 60 * 1000) {
    return CACHE[url].data;
  }
  var res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("fetch " + res.status + " " + url);
  var data = await res.json();
  CACHE[url] = { ts: Date.now(), data: data };
  return data;
}

self.onmessage = async function (ev) {
  var msg = ev.data || {};
  var id = msg.id;
  var type = msg.type;
  try {
    if (type === "ping") {
      reply(id, true, { pong: true, ts: Date.now() });
      return;
    }

    if (type === "fetch-geojson") {
      var data = await fetchJson(msg.url);
      reply(id, true, data);
      return;
    }

    if (type === "enrich-wifi") {
      var fc = msg.featureCollection;
      if (!fc && msg.url) fc = await fetchJson(msg.url);
      if (!fc) throw new Error("no featureCollection");
      var enriched = enrichWifi(fc, msg.reports || {});
      if (msg.bbox) enriched = filterByBbox(enriched, msg.bbox);
      reply(id, true, enriched);
      return;
    }

    if (type === "prepare-pantry") {
      var pfc = msg.featureCollection;
      if (!pfc && msg.url) pfc = await fetchJson(msg.url);
      if (!pfc) throw new Error("no featureCollection");
      if (msg.bbox) pfc = filterByBbox(pfc, msg.bbox);
      reply(id, true, pfc);
      return;
    }

    if (type === "clear-cache") {
      CACHE = Object.create(null);
      reply(id, true, { cleared: true });
      return;
    }

    reply(id, false, null, "unknown type: " + type);
  } catch (err) {
    reply(id, false, null, (err && err.message) || String(err));
  }
};
