/**
 * Service Worker for NurtGov
 * Handles offline caching, request interception, and background sync
 */

const CACHE_NAME = 'nurtgov-v1';
const RUNTIME_CACHE = 'nurtgov-runtime';
const API_CACHE = 'nurtgov-api';
const IMAGE_CACHE = 'nurtgov-images';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

/**
 * Install event - cache static assets
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker');

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Failed to cache some assets:', err);
      });
    })
  );

  self.skipWaiting();
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (
            cacheName !== CACHE_NAME &&
            cacheName !== RUNTIME_CACHE &&
            cacheName !== API_CACHE &&
            cacheName !== IMAGE_CACHE
          ) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );

  self.clients.claim();
});

/**
 * Fetch event - implement caching strategies
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome extensions and external URLs
  if (url.protocol === 'chrome-extension:' || url.origin !== self.location.origin) {
    return;
  }

  // API requests - Network first, fallback to cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request, API_CACHE));
    return;
  }

  // Images - Cache first, fallback to network
  if (request.destination === 'image') {
    event.respondWith(cacheFirstStrategy(request, IMAGE_CACHE));
    return;
  }

  // HTML, JS, CSS - Stale while revalidate
  if (
    request.destination === 'document' ||
    request.destination === 'script' ||
    request.destination === 'style'
  ) {
    event.respondWith(staleWhileRevalidateStrategy(request, RUNTIME_CACHE));
    return;
  }

  // Default - Network first
  event.respondWith(networkFirstStrategy(request, RUNTIME_CACHE));
});

/**
 * Network first strategy
 * Try network first, fallback to cache
 */
async function networkFirstStrategy(request, cacheName) {
  try {
    const response = await fetch(request);

    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.log('[SW] Network failed, using cache:', request.url);
    const cached = await caches.match(request);

    if (cached) {
      return cached;
    }

    // Return offline page for document requests
    if (request.destination === 'document') {
      return caches.match('/index.html');
    }

    return new Response('Offline - Resource not available', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

/**
 * Cache first strategy
 * Try cache first, fallback to network
 */
async function cacheFirstStrategy(request, cacheName) {
  const cached = await caches.match(request);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);

    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.log('[SW] Network failed and no cache:', request.url);
    return new Response('Offline - Resource not available', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

/**
 * Stale while revalidate strategy
 * Return cached version immediately, update in background
 */
async function staleWhileRevalidateStrategy(request, cacheName) {
  const cached = await caches.match(request);

  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      const cache = caches.open(cacheName);
      cache.then((c) => c.put(request, response.clone()));
    }
    return response;
  });

  return cached || fetchPromise;
}

/**
 * Background sync event
 * Sync queued requests when connection is restored
 */
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);

  if (event.tag === 'sync-queue') {
    event.waitUntil(syncQueuedRequests());
  }
});

/**
 * Sync queued requests
 */
async function syncQueuedRequests() {
  try {
    const db = await openOfflineDB();
    const requests = await getQueuedRequests(db);

    for (const req of requests) {
      try {
        const response = await fetch(req.url, {
          method: req.method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: req.data ? JSON.stringify(req.data) : undefined,
        });

        if (response.ok) {
          await removeQueuedRequest(db, req.id);
          console.log('[SW] Synced request:', req.url);
        }
      } catch (error) {
        console.error('[SW] Failed to sync request:', req.url, error);
      }
    }

    // Notify clients of sync completion
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        timestamp: Date.now(),
      });
    });
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

/**
 * Open offline database
 */
function openOfflineDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('NurtGov', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Get queued requests from database
 */
function getQueuedRequests(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['queue'], 'readonly');
    const store = transaction.objectStore('queue');
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Remove queued request from database
 */
function removeQueuedRequest(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['queue'], 'readwrite');
    const store = transaction.objectStore('queue');
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(true);
  });
}

/**
 * Message event - handle messages from clients
 */
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data.type);

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((cacheNames) => {
      Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
    });
  }
});
