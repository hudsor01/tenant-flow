/* eslint-env serviceworker, browser */
/* global caches, fetch, Response, self, URL, console */
/*
 	TenantFlow service worker

	Goals:
	- Precache critical shell assets for fast first load
	- Runtime caching: cache-first for static assets, network-first for API
	- Navigation fallback for SPA routing
	- Cache size limits and safe cleanup
	- Safe update flow: support skipWaiting via message and notify clients

	This worker is intentionally small and conservative to avoid surprising
	behavior. It does not attempt to cache every request; it focuses on
	assets that meaningfully improve performance and resilience.
*/

const CACHE_VERSION = 'v1'
const PRECACHE = `tenantflow-precache-${CACHE_VERSION}`
const RUNTIME = `tenantflow-runtime-${CACHE_VERSION}`

// Files we want to precache. Keep this list conservative — avoid large files.
const PRECACHE_URLS = ['/', '/manifest.json', '/favicon.ico']

// Limit entries in runtime caches to avoid unbounded growth
const MAX_RUNTIME_ENTRIES = 100

// Utility: trim cache to max entries (LRU-ish by deletion order)
async function trimCache(cacheName, maxEntries) {
	const cache = await caches.open(cacheName)
	const keys = await cache.keys()
	if (keys.length <= maxEntries) return
	const deletions = keys.slice(0, keys.length - maxEntries)
	await Promise.all(deletions.map(k => cache.delete(k)))
}

// Utility: respond with network-first strategy for APIs
async function networkFirst(request) {
	const cache = await caches.open(RUNTIME)
	try {
		const response = await fetch(request)
		// Only cache successful GET responses
		if (request.method === 'GET' && response && response.status === 200) {
			cache.put(request, response.clone())
			// Trim cache in background
			trimCache(RUNTIME, MAX_RUNTIME_ENTRIES)
		}
		return response
	} catch {
		const cached = await cache.match(request)
		if (cached) return cached
		return new Response('Network error', { status: 503 })
	}
}

// Utility: cache-first for static assets
async function cacheFirst(request) {
	const cache = await caches.open(RUNTIME)
	const cached = await cache.match(request)
	if (cached) return cached
	try {
		const response = await fetch(request)
		if (response && response.status === 200 && request.method === 'GET') {
			cache.put(request, response.clone())
			trimCache(RUNTIME, MAX_RUNTIME_ENTRIES)
		}
		return response
	} catch {
		return new Response('Offline', { status: 503 })
	}
}

self.addEventListener('install', event => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(PRECACHE)
			try {
				await cache.addAll(PRECACHE_URLS)
			} catch (e) {
				// If precache fails, continue — runtime caching still works
				console.warn('SW: precache failed', e)
			}
			// Activate immediately
			await self.skipWaiting()
		})()
	)
})

self.addEventListener('activate', event => {
	event.waitUntil(
		(async () => {
			// Delete old caches that don't match our current names
			const keys = await caches.keys()
			await Promise.all(
				keys
					.filter(k => k !== PRECACHE && k !== RUNTIME)
					.map(k => caches.delete(k))
			)
			await self.clients.claim()
		})()
	)
})

// Handle messages from client (e.g., skipWaiting)
self.addEventListener('message', event => {
	if (!event.data) return
	if (event.data.type === 'SKIP_WAITING') {
		self.skipWaiting()
	}
})

// Navigation fallback response from precache
async function navigationFallback() {
	const cache = await caches.open(PRECACHE)
	const cached = await cache.match('/')
	return (
		cached ||
		new Response(
			'<!doctype html><meta charset="utf-8"><title>Offline</title><h1>Offline</h1>',
			{ headers: { 'Content-Type': 'text/html' } }
		)
	)
}

self.addEventListener('fetch', event => {
	const { request } = event

	// Only handle GET requests in service worker to be safe
	if (request.method !== 'GET') return

	const url = new URL(request.url)

	// Bypass cross-origin requests (e.g., analytics, third-party) — let network handle them
	if (url.origin !== self.location.origin) return

	// Prefer cache-first for static resources (by extension or _next static)
	if (
		url.pathname.startsWith('/_next/') ||
		url.pathname.endsWith('.js') ||
		url.pathname.endsWith('.css') ||
		url.pathname.endsWith('.woff2') ||
		url.pathname.endsWith('.png') ||
		url.pathname.endsWith('.jpg') ||
		url.pathname.endsWith('.svg')
	) {
		event.respondWith(cacheFirst(request))
		return
	}

	// Network-first for API requests under /api/
	if (url.pathname.startsWith('/api/')) {
		event.respondWith(networkFirst(request))
		return
	}

	// Navigation requests (HTML) -> use navigation fallback on failure
	if (request.mode === 'navigate') {
		event.respondWith(
			(async () => {
				try {
					const response = await fetch(request)
					// Update precache index if fetched successfully
					if (response && response.status === 200) {
						const cache = await caches.open(RUNTIME)
						cache.put(request, response.clone())
					}
					return response
				} catch {
					return navigationFallback()
				}
			})()
		)
		return
	}

	// Default: network-first then fallback to cache
	event.respondWith(networkFirst(request))
})

// Periodic cleanup: trim runtime cache on message request
self.addEventListener('message', event => {
	if (event.data && event.data.type === 'TRIM_CACHES') {
		event.waitUntil(trimCache(RUNTIME, MAX_RUNTIME_ENTRIES))
	}
})
