/**
 * Application Configuration Constants
 *
 * Centralized configuration for the backend application.
 * All environment-dependent values should be defined here.
 */

export const APP_CONFIG = {
	// Application URLs
	FRONTEND_URL:
		process.env.FRONTEND_URL ||
		(process.env.NODE_ENV === 'production'
			? 'https://tenantflow.app'
			: 'http://tenantflow.app'),

	// API Configuration
	API_PORT: process.env.PORT || '3002',
	API_PREFIX: '/api',

	// CORS Configuration
	ALLOWED_ORIGINS: process.env.CORS_ORIGINS?.split(',') || [],

	// Development Ports (only used in non-production)
	DEV_PORTS: {
		FRONTEND: ['5172', '5173', '5174', '5175'],
		BACKEND: ['3000', '3001', '3002', '3003', '3004']
	},

	// External Services
	SUPABASE: {
		URL: process.env.SUPABASE_URL,
		SERVICE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
		ANON_KEY: process.env.SUPABASE_ANON_KEY
	},

	// Stripe Configuration
	STRIPE: {
		SECRET_KEY: process.env.STRIPE_SECRET_KEY,
		WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
		// Portal return URL
		PORTAL_RETURN_URL:
			process.env.STRIPE_PORTAL_RETURN_URL ||
			process.env.FRONTEND_URL ||
			(process.env.NODE_ENV === 'production'
				? 'https://tenantflow.app/settings/billing'
				: 'http://tenantflow.app/settings/billing')
	},

	// Email Configuration
	EMAIL: {
		RESEND_API_KEY: process.env.RESEND_API_KEY,
		FROM_ADDRESS:
			process.env.EMAIL_FROM_ADDRESS || 'noreply@tenantflow.app',
		SUPPORT_EMAIL: process.env.SUPPORT_EMAIL || 'support@tenantflow.app'
	},

	// Feature Flags
	FEATURES: {
		ENABLE_TELEMETRY: process.env.ENABLE_TELEMETRY === 'true',
		ENABLE_DEBUG_LOGGING: process.env.ENABLE_DEBUG_LOGGING === 'true',
		ENABLE_MAINTENANCE_MODE: process.env.ENABLE_MAINTENANCE_MODE === 'true'
	},

	// Environment
	IS_PRODUCTION: process.env.NODE_ENV === 'production',
	IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
	IS_TEST: process.env.NODE_ENV === 'test',

	// Database
	DATABASE_URL: process.env.DATABASE_URL,

	// Security
	JWT_SECRET: process.env.JWT_SECRET,
	JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

	// Rate Limiting
	RATE_LIMIT: {
		WINDOW_MS: 15 * 60 * 1000, // 15 minutes
		MAX_REQUESTS: process.env.RATE_LIMIT_MAX || 100
	}
} as const

// Validation function to ensure required config is present
export function validateConfig(): void {
	const requiredVars = [
		{ key: 'DATABASE_URL', value: APP_CONFIG.DATABASE_URL },
		{ key: 'JWT_SECRET', value: APP_CONFIG.JWT_SECRET },
		{ key: 'SUPABASE_URL', value: APP_CONFIG.SUPABASE.URL },
		{
			key: 'SUPABASE_SERVICE_ROLE_KEY',
			value: APP_CONFIG.SUPABASE.SERVICE_KEY
		}
	]

	const missing = requiredVars
		.filter(({ value }) => !value)
		.map(({ key }) => key)

	if (missing.length > 0) {
		throw new Error(
			`Missing required environment variables: ${missing.join(', ')}\n` +
				'Please check your .env file and ensure all required variables are set.'
		)
	}
}

// Helper to get a safe frontend URL for redirects
export function getFrontendUrl(path = ''): string {
	const baseUrl = APP_CONFIG.FRONTEND_URL.replace(/\/$/, '') // Remove trailing slash
	const cleanPath = path.startsWith('/') ? path : `/${path}`
	return `${baseUrl}${cleanPath}`
}
