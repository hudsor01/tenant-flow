/**
 * API Configuration - DRY principle
 * Single source of truth for API URL
 */

import { createLogger } from '@repo/shared/lib/frontend-logger'

const logger = createLogger({ component: 'APIConfig' })

// Track warning state to avoid repeated logs on SSR
let hasWarned = false

/**
 * Get API base URL with environment-aware fallback
 * 
 * Priority:
 * 1. NEXT_PUBLIC_API_BASE_URL env var (if set)
 * 2. Production URL (if NODE_ENV === 'production')
 * 3. Development fallback with single warning
 * 
 * Logs warning at most once per process to avoid SSR spam
 */
export function getApiBaseUrl(): string {
	const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL

	// If explicitly set, use it
	if (envUrl) {
		return envUrl
	}

	// Production fallback (no warning needed)
	if (process.env.NODE_ENV === 'production') {
		return 'https://api.tenantflow.app'
	}

	// Development: warn once and use fallback
	if (!hasWarned) {
		hasWarned = true
		logger.warn(
			'NEXT_PUBLIC_API_BASE_URL is not configured, falling back to production URL. ' +
			'Set this in .env.local for local development.'
		)
	}

	return 'https://api.tenantflow.app'
}

/**
 * API base URL constant (computed lazily)
 * For backward compatibility with existing imports
 */
export const API_BASE_URL = getApiBaseUrl()

/**
 * Helper to build API endpoint URL
 * @example buildApiUrl('properties') => 'https://api.tenantflow.app/api/v1/properties'
 * @deprecated Use api() from #lib/api instead
 */
export function buildApiUrl(path: string): string {
	const cleanPath = path.startsWith('/') ? path.slice(1) : path
	return `${API_BASE_URL}/api/v1/${cleanPath}`
}
