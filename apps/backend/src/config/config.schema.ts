import { z } from 'zod'
import {
	CONFIG_DEFAULTS,
	LOG_LEVELS,
	NODE_ENVIRONMENTS,
	STORAGE_PROVIDERS
} from './config.constants'

/**
 * Environment Configuration using Zod (CLAUDE.md compliant)
 *
 * Native Zod validation - no custom DTOs or decorators
 */

const environmentSchema = z.object({
	// Application
	NODE_ENV: z
		.enum(NODE_ENVIRONMENTS)
		.default(CONFIG_DEFAULTS.NODE_ENV),
	PORT: z.coerce.number().default(CONFIG_DEFAULTS.PORT),
  BACKEND_TIMEOUT_MS: z.coerce.number().default(Number(CONFIG_DEFAULTS.BACKEND_TIMEOUT_MS)),
	API_BASE_URL: z.string().url('Must be a valid URL').default(CONFIG_DEFAULTS.API_BASE_URL),

	// Frontend
	FRONTEND_URL: z
		.string()
		.url('Must be a valid URL')
		.default(CONFIG_DEFAULTS.FRONTEND_URL),
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
	JWT_EXPIRES_IN: z.string().default(CONFIG_DEFAULTS.JWT_EXPIRES_IN),

	// Supabase (using modern API key naming convention)
	SUPABASE_URL: z.string().url('Must be a valid URL'),
	SUPABASE_SECRET_KEY: z.string(),
	/**
	 * Supabase JWT Secret - Get this from your Supabase dashboard under Settings > JWT Keys > Current Signing Key
	 * This is used for JWT verification instead of relying on JWKS endpoints
	 */
	SUPABASE_JWT_SECRET: z
		.string()
		.min(32, 'Supabase JWT secret must be at least 32 characters')
		.optional(),
	/**
	 * Supabase JWT Algorithm - Defaults to ES256 (Supabase's default)
	 * Only ES256 is currently supported for direct key verification
	 */
	SUPABASE_JWT_ALGORITHM: z
		.string()
		.transform(val => val.toUpperCase().trim())
		.pipe(z.enum(['ES256', 'RS256']))
		.optional(),
	SUPABASE_PUBLISHABLE_KEY: z.string(),
	SUPABASE_PROJECT_REF: z.string().default(CONFIG_DEFAULTS.SUPABASE_PROJECT_REF),
	SUPABASE_AUTH_WEBHOOK_SECRET: z.string().optional(),

	// CORS
	CORS_ORIGINS: z.string().optional(),

	// Rate Limiting
	RATE_LIMIT_TTL: z.string().optional(),
	RATE_LIMIT_LIMIT: z.string().optional(),
	WEBHOOK_THROTTLE_TTL: z.coerce.number().default(Number(CONFIG_DEFAULTS.WEBHOOK_THROTTLE_TTL)),
	WEBHOOK_THROTTLE_LIMIT: z.coerce.number().default(Number(CONFIG_DEFAULTS.WEBHOOK_THROTTLE_LIMIT)),

	// Stripe
	STRIPE_SECRET_KEY: z.string(),
	STRIPE_PUBLISHABLE_KEY: z.string().optional(),
	STRIPE_WEBHOOK_SECRET: z.string(),

	// Stripe Sync Engine Configuration (hardcoded industry best practice defaults)
	STRIPE_SYNC_DATABASE_SCHEMA: z
		.string()
		.default(CONFIG_DEFAULTS.STRIPE_SYNC_DATABASE_SCHEMA),
	STRIPE_SYNC_AUTO_EXPAND_LISTS: z
		.coerce.boolean()
		.default(CONFIG_DEFAULTS.STRIPE_SYNC_AUTO_EXPAND_LISTS),
	STRIPE_SYNC_BACKFILL_RELATED_ENTITIES: z
		.coerce.boolean()
		.default(CONFIG_DEFAULTS.STRIPE_SYNC_BACKFILL_RELATED_ENTITIES),
	STRIPE_SYNC_MAX_POSTGRES_CONNECTIONS: z
		.coerce.number()
		.default(CONFIG_DEFAULTS.STRIPE_SYNC_MAX_POSTGRES_CONNECTIONS),
	STRIPE_PRICE_ID_STARTER: z.string().optional(),
	STRIPE_PRICE_ID_GROWTH: z.string().optional(),
	STRIPE_PRICE_ID_BUSINESS: z.string().optional(),
	STRIPE_PRICE_ID_TENANTFLOW_MAX: z.string().optional(),
	STRIPE_CONNECT_DEFAULT_COUNTRY: z
		.string()
		.default(CONFIG_DEFAULTS.STRIPE_CONNECT_DEFAULT_COUNTRY),

	// Redis
	REDIS_URL: z.string().optional(),
	REDIS_HOST: z.string().optional(),
	REDIS_PORT: z.string().optional(),
	REDIS_PASSWORD: z.string().optional(),
	REDIS_DB: z.string().optional(),

	// Logging
	LOG_LEVEL: z.enum(LOG_LEVELS).default(CONFIG_DEFAULTS.LOG_LEVEL),

	// Monitoring
	ENABLE_METRICS: z
		.coerce.boolean()
		.default(CONFIG_DEFAULTS.ENABLE_METRICS),
	PROMETHEUS_BEARER_TOKEN: z
		.string()
		.min(16, 'PROMETHEUS_BEARER_TOKEN must be at least 16 characters')
		.optional(),

	// File Storage
	STORAGE_PROVIDER: z
		.enum(STORAGE_PROVIDERS)
		.default(CONFIG_DEFAULTS.STORAGE_PROVIDER),
	STORAGE_BUCKET: z.string().default(CONFIG_DEFAULTS.STORAGE_BUCKET),

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
		.default(CONFIG_DEFAULTS.RESEND_FROM_EMAIL),
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
		.default(CONFIG_DEFAULTS.ENABLE_SWAGGER),
	ENABLE_RATE_LIMITING: z
		.coerce.boolean()
		.default(CONFIG_DEFAULTS.ENABLE_RATE_LIMITING),

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
		.default(CONFIG_DEFAULTS.ALLOW_LOCALHOST_CORS),
	REDISHOST: z.string().optional(),
	REDISPASSWORD: z.string().optional(),
	REDISPORT: z.string().optional(),
	VERCEL_ENV: z.string().optional(),
	VERCEL_URL: z.string().optional(),
	DOCKER_CONTAINER: z
		.coerce.boolean()
		.default(CONFIG_DEFAULTS.DOCKER_CONTAINER)
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
