/* Žandar service worker (DS §9 D1).
 *
 * Keširamo SAMO statiku (nikad API/state). Pravila:
 *  - GET, same-origin, /_next/static/ ili ikone/manifest → cache-first.
 *  - Sve ostalo (navigacije, API na drugom origin-u, socket, POST) → NE diramo
 *    (pusti mreži). Tako nikad ne serviramo ustajao app/state.
 */

const CACHE = "zandar-static-v1";

const PRECACHE = [
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-512.png",
  "/apple-icon.png",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

function isStatic(url) {
  if (url.origin !== self.location.origin) return false; // nikad cross-origin (API)
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname === "/manifest.webmanifest" ||
    /\.(png|svg|ico|webp|woff2?)$/.test(url.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return; // POST/PUT… → mreža
  const url = new URL(req.url);
  if (!isStatic(url)) return; // navigacije/API → mreža (svjež state)

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(req);
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      } catch {
        return hit || Response.error();
      }
    }),
  );
});

// Dozvoli stranici da forsira aktivaciju novog SW-a (update prompt).
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
