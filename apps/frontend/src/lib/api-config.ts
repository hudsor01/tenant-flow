/**
 * API Configuration - DRY principle
 * Single source of truth for API URL
 *
 * - Development: Falls back to localhost:4650
 * - Production: Requires NEXT_PUBLIC_API_BASE_URL to be set
 */

const DEV_API_URL = 'http://localhost:4650'

/**
 * Get API base URL from environment
 * Falls back to localhost in development, throws in production if not set
 */
export function getApiBaseUrl(): string {
	const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ||
		(process.env.NODE_ENV === 'production' ? undefined : DEV_API_URL)

	if (!baseUrl) {
		throw new Error(
			'NEXT_PUBLIC_API_BASE_URL environment variable is required in production. ' +
			'Set it in your deployment environment.'
		)
	}

	return baseUrl
}

/**
 * API base URL constant
 * For backward compatibility with existing imports
 */
export const API_BASE_URL = getApiBaseUrl()
