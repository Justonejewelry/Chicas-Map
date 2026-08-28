/* Load Leaflet if unpkg was blocked. */
(function () {
  if (window.L && window.L.map) return;
  var s = document.createElement("script");
  s.src = "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js";
  s.async = false;
  document.head.appendChild(s);
  var c = document.createElement("link");
  c.rel = "stylesheet";
  c.href = "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css";
  document.head.appendChild(c);
})();
