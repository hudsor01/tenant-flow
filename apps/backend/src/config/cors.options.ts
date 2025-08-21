import type { FastifyCorsOptions } from '@fastify/cors'

/**
 * CORS Options Factory Function
 *
 * Simple factory function that creates basic CORS options
 * without dependency injection for use in main.ts
 */

/**
 * Create CORS options for Fastify
 * Used by main.ts for basic CORS setup
 */
export function createCorsOptions(): FastifyCorsOptions {
	// Production CORS: strict origin validation
	const corsOrigins =
		process.env.CORS_ORIGINS?.split(',')
			.map(o => o.trim())
			.filter(Boolean) || []

	// Production domains
	const productionOrigins = [
		'https://tenantflow.app',
		'https://www.tenantflow.app'
	]

	// Auto-detect deployment URLs (production only)
	const deploymentOrigins: string[] = []

	// Railway detection (production)
	if (process.env.RAILWAY_STATIC_URL) {
		deploymentOrigins.push(process.env.RAILWAY_STATIC_URL)
	} else if (process.env.RAILWAY_PUBLIC_DOMAIN) {
		deploymentOrigins.push(`https://${process.env.RAILWAY_PUBLIC_DOMAIN}`)
	}

	// Vercel detection (production)
	if (process.env.VERCEL_URL) {
		deploymentOrigins.push(`https://${process.env.VERCEL_URL}`)
	}

	// Combine all origins - production security
	const allOrigins = [
		...productionOrigins,
		...corsOrigins,
		...deploymentOrigins
	].filter(Boolean)

	// Remove duplicates and validate HTTPS in production
	const uniqueOrigins = [...new Set(allOrigins)].filter(origin => {
		if (process.env.NODE_ENV === 'production') {
			return origin.startsWith('https://')
		}
		return true
	})

	// Production fallback
	if (uniqueOrigins.length === 0) {
		uniqueOrigins.push('https://tenantflow.app')
	}

	return {
		origin: uniqueOrigins,
		methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
		allowedHeaders: [
			'Content-Type',
			'Authorization',
			'X-Requested-With',
			'Accept',
			'Origin',
			'Cache-Control',
			'X-CSRF-Token',
			'X-XSRF-Token',
			'X-Correlation-Id',
			'stripe-signature'
		],
		exposedHeaders: [
			'X-Request-Id',
			'X-Response-Time',
			'X-RateLimit-Limit',
			'X-RateLimit-Remaining',
			'X-RateLimit-Reset'
		],
		credentials: true,
		// Production: cache preflight for 24 hours
		maxAge: process.env.NODE_ENV === 'production' ? 86400 : 300,
		optionsSuccessStatus: 204,
		// Production security: strict preflight
		preflightContinue: false,
		// Only allow explicit origins (no wildcards in production)
		strictPreflight: process.env.NODE_ENV === 'production'
	}
}
