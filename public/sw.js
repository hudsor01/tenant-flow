/* eslint-env serviceworker, browser */
/* global caches, self */
/*
TenantFlow service worker — KILL SWITCH.

The previous version was cache-first on `/_next/` + `.js` assets. Because the
cache key is the request URL and hashed chunk filenames change every deploy, a
client holding a populated cache could serve a STALE chunk after a deploy —
producing a JS version skew that fails hydration and strands the user on the
root "Loading TenantFlow…" overlay. Vercel's CDN already serves immutable
hashed assets with long-lived cache headers, so this worker was redundant as
well as risky.

This build neutralizes any previously-installed worker: it registers no fetch
handler (never intercepts a request), purges every cache, and unregisters
itself on activation. Browsers with the old worker pick this up via their
automatic SW update check; `register-sw.tsx` also unregisters proactively on
load. Once cleared, no service worker controls the origin.
*/

self.addEventListener("install", () => {
	self.skipWaiting();
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		(async () => {
			const keys = await caches.keys();
			await Promise.all(keys.map((k) => caches.delete(k)));
			await self.registration.unregister();
		})(),
	);
});

// Intentionally no "fetch" handler: this worker never intercepts or caches
// any request, so it cannot serve a stale asset while it waits to deactivate.
