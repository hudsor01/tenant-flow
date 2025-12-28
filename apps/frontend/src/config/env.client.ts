/**
 * Client-side Environment Variables
 * Safe to import in Client Components - only contains NEXT_PUBLIC_* vars
 *
 * - Development: Falls back to localhost URLs
 * - Production: Requires environment variables to be set
 *
 * Uses plain Zod validation - no T3 Env dependency
 * Next.js inlines NEXT_PUBLIC_* at build time, so these are safe for client
 */

import { z } from 'zod'

const isProduction = process.env.NODE_ENV === 'production'

const clientEnvSchema = z.object({
	// App URLs - required in production, defaults in development
	NEXT_PUBLIC_APP_URL: z
		.string()
		.url()
		.optional()
		.transform(
			val => val || (isProduction ? undefined : 'http://localhost:3000')
		)
		.refine(val => val !== undefined, {
			message: 'NEXT_PUBLIC_APP_URL is required in production'
		}),
	NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
	NEXT_PUBLIC_BASE_URL: z.string().url().optional(),

	// API - required in production, defaults in development
	NEXT_PUBLIC_API_BASE_URL: z
		.string()
		.url()
		.optional()
		.transform(
			val => val || (isProduction ? undefined : 'http://localhost:4600')
		)
		.refine(val => val !== undefined, {
			message: 'NEXT_PUBLIC_API_BASE_URL is required in production'
		}),

	// Supabase Client
	NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
	NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
	NEXT_PUBLIC_JWT_ALGORITHM: z
		.enum(['ES256', 'RS256', 'HS256'])
		.default('ES256'),

	// Stripe Client
	NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_'),

	// Feature Flags
	NEXT_PUBLIC_ENABLE_DEBUG_LOGGING: z
		.string()
		.optional()
		.transform(v => v === 'true'),
	NEXT_PUBLIC_ENABLE_ANALYTICS: z
		.string()
		.optional()
		.transform(v => v === 'true')
})

// Parse at module load - extracts only NEXT_PUBLIC_* vars
export const clientEnv = clientEnvSchema.parse({
	NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
	NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
	NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
	NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
	NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
	NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
		process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
	NEXT_PUBLIC_JWT_ALGORITHM: process.env.NEXT_PUBLIC_JWT_ALGORITHM,
	NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
		process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
	NEXT_PUBLIC_ENABLE_DEBUG_LOGGING:
		process.env.NEXT_PUBLIC_ENABLE_DEBUG_LOGGING,
	NEXT_PUBLIC_ENABLE_ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS
})
