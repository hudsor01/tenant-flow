/**
 * Client-side CSRF token management
 */

import { logger } from "@/lib/logger/logger"

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
			credentials: 'same-origin',
			headers: {
				'Content-Type': 'application/json'
			}
		})

		if (!response.ok) {
			throw new Error(`Failed to fetch CSRF token: ${response.status}`)
		}

		const data: { token: string } = await response.json()
		const token = data.token

		if (!token) {
			throw new Error('No token received from server')
		}

		// Cache the token
		tokenCache = {
			token,
			expires: Date.now() + TOKEN_CACHE_TIME
		}

		return token
	} catch (error) {
		logger.warn('Failed to get CSRF token, using fallback', { error })

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
