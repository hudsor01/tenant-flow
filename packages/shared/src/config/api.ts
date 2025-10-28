/**
 * API Configuration
 * Centralized API base URL and related configurations.
 */

/**
 * Resolves the API base URL based on the environment.
 * - In production, it expects `NEXT_PUBLIC_API_BASE_URL` to be set.
 * - In development, it defaults to `http://localhost:4600`.
 * - During Next.js build, it provides a placeholder to avoid build failures.
 */
function getApiBaseUrl(): string {
	const defaultUrl =
		process.env.NODE_ENV === 'production'
			? 'https://api.tenantflow.app'
			: 'http://localhost:4600'
	return process.env.NEXT_PUBLIC_API_BASE_URL || defaultUrl
}

/**
 * Centralized API base URL constant.
 *
 * **Single source of truth for all backend API calls**
 *
 * - Production: `https://api.tenantflow.app` (via Doppler)
 * - Development: `http://localhost:4600` (NestJS backend)
 * - Build-time: Placeholder for Next.js static analysis
 *
 * @example
 * ```typescript
 * import { API_BASE_URL } from '@repo/shared/config/api'
 *
 * const response = await fetch(`${API_BASE_URL}/api/v1/properties`)
 * ```
 *
 * @see CLAUDE.md (repository root) - DRY principle enforcement
 * @see {@link getApiBaseUrl} - Internal resolution logic
 */
export const API_BASE_URL = getApiBaseUrl()
