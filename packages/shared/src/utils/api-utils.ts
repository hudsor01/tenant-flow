/**
 * Shared API Utilities
 * Standardized URL construction logic for all API clients
 */

/**
 * Construct the API base URL with intelligent fallbacks
 * Handles various environment configurations:
 * - Production: Full URL from NEXT_PUBLIC_API_BASE_URL
 * - Development: Relative /api/v1 in browser, localhost:3001 on server
 * - Vercel/Railway: Automatically handles proxy routing
 *
 * @returns Properly formatted API base URL without trailing slash
 */
export function getApiBaseUrl(): string {
	// Prefer explicit env var when available
	const envBase = process.env["NEXT_PUBLIC_API_BASE_URL"]

	if (envBase) {
		const cleaned = envBase.replace(/\/$/, '')
		try {
			const parsed = new URL(cleaned)
			// If the URL has a pathname with /api, treat it as already pointing to the API
			if (
				parsed.pathname &&
				parsed.pathname !== '/' &&
				parsed.pathname.includes('/api')
			) {
				return cleaned
			}
			return `${cleaned}/api/v1`
		} catch {
			// Not an absolute URL (maybe a relative path like '/api'), check directly
			return cleaned.startsWith('/api') ? cleaned : `${cleaned}/api/v1`
		}
	}

	// On the client, prefer a relative API route
	if (typeof window !== 'undefined') {
		return '/api/v1'
	}

	// Server-side fallback for local dev
	return 'http://localhost:3001/api/v1'
}
