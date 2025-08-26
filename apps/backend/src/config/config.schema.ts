/**
 * Ultra-Native Configuration Schema
 *
 * Single source of truth for environment variables
 * Validates at startup - no runtime validation layers
 */

export interface EnvironmentVariables {
	// Core Database
	DATABASE_URL: string
	SUPABASE_URL: string
	SUPABASE_SERVICE_ROLE_KEY: string
	SUPABASE_ANON_KEY: string
	SUPABASE_JWT_SECRET: string

	// Authentication
	JWT_SECRET: string
	JWT_EXPIRES_IN?: string

	// External Services
	STRIPE_SECRET_KEY?: string
	STRIPE_WEBHOOK_SECRET?: string
	STRIPE_PORTAL_RETURN_URL?: string

	// Email
	RESEND_API_KEY?: string
	EMAIL_FROM_ADDRESS?: string
	SUPPORT_EMAIL?: string

	// Analytics
	POSTHOG_KEY?: string
	POSTHOG_HOST?: string

	// Application
	NODE_ENV: 'development' | 'production' | 'test'
	PORT?: string
	FRONTEND_URL?: string
	CORS_ORIGINS?: string

	// Rate Limiting
	RATE_LIMIT_MAX?: string
}

/**
 * Ultra-native validation - no external dependencies
 * Single validation function that throws on startup if config is invalid
 */
export function validate(
	config: Record<string, unknown>
): EnvironmentVariables {
	const requiredVars = [
		'DATABASE_URL',
		'SUPABASE_URL',
		'SUPABASE_SERVICE_ROLE_KEY',
		'SUPABASE_JWT_SECRET',
		'JWT_SECRET'
	]

	const missing = requiredVars.filter(key => !config[key])

	if (missing.length > 0) {
		throw new Error(
			`Missing required environment variables: ${missing.join(', ')}\n` +
				'Please check your .env file and ensure all required variables are set.'
		)
	}

	// Security validation
	const jwtSecret = config.JWT_SECRET as string
	if (jwtSecret && jwtSecret.length < 32) {
		throw new Error(
			'JWT_SECRET must be at least 32 characters for security'
		)
	}

	return config as unknown as EnvironmentVariables
}
