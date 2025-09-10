import { z } from 'zod'

/**
 * Environment Configuration using Zod (CLAUDE.md compliant)
 * 
 * Native Zod validation - no custom DTOs or decorators
 */

const environmentSchema = z.object({
	// Application
	NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
	PORT: z.coerce.number().default(4600),

	// Database
	DATABASE_URL: z.string(),
	DIRECT_URL: z.string().optional(),
	DATABASE_MAX_CONNECTIONS: z.string().optional(),
	DATABASE_CONNECTION_TIMEOUT: z.string().optional(),

	// Authentication
	JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
	JWT_EXPIRES_IN: z.string().default('7d'),

	// Supabase
	SUPABASE_URL: z.string().url('Must be a valid URL'),
	SUPABASE_SERVICE_ROLE_KEY: z.string(),
	SUPABASE_JWT_SECRET: z.string().min(32, 'Supabase JWT secret must be at least 32 characters'),
	SUPABASE_ANON_KEY: z.string(),

	// CORS
	CORS_ORIGINS: z.string().optional(),

	// Rate Limiting
	RATE_LIMIT_TTL: z.string().optional(),
	RATE_LIMIT_LIMIT: z.string().optional(),

	// Stripe
	STRIPE_SECRET_KEY: z.string(),
	STRIPE_PUBLISHABLE_KEY: z.string().optional(),
	STRIPE_WEBHOOK_SECRET: z.string(),

	// Stripe Sync Engine Configuration
	STRIPE_SYNC_DATABASE_SCHEMA: z.string().default('stripe'),
	STRIPE_SYNC_AUTO_EXPAND_LISTS: z.coerce.boolean().default(true),
	STRIPE_SYNC_BACKFILL_RELATED_ENTITIES: z.coerce.boolean().default(true),
	STRIPE_SYNC_MAX_POSTGRES_CONNECTIONS: z.coerce.number().default(10),
	STRIPE_PRICE_ID_STARTER: z.string().optional(),
	STRIPE_PRICE_ID_GROWTH: z.string().optional(),
	STRIPE_PRICE_ID_BUSINESS: z.string().optional(),
	STRIPE_PRICE_ID_TENANTFLOW_MAX: z.string().optional(),

	// Redis
	REDIS_URL: z.string().optional(),
	REDIS_HOST: z.string().optional(),
	REDIS_PORT: z.string().optional(),
	REDIS_PASSWORD: z.string().optional(),
	REDIS_DB: z.string().optional(),

	// Logging
	LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

	// Monitoring
	ENABLE_METRICS: z.coerce.boolean().default(false),

	// File Storage
	STORAGE_PROVIDER: z.enum(['local', 'supabase', 's3']).default('supabase'),
	STORAGE_BUCKET: z.string().default('tenant-flow-storage'),

	// Email
	SMTP_HOST: z.string().optional(),
	SMTP_PORT: z.string().optional(),
	SMTP_USER: z.string().optional(),
	SMTP_PASS: z.string().optional(),
	FROM_EMAIL: z.string().email('Must be a valid email address').optional(),

	// Resend
	RESEND_API_KEY: z.string().optional(),
	RESEND_FROM_EMAIL: z.string().email('Must be a valid email address').default('noreply@tenantflow.app'),

	// Analytics
	POSTHOG_KEY: z.string().optional(),

	// Security
	CSRF_SECRET: z.string().optional(),
	SESSION_SECRET: z.string().min(32, 'Session secret must be at least 32 characters').optional(),

	// Production Features
	ENABLE_SWAGGER: z.coerce.boolean().default(false),
	ENABLE_RATE_LIMITING: z.coerce.boolean().default(true),

	// Platform Detection
	RAILWAY_PUBLIC_DOMAIN: z.string().optional(),
	RAILWAY_PRIVATE_DOMAIN: z.string().optional(),
	RAILWAY_PROJECT_NAME: z.string().optional(),
	RAILWAY_ENVIRONMENT_NAME: z.string().optional(),
	RAILWAY_SERVICE_NAME: z.string().optional(),
	RAILWAY_PROJECT_ID: z.string().optional(),
	RAILWAY_ENVIRONMENT_ID: z.string().optional(),
	RAILWAY_SERVICE_ID: z.string().optional(),
	ALLOW_LOCALHOST_CORS: z.coerce.boolean().default(false),
	REDISHOST: z.string().optional(),
	REDISPASSWORD: z.string().optional(),
	REDISPORT: z.string().optional(),
	VERCEL_ENV: z.string().optional(),
	VERCEL_URL: z.string().optional(),
	DOCKER_CONTAINER: z.coerce.boolean().default(false)
})

export function validate(config: Record<string, unknown>) {
	try {
		return environmentSchema.parse(config)
	} catch (error) {
		if (error instanceof z.ZodError) {
			const errorMessages = error.issues.map((err) => {
				return `${err.path.join('.')}: ${err.message}`
			})
			throw new Error(
				`Configuration validation failed: ${errorMessages.join('; ')}`
			)
		}
		throw error
	}
}

export type Config = z.infer<typeof environmentSchema>