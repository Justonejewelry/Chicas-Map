/**
 * Chica Map — Layer Worker client (main thread)
 * Runs fetch/enrich in a Worker when available; falls back to main thread.
 */
(function (global) {
  "use strict";

  var worker = null;
  var seq = 0;
  var pending = Object.create(null);
  var WORKER_URL = "js/workers/layer-worker.js?v=lw1";

  function canUseWorker() {
    try {
      return typeof Worker !== "undefined";
    } catch (_) {
      return false;
    }
  }

  function ensureWorker() {
    if (worker || !canUseWorker()) return worker;
    try {
      worker = new Worker(WORKER_URL);
      worker.onmessage = function (ev) {
        var msg = ev.data || {};
        var p = pending[msg.id];
        if (!p) return;
        delete pending[msg.id];
        if (msg.ok) p.resolve(msg.payload);
        else p.reject(new Error(msg.error || "worker error"));
      };
      worker.onerror = function (err) {
        console.warn("[layer-worker] error", err);
        try {
          worker.terminate();
        } catch (_) {}
        worker = null;
        Object.keys(pending).forEach(function (k) {
          pending[k].reject(new Error("worker crashed"));
          delete pending[k];
        });
      };
    } catch (err) {
      console.warn("[layer-worker] init failed, main-thread fallback", err);
      worker = null;
    }
    return worker;
  }

  function callWorker(type, payload, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var w = ensureWorker();
      if (!w) {
        reject(new Error("no worker"));
        return;
      }
      var id = "lw_" + ++seq + "_" + Date.now();
      pending[id] = { resolve: resolve, reject: reject };
      var t = setTimeout(function () {
        if (pending[id]) {
          delete pending[id];
          reject(new Error("worker timeout"));
        }
      }, timeoutMs || 12000);
      var prevResolve = pending[id].resolve;
      var prevReject = pending[id].reject;
      pending[id].resolve = function (v) {
        clearTimeout(t);
        prevResolve(v);
      };
      pending[id].reject = function (e) {
        clearTimeout(t);
        prevReject(e);
      };
      w.postMessage(Object.assign({ id: id, type: type }, payload || {}));
    });
  }

  function computeWifiStatus(props, reports) {
    var report = reports && props && props.name ? reports[props.name] : null;
    var now = new Date();
    var nowHour = now.getHours() + now.getMinutes() / 60;
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

  function enrichWifiMain(fc, reports) {
    var features = ((fc && fc.features) || []).map(function (f) {
      var props = Object.assign({}, (f && f.properties) || {});
      props._status = computeWifiStatus(props, reports || {});
      return { type: "Feature", geometry: f.geometry, properties: props };
    });
    return { type: "FeatureCollection", features: features };
  }

  async function fetchGeoJsonMain(url) {
    var res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("fetch " + res.status);
    return res.json();
  }

  var api = {
    ready: function () {
      if (!canUseWorker()) return Promise.resolve(false);
      return callWorker("ping", {}, 3000)
        .then(function () {
          return true;
        })
        .catch(function () {
          return false;
        });
    },

    enrichWifi: function (opts) {
      opts = opts || {};
      return callWorker(
        "enrich-wifi",
        {
          url: opts.url,
          featureCollection: opts.featureCollection,
          reports: opts.reports || {},
          bbox: opts.bbox || null,
        },
        15000
      ).catch(function (err) {
        console.warn("[layer-worker] enrichWifi fallback", err && err.message);
        var p = opts.featureCollection
          ? Promise.resolve(opts.featureCollection)
          : fetchGeoJsonMain(opts.url);
        return p.then(function (fc) {
          return enrichWifiMain(fc, opts.reports || {});
        });
      });
    },

    preparePantry: function (opts) {
      opts = opts || {};
      return callWorker(
        "prepare-pantry",
        {
          url: opts.url,
          featureCollection: opts.featureCollection,
          bbox: opts.bbox || null,
        },
        15000
      ).catch(function (err) {
        console.warn("[layer-worker] preparePantry fallback", err && err.message);
        if (opts.featureCollection) return opts.featureCollection;
        return fetchGeoJsonMain(opts.url);
      });
    },

    fetchGeoJson: function (url) {
      return callWorker("fetch-geojson", { url: url }, 15000).catch(function () {
        return fetchGeoJsonMain(url);
      });
    },

    clearCache: function () {
      return callWorker("clear-cache", {}, 3000).catch(function () {
        return { cleared: false };
      });
    },
  };

  global.ChicaLayerWorker = api;
})(window);
