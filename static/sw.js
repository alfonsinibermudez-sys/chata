// Service worker: caches the app shell so the app opens instantly and works
// offline. API calls (/api/*) are never intercepted here — offline writes for
// those are handled by the app itself via IndexedDB (see js/idb.js).
const CACHE_VERSION = "shell-v6";

const SHELL_FILES = [
  "/",
  "/index.html",
  "/manifest.json",
  "/css/styles.css",
  "/js/idb.js",
  "/js/api.js",
  "/js/manifiesto-template.js",
  "/js/app.js",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_VERSION).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never intercept API calls or cross-origin requests (fonts, etc. pass straight through).
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  if (event.request.method !== "GET") return;

  // Network-first for the app shell: online users always get what was just
  // deployed (no "reload twice after a deploy" staleness); offline users
  // fall back to the last cached copy so the app still opens.
  event.respondWith(
    caches.open(CACHE_VERSION).then(async (cache) => {
      try {
        const res = await fetch(event.request);
        if (res && res.ok) cache.put(event.request, res.clone());
        return res;
      } catch (e) {
        return (await cache.match(event.request)) || caches.match("/index.html");
      }
    })
  );
});
