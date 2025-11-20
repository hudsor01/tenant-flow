/**
 * API Configuration - DRY principle
 * Single source of truth for API URL
 */

import { env } from '#config/env'

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
	let baseUrl = env.NEXT_PUBLIC_API_BASE_URL

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
 * API base URL constant (computed lazily)
 * For backward compatibility with existing imports
 *
 * NOTE: This is evaluated at module load time (server-side).
 * For client-side code that needs the dynamic localhost override,
 * use getApiBaseUrl() function directly instead.
 */
export const API_BASE_URL = env.NEXT_PUBLIC_API_BASE_URL

/**
 * Helper to build API endpoint URL
 * @example buildApiUrl('properties') => 'https://api.tenantflow.app/api/v1/properties'
 * @deprecated Use api() from #lib/api instead
 */
export function buildApiUrl(path: string): string {
	const cleanPath = path.startsWith('/') ? path.slice(1) : path
	return `${API_BASE_URL}/api/v1/${cleanPath}`
}
