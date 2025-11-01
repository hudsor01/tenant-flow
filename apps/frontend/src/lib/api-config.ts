/**
 * API Configuration - DRY principle
 * Single source of truth for API URL
 */

/**
 * API base URL for backend (Railway)
 * Works in both Server Components and Client Components
 * Falls back to production URL if env var not set
 */
const API_BASE_URL_RAW = process.env.NEXT_PUBLIC_API_BASE_URL

if (!API_BASE_URL_RAW) {
	console.warn(
		'[API Config] NEXT_PUBLIC_API_BASE_URL is not defined, falling back to production URL: https://api.tenantflow.app'
	)
}

export const API_BASE_URL = API_BASE_URL_RAW || 'https://api.tenantflow.app'

/**
 * Get API base URL (single source of truth)
 */
export function getApiBaseUrl(): string {
	return API_BASE_URL
}

/**
 * Helper to build API endpoint URL (for backward compatibility)
 * Will be removed once all files migrate to api() helper
 * @example buildApiUrl('properties') => 'https://api.tenantflow.app/api/v1/properties'
 * @deprecated Use api() from #lib/api instead
 */
export function buildApiUrl(path: string): string {
	const cleanPath = path.startsWith('/') ? path.slice(1) : path
	return `${API_BASE_URL}/api/v1/${cleanPath}`
}
