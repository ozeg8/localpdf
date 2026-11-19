/* Replaced with a content-derived cache name and exact build assets. */
const CACHE = '__CACHE__';
const ASSETS = __ASSETS__;
const allowed = new Set(ASSETS.map(path => new URL(path, self.location.origin).href));
self.addEventListener('install', event => {
  // addAll is atomic: an incomplete application never becomes an offline release.
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  // Updates wait until the user chooses activation with an empty workspace.
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    // Other tabs can still depend on a previous build. Retain their assets.
    if (clients.length <= 1) {
      for (const key of await caches.keys()) if (key.startsWith('localpdf-') && key !== CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type === 'ACTIVATE') event.waitUntil(self.skipWaiting());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  // Only known app GET assets are cached. No documents, blob URLs or request bodies.
  if (url.origin !== self.location.origin || request.method !== 'GET') return;
  if (request.mode === 'navigate') {
    event.respondWith(caches.open(CACHE).then(cache => cache.match('/index.html')).then(response => response ?? fetch(request)));
  } else if (allowed.has(url.href)) {
    event.respondWith(caches.open(CACHE).then(cache => cache.match(request)).then(async response => response ?? await caches.match(request) ?? fetch(request)));
  } else if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/pdf-assets/')) {
    // A previously open tab may request an older hash after an update.
    event.respondWith(caches.match(request).then(response => response ?? fetch(request)));
  }
});
