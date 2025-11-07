/**
 * Application Configuration Constants
 *
 * Production-ready configuration for the backend application.
 * All environment-dependent values should be defined here.
 */

export const APP_CONFIG = {
	// Application URLs
	FRONTEND_URL:
		process.env.NEXT_PUBLIC_APP_URL ||
		(() => {
			throw new Error('NEXT_PUBLIC_APP_URL environment variable is required')
		})(),

	// API Configuration (hardcoded following industry best practices)
	API_PORT: 4600, // Hardcoded default, platform can override via process.env.PORT
	API_PREFIX: '/api',

	// CORS Configuration
	ALLOWED_ORIGINS:
		process.env.CORS_ORIGINS?.split(',') ||
		(() => {
			throw new Error('CORS_ORIGINS environment variable is required')
		})(),

	// External Services
	SUPABASE: {
		URL: process.env.SUPABASE_URL,
		SERVICE_KEY: process.env.SUPABASE_SECRET_KEY,
		PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY
	},

	// Stripe Configuration
	STRIPE: {
		SECRET_KEY: process.env.STRIPE_SECRET_KEY,
		WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
		// Portal return URL (construct from frontend URL - no separate env var needed)
		PORTAL_RETURN_URL:
			process.env.NEXT_PUBLIC_APP_URL + '/billing' ||
			(() => {
				throw new Error(
					'NEXT_PUBLIC_APP_URL environment variable is required for Stripe portal return URL'
				)
			})()
	},

	// Email Configuration
	EMAIL: {
		RESEND_API_KEY: process.env.TEST_RESEND_API_KEY,
		FROM_ADDRESS:
			process.env.TEST_EMAIL_FROM ||
			(() => {
				throw new Error('TEST_EMAIL_FROM environment variable is required')
			})(),
		SUPPORT_EMAIL: 'support@tenantflow.app' // Hardcoded since not in Doppler
	},

	// Production Features (always enabled in stable version)
	FEATURES: {
		ENABLE_TELEMETRY: true,
		ENABLE_MAINTENANCE_MODE: false
	},

	// Environment
	IS_PRODUCTION: process.env.NODE_ENV === 'production',

	// Database
	DATABASE_URL: process.env.DATABASE_URL,

	// Security
	JWT_SECRET: process.env.JWT_SECRET,
	JWT_EXPIRES_IN: '7d', // Default value since not in Doppler

	// Rate Limiting
	RATE_LIMIT: {
		WINDOW_MS: 15 * 60 * 1000, // 15 minutes
		MAX_REQUESTS: 100 // Default value since not in Doppler
	}
} as const

// Validation function to ensure required config is present
export function validateConfig(): void {
	const requiredVars = [
		{ key: 'DATABASE_URL', value: APP_CONFIG.DATABASE_URL },
		{ key: 'JWT_SECRET', value: APP_CONFIG.JWT_SECRET },
		{ key: 'SUPABASE_URL', value: APP_CONFIG.SUPABASE.URL },
		{
			key: 'SUPABASE_SECRET_KEY',
			value: APP_CONFIG.SUPABASE.SERVICE_KEY
		}
	]

	// Production requirements
	requiredVars.push(
		{ key: 'JWT_SECRET', value: process.env.JWT_SECRET },
		{ key: 'CORS_ORIGINS', value: process.env.CORS_ORIGINS }
	)

	const missing = requiredVars
		.filter(({ value }) => !value)
		.map(({ key }) => key)

	if (missing.length > 0) {
		throw new Error(
			`Missing required environment variables: ${missing.join(', ')}\n` +
				'Please check your .env file and ensure all required variables are set.'
		)
	}

	// Validate JWT_SECRET length for security
	if (APP_CONFIG.JWT_SECRET && APP_CONFIG.JWT_SECRET.length < 32) {
		throw new Error('JWT_SECRET must be at least 32 characters for security')
	}
}

// Helper to get a safe frontend URL for redirects
export function getFrontendUrl(path = ''): string {
	const baseUrl = APP_CONFIG.FRONTEND_URL.replace(/\/$/, '') // Remove trailing slash
	const cleanPath = path.startsWith('/') ? path : `/${path}`
	return `${baseUrl}${cleanPath}`
}
