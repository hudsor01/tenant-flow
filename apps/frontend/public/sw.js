/**
 * Service Worker for TenantFlow
 * Optimizes caching and offline experience
 */

const CACHE_NAME = 'tenantflow-v1'
const STATIC_CACHE = 'tenantflow-static-v1'
const API_CACHE = 'tenantflow-api-v1'

// Cache strategies
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  NETWORK_ONLY: 'network-only',
  CACHE_ONLY: 'cache-only',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate'
}

// Routes and their caching strategies
const ROUTE_STRATEGIES = {
  '/static/': CACHE_STRATEGIES.CACHE_FIRST,
  '/assets/': CACHE_STRATEGIES.CACHE_FIRST,
  '/api/properties': CACHE_STRATEGIES.STALE_WHILE_REVALIDATE,
  '/api/tenants': CACHE_STRATEGIES.STALE_WHILE_REVALIDATE,
  '/api/dashboard': CACHE_STRATEGIES.STALE_WHILE_REVALIDATE,
  '/api/auth': CACHE_STRATEGIES.NETWORK_ONLY,
  '/api/realtime': CACHE_STRATEGIES.NETWORK_ONLY
}

// Files to cache immediately
const CRITICAL_ASSETS = [
  '/',
  '/static/js/react-vendor.js',
  '/static/js/router-vendor.js',
  '/static/js/ui-vendor.js',
  '/static/css/main.css',
  '/manifest.json'
]

/**
 * Install event - cache critical assets
 */
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...')
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching critical assets')
        return cache.addAll(CRITICAL_ASSETS)
      })
      .then(() => self.skipWaiting())
      .catch((error) => {
        console.error('Service Worker: Failed to cache critical assets', error)
      })
  )
})

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...')
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && 
                cacheName !== STATIC_CACHE && 
                cacheName !== API_CACHE) {
              console.log('Service Worker: Deleting old cache', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => self.clients.claim())
  )
})

/**
 * Fetch event - handle all network requests
 */
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests for caching
  if (request.method !== 'GET') {
    return
  }

  // Skip Chrome extension requests
  if (url.protocol === 'chrome-extension:') {
    return
  }

  // Determine cache strategy
  const strategy = getStrategyForUrl(url.pathname)
  
  event.respondWith(
    handleRequest(request, strategy)
  )
})

/**
 * Get caching strategy for URL
 */
function getStrategyForUrl(pathname) {
  for (const [route, strategy] of Object.entries(ROUTE_STRATEGIES)) {
    if (pathname.startsWith(route)) {
      return strategy
    }
  }
  
  // Default strategy based on file type
  if (pathname.includes('/static/') || pathname.includes('/assets/')) {
    return CACHE_STRATEGIES.CACHE_FIRST
  }
  
  if (pathname.startsWith('/api/')) {
    return CACHE_STRATEGIES.NETWORK_FIRST
  }
  
  return CACHE_STRATEGIES.NETWORK_FIRST
}

/**
 * Handle request based on strategy
 */
async function handleRequest(request, strategy) {
  const cacheName = getCacheNameForRequest(request)
  
  switch (strategy) {
    case CACHE_STRATEGIES.CACHE_FIRST:
      return cacheFirst(request, cacheName)
    
    case CACHE_STRATEGIES.NETWORK_FIRST:
      return networkFirst(request, cacheName)
    
    case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
      return staleWhileRevalidate(request, cacheName)
    
    case CACHE_STRATEGIES.NETWORK_ONLY:
      return fetch(request)
    
    case CACHE_STRATEGIES.CACHE_ONLY:
      return caches.match(request)
    
    default:
      return networkFirst(request, cacheName)
  }
}

/**
 * Get appropriate cache name for request
 */
function getCacheNameForRequest(request) {
  const url = new URL(request.url)
  
  if (url.pathname.startsWith('/api/')) {
    return API_CACHE
  }
  
  if (url.pathname.includes('/static/') || url.pathname.includes('/assets/')) {
    return STATIC_CACHE
  }
  
  return CACHE_NAME
}

/**
 * Cache First Strategy
 */
async function cacheFirst(request, cacheName) {
  try {
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    
    const networkResponse = await fetch(request)
    const cache = await caches.open(cacheName)
    
    // Only cache successful responses
    if (networkResponse.status === 200) {
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    console.error('Cache first strategy failed:', error)
    return caches.match(request) || new Response('Offline', { status: 503 })
  }
}

/**
 * Network First Strategy
 */
async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request)
    const cache = await caches.open(cacheName)
    
    // Cache successful responses
    if (networkResponse.status === 200) {
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    console.log('Network failed, trying cache:', error.message)
    const cachedResponse = await caches.match(request)
    
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/') || new Response('Offline', { 
        status: 503,
        headers: { 'Content-Type': 'text/html' }
      })
    }
    
    return new Response('Offline', { status: 503 })
  }
}

/**
 * Stale While Revalidate Strategy
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cachedResponse = await caches.match(request)
  
  // Fetch fresh response in background
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.status === 200) {
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  }).catch((error) => {
    console.log('Background fetch failed:', error.message)
  })
  
  // Return cached response immediately if available
  if (cachedResponse) {
    return cachedResponse
  }
  
  // If no cache, wait for network
  return fetchPromise || new Response('Offline', { status: 503 })
}

/**
 * Background sync for failed requests
 */
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(handleBackgroundSync())
  }
})

async function handleBackgroundSync() {
  console.log('Service Worker: Handling background sync')
  // Implement retry logic for failed API calls
}

/**
 * Push notification handling
 */
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New notification',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    tag: 'tenantflow-notification',
    renotify: true,
    requireInteraction: false
  }
  
  event.waitUntil(
    self.registration.showNotification('TenantFlow', options)
  )
})

/**
 * Notification click handling
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  
  event.waitUntil(
    clients.openWindow('/')
  )
})