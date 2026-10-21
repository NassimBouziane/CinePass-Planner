// CinéPass Planner - Service Worker for Browser-Side Image Caching
// Strategy: Cache-First for movie posters and image assets with network fallback.

const CACHE_NAME = 'cinepass-posters-v1';

// Match Allocine CDN and standard image formats
function isImageRequest(request) {
  if (request.destination === 'image') return true;
  const url = request.url.toLowerCase();
  if (url.includes('acsta.net') || url.includes('allocine')) {
    return true;
  }
  return /\.(jpe?g|png|webp|avif|gif|svg)(\?.*)?$/i.test(url);
}

// 1. Install lifecycle: activate immediately without waiting for existing clients to close
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// 2. Activate lifecycle: purge older cache generations and claim all open tabs
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('cinepass-posters-') && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch lifecycle: Cache-First strategy for poster images
self.addEventListener('fetch', (event) => {
  // Only intercept GET requests for images
  if (event.request.method !== 'GET' || !isImageRequest(event.request)) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      // 1. Check local browser cache
      const cachedResponse = await cache.match(event.request);
      if (cachedResponse) {
        return cachedResponse;
      }

      // 2. Fetch from network and cache for subsequent visits
      try {
        const networkResponse = await fetch(event.request);
        // Note: Cross-origin image requests (e.g. acsta.net) may return opaque responses (type === 'opaque', status === 0)
        if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
          cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      } catch (err) {
        // If offline or network error, fallback to cache if available
        if (cachedResponse) {
          return cachedResponse;
        }
        throw err;
      }
    })
  );
});
