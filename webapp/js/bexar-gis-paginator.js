/* Chica Map — Bexar County GIS school pagination
 * Keeps the Zone Aware layer on the official Bexar County GIS Public_Schools
 * source while automatically retrieving every page beyond the 1,000-record cap.
 */
(function () {
  "use strict";

  if (window.__CHICA_BEXAR_GIS_PAGINATOR__) return;
  window.__CHICA_BEXAR_GIS_PAGINATOR__ = true;

  var nativeFetch = window.fetch.bind(window);
  var GIS_PATH = "/arcgis/rest/services/Schools/MapServer/0/query";
  var PAGE_SIZE = 1000;
  var MAX_PAGES = 20;

  function isSchoolQuery(input) {
    var url = typeof input === "string" ? input : (input && input.url) || "";
    return url.indexOf(GIS_PATH) !== -1 && /[?&]f=geojson(?:&|$)/i.test(url);
  }

  function makeUrl(base, offset) {
    var u = new URL(base, window.location.href);
    u.searchParams.set("resultRecordCount", String(PAGE_SIZE));
    u.searchParams.set("resultOffset", String(offset));
    u.searchParams.set("returnExceededLimitFeatures", "true");
    return u.toString();
  }

  async function fetchAll(input, init) {
    var base = typeof input === "string" ? input : input.url;
    var features = [];
    var offset = 0;
    var headers = { Accept: "application/geo+json,application/json" };

    for (var page = 0; page < MAX_PAGES; page++) {
      var response = await nativeFetch(makeUrl(base, offset), init);
      if (!response.ok) return response;

      var payload = await response.json();
      if (!payload || payload.type !== "FeatureCollection" || !Array.isArray(payload.features)) {
        return new Response(JSON.stringify(payload), {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers
        });
      }

      features = features.concat(payload.features);
      var exceeded = !!payload.exceededTransferLimit;
      if (!exceeded || payload.features.length < PAGE_SIZE) break;
      offset += payload.features.length;
    }

    var combined = {
      type: "FeatureCollection",
      features: features
    };

    headers["Content-Type"] = "application/geo+json;charset=UTF-8";
    headers["X-Chica-Bexar-Records"] = String(features.length);

    return new Response(JSON.stringify(combined), {
      status: 200,
      headers: headers
    });
  }

  window.fetch = function (input, init) {
    try {
      if (isSchoolQuery(input)) return fetchAll(input, init);
    } catch (e) {
      console.warn("[chica-bexar-gis] pagination error", e);
    }
    return nativeFetch(input, init);
  };
})();
