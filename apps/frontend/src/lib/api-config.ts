/**
 * API Configuration - DRY principle
 * Single source of truth for API URL
 *
 * Uses @t3-oss/env-nextjs for type-safe env validation at build time.
 */

import { env } from '#env'

/**
 * API base URL constant
 * Validated at build time via t3-env
 */
export const API_BASE_URL = env.NEXT_PUBLIC_API_BASE_URL

/**
 * Get API base URL
 * For backward compatibility with existing code
 */
export function getApiBaseUrl(): string {
	return API_BASE_URL
}
