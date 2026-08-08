/* Chica Map service worker — offline packet + asset cache */
const CACHE = "chica-v2";
const PRECACHE = [
  "./map.html",
  "./index.html",
  "./css/app.css",
  "./css/map-voss.css",
  "./css/map-fabs.css",
  "./css/chica-sign.css",
  "./js/app.js",
  "./js/features.js",
  "./data/cities/san-antonio.json",
  "./data/sponsors.json",
  "./favicon-48.png",
  "./manifest.webmanifest",
  "./assets/chica/chica-logo.svg?v=2",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE).catch(() => {})).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  // Network-first for city JSON (fresh weekend data), cache fallback
  if (url.pathname.includes("/data/")) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }
  // Cache-first for app shell
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      if (res.ok && url.origin === self.location.origin) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
      }
      return res;
    }).catch(() => caches.match("./map.html")))
  );
});