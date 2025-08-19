import { registerAs } from '@nestjs/config'
import { z } from 'zod'

/**
 * CORS Configuration with Zod Validation
 *
 * This provides a more secure, type-safe approach to CORS configuration
 * using NestJS's registerAs pattern with Zod validation
 */

// Define the CORS schema with strict validation
const corsConfigSchema = z.object({
	origins: z
		.string()
		.optional()
		.default('')
		.transform(str => {
			// Transform comma-separated string to array
			if (!str) {
				return []
			}
			return str
				.split(',')
				.map(origin => origin.trim())
				.filter(Boolean)
		})
		.refine(
			origins => {
				// Validate each origin is a valid URL
				return origins.every(origin => {
					try {
						const url = new URL(origin)
						return ['http:', 'https:'].includes(url.protocol)
					} catch {
						return false
					}
				})
			},
			{ message: 'All CORS origins must be valid HTTP(S) URLs' }
		)
		.refine(
			origins => {
				// In production, enforce HTTPS only
				if (
					process.env.NODE_ENV === 'production' &&
					origins.length > 0
				) {
					return origins.every(origin =>
						origin.startsWith('https://')
					)
				}
				return true
			},
			{ message: 'Production CORS origins must use HTTPS' }
		),

	credentials: z
		.string()
		.optional()
		.transform(val => val === 'true')
		.default(true),

	maxAge: z
		.string()
		.optional()
		.transform(val => (val ? parseInt(val, 10) : 86400)) // Default 24 hours
		.refine(val => val > 0 && val <= 86400, {
			message: 'CORS max age must be between 1 and 86400 seconds'
		}),

	allowedHeaders: z
		.string()
		.optional()
		.default('Content-Type,Authorization,X-Requested-With,Accept,Origin')
		.transform(str => str.split(',').map(h => h.trim())),

	exposedHeaders: z
		.string()
		.optional()
		.default('X-Total-Count,X-Request-Id')
		.transform(str => str.split(',').map(h => h.trim())),

	methods: z
		.string()
		.optional()
		.default('GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS')
		.transform(str => str.split(',').map(m => m.trim()))
})

// Type inference for the CORS config
export type CorsConfig = z.infer<typeof corsConfigSchema>

/**
 * Register CORS configuration as a namespaced config
 * This allows accessing it via configService.get('cors')
 */
export default registerAs('cors', (): CorsConfig => {
	const config = {
		origins: process.env.CORS_ORIGINS,
		credentials: process.env.CORS_CREDENTIALS,
		maxAge: process.env.CORS_MAX_AGE,
		allowedHeaders: process.env.CORS_ALLOWED_HEADERS,
		exposedHeaders: process.env.CORS_EXPOSED_HEADERS,
		methods: process.env.CORS_METHODS
	}

	// Validate and transform the configuration
	const result = corsConfigSchema.safeParse(config)

	if (!result.success) {
		const errors = result.error.issues
			.map(issue => `${issue.path.join('.')}: ${issue.message}`)
			.join('\n')
		throw new Error(`CORS configuration validation failed:\n${errors}`)
	}

	return result.data
})

/**
 * Helper function to get CORS config with proper typing
 * Usage: const corsConfig = getCorsConfig(configService)
 */
export function getCorsConfig(configService: {
	get: (key: string) => unknown
}): CorsConfig {
	return configService.get('cors') as CorsConfig
}

/**
 * Security utility to validate CORS origins at runtime
 */
export class CorsSecurityValidator {
	static validateOrigin(origin: string, allowedOrigins: string[]): boolean {
		// Exact match check
		if (allowedOrigins.includes(origin)) {
			return true
		}

		// Check for wildcard subdomain patterns (e.g., https://*.tenantflow.app)
		for (const allowed of allowedOrigins) {
			if (allowed.includes('*')) {
				const pattern = allowed
					.replace(/\./g, '\\.')
					.replace(/\*/g, '.*')
				const regex = new RegExp(`^${pattern}$`)
				if (regex.test(origin)) {
					return true
				}
			}
		}

		return false
	}

	static isSecureOrigin(origin: string): boolean {
		// localhost is considered secure for development
		if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
			return true
		}

		// Production origins must use HTTPS
		return origin.startsWith('https://')
	}
}
