/* Alamo Atlas — desk-only worker. Does not cache Open Data SA. */
self.addEventListener("install", function (e) {
  self.skipWaiting();
});
self.addEventListener("activate", function (e) {
  e.waitUntil(self.clients.claim());
});
self.addEventListener("fetch", function (e) {
  var url = new URL(e.request.url);
  if (url.hostname === "data.sanantonio.gov") return;
  if (e.request.mode === "navigate") {
    e.respondWith(fetch(e.request).catch(function () { return caches.match("/Chicas-Map/atlas/"); }));
  }
});
