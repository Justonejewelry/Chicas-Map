/* Alamo City Resources map boot. Reads only the resources feed. No sales features. */
(function (w) {
  var BASE = "/Chicas-Map";
  var START = [29.42, -98.49];
  var COLORS = {
    pantry: "#e76f51",
    wifi: "#2a9d8f",
    parking: "#e9c46a",
    "school-zone": "#264653",
    emergency: "#e63946",
    thrift: "#9b5de5",
    other: "#8d99ae"
  };

  function hideBoot() {
    var el = document.getElementById("boot");
    if (el) el.classList.add("done");
  }

  function iconFor(type, L) {
    var color = COLORS[type] || COLORS.other;
    var html = '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="8" fill="' + color + '" stroke="#fff" stroke-width="2"/></svg>';
    return L.divIcon({
      className: "resource-pin",
      html: html,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });
  }

  function boot() {
    var L = w.L;
    if (!L) return;
    var el = document.getElementById("resources-map");
    if (!el) return;
    var map = L.map(el, { zoomControl: true, attributionControl: true }).setView(START, 11);
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}", {
      attribution: "Tiles © Esri",
      maxZoom: 19
    }).addTo(map);

    fetch(BASE + "/data/resources/san-antonio.json", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        var resources = (data && data.resources) || [];
        var n = 0;
        resources.forEach(function (r) {
          var lat = Number(r.latitude);
          var lon = Number(r.longitude);
          if (!isFinite(lat) || !isFinite(lon)) return;
          var mk = L.marker([lat, lon], {
            icon: iconFor(r.resource_type, L),
            title: r.name || r.resource_type
          });
          var popup = "<b>" + (r.name || "Resource") + "</b><br>" +
            (r.resource_type || "") + "<br>" +
            (r.address || "") + "<br>" +
            (r.hours ? "Hours: " + r.hours + "<br>" : "") +
            (r.description ? r.description + "<br>" : "") +
            (r.google_maps_url ? '<a href="' + r.google_maps_url + '" target="_blank" rel="noopener">Open in Maps</a>' : "");
          mk.bindPopup(popup);
          mk.addTo(map);
          n += 1;
        });
        var copy = document.querySelector("#boot .copy");
        if (copy) copy.textContent = n ? n + " resources loaded" : "No resources in feed";
        hideBoot();
      })
      .catch(function () {
        var copy = document.querySelector("#boot .copy");
        if (copy) copy.textContent = "Feed did not load";
        hideBoot();
      });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(window);
