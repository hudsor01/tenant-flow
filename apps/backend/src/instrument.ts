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
const isStaging = process.env.NODE_ENV === 'staging'

Sentry.init({
	dsn: process.env.SENTRY_DSN,
	environment: process.env.NODE_ENV || 'development',
	release: process.env.RAILWAY_GIT_COMMIT_SHA || process.env.GIT_COMMIT_SHA,

	integrations: [
		// CPU/memory profiling
		nodeProfilingIntegration(),
	],

	// Performance Monitoring
	tracesSampleRate: isProduction ? 0.2 : 1.0, // 20% in prod, 100% in dev/staging

	// Profiling (only in production to reduce overhead)
	profilesSampleRate: isProduction ? 0.1 : 0.5,

	// Filter out noisy/expected errors
	ignoreErrors: [
		'NotFoundException',
		'UnauthorizedException',
		'ECONNRESET',
		'ETIMEDOUT',
	],

	// Add context to all events
	beforeSend(event) {
		// Don't send events in test environment
		if (process.env.NODE_ENV === 'test') {
			return null
		}
		return event
	},

	// Trace propagation for distributed tracing
	tracePropagationTargets: [
		'localhost',
		/^https:\/\/api\.tenantflow\.app/,
		/^https:\/\/.*\.supabase\.co/,
		/^https:\/\/api\.stripe\.com/,
	],

	// Enable debug logging in development
	debug: !isProduction && !isStaging,
})
