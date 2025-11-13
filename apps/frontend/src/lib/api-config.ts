/**
 * API Configuration - DRY principle
 * Single source of truth for API URL
 */

import { env } from '#config/env'

/**
 * Get API base URL with environment-aware fallback
 *
 * Uses validated environment variables from the new env system.
 * No more undefined checks needed - env.NEXT_PUBLIC_API_BASE_URL is guaranteed to be a string.
 */
export function getApiBaseUrl(): string {
	return env.NEXT_PUBLIC_API_BASE_URL
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
