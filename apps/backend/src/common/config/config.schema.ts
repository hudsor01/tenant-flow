import { z } from 'zod'

/**
 * Environment Configuration Schema using Zod
 *
 * This schema provides:
 * - Runtime type validation for all environment variables
 * - Type-safe configuration throughout the application
 * - Better error messages for configuration issues
 * - Automatic type inference for TypeScript
 */

// Base URL validation schema
const urlSchema = z.string().url('Must be a valid URL')

// PostgreSQL connection string validation
const postgresUrlSchema = z
	.string()
	.refine(
		url => url.startsWith('postgresql://') || url.startsWith('postgres://'),
		'Must be a valid PostgreSQL connection string'
	)

// JWT secret validation (minimum 32 characters for security)
const jwtSecretSchema = z
	.string()
	.min(32, 'JWT secret must be at least 32 characters for security')

// CORS origins validation
const corsOriginsSchema = z
	.string()
	.optional()
	.default('')
	.transform(str => (str ? str.split(',').map(origin => origin.trim()) : []))
	.refine(
		origins =>
			origins.length === 0 ||
			origins.every(origin => {
				try {
					new URL(origin)
					return true
				} catch {
					return false
				}
			}),
		'All CORS origins must be valid URLs'
	)
	.refine(origins => {
		// Only enforce HTTPS in actual production deployment environments
		// Allow HTTP origins for local production testing (NODE_ENV=production locally)
		const isActualProductionDeployment =
			process.env.NODE_ENV === 'production' &&
			(process.env.RAILWAY_ENVIRONMENT === 'production' ||
				process.env.VERCEL_ENV === 'production' ||
				process.env.DOCKER_CONTAINER === 'true')

		if (isActualProductionDeployment && origins.length > 0) {
			const httpOrigins = origins.filter(origin =>
				origin.startsWith('http://')
			)
			if (httpOrigins.length > 0) {
				return false // Will trigger error message below
			}
		}
		return true
	}, 'Production deployment cannot have HTTP origins')

// Port validation
const portSchema = z
	.string()
	.optional()
	.transform(val => (val ? parseInt(val, 10) : 3001))
	.refine(
		port => port > 0 && port < 65536,
		'Port must be between 1 and 65535'
	)

// Node environment validation
// CRITICAL: Don't default to development - require explicit setting
const nodeEnvSchema = z
	.enum(['development', 'production', 'test'])
	.optional()
	.default('production')

// Main configuration schema
export const configSchema = z
	.object({
		// Application
		NODE_ENV: nodeEnvSchema,
		PORT: portSchema,

		// Database
		DATABASE_URL: postgresUrlSchema.optional(),
		DIRECT_URL: postgresUrlSchema.optional(),
		DATABASE_MAX_CONNECTIONS: z.string().optional(),
		DATABASE_CONNECTION_TIMEOUT: z.string().optional(),

		// Authentication
		JWT_SECRET: jwtSecretSchema.optional(),
		JWT_EXPIRES_IN: z.string().default('7d'),

		// Supabase
		SUPABASE_URL: urlSchema.optional(),
		SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
		SUPABASE_JWT_SECRET: jwtSecretSchema.optional(),

		// CORS
		CORS_ORIGINS: corsOriginsSchema,

		// Rate Limiting
		RATE_LIMIT_TTL: z.string().optional(),
		RATE_LIMIT_LIMIT: z.string().optional(),

		// Stripe (optional in development)
		STRIPE_SECRET_KEY: z.string().optional(),
		STRIPE_PUBLISHABLE_KEY: z.string().optional(),
		STRIPE_WEBHOOK_SECRET: z.string().optional(),
		STRIPE_PRICE_ID_STARTER: z.string().optional(),
		STRIPE_PRICE_ID_GROWTH: z.string().optional(),
		STRIPE_PRICE_ID_BUSINESS: z.string().optional(),
		STRIPE_PRICE_ID_TENANTFLOW_MAX: z.string().optional(),

		// Redis (optional)
		REDIS_URL: z.string().optional(),
		REDIS_HOST: z.string().optional(),
		REDIS_PORT: z.string().optional(),
		REDIS_PASSWORD: z.string().optional(),
		REDIS_DB: z.string().optional(),

		// Logging
		LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

		// Monitoring
		ENABLE_METRICS: z
			.string()
			.optional()
			.transform(val => val === 'true')
			.default(false),

		// File Storage
		STORAGE_PROVIDER: z
			.enum(['local', 'supabase', 's3'])
			.default('supabase'),
		STORAGE_BUCKET: z.string().default('tenant-flow-storage'),

		// Email (optional)
		SMTP_HOST: z.string().optional(),
		SMTP_PORT: z.string().optional(),
		SMTP_USER: z.string().optional(),
		SMTP_PASS: z.string().optional(),
		FROM_EMAIL: z.string().email().optional(),

		// Resend Email Service
		RESEND_API_KEY: z.string().optional(),
		RESEND_FROM_EMAIL: z
			.string()
			.email()
			.optional()
			.default('noreply@tenantflow.app'),

		// Security
		CSRF_SECRET: z.string().optional(),
		SESSION_SECRET: z
			.string()
			.min(32, 'Session secret must be at least 32 characters')
			.optional(),

		// Feature Flags
		ENABLE_SWAGGER: z
			.string()
			.optional()
			.transform(val => val === 'true')
			.default(false),

		ENABLE_RATE_LIMITING: z
			.string()
			.optional()
			.transform(val => val !== 'false')
			.default(true),

		// Railway Platform Detection
		RAILWAY_ENVIRONMENT: z.string().optional(),
		RAILWAY_SERVICE_NAME: z.string().optional(),
		RAILWAY_PROJECT_ID: z.string().optional(),
		RAILWAY_DEPLOYMENT_ID: z.string().optional(),
		RAILWAY_PUBLIC_DOMAIN: z.string().optional(),
		RAILWAY_STATIC_URL: z.string().url().optional(),
		RAILWAY_GIT_COMMIT_SHA: z.string().optional(),
		RAILWAY_GIT_BRANCH: z.string().optional(),
		RAILWAY_BUILD_ID: z.string().optional(),

		// Vercel Platform Detection
		VERCEL_ENV: z.string().optional(),
		VERCEL_URL: z.string().optional(),

		// Docker Detection
		DOCKER_CONTAINER: z
			.string()
			.optional()
			.transform(val => val === 'true')
			.default(false)
	})
	.superRefine((config, ctx) => {
		// In production, certain fields are required
		if (config.NODE_ENV === 'production') {
			if (!config.DATABASE_URL) {
				ctx.addIssue({
					code: 'custom',
					path: ['DATABASE_URL'],
					message: 'DATABASE_URL is required in production'
				})
			}
			if (!config.DIRECT_URL) {
				ctx.addIssue({
					code: 'custom',
					path: ['DIRECT_URL'],
					message: 'DIRECT_URL is required in production'
				})
			}
			if (!config.JWT_SECRET) {
				ctx.addIssue({
					code: 'custom',
					path: ['JWT_SECRET'],
					message: 'JWT_SECRET is required in production'
				})
			}
			if (!config.SUPABASE_URL) {
				ctx.addIssue({
					code: 'custom',
					path: ['SUPABASE_URL'],
					message: 'SUPABASE_URL is required in production'
				})
			}
			if (!config.SUPABASE_SERVICE_ROLE_KEY) {
				ctx.addIssue({
					code: 'custom',
					path: ['SUPABASE_SERVICE_ROLE_KEY'],
					message:
						'SUPABASE_SERVICE_ROLE_KEY is required in production'
				})
			}
			if (!config.SUPABASE_JWT_SECRET) {
				ctx.addIssue({
					code: 'custom',
					path: ['SUPABASE_JWT_SECRET'],
					message: 'SUPABASE_JWT_SECRET is required in production'
				})
			}
		}
	})

// Inferred TypeScript type from schema
export type Config = z.infer<typeof configSchema>

// Derived configuration objects for better organization
export const createDerivedConfig = (config: Config) => ({
	database: {
		url: config.DATABASE_URL || '',
		directUrl: config.DIRECT_URL || '',
		maxConnections: config.DATABASE_MAX_CONNECTIONS
			? parseInt(config.DATABASE_MAX_CONNECTIONS)
			: 10,
		connectionTimeout: config.DATABASE_CONNECTION_TIMEOUT
			? parseInt(config.DATABASE_CONNECTION_TIMEOUT)
			: 5000
	},

	supabase: {
		url: config.SUPABASE_URL || '',
		serviceRoleKey: config.SUPABASE_SERVICE_ROLE_KEY || '',
		jwtSecret: config.SUPABASE_JWT_SECRET || ''
	},

	jwt: {
		secret: config.JWT_SECRET || '',
		expiresIn: config.JWT_EXPIRES_IN
	},

	cors: {
		origins: config.CORS_ORIGINS || [] // Already an array from corsOriginsSchema transform
	},

	rateLimit: {
		ttl: config.RATE_LIMIT_TTL ? parseInt(config.RATE_LIMIT_TTL) : 60000,
		limit: config.RATE_LIMIT_LIMIT ? parseInt(config.RATE_LIMIT_LIMIT) : 100
	},

	stripe: {
		secretKey: config.STRIPE_SECRET_KEY,
		publishableKey: config.STRIPE_PUBLISHABLE_KEY,
		webhookSecret: config.STRIPE_WEBHOOK_SECRET,
		priceIds: {
			starter: config.STRIPE_PRICE_ID_STARTER,
			growth: config.STRIPE_PRICE_ID_GROWTH,
			business: config.STRIPE_PRICE_ID_BUSINESS,
			tenantflow_max: config.STRIPE_PRICE_ID_TENANTFLOW_MAX
		}
	},

	redis: {
		url: config.REDIS_URL,
		host: config.REDIS_HOST || 'localhost',
		port: config.REDIS_PORT ? parseInt(config.REDIS_PORT) : 6379,
		password: config.REDIS_PASSWORD,
		db: config.REDIS_DB ? parseInt(config.REDIS_DB) : 0
	},

	app: {
		port: config.PORT,
		nodeEnv: config.NODE_ENV,
		logLevel: config.LOG_LEVEL,
		enableMetrics: config.ENABLE_METRICS,
		enableSwagger: config.ENABLE_SWAGGER,
		enableRateLimiting: config.ENABLE_RATE_LIMITING
	},

	storage: {
		provider: config.STORAGE_PROVIDER,
		bucket: config.STORAGE_BUCKET
	},

	email: {
		smtp: {
			host: config.SMTP_HOST,
			port: config.SMTP_PORT ? parseInt(config.SMTP_PORT) : 587,
			user: config.SMTP_USER,
			pass: config.SMTP_PASS
		},
		from: config.FROM_EMAIL
	},

	security: {
		csrfSecret: config.CSRF_SECRET,
		sessionSecret: config.SESSION_SECRET
	},

	// Deployment Platform Detection
	deployment: {
		platform: (() => {
			if (config.RAILWAY_ENVIRONMENT) {
				return 'railway' as const
			}
			if (config.VERCEL_ENV) {
				return 'vercel' as const
			}
			if (config.DOCKER_CONTAINER) {
				return 'docker' as const
			}
			return 'unknown' as const
		})(),

		isRailway: !!config.RAILWAY_ENVIRONMENT,
		isVercel: !!config.VERCEL_ENV,
		isDocker: !!config.DOCKER_CONTAINER,

		// Railway-specific info
		railway: config.RAILWAY_ENVIRONMENT
			? {
					environment: config.RAILWAY_ENVIRONMENT,
					serviceName: config.RAILWAY_SERVICE_NAME,
					projectId: config.RAILWAY_PROJECT_ID,
					deploymentId: config.RAILWAY_DEPLOYMENT_ID,
					publicDomain: config.RAILWAY_PUBLIC_DOMAIN,
					staticUrl: config.RAILWAY_STATIC_URL,
					gitCommit: config.RAILWAY_GIT_COMMIT_SHA,
					gitBranch: config.RAILWAY_GIT_BRANCH,
					buildId: config.RAILWAY_BUILD_ID,
					// Computed service URL
					serviceUrl:
						config.RAILWAY_STATIC_URL ||
						(config.RAILWAY_PUBLIC_DOMAIN
							? `https://${config.RAILWAY_PUBLIC_DOMAIN}`
							: undefined)
				}
			: null,

		// Vercel-specific info
		vercel: config.VERCEL_ENV
			? {
					environment: config.VERCEL_ENV,
					url: config.VERCEL_URL
				}
			: null,

		// Docker info
		docker: config.DOCKER_CONTAINER
			? {
					isContainer: true
				}
			: null
	}
})

export type DerivedConfig = ReturnType<typeof createDerivedConfig>
