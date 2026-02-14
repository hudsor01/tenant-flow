/**
 * Sentry Edge Configuration
 *
 * Configures Sentry for Edge runtime (middleware, edge API routes).
 */
import * as Sentry from '@sentry/nextjs'

const isProduction = process.env.NODE_ENV === 'production'

Sentry.init({
	dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
	environment: process.env.NODE_ENV || 'development',

	// Performance Monitoring
	tracesSampleRate: isProduction ? 0.2 : 1.0,

	// Don't send events in development, scrub sensitive data
	beforeSend(event) {
		if (process.env.NODE_ENV === 'development' && !process.env.SENTRY_DEBUG) {
			return null
		}

		// Scrub sensitive headers from request
		if (event.request?.headers) {
			const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key']
			for (const header of sensitiveHeaders) {
				if (event.request.headers[header]) {
					event.request.headers[header] = '[REDACTED]'
				}
			}
		}

		// Scrub sensitive data patterns from breadcrumbs
		if (event.breadcrumbs) {
			event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
				if (breadcrumb.data) {
					const scrubbed = { ...breadcrumb.data }
					for (const [key, value] of Object.entries(scrubbed)) {
						if (typeof value === 'string') {
							if (/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/.test(value)) {
								scrubbed[key] = '[CARD_REDACTED]'
							}
						}
					}
					return { ...breadcrumb, data: scrubbed }
				}
				return breadcrumb
			})
		}

		return event
	}
})
