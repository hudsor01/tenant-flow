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
		// Session Replay. All three masks default to ON so the dashboard
		// surface — tenant names, email addresses, lease amounts, property
		// addresses — never reaches Sentry. Without these, replay records
		// PII that we have no DPA to share with Sentry; flipping them to
		// `false` would re-open a GDPR exposure for any EU user. Future
		// callers that need a screen-share UX should add explicit
		// `unmask: ['.selector']` rules rather than disable masking
		// globally.
		Sentry.replayIntegration({
			maskAllText: true,
			blockAllMedia: true,
			maskAllInputs: true
		}),
		// Browser Tracing for Web Vitals
		Sentry.browserTracingIntegration({
			enableInp: true // Interaction to Next Paint
		}),
		// HTTP client instrumentation
		Sentry.browserApiErrorsIntegration(),
		// User Feedback widget - lets users report UX issues directly
		Sentry.feedbackIntegration({
			colorScheme: 'system',
			isNameRequired: false,
			isEmailRequired: false,
			showBranding: false,
			buttonLabel: 'Report a Bug',
			submitButtonLabel: 'Send Report',
			formTitle: 'Report a Problem',
			messagePlaceholder: 'Describe what happened and what you expected to happen...',
			successMessageText: 'Thank you for your report!'
		})
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
	// Also scrub sensitive data from all events
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
							// Card number pattern: 4 groups of 4 digits
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
	},

	// Trace propagation for distributed tracing
	tracePropagationTargets: [
		'localhost',
		/^https:\/\/tenantflow\.app/,
		/^https:\/\/api\.tenantflow\.app/
	]
})
