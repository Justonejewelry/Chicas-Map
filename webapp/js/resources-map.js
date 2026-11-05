/* Alamo City Resources map boot. Reads only the resources feed. No sales features. */
(function (w) {
  var BASE = "/Chicas-Map";
  var START = [29.42, -98.49];

  // Colors and labels matched to the icon pack
  var TYPES = {
    "school-zone": { label: "School Zone", color: "#1a1a1a", icon: "crosswalk" },
    thrift:        { label: "Thrift",      color: "#e76f51", icon: "hanger" },
    wifi:          { label: "Wi-Fi",       color: "#1b7f6a", icon: "wifi" },
    emergency:     { label: "Emergency",   color: "#d32f2f", icon: "cross" },
    parking:       { label: "Parking",     color: "#1a365d", icon: "parking" },
    pantry:        { label: "Pantry",      color: "#c9a227", icon: "cart" },
    other:         { label: "Other",       color: "#8d99ae", icon: "dot" }
  };

  function hideBoot() {
    var el = document.getElementById("boot");
    if (el) el.classList.add("done");
  }

  function svgFor(type) {
    var meta = TYPES[type] || TYPES.other;
    var c = meta.color;
    var paths = {
      crosswalk: '<circle cx="16" cy="16" r="14" fill="' + c + '"/><path d="M6 22l4-2 4 2 4-2 4 2" stroke="#f5f0e6" stroke-width="1.6" fill="none"/><path d="M8 18h16M9 14h14M10 10h12" stroke="#f5f0e6" stroke-width="1.4"/><path d="M13 6.5a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6zm1.2 4.2l2.2 4.5h-2.4l-1 2.2-1.2-2.2H9.5l2.2-4.5z" fill="#f5f0e6"/>',
      hanger:    '<circle cx="16" cy="16" r="14" fill="' + c + '"/><path d="M16 6.5c1.6 0 2.8 1.1 2.8 2.4 0 .9-.5 1.6-1.2 2L20.5 19H11.5l2.9-8.1c-.7-.4-1.2-1.1-1.2-2 0-1.3 1.2-2.4 2.8-2.4z" fill="none" stroke="#f5f0e6" stroke-width="1.7" stroke-linejoin="round"/>',
      wifi:      '<circle cx="16" cy="16" r="14" fill="' + c + '"/><path d="M7.5 13.5c2.2-2.2 5.2-3.4 8.5-3.4s6.3 1.2 8.5 3.4M9.5 16.2c1.6-1.6 3.8-2.5 6.5-2.5s4.9.9 6.5 2.5" fill="none" stroke="#f5f0e6" stroke-width="1.8" stroke-linecap="round"/><circle cx="16" cy="20.2" r="1.5" fill="#f5f0e6"/>',
      cross:     '<circle cx="16" cy="16" r="14" fill="' + c + '"/><circle cx="16" cy="16" r="9" fill="none" stroke="#f5f0e6" stroke-width="1.6"/><circle cx="16" cy="16" r="7" fill="none" stroke="#f5f0e6" stroke-width="1.2"/><path d="M16 9.5v13M9.5 16h13" stroke="#f5f0e6" stroke-width="2.4" stroke-linecap="round"/>',
      parking:   '<circle cx="16" cy="16" r="14" fill="' + c + '"/><circle cx="16" cy="16" r="8.5" fill="none" stroke="#f5f0e6" stroke-width="1.7"/><path d="M12.8 10.5h4.2a3 3 0 0 1 0 6h-4.2v-6zm0 6v4.5" fill="none" stroke="#f5f0e6" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>',
      cart:      '<circle cx="16" cy="16" r="14" fill="' + c + '"/><path d="M8.5 11h2.2l1.6 7.2h7.8l1.4-4.2h-9.2" fill="none" stroke="#f5f0e6" stroke-width="1.5" stroke-linejoin="round"/><circle cx="12.8" cy="21.2" r="1.1" fill="#f5f0e6"/><circle cx="18.2" cy="21.2" r="1.1" fill="#f5f0e6"/><path d="M13.5 8.5h1.2v2.2M15.2 7.8v2.2M16.8 8.5h1.2v2.2" stroke="#f5f0e6" stroke-width="1.1" fill="none"/>',
      dot:       '<circle cx="16" cy="16" r="14" fill="' + c + '"/><circle cx="16" cy="16" r="4" fill="#f5f0e6"/>'
    };
    return '<svg viewBox="0 0 32 32" width="28" height="28">' + (paths[meta.icon] || paths.dot) + '</svg>';
  }

  function iconFor(type, L) {
    return L.divIcon({
      className: "resource-pin",
      html: svgFor(type),
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16]
    });
  }

  function buildLegend(map, groups, L) {
    var Legend = L.Control.extend({
      options: { position: "bottomleft" },
      onAdd: function () {
        var div = L.DomUtil.create("div", "resource-legend");
        div.innerHTML = '<div class="legend-title">Alamo City Resources</div>';
        Object.keys(TYPES).forEach(function (type) {
          if (type === "other" && !groups[type]) return;
          var meta = TYPES[type];
          var row = document.createElement("label");
          row.className = "legend-row";
          var cb = document.createElement("input");
          cb.type = "checkbox";
          cb.checked = true;
          cb.dataset.type = type;
          cb.addEventListener("change", function () {
            var g = groups[type];
            if (!g) return;
            if (this.checked) map.addLayer(g);
            else map.removeLayer(g);
          });
          var icon = document.createElement("span");
          icon.className = "legend-icon";
          icon.innerHTML = svgFor(type).replace('width="28" height="28"', 'width="20" height="20"');
          var text = document.createElement("span");
          text.textContent = meta.label;
          row.appendChild(cb);
          row.appendChild(icon);
          row.appendChild(text);
          div.appendChild(row);
        });
        L.DomEvent.disableClickPropagation(div);
        L.DomEvent.disableScrollPropagation(div);
        return div;
      }
    });
    map.addControl(new Legend());
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

    var groups = {};
    Object.keys(TYPES).forEach(function (t) {
      groups[t] = L.layerGroup();
    });

    fetch(BASE + "/data/resources/san-antonio.json", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        var resources = (data && data.resources) || [];
        var n = 0;
        resources.forEach(function (r) {
          var lat = Number(r.latitude);
          var lon = Number(r.longitude);
          if (!isFinite(lat) || !isFinite(lon)) return;
          var type = r.resource_type || "other";
          if (!groups[type]) groups[type] = L.layerGroup();
          var mk = L.marker([lat, lon], {
            icon: iconFor(type, L),
            title: r.name || type
          });
          var popup = "<b>" + (r.name || "Resource") + "</b><br>" +
            (TYPES[type] ? TYPES[type].label : type) + "<br>" +
            (r.address || "") + "<br>" +
            (r.hours ? "Hours: " + r.hours + "<br>" : "") +
            (r.description ? r.description + "<br>" : "") +
            (r.google_maps_url ? '<a href="' + r.google_maps_url + '" target="_blank" rel="noopener">Open in Maps</a>' : "");
          mk.bindPopup(popup);
          groups[type].addLayer(mk);
          n += 1;
        });
        Object.keys(groups).forEach(function (t) {
          if (groups[t].getLayers().length) map.addLayer(groups[t]);
        });
        buildLegend(map, groups, L);
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
