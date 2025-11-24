/**
 * Frontend Environment Variables
 * Type-safe environment validation using T3 Env + Zod
 *
 * Follows Next.js 16 best practices:
 * - Build-time validation prevents deployment of misconfigured apps
 * - Automatic server/client separation prevents secret leaks
 * - Type inference provides autocomplete and compile-time safety
 *
 * @see https://env.t3.gg/docs/nextjs
 */

import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const env = createEnv({
	/**
	 * Server-side environment variables
	 * ❌ NOT available in the browser (prevents secret leaks)
	 * ✅ Only accessible in Server Components, API Routes, and Server Actions
	 */
	server: {
		// Node.js
		NODE_ENV: z
			.enum(['development', 'production', 'test'])
			.default('development'),

		// Supabase Server
		SUPABASE_JWT_ALGORITHM: z
			.enum(['ES256', 'RS256', 'HS256'])
			.default('ES256')
			.describe('Algorithm used for Supabase JWT verification'),
		SUPABASE_JWT_SECRET: z
			.string()
			.min(32, 'JWT secret must be at least 32 characters')
			.optional()
			.describe('Secret for verifying Supabase JWTs (optional for ES256)'),

		// Stripe Server (Price IDs - not exposed to client)
		STRIPE_STARTER_MONTHLY_PRICE_ID: z
			.string()
			.optional()
			.describe('Stripe price ID for Starter monthly plan'),
		STRIPE_STARTER_ANNUAL_PRICE_ID: z
			.string()
			.optional()
			.describe('Stripe price ID for Starter annual plan'),
		STRIPE_GROWTH_MONTHLY_PRICE_ID: z
			.string()
			.optional()
			.describe('Stripe price ID for Growth monthly plan'),
		STRIPE_GROWTH_ANNUAL_PRICE_ID: z
			.string()
			.optional()
			.describe('Stripe price ID for Growth annual plan'),
		STRIPE_MAX_MONTHLY_PRICE_ID: z
			.string()
			.optional()
			.describe('Stripe price ID for Max monthly plan'),
		STRIPE_MAX_ANNUAL_PRICE_ID: z
			.string()
			.optional()
			.describe('Stripe price ID for Max annual plan'),

		// Security Monitoring
		SECURITY_MONITORING_WEBHOOK: z
			.string()
			.url('Must be a valid webhook URL')
			.optional()
			.describe('Webhook URL for security monitoring alerts'),
		SECURITY_MONITORING_TOKEN: z
			.string()
			.optional()
			.describe('Authentication token for security monitoring webhook'),

		// Testing (Server-side only to avoid exposing credentials)
		E2E_OWNER_EMAIL: z
			.string()
			.email('Must be a valid email')
			.optional()
			.describe('Email for E2E test owner account'),
		E2E_OWNER_PASSWORD: z
			.string()
			.optional()
			.describe('Password for E2E test owner account'),
		RUN_INTEGRATION_TESTS: z
			.boolean()
			.default(false)
			.describe('Flag to enable integration tests'),
	},

	/**
	 * Client-side environment variables
	 * ✅ Available in the browser
	 * ⚠️ Never put secrets here - visible to end users!
	 */
	client: {
		// App URLs
		NEXT_PUBLIC_APP_URL: z
			.string()
			.url('Must be a valid URL')
			.default('http://localhost:3000')
			.describe('Primary app URL for canonical links'),
		NEXT_PUBLIC_SITE_URL: z
			.string()
			.url('Must be a valid URL')
			.optional()
			.describe('Alternative site URL for metadata'),
		NEXT_PUBLIC_BASE_URL: z
			.string()
			.url('Must be a valid URL')
			.optional()
			.describe('Base URL for marketing pages'),

		// API
		NEXT_PUBLIC_API_BASE_URL: z
			.string()
			.url('Must be a valid URL')
			.default('http://localhost:4600')
			.describe('Backend API base URL'),

		// Supabase Client
		NEXT_PUBLIC_SUPABASE_URL: z
			.string()
			.url('Must be a valid Supabase URL')
			.describe('Supabase project URL'),
		NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
			.string()
			.min(1, 'Supabase anon key is required')
			.describe('Supabase anonymous/publishable key'),
		NEXT_PUBLIC_SUPABASE_JWT_ALGORITHM: z
			.enum(['ES256', 'RS256', 'HS256'])
			.default('ES256')
			.describe('Algorithm for Supabase JWT (client-side validation)'),

		// Stripe Client
		NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z
			.string()
			.startsWith('pk_', 'Must be a Stripe publishable key (starts with pk_)')
			.describe('Stripe publishable key for client-side checkout'),

		// Feature Flags
		NEXT_PUBLIC_ENABLE_DEBUG_LOGGING: z
			.boolean()
			.default(false)
			.describe('Enable verbose debug logging in browser console'),
		NEXT_PUBLIC_ENABLE_ANALYTICS: z
			.boolean()
			.default(false)
			.describe('Enable analytics tracking (Vercel Analytics, etc.)'),
	},

	/**
	 * Runtime environment variables mapping
	 *
	 * You can't destructure `process.env` as a regular object in Next.js edge runtimes
	 * (e.g. middlewares) or Client components, so we have to destructure manually.
	 *
	 * This ensures Next.js properly inlines the env vars at build time.
	 */
	runtimeEnv: {
		// Node.js
		NODE_ENV: process.env.NODE_ENV,

		// Client vars (NEXT_PUBLIC_*)
		NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
		NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
		NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
		NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
		NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
		NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
		NEXT_PUBLIC_SUPABASE_JWT_ALGORITHM: process.env.NEXT_PUBLIC_SUPABASE_JWT_ALGORITHM,
		NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
			process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
		NEXT_PUBLIC_ENABLE_DEBUG_LOGGING:
			process.env.NEXT_PUBLIC_ENABLE_DEBUG_LOGGING === 'true',
		NEXT_PUBLIC_ENABLE_ANALYTICS:
			process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',

		// Server vars (only accessible server-side)
		SUPABASE_JWT_ALGORITHM: process.env.SUPABASE_JWT_ALGORITHM,
		SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET,
		STRIPE_STARTER_MONTHLY_PRICE_ID: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID,
		STRIPE_STARTER_ANNUAL_PRICE_ID: process.env.STRIPE_STARTER_ANNUAL_PRICE_ID,
		STRIPE_GROWTH_MONTHLY_PRICE_ID: process.env.STRIPE_GROWTH_MONTHLY_PRICE_ID,
		STRIPE_GROWTH_ANNUAL_PRICE_ID: process.env.STRIPE_GROWTH_ANNUAL_PRICE_ID,
		STRIPE_MAX_MONTHLY_PRICE_ID: process.env.STRIPE_MAX_MONTHLY_PRICE_ID,
		STRIPE_MAX_ANNUAL_PRICE_ID: process.env.STRIPE_MAX_ANNUAL_PRICE_ID,
		SECURITY_MONITORING_WEBHOOK: process.env.SECURITY_MONITORING_WEBHOOK,
		SECURITY_MONITORING_TOKEN: process.env.SECURITY_MONITORING_TOKEN,
		E2E_OWNER_EMAIL: process.env.E2E_OWNER_EMAIL,
		E2E_OWNER_PASSWORD: process.env.E2E_OWNER_PASSWORD,
		RUN_INTEGRATION_TESTS: process.env.RUN_INTEGRATION_TESTS === 'true',
	},

	/**
	 * Skip validation during build in CI if needed
	 * Useful for Docker builds or when env vars are injected at runtime
	 *
	 * @default false
	 */
	skipValidation:
		process.env.SKIP_ENV_VALIDATION === 'true' ||
		process.env.BUILDING_FOR_CI === 'true',

	/**
	 * Makes it so that empty strings are treated as undefined.
	 * `SOME_VAR: z.string()` and `SOME_VAR=''` will throw an error.
	 *
	 * @default false
	 */
	emptyStringAsUndefined: true,
})

/**
 * Type export for env object
 * Provides full autocomplete and type safety
 */
export type Env = typeof env

/**
 * Helper functions for environment detection
 * These remain unchanged for backward compatibility
 */
export function isIntegrationTest(): boolean {
	return env.RUN_INTEGRATION_TESTS
}

export function isDevelopment(): boolean {
	return env.NODE_ENV === 'development'
}

export function isProduction(): boolean {
	return env.NODE_ENV === 'production'
}

export function isTest(): boolean {
	return env.NODE_ENV === 'test'
}
