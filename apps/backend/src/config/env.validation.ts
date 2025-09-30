import { Logger } from '@nestjs/common'

export interface RequiredEnvVars {
	DATABASE_URL: string
	DIRECT_URL: string
	SUPABASE_URL: string
	SUPABASE_SERVICE_ROLE_KEY: string
	SUPABASE_JWT_SECRET: string
	JWT_SECRET: string
	CORS_ORIGINS: string
}

export function validateEnvironment(): void {
	const logger = new Logger('EnvValidation')

	// Define required environment variables
	const requiredVars: (keyof RequiredEnvVars)[] = [
		'DATABASE_URL',
		'DIRECT_URL',
		'SUPABASE_URL',
		'SUPABASE_SERVICE_ROLE_KEY',
		'SUPABASE_JWT_SECRET',
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
		missing.includes('SUPABASE_SERVICE_ROLE_KEY') &&
		process.env.SERVICE_ROLE_KEY
	) {
		logger.warn(
			'SERVICE_ROLE_KEY is set but SUPABASE_SERVICE_ROLE_KEY is missing. Please migrate to the new variable name.'
		)
	}
	if (
		missing.includes('SUPABASE_JWT_SECRET') &&
		process.env.JWT_SECRET
	) {
		logger.warn(
			'JWT_SECRET is set but SUPABASE_JWT_SECRET is missing. Provide SUPABASE_JWT_SECRET for Supabase authentication.'
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
