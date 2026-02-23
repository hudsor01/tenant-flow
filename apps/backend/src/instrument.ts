/**
 * Sentry Instrumentation - MUST be imported before any other modules
 *
 * Provides:
 * - Error tracking with full stack traces
 * - Performance tracing (API requests, DB queries)
 * - Profiling for CPU/memory analysis
 * - Queue monitoring (BullMQ)
 * - Cache monitoring (Redis)
 * - Outbound HTTP tracking (Stripe, external APIs)
 */
import * as Sentry from '@sentry/nestjs'
import { nodeProfilingIntegration } from '@sentry/profiling-node'

const isProduction = process.env.NODE_ENV === 'production'

Sentry.init({
	dsn: process.env.SENTRY_DSN,
	environment: process.env.NODE_ENV ?? 'development',
	release: process.env.RAILWAY_GIT_COMMIT_SHA ?? process.env.GIT_COMMIT_SHA,

	// Profiling integration - only active in production
	integrations: isProduction ? [nodeProfilingIntegration()] : [],

	// Performance: 20% sampling in prod, 100% in dev
	tracesSampleRate: isProduction ? 0.2 : 1.0,

	// Profiling: 10% in prod, 50% in dev (no-op if integration not loaded)
	profilesSampleRate: isProduction ? 0.1 : 0.5,

	// Suppress verbose instrumentation logs
	debug: false,

	// Expected errors that don't need tracking (4xx HTTP errors are user/input errors, not bugs)
	ignoreErrors: [
		'NotFoundException',
		'UnauthorizedException',
		'ForbiddenException',
		'BadRequestException',
		'ConflictException',
		'ECONNRESET',
		'ETIMEDOUT',
	],

	// Distributed tracing targets
	tracePropagationTargets: [
		'localhost',
		/^https:\/\/api\.tenantflow\.app/,
		/^https:\/\/.*\.supabase\.co/,
		/^https:\/\/api\.stripe\.com/,
	],

	beforeSend(event) {
		// Skip test environment
		if (process.env.NODE_ENV === 'test') {
			return null
		}

		// Skip development unless explicitly enabled (parity with frontend config)
		if (process.env.NODE_ENV === 'development' && !process.env.SENTRY_DEBUG) {
			return null
		}

		// Scrub sensitive headers
		if (event.request?.headers) {
			const sensitiveHeaders = [
				'authorization',
				'x-stripe-signature',
				'cookie',
				'x-api-key',
				'x-supabase-auth',
			]
			for (const header of sensitiveHeaders) {
				if (event.request.headers[header]) {
					event.request.headers[header] = '[REDACTED]'
				}
			}
		}

		// Scrub PCI data from breadcrumbs
		if (event.breadcrumbs) {
			event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
				if (!breadcrumb.data) return breadcrumb

				const scrubbed = { ...breadcrumb.data }
				for (const [key, value] of Object.entries(scrubbed)) {
					if (typeof value !== 'string') continue

					// Card numbers (16 digits with optional separators)
					if (/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/.test(value)) {
						scrubbed[key] = '[CARD_REDACTED]'
					}

					// CVV (3-4 digits when key indicates CVV)
					if (/\b\d{3,4}\b/.test(value) && key.toLowerCase().includes('cvv')) {
						scrubbed[key] = '[CVV_REDACTED]'
					}
				}

				return { ...breadcrumb, data: scrubbed }
			})
		}

		return event
	},
})
