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
 * API base URL constant with local development override
 * 
 * For local development, if API URL is production but NODE_ENV is development,
 * redirect to local backend at http://localhost:4600
 */
function getServerApiUrl(): string {
	const baseUrl = env.NEXT_PUBLIC_API_BASE_URL
	
	// Override production API URL in development mode
	if (process.env.NODE_ENV === 'development' && baseUrl === 'https://api.tenantflow.app') {
		return 'http://localhost:4600'
	}
	
	return baseUrl
}

/**
 * API base URL constant (computed lazily)
 * For backward compatibility with existing imports
 *
 * Automatically uses local backend (http://localhost:4600) in development mode
 * even if NEXT_PUBLIC_API_BASE_URL points to production
 */
export const API_BASE_URL = getServerApiUrl()
