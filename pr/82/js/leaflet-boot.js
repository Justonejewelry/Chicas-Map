/* Load self-hosted Leaflet 1.9.4 if the page tag did not run. */
(function () {
  if (window.L && window.L.map) return;
  var s = document.createElement("script");
  s.src = "/Chicas-Map/preview/82/vendor/leaflet-1.9.4/leaflet.js";
  s.async = false;
  document.head.appendChild(s);
  var c = document.createElement("link");
  c.rel = "stylesheet";
  c.href = "/Chicas-Map/preview/82/vendor/leaflet-1.9.4/leaflet.css";
  document.head.appendChild(c);
})();
