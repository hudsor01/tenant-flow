import { z } from 'zod'
import {
	LOG_LEVELS,
	NODE_ENVIRONMENTS,
	STORAGE_PROVIDERS
} from './config.constants'

/**
 * Environment Configuration using Zod (CLAUDE.md compliant)
 *
 * Native Zod validation - no custom DTOs or decorators
 * Default values are inlined directly for single source of truth
 */

const environmentSchema = z.object({
	// Application
	NODE_ENV: z
		.enum(NODE_ENVIRONMENTS)
		.default('production'),
	PORT: z.coerce.number().default(4600),
  BACKEND_TIMEOUT_MS: z.coerce.number().default(30000),
	API_BASE_URL: z.string().url('Must be a valid URL').default('https://api.tenantflow.app'),

	// Frontend
	FRONTEND_URL: z
		.string()
		.url('Must be a valid URL')
		.default('https://tenantflow.app'),
	NEXT_PUBLIC_APP_URL: z.string().url('Must be a valid URL'),

	// Database
	DATABASE_URL: z.string(),
	DIRECT_URL: z.string().optional(),
	DATABASE_MAX_CONNECTIONS: z.string().optional(),
	DATABASE_CONNECTION_TIMEOUT: z.string().optional(),

	// Authentication
	JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
	// JWT public keys for asymmetric algorithms (supporting key rotation)
	JWT_PUBLIC_KEY_CURRENT: z.string().optional(),
	JWT_PUBLIC_KEY_STANDBY: z.string().optional(),
	JWT_EXPIRES_IN: z.string().default('7d'),

	// Supabase (using modern API key naming convention)
	SB_URL: z.string().url('Must be a valid URL'),
	SB_SECRET_KEY: z.string(),
	/**
	 * Supabase JWT Secret - Legacy field, not currently used
	 * Supabase now uses JWKS (JSON Web Key Set) discovery with asymmetric key verification (ES256/RS256)
	 * This field is kept for potential future use or migration scenarios
	 */
	SB_JWT_SECRET: z
		.string()
		.min(32, 'Supabase JWT secret must be at least 32 characters')
		.optional(),
	/**
	 * Supabase JWT Algorithm - ES256 (JWKS default) or RS256
	 * Supabase uses asymmetric key verification via JWKS endpoint (no shared secrets)
	 * Configuration is detected from JWT header (kid) and JWKS discovery
	 */
	SB_JWT_ALGORITHM: z
		.preprocess(
			val => (typeof val === 'string' ? val.toUpperCase().trim() : val),
			z.enum(['ES256', 'RS256']).default('ES256')
		),
	SB_PUBLISHABLE_KEY: z.string(),
	SB_PROJECT_REF: z.string().default('bshjmbshupiibfiewpxb'),
	SB_AUTH_WEBHOOK_SECRET: z.string().optional(),

	// CORS
	CORS_ORIGINS: z.string().optional(),

	// Rate Limiting
	RATE_LIMIT_TTL: z.string().optional(),
	RATE_LIMIT_LIMIT: z.string().optional(),
	HEALTH_THROTTLE_TTL: z
		.coerce.number()
		.default(60000),
	HEALTH_THROTTLE_LIMIT: z
		.coerce.number()
		.default(300),
	CONTACT_THROTTLE_TTL: z
		.coerce.number()
		.default(60000),
	CONTACT_THROTTLE_LIMIT: z
		.coerce.number()
		.default(5),
	METRICS_THROTTLE_TTL: z
		.coerce.number()
		.default(60000),
	METRICS_THROTTLE_LIMIT: z
		.coerce.number()
		.default(60),
	WEBHOOK_THROTTLE_TTL: z.coerce.number().default(60000),
	WEBHOOK_THROTTLE_LIMIT: z.coerce.number().default(30),
	STRIPE_SYNC_THROTTLE_TTL: z
		.coerce.number()
		.default(60000),
	STRIPE_SYNC_THROTTLE_LIMIT: z
		.coerce.number()
		.default(30),
	SB_AUTH_THROTTLE_TTL: z
		.coerce.number()
		.default(60000),
	SB_AUTH_THROTTLE_LIMIT: z
		.coerce.number()
		.default(30),
	TENANT_INVITATION_THROTTLE_TTL: z
		.coerce.number()
		.default(3600000),
	TENANT_INVITATION_THROTTLE_LIMIT: z
		.coerce.number()
		.default(5),

	// Health Check Thresholds
	HEALTH_MEMORY_WARNING_THRESHOLD: z
		.coerce.number()
		.default(80),
	HEALTH_MEMORY_CRITICAL_THRESHOLD: z
		.coerce.number()
		.default(95),
	HEALTH_RESPONSE_TIME_WARNING_THRESHOLD: z
		.coerce.number()
		.default(100),
	HEALTH_RESPONSE_TIME_CRITICAL_THRESHOLD: z
		.coerce.number()
		.default(200),
	HEALTH_CACHE_MAX_ENTRIES: z
		.coerce.number()
		.default(100),

	// Stripe
	STRIPE_SECRET_KEY: z.string(),
	STRIPE_PUBLISHABLE_KEY: z.string().optional(),
	STRIPE_WEBHOOK_SECRET: z.string(),

	// Stripe Sync Engine Configuration (hardcoded industry best practice defaults)
	STRIPE_SYNC_DATABASE_SCHEMA: z
		.string()
		.default('stripe'),
	STRIPE_SYNC_AUTO_EXPAND_LISTS: z
		.coerce.boolean()
		.default(true),
	STRIPE_SYNC_BACKFILL_RELATED_ENTITIES: z
		.coerce.boolean()
		.default(true),
	STRIPE_SYNC_MAX_POSTGRES_CONNECTIONS: z
		.coerce.number()
		.default(10),
	STRIPE_PRICE_ID_STARTER: z.string().optional(),
	STRIPE_PRICE_ID_GROWTH: z.string().optional(),
	STRIPE_PRICE_ID_BUSINESS: z.string().optional(),
	STRIPE_PRICE_ID_TENANTFLOW_MAX: z.string().optional(),
	STRIPE_CONNECT_DEFAULT_COUNTRY: z
		.string()
		.default('US'),

	// Redis
	REDIS_URL: z.string().optional(),
	REDIS_HOST: z.string().optional(),
	REDIS_PORT: z.string().optional(),
	REDIS_PASSWORD: z.string().optional(),
	REDIS_DB: z.string().optional(),

	// Logging
	LOG_LEVEL: z.enum(LOG_LEVELS).default('info'),

	// Monitoring
	ENABLE_METRICS: z
		.coerce.boolean()
		.default(true),
	PROMETHEUS_BEARER_TOKEN: z
		.string()
		.min(16, 'PROMETHEUS_BEARER_TOKEN must be at least 16 characters')
		.optional(),
	PROMETHEUS_REQUIRE_AUTH: z
		.preprocess(
			val => (typeof val === 'string' ? val === 'true' : val),
			z.boolean()
		)
		.default(true),

	// File Storage
	STORAGE_PROVIDER: z
		.enum(STORAGE_PROVIDERS)
		.default('supabase'),
	STORAGE_BUCKET: z.string().default('tenant-flow-storage'),

	// Email
	SMTP_HOST: z.string().optional(),
	SMTP_PORT: z.string().optional(),
	SMTP_USER: z.string().optional(),
	SMTP_PASS: z.string().optional(),
	FROM_EMAIL: z.string().email('Must be a valid email address').optional(),
	SUPPORT_EMAIL: z.string().email('Must be a valid email address'),
	SUPPORT_PHONE: z.string().optional(),

	// Resend
	RESEND_API_KEY: z.string(),
	RESEND_FROM_EMAIL: z
		.string()
		.email('Must be a valid email address')
		.default('noreply@tenantflow.app'),
	TEST_RESEND_API_KEY: z.string().optional(),

	// Security
	IDEMPOTENCY_KEY_SECRET: z.string().min(32, 'Idempotency key secret must be at least 32 characters'),
	CSRF_SECRET: z.string().optional(),
	SESSION_SECRET: z
		.string()
		.min(32, 'Session secret must be at least 32 characters')
		.optional(),

	// Production Features
	ENABLE_SWAGGER: z
		.coerce.boolean()
		.default(false),
	ENABLE_RATE_LIMITING: z
		.coerce.boolean()
		.default(true),

	// Platform Detection
	RAILWAY_PUBLIC_DOMAIN: z.string().optional(),
	RAILWAY_PRIVATE_DOMAIN: z.string().optional(),
	RAILWAY_PROJECT_NAME: z.string().optional(),
	RAILWAY_ENVIRONMENT_NAME: z.string().optional(),
	RAILWAY_SERVICE_NAME: z.string().optional(),
	RAILWAY_PROJECT_ID: z.string().optional(),
	RAILWAY_ENVIRONMENT_ID: z.string().optional(),
	RAILWAY_SERVICE_ID: z.string().optional(),
	ALLOW_LOCALHOST_CORS: z
		.coerce.boolean()
		.default(false),
	REDISHOST: z.string().optional(),
	REDISPASSWORD: z.string().optional(),
	REDISPORT: z.string().optional(),
	VERCEL_ENV: z.string().optional(),
	VERCEL_URL: z.string().optional(),
	DOCKER_CONTAINER: z
		.coerce.boolean()
		.default(false)
})

export function validate(config: Record<string, unknown>) {
	try {
		return environmentSchema.parse(config)
	} catch (error) {
		if (error instanceof z.ZodError) {
			const errorMessages = error.issues.map(err => {
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
