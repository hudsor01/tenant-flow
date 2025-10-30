/**
 * API Configuration - Native fetch() pattern per CLAUDE.md
 * NO abstraction layers - use fetch() directly
 */

/**
 * Server-side API base URL (includes auth via Authorization header)
 * Use in Server Components with requireSession()
 */
export const API_BASE_URL =
	process.env.API_BASE_URL || 'https://api.tenantflow.app'

/**
 * Client-side API base URL (uses cookies automatically)
 * Use in Client Components - authentication via Supabase cookies
 */
export const NEXT_PUBLIC_API_BASE_URL =
	// eslint-disable-next-line no-restricted-syntax -- Central definition per DRY principle
	process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.tenantflow.app'

/**
 * Get appropriate base URL based on environment
 * - Server: Uses API_BASE_URL (requires explicit token)
 * - Browser: Uses NEXT_PUBLIC_API_BASE_URL (uses cookies)
 */
export function getApiBaseUrl(): string {
	if (typeof window === 'undefined') {
		return API_BASE_URL
	}
	return NEXT_PUBLIC_API_BASE_URL
}

/**
 * Helper to build API endpoint URL
 * @example buildApiUrl('/properties') => 'https://api.tenantflow.app/api/v1/properties'
 */
export function buildApiUrl(path: string): string {
	const baseUrl = getApiBaseUrl()
	const cleanPath = path.startsWith('/') ? path.slice(1) : path
	return `${baseUrl}/api/v1/${cleanPath}`
}
