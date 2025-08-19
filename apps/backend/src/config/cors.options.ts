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
	// Get base origins from environment
	const corsOrigins =
		process.env.CORS_ORIGINS?.split(',')
			.map(o => o.trim())
			.filter(Boolean) || []

	// Add frontend URL if configured
	const frontendUrl = process.env.FRONTEND_URL

	// Auto-detect deployment URLs
	const deploymentOrigins: string[] = []

	// Railway detection
	if (process.env.RAILWAY_STATIC_URL) {
		deploymentOrigins.push(process.env.RAILWAY_STATIC_URL)
	} else if (process.env.RAILWAY_PUBLIC_DOMAIN) {
		deploymentOrigins.push(`https://${process.env.RAILWAY_PUBLIC_DOMAIN}`)
	}

	// Vercel detection
	if (process.env.VERCEL_URL) {
		deploymentOrigins.push(`https://${process.env.VERCEL_URL}`)
	}

	// Combine all origins
	const allOrigins = [
		...corsOrigins,
		...deploymentOrigins,
		...(frontendUrl ? [frontendUrl] : [])
	].filter(Boolean)

	// Remove duplicates
	const uniqueOrigins = [...new Set(allOrigins)]

	// Fallback if no origins configured
	if (uniqueOrigins.length === 0) {
		uniqueOrigins.push('http://localhost:3000')
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
		maxAge: process.env.NODE_ENV === 'production' ? 86400 : 0,
		optionsSuccessStatus: 204
	}
}
