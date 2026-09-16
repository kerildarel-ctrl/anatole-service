const CACHE_NAME = "anatole-service-v1.1.2";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/style.css?v=1.1.2",
  "/app.js?v=1.1.2",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/screenshot-desktop.png",
  "/screenshot-mobile.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || event.request.url.includes("/api/")) {
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
