/**
 * Compile-time configuration constants.
 * Extracting static values enables tree shaking and guarantees zero runtime cost.
 */
export const NODE_ENVIRONMENTS = [
	'development',
	'production',
	'test'
] as const

export const LOG_LEVELS = ['error', 'warn', 'info', 'debug'] as const

export const STORAGE_PROVIDERS = ['local', 'supabase', 's3'] as const

export const CONFIG_DEFAULTS = {
	NODE_ENV: 'production',
	PORT: 4600,
	FRONTEND_URL: 'https://tenantflow.app',
	JWT_EXPIRES_IN: '7d',
	BACKEND_TIMEOUT_MS: '30000',
	STRIPE_SYNC_DATABASE_SCHEMA: 'stripe',
	STRIPE_SYNC_AUTO_EXPAND_LISTS: true,
	STRIPE_SYNC_BACKFILL_RELATED_ENTITIES: true,
	STRIPE_SYNC_MAX_POSTGRES_CONNECTIONS: 10,
	STRIPE_CONNECT_DEFAULT_COUNTRY: 'US',
	LOG_LEVEL: 'info',
	ENABLE_METRICS: true,
	STORAGE_PROVIDER: 'supabase',
	STORAGE_BUCKET: 'tenant-flow-storage',
	RESEND_FROM_EMAIL: 'noreply@tenantflow.app',
	ENABLE_SWAGGER: false,
	ENABLE_RATE_LIMITING: true,
	ALLOW_LOCALHOST_CORS: false,
	DOCKER_CONTAINER: false,
	SUPABASE_PROJECT_REF: 'bshjmbshupiibfiewpxb',
	API_BASE_URL: 'https://api.tenantflow.app',
	// Rate limiting defaults (in milliseconds and requests)
	RATE_LIMIT_TTL: '60000', // 60 seconds
	RATE_LIMIT_LIMIT: '100', // 100 requests per window
	WEBHOOK_THROTTLE_TTL: '60000', // 60 seconds for webhooks
	WEBHOOK_THROTTLE_LIMIT: '30' // 30 webhook requests per window
} as const

export type NodeEnvironment = (typeof NODE_ENVIRONMENTS)[number]
export type LogLevel = (typeof LOG_LEVELS)[number]
export type StorageProvider = (typeof STORAGE_PROVIDERS)[number]
