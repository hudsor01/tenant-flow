"use client";

import { useEffect } from "react";

/**
 * Unregisters any previously-installed service worker and purges its caches.
 *
 * TenantFlow used to ship a cache-first worker (`public/sw.js`) that cached
 * `/_next/` + `.js` assets by URL. After a deploy, hashed chunk filenames
 * change, so a client holding a populated cache could serve a stale chunk →
 * JS version skew → hydration failure → stuck on the "Loading TenantFlow…"
 * overlay. Vercel's CDN already caches immutable assets, so the worker was
 * redundant. We now actively tear it down on every load. `public/sw.js` is a
 * matching kill-switch for browsers that only re-check the worker via their
 * own update cycle.
 */
export default function RegisterServiceWorker() {
	useEffect(() => {
		if (typeof window === "undefined") return;
		if (!("serviceWorker" in navigator)) return;

		navigator.serviceWorker
			.getRegistrations()
			.then((registrations) =>
				Promise.all(registrations.map((r) => r.unregister())),
			)
			.catch(() => {
				// best-effort teardown; ignore failures
			});

		if ("caches" in window) {
			caches
				.keys()
				.then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
				.catch(() => {
					// best-effort cache purge; ignore failures
				});
		}
	}, []);

	return null;
}
