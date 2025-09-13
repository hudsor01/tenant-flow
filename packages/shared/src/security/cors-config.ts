/**
 * Unified CORS Configuration for TenantFlow
 * Ensures alignment between backend CORS and frontend CSP policies
 * Follows DRY/KISS/Native principles
 */

// Application domains configuration
export const APP_DOMAINS = {
	// Frontend domains
	FRONTEND: {
		PRODUCTION: [
			'https://tenantflow.app',
			'https://www.tenantflow.app'
		],
		DEVELOPMENT: [
			'http://localhost:3000',
			'http://localhost:3002',
			'http://127.0.0.1:3000',
			'http://127.0.0.1:3002'
		]
	},
	
	// Backend API domains  
	BACKEND: {
		PRODUCTION: [
			'https://api.tenantflow.app'
		],
		DEVELOPMENT: [
			'http://localhost:4600',
			'http://127.0.0.1:4600'
		]
	},
	
	// Railway infrastructure
	RAILWAY: {
		PRODUCTION: [
			'https://healthcheck.railway.app'
		],
		DEVELOPMENT: [
			'https://healthcheck.railway.app'
		]
	}
} as const

/**
 * Get CORS allowed origins for backend
 */
export function getCORSOrigins(environment: 'development' | 'production' = 'production'): string[] | boolean {
	if (environment === 'development') {
		// SECURITY FIX: Use specific origins even in development
		return [
			...APP_DOMAINS.FRONTEND.DEVELOPMENT,
			...APP_DOMAINS.BACKEND.DEVELOPMENT,
			...APP_DOMAINS.RAILWAY.DEVELOPMENT
		]
	}
	
	return [
		...APP_DOMAINS.FRONTEND.PRODUCTION,
		// Allow API calls from the same domain (for server-side operations)
		...APP_DOMAINS.BACKEND.PRODUCTION,
		// Allow Railway healthcheck requests
		...APP_DOMAINS.RAILWAY.PRODUCTION
	]
}

/**
 * Get environment-appropriate CORS origins
 */
export function getCORSOriginsForEnv(): string[] | boolean {
	const env = process.env.NODE_ENV === 'development' ? 'development' : 'production'
	return getCORSOrigins(env)
}

/**
 * CORS configuration object for Fastify
 */
export function getCORSConfig() {
	return {
		origin: getCORSOriginsForEnv(),
		credentials: true,
		methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
		allowedHeaders: [
			'Origin',
			'X-Requested-With', 
			'Content-Type',
			'Accept',
			'Authorization',
			'X-CSRF-Token',
			'X-XSRF-Token'
		]
	}
}