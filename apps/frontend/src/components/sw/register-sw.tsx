'use client'

import { useEffect } from 'react'

export default function RegisterServiceWorker() {
	useEffect(() => {
		if (typeof window === 'undefined') return
		if (!('serviceWorker' in navigator)) return

		let refreshing = false

		navigator.serviceWorker
			.register('/sw.js')
			.then(async registration => {
				// Ask the SW to skipWaiting if there's an update waiting
				if (registration.waiting) {
					try {
						registration.waiting.postMessage({ type: 'SKIP_WAITING' })
					} catch {
						// ignore postMessage failures - best-effort
					}
				}

				// When an update is found, attempt to skip waiting to activate
				registration.addEventListener('updatefound', () => {
					const newWorker = registration.installing
					if (!newWorker) return
					newWorker.addEventListener('statechange', () => {
						if (newWorker.state === 'installed' && registration.waiting) {
							try {
								registration.waiting.postMessage({ type: 'SKIP_WAITING' })
							} catch {
								// ignore
							}
						}
					})
				})
			})
			.catch(() => {
				// Fail silently; service worker is optional
			})

		// When the new worker takes control, reload to ensure clients get latest
		navigator.serviceWorker.addEventListener('controllerchange', () => {
			if (refreshing) return
			refreshing = true
			try {
				window.location.reload()
			} catch {
				// ignore reload failures in uncommon browsers
			}
		})

		// Periodically message SW to trim caches (best-effort)
		const trimInterval = setInterval(
			() => {
				if (navigator.serviceWorker.controller) {
					try {
						navigator.serviceWorker.controller.postMessage({
							type: 'TRIM_CACHES'
						})
					} catch (err) {
						// best-effort trim; ignore errors
						void err
					}
				}
			},
			1000 * 60 * 60
		)

		return () => {
			clearInterval(trimInterval)
		}
	}, [])

	return null
}
