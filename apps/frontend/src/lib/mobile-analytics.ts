'use client'

/**
 * Mobile Analytics Utility
 * Lightweight analytics for mobile-specific events
 */

import { createLogger } from '@repo/shared/lib/frontend-logger'

const logger = createLogger({ component: 'MobileAnalytics' })

interface MobileAnalyticsEvent {
	eventName: string
	properties: Record<string, unknown>
	timestamp: string
	userAgent: string
	screenResolution: string
	networkType: string
	isOnline: boolean
}

interface NavigatorWithConnection extends Navigator {
	connection?: {
		effectiveType: string
	}
}

/** Analytics request timeout in milliseconds */
const ANALYTICS_TIMEOUT_MS = 5000

class MobileAnalytics {
	private endpoint = '/api/v1/analytics'
	private isTracking = true

	track(eventName: string, properties: Record<string, unknown> = {}): void {
		if (!this.isTracking) return

		// Avoid SSR/RSC crashes when browser globals are unavailable
		if (typeof window === 'undefined' || typeof navigator === 'undefined') return

		const navigatorWithConnection = navigator as NavigatorWithConnection

		const analyticsEvent: MobileAnalyticsEvent = {
			eventName,
			properties,
			timestamp: new Date().toISOString(),
			userAgent: navigator.userAgent,
			screenResolution: `${window.screen.width}x${window.screen.height}`,
			networkType: navigatorWithConnection.connection?.effectiveType || 'unknown',
			isOnline: navigator.onLine
		}

		// Sanitize properties to remove sensitive data
		const sanitizedProperties = this.sanitizeProperties(analyticsEvent.properties)

		// Send analytics with timeout - fire and forget but with proper cleanup
		this.sendAnalytics({
			...analyticsEvent,
			properties: sanitizedProperties
		})
	}

	private sendAnalytics(event: MobileAnalyticsEvent): void {
		const controller = new AbortController()
		const timeoutId = setTimeout(() => controller.abort(), ANALYTICS_TIMEOUT_MS)

		fetch(this.endpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Source': 'mobile-analytics-endpoint'
			},
			body: JSON.stringify(event),
			signal: controller.signal
		})
			.catch((error: unknown) => {
				// Only log non-abort errors in development
				if (error instanceof Error && error.name !== 'AbortError') {
					logger.debug('Analytics beacon failed', {
						action: 'analytics_beacon_failed',
						metadata: { reason: error.message }
					})
				}
				// Fail silently to avoid impacting user experience
			})
			.finally(() => {
				clearTimeout(timeoutId)
			})
	}

	private sanitizeProperties(properties: Record<string, unknown>): Record<string, unknown> {
		const sanitized: Record<string, unknown> = {}
		const sensitiveKeys = ['token', 'password', 'secret', 'key', 'auth', 'cookie', 'session']

		for (const [key, value] of Object.entries(properties)) {
			if (typeof value === 'string' && value.length > 100) {
				// Truncate long strings
				sanitized[key] = value.substring(0, 100) + '...'
			} else if (sensitiveKeys.some(sensitiveKey =>
				key.toLowerCase().includes(sensitiveKey)
			)) {
				// Skip sensitive properties
				sanitized[key] = 'REDACTED'
				sanitized.unsupported = true
			} else {
				sanitized[key] = value
			}
		}

		return sanitized
	}

	enable(): void {
		this.isTracking = true
	}

	disable(): void {
		this.isTracking = false
	}
}

export const mobileAnalytics = new MobileAnalytics()
