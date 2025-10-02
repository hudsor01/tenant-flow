/**
 * Unified CORS Configuration for TenantFlow
 * Ensures alignment between backend CORS and frontend CSP policies
 * Follows DRY/KISS/Native principles
 * Note: ENABLE_MOCK_AUTH disabled in production for real auth providers
 */

/**
 * Get application domains from environment variables ONLY
 * NO HARDCODED URLS - ALL URLs MUST COME FROM ENVIRONMENT
 */
function getApplicationDomains() {
	// Consider production only when explicitly set to 'production' or running on Vercel
	const isProduction =
		process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'

	// Get all URLs from environment variables only
	const frontendUrl = process.env.NEXT_PUBLIC_APP_URL
	const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL

	if (isProduction) {
		// Production: prefer env vars but don't throw during local builds.
		// If envs are missing, warn and fall back to localhost defaults so
		// a frontend production build can proceed in a developer environment.
		const frontendList: string[] = []
		const backendList: string[] = []

		if (frontendUrl) {
			frontendList.push(
				frontendUrl,
				frontendUrl.replace('https://', 'https://www.')
			)
		}
		if (backendUrl) {
			backendList.push(backendUrl)
		}

		if (!frontendUrl || !backendUrl) {
			// Log a warning but do not throw — CI/deploy should still set these.
			console.warn(
				'Missing NEXT_PUBLIC_APP_URL or NEXT_PUBLIC_API_BASE_URL during production build; falling back to localhost defaults for build.'
			)
			frontendList.push('http://localhost:3000')
			backendList.push('http://localhost:3001')
		}

		return {
			FRONTEND: frontendList.filter(Boolean),
			BACKEND: backendList.filter(Boolean)
		}
	}

	// Development: Use environment variables or fail gracefully
	const developmentOrigins = []

	if (frontendUrl) developmentOrigins.push(frontendUrl)
	if (backendUrl) developmentOrigins.push(backendUrl)

	// Only add localhost for actual local development (not builds)
	if (
		process.env.NODE_ENV === 'development' &&
		!process.env.VERCEL &&
		!process.env.CI
	) {
		developmentOrigins.push('http://localhost:3000', 'http://localhost:4600')
	}

	return {
		FRONTEND: developmentOrigins,
		BACKEND: developmentOrigins
	}
}

// Dynamic domains based on environment
export const APP_DOMAINS = getApplicationDomains()

/**
 * Get CORS allowed origins for backend
 */
export function getCORSOrigins(
	environment: 'development' | 'production' = 'production'
): string[] | boolean {
	if (environment === 'development') {
		// SECURITY FIX: Use specific origins even in development
		return [...APP_DOMAINS.FRONTEND, ...APP_DOMAINS.BACKEND]
	}

	return [
		...APP_DOMAINS.FRONTEND,
		// Allow API calls from the same domain (for server-side operations)
		...APP_DOMAINS.BACKEND
	]
}

/**
 * Get environment-appropriate CORS origins
 * Ensures Vercel builds use production configuration
 */
export function getCORSOriginsForEnv(): string[] | boolean {
	// Consider production only when explicitly set to 'production' or running on Vercel
	const isProduction =
		process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'

	const env = isProduction ? 'production' : 'development'
	return getCORSOrigins(env)
}

/**
 * CORS configuration object for Express
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
