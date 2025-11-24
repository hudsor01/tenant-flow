/**
 * API Configuration - DRY principle
 * Single source of truth for API URL
 */

/**
 * Get API base URL with environment-aware fallback
 *
 * For local development and E2E tests:
 * - If API URL is production (https://api.tenantflow.app) but frontend is on localhost,
 *   redirect to local backend for testing purposes
 *
 * Uses validated environment variables from the new env system.
 */
export function getApiBaseUrl(): string {
	let baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL!

	// In local development/E2E tests, redirect production API to local backend
	// This check runs in browser context where window is available
	if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
		if (baseUrl === 'https://api.tenantflow.app') {
			baseUrl = 'http://localhost:4600'
		}
	}

	return baseUrl
}

/**
 * API base URL constant
 * For backward compatibility with existing imports
 *
 * Uses NEXT_PUBLIC_API_BASE_URL directly (client-safe)
 * Browser-side redirection handled by getApiBaseUrl() function
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL!
