import { Logger } from '@nestjs/common'

export interface RequiredEnvVars {
	DATABASE_URL: string
	DIRECT_URL: string
	SUPABASE_URL: string
	SUPABASE_SECRET_KEY: string
	JWT_SECRET: string
	CORS_ORIGINS: string
}

export function validateEnvironment(): void {
	const logger = new Logger('EnvValidation')

	// Define required environment variables
	// Note: SUPABASE_JWT_SECRET is no longer required - we use JWKS endpoint for JWT verification
	const requiredVars: (keyof RequiredEnvVars)[] = [
		'DATABASE_URL',
		'DIRECT_URL',
		'SUPABASE_URL',
		'SUPABASE_SECRET_KEY',
		'JWT_SECRET',
		'CORS_ORIGINS'
	]

	// Check for missing variables
	const missing: string[] = []
	for (const varName of requiredVars) {
		if (!process.env[varName]) {
			missing.push(varName)
		}
	}

	// Provide targeted guidance if legacy env vars are set but new ones are missing
	if (
		missing.includes('SUPABASE_SECRET_KEY') &&
		process.env.SUPABASE_SECRET_KEY
	) {
		logger.warn(
			'SUPABASE_SECRET_KEY is set but SUPABASE_SECRET_KEY is missing. Please migrate to the new variable name.'
		)
	}
	// SUPABASE_JWT_SECRET is now optional - we use JWKS endpoint for JWT verification
	if (process.env.SUPABASE_JWT_SECRET) {
		logger.warn(
			'SUPABASE_JWT_SECRET is set but no longer required. We now use JWKS endpoint for JWT verification. You can remove this variable.'
		)
	}

	// Fail fast if critical variables are missing
	if (missing.length > 0) {
		logger.error(
			`Missing required environment variables: ${missing.join(', ')}`
		)
		if (process.env.NODE_ENV === 'production') {
			throw new Error(
				`Critical environment variables missing: ${missing.join(', ')}`
			)
		} else {
			logger.warn(
				'Running in development mode with missing environment variables'
			)
		}
	}

	// Validate CORS_ORIGINS format
	const corsOrigins = process.env.CORS_ORIGINS
	if (corsOrigins) {
		const origins = corsOrigins.split(',').map(origin => origin.trim())
		const validOriginPattern = /^https?:\/\/[a-zA-Z0-9.-]+(?::\d+)?$/

		for (const origin of origins) {
			if (!validOriginPattern.test(origin)) {
				throw new Error(
					`Invalid CORS origin format: ${origin}. Origins must be valid URLs.`
				)
			}
		}

		// In production, enforce HTTPS-only origins
		if (process.env.NODE_ENV === 'production') {
			const httpOrigins = origins.filter(origin =>
				origin.startsWith('http://')
			)
			if (httpOrigins.length > 0) {
				throw new Error(
					`Production environment cannot have HTTP origins: ${httpOrigins.join(', ')}`
				)
			}
		}
	}

	// Validate database URLs
	if (
		process.env.DATABASE_URL &&
		!process.env.DATABASE_URL.startsWith('postgresql://')
	) {
		throw new Error(
			'DATABASE_URL must be a valid PostgreSQL connection string'
		)
	}

	logger.log('Environment validation completed successfully')
}
