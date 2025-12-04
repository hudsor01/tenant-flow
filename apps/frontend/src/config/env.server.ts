/**
 * Server-side Environment Variables
 * Only import this in Server Components, API Routes, and Server Actions
 *
 * Uses plain Zod validation - no T3 Env dependency
 */

import { z } from 'zod'

const serverEnvSchema = z.object({
	NODE_ENV: z
		.enum(['development', 'production', 'test'])
		.default('development'),

	// Supabase Server
	JWT_ALGORITHM: z
		.enum(['ES256', 'RS256', 'HS256'])
		.default('ES256'),
	JWT_SECRET: z
		.string()
		.min(32, 'JWT secret must be at least 32 characters')
		.optional(),

	// Stripe Server (Price IDs - not exposed to client)
	STRIPE_STARTER_MONTHLY_PRICE_ID: z.string().optional(),
	STRIPE_STARTER_ANNUAL_PRICE_ID: z.string().optional(),
	STRIPE_GROWTH_MONTHLY_PRICE_ID: z.string().optional(),
	STRIPE_GROWTH_ANNUAL_PRICE_ID: z.string().optional(),
	STRIPE_MAX_MONTHLY_PRICE_ID: z.string().optional(),
	STRIPE_MAX_ANNUAL_PRICE_ID: z.string().optional(),

	// Security Monitoring
	SECURITY_MONITORING_WEBHOOK: z.string().url().optional(),
	SECURITY_MONITORING_TOKEN: z.string().optional(),

	// Testing
	E2E_OWNER_EMAIL: z.string().email().optional(),
	E2E_OWNER_PASSWORD: z.string().optional(),
	RUN_INTEGRATION_TESTS: z.string().optional().transform(v => v === 'true'),
})

// Parse at module load - will throw if invalid (fail-fast)
export const serverEnv = serverEnvSchema.parse(process.env)

// Helper exports
export const isProduction = serverEnv.NODE_ENV === 'production'
export const isDevelopment = serverEnv.NODE_ENV === 'development'
export const isTest = serverEnv.NODE_ENV === 'test'
export const isIntegrationTest = serverEnv.RUN_INTEGRATION_TESTS === true
