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

	// Don't send events in development
	beforeSend(event) {
		if (process.env.NODE_ENV === 'development' && !process.env.SENTRY_DEBUG) {
			return null
		}
		return event
	}
})
