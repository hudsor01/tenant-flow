/**
 * Sentry Client Configuration
 *
 * Configures Sentry for browser-side error tracking and performance monitoring.
 * Includes: Web Vitals, Session Replay, Network Requests, Assets
 */
import * as Sentry from '@sentry/nextjs'

const isProduction = process.env.NODE_ENV === 'production'

Sentry.init({
	dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
	environment: process.env.NODE_ENV || 'development',

	// Performance Monitoring
	tracesSampleRate: isProduction ? 0.2 : 1.0,

	// Session Replay - capture user sessions for debugging
	replaysSessionSampleRate: isProduction ? 0.1 : 0.5,
	replaysOnErrorSampleRate: 1.0, // Always capture replays on errors

	integrations: [
		// Session Replay
		Sentry.replayIntegration({
			maskAllText: false,
			blockAllMedia: false,
			maskAllInputs: true // Mask form inputs for privacy
		}),
		// Browser Tracing for Web Vitals
		Sentry.browserTracingIntegration({
			enableInp: true // Interaction to Next Paint
		}),
		// HTTP client instrumentation
		Sentry.browserApiErrorsIntegration()
	],

	// Filter noisy errors
	ignoreErrors: [
		// Browser extensions
		/chrome-extension/,
		/moz-extension/,
		// Network errors that are usually transient
		'Failed to fetch',
		'Load failed',
		'NetworkError',
		// User cancellation
		'AbortError',
		// Third-party scripts
		/Script error/i
	],

	// Don't send events in development unless explicitly enabled
	beforeSend(event) {
		if (process.env.NODE_ENV === 'development' && !process.env.SENTRY_DEBUG) {
			return null
		}
		return event
	},

	// Trace propagation for distributed tracing
	tracePropagationTargets: [
		'localhost',
		/^https:\/\/tenantflow\.app/,
		/^https:\/\/api\.tenantflow\.app/
	]
})
