const CACHE_NAME = 'gymtrack-pro-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // 1. Only handle HTTP/HTTPS requests (ignores chrome-extension://, data:, etc.)
  if (!event.request.url.startsWith('http') && !event.request.url.startsWith('https')) {
    return;
  }

  // 2. Only intercept GET requests, ignore cloud database and authentication calls
  if (event.request.method !== 'GET' || 
      event.request.url.includes('firestore') || 
      event.request.url.includes('firebase') || 
      event.request.url.includes('googleapis')) {
    return;
  }

  const isStaticHashedAsset = event.request.url.includes('/assets/');

  if (isStaticHashedAsset) {
    // Cache First strategy for hashed assets (extremely fast, safe because filenames are unique)
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        }).catch(() => {
          // Fail silently
        });
      })
    );
  } else {
    // Network First strategy for navigation, index.html, manifest, and icons
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache if network is unavailable (offline)
          return caches.match(event.request);
        })
    );
  }
});
