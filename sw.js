/* Midas service worker: makes repeat visits fast on slow or patchy networks.
   - Pages: network first, but if the network takes longer than 3.5s the last
     copy is shown straight away (and refreshed in the background).
   - Photos, logos, fonts: served from the phone's cache, updated quietly.
   - Everything else (the Ask Midas API, analytics) goes straight to the network.
   Bump VERSION to drop every cached file on the next visit. */
const VERSION = "midas-v3";   // bump whenever photos change at the same address
const PAGES = VERSION + "-pages";
const MEDIA = VERSION + "-media";
const MEDIA_MAX = 220;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const isMedia = (url) =>
  url.hostname === "fonts.gstatic.com" ||
  url.hostname === "fonts.googleapis.com" ||
  (url.origin === self.location.origin && /\.(avif|webp|jpe?g|png|svg|woff2?)$/i.test(url.pathname));

async function trim(cache) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - MEDIA_MAX; i++) await cache.delete(keys[i]);
}

async function page(req) {
  const cache = await caches.open(PAGES);
  const key = new URL(req.url).pathname;
  const network = fetch(req).then((res) => {
    if (res.ok) cache.put(key, res.clone());
    return res;
  });
  const cached = await cache.match(key);
  if (!cached) return network;
  const slow = new Promise((resolve) => setTimeout(() => resolve(cached), 3500));
  return Promise.race([network.catch(() => cached), slow]);
}

async function media(req, event) {
  const cache = await caches.open(MEDIA);
  const cached = await cache.match(req);
  // re-check with the server every time, so a photo replaced at the same address is picked up
  const update = fetch(req, { cache: "no-cache" }).then((res) => {
    if (res.ok || res.type === "opaque") cache.put(req, res.clone()).then(() => trim(cache));
    return res;
  });
  if (cached) {
    event.waitUntil(update.catch(() => {}));
    return cached;
  }
  return update;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (req.mode === "navigate" && url.origin === self.location.origin) {
    event.respondWith(page(req));
  } else if (isMedia(url)) {
    event.respondWith(media(req, event));
  }
});
