import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

/**
 * Type-safe environment variables using @t3-oss/env-nextjs
 *
 * Features enabled:
 * - Build-time validation (imported in next.config.ts)
 * - Runtime validation on first import
 * - Server/client variable separation with type safety
 * - Custom error handlers for clear debugging
 * - Empty string as undefined (prevents "" from passing validation)
 *
 * @see https://env.t3.gg/docs/nextjs
 */
export const env = createEnv({
	/**
	 * Server-side environment variables (never exposed to browser)
	 * Access these only in Server Components, API routes, or server actions
	 */
	server: {
		NODE_ENV: z
			.enum(['development', 'test', 'production'])
			.default('development'),

		// Stripe price IDs (server-only for checkout sessions)
		STRIPE_STARTER_MONTHLY: z
			.string()
			.min(1, 'STRIPE_STARTER_MONTHLY is required')
			.startsWith('price_', 'Must be a Stripe price ID'),
		STRIPE_STARTER_ANNUAL: z
			.string()
			.min(1, 'STRIPE_STARTER_ANNUAL is required')
			.startsWith('price_', 'Must be a Stripe price ID'),
		STRIPE_GROWTH_MONTHLY: z
			.string()
			.min(1, 'STRIPE_GROWTH_MONTHLY is required')
			.startsWith('price_', 'Must be a Stripe price ID'),
		STRIPE_GROWTH_ANNUAL: z
			.string()
			.min(1, 'STRIPE_GROWTH_ANNUAL is required')
			.startsWith('price_', 'Must be a Stripe price ID'),
		STRIPE_MAX_MONTHLY: z
			.string()
			.min(1, 'STRIPE_MAX_MONTHLY is required')
			.startsWith('price_', 'Must be a Stripe price ID'),
		STRIPE_MAX_ANNUAL: z
			.string()
			.min(1, 'STRIPE_MAX_ANNUAL is required')
			.startsWith('price_', 'Must be a Stripe price ID'),

		// Vercel auto-injected
		VERCEL_URL: z.string().optional(),
		VERCEL_ENV: z.enum(['development', 'preview', 'production']).optional(),

		// Sentry (optional, only needed for source map uploads)
		SENTRY_ORG: z.string().optional(),
		SENTRY_PROJECT: z.string().optional(),
		SENTRY_AUTH_TOKEN: z.string().optional()
	},

	/**
	 * Client-side environment variables (exposed to browser)
	 * Must be prefixed with NEXT_PUBLIC_
	 * These are inlined at build time - changes require rebuild
	 */
	client: {
		NEXT_PUBLIC_APP_URL: z
			.string()
			.url('NEXT_PUBLIC_APP_URL must be a valid URL'),

		NEXT_PUBLIC_API_BASE_URL: z
			.string()
			.url('NEXT_PUBLIC_API_BASE_URL must be a valid URL'),

		NEXT_PUBLIC_SUPABASE_URL: z
			.string()
			.url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL')
			.refine(
				url =>
					url.includes('supabase.co') ||
					url.includes('supabase.in') ||
					url.includes('127.0.0.1') ||
					url.includes('localhost'),
				'Must be a Supabase URL or localhost'
			),

		NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
			.string()
			.min(1, 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required'),

		NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z
			.string()
			.startsWith('pk_', 'Stripe publishable key must start with pk_'),

		NEXT_PUBLIC_JWT_ALGORITHM: z
			.enum(['ES256', 'RS256', 'HS256'])
			.default('ES256'),

		// Feature flags (optional, default to false)
		// Uses string->boolean transform pattern from t3-env recipes
		NEXT_PUBLIC_ENABLE_ANALYTICS: z
			.string()
			.optional()
			.default('false')
			.transform(s => s === 'true'),

		NEXT_PUBLIC_MAINTENANCE_MODE: z
			.string()
			.optional()
			.default('false')
			.transform(s => s === 'true')
	},

	/**
	 * Runtime environment variable mapping
	 * Required for Next.js tree-shaking - must explicitly destructure
	 */
	runtimeEnv: {
		// Server
		NODE_ENV: process.env.NODE_ENV,
		STRIPE_STARTER_MONTHLY: process.env.STRIPE_STARTER_MONTHLY,
		STRIPE_STARTER_ANNUAL: process.env.STRIPE_STARTER_ANNUAL,
		STRIPE_GROWTH_MONTHLY: process.env.STRIPE_GROWTH_MONTHLY,
		STRIPE_GROWTH_ANNUAL: process.env.STRIPE_GROWTH_ANNUAL,
		STRIPE_MAX_MONTHLY: process.env.STRIPE_MAX_MONTHLY,
		STRIPE_MAX_ANNUAL: process.env.STRIPE_MAX_ANNUAL,
		VERCEL_URL: process.env.VERCEL_URL,
		VERCEL_ENV: process.env.VERCEL_ENV,
		SENTRY_ORG: process.env.SENTRY_ORG,
		SENTRY_PROJECT: process.env.SENTRY_PROJECT,
		SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,

		// Client
		NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
		NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
		NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
		NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
			process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
		NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
			process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
		NEXT_PUBLIC_JWT_ALGORITHM: process.env.NEXT_PUBLIC_JWT_ALGORITHM,
		NEXT_PUBLIC_ENABLE_ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS,
		NEXT_PUBLIC_MAINTENANCE_MODE: process.env.NEXT_PUBLIC_MAINTENANCE_MODE
	},

	/**
	 * Skip validation for CI/testing when env vars may not be available
	 * Set SKIP_ENV_VALIDATION=true to bypass
	 */
	skipValidation:
		process.env.SKIP_ENV_VALIDATION === 'true' ||
		process.env.npm_lifecycle_event === 'lint',

	/**
	 * Treat empty strings as undefined
	 * Prevents `VAR=""` from passing required validation
	 * Recommended for all projects
	 */
	emptyStringAsUndefined: true,

	/**
	 * Custom validation error handler
	 * Provides clear, actionable error messages
	 */
	onValidationError: issues => {
		const formatted = issues
			.map(issue => {
				const path = Array.isArray(issue.path)
					? issue.path.join('.')
					: String(issue.path)
				return `  - ${path}: ${issue.message}`
			})
			.join('\n')

		console.error('\n❌ Invalid environment variables:\n')
		console.error(formatted)
		console.error('\n📋 Check your .env.local file or deployment configuration.\n')

		throw new Error(`Environment validation failed:\n${formatted}`)
	},

	/**
	 * Handler for accessing server variables on client
	 * Prevents accidental exposure of secrets
	 */
	onInvalidAccess: variable => {
		throw new Error(
			`❌ Attempted to access server-side environment variable "${variable}" on the client.\n` +
				`This variable is not prefixed with NEXT_PUBLIC_ and cannot be exposed to the browser.\n` +
				`If you need this value client-side, create a NEXT_PUBLIC_ version or fetch it from an API route.`
		)
	}
})

/**
 * Type export for use in other files
 * Enables type-safe access to env vars throughout the app
 */
export type Env = typeof env
