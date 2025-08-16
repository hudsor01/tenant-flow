/**
 * Client-side CSRF token management
 * Uses API endpoint to get/set tokens
 */

import { logger } from '@/lib/logger'

const TOKEN_CACHE_TIME = 60 * 60 * 1000 // 1 hour

interface CSRFTokenCache {
	token: string
	expires: number
}

let tokenCache: CSRFTokenCache | null = null

/**
 * Get or create CSRF token for client-side forms
 */
export async function getCSRFToken(): Promise<string> {
	// Check cache first
	if (tokenCache && tokenCache.expires > Date.now()) {
		return tokenCache.token
	}

	try {
		// Fetch token from API
		const response = await fetch('/api/auth/csrf', {
			method: 'GET',
			credentials: 'same-origin'
		})

		if (!response.ok) {
			throw new Error('Failed to fetch CSRF token')
		}

		const data = await response.json()
		const token = data.token

		// Cache the token
		tokenCache = {
			token,
			expires: Date.now() + TOKEN_CACHE_TIME
		}

		logger.debug('CSRF token fetched', {
			component: 'CSRF-Client',
			tokenPrefix: token.substring(0, 8)
		})

		return token
	} catch (error) {
		logger.error(
			'Failed to get CSRF token',
			error instanceof Error ? error : new Error(String(error)),
			{
				component: 'CSRF-Client'
			}
		)

		// Generate a client-side token as fallback
		const fallbackToken = generateClientToken()

		tokenCache = {
			token: fallbackToken,
			expires: Date.now() + TOKEN_CACHE_TIME
		}

		return fallbackToken
	}
}

/**
 * Generate a client-side token as fallback
 */
function generateClientToken(): string {
	const array = new Uint8Array(32)
	crypto.getRandomValues(array)
	return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join(
		''
	)
}

/**
 * Clear cached token
 */
export function clearCSRFToken(): void {
	tokenCache = null
}
