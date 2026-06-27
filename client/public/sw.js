const CACHE_NAME = 'evolv-static-v1';
const API_CACHE_NAME = 'evolv-api-v1';

// Static assets to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/src/index.css',
  '/favicon.ico'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== API_CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Helper to determine if a URL is a static asset request
function isStaticAsset(url) {
  const path = url.pathname;
  return (
    url.origin === self.location.origin &&
    (path === '/' ||
     path.endsWith('.html') ||
     path.endsWith('.js') ||
     path.endsWith('.ts') ||
     path.endsWith('.tsx') ||
     path.endsWith('.css') ||
     path.endsWith('.svg') ||
     path.endsWith('.png') ||
     path.endsWith('.ico') ||
     path.includes('/assets/'))
  );
}

// Helper to check if request is an API request we want to cache (non-auth, non-AI GET requests)
function isCacheableApiRequest(request) {
  const url = new URL(request.url);
  return (
    request.method === 'GET' &&
    url.pathname.startsWith('/api/') &&
    !url.pathname.includes('/api/auth/') &&
    !url.pathname.includes('/api/ai/')
  );
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Handle API Requests (Network-First with Cache Fallback)
  if (isCacheableApiRequest(event.request)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(API_CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return response;
        })
        .catch(() => {
          // Network failed — fall back to API cache
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // If completely offline and uncached, return custom JSON error
            return new Response(
              JSON.stringify({ error: 'System offline. Offline cached data unavailable for this view.' }),
              {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
              }
            );
          });
        })
    );
    return;
  }

  // 2. Handle Static Assets (Stale-While-Revalidate / Cache-First)
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse.ok) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse.clone());
            });
          }
          return networkResponse;
        }).catch(() => {
          // Ignore network errors for stale updates
        });
        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 3. Default Fetch (direct bypass)
  event.respondWith(fetch(event.request));
});
