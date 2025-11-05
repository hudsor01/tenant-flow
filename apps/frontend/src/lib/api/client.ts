/**
 * Client-side API utility for TanStack Query hooks
 * Mirrors server.ts pattern with Authorization header from Supabase session
 *
 * Pattern consistent with reports-client.ts and stripe-client.ts
 *
 * NOTE: This utility can be called from both client and server contexts,
 * so it MUST NOT call browser-only APIs like toast()
 */
import { createClient } from '#lib/supabase/client'
import { API_BASE_URL } from '#lib/api-config'
import { createLogger } from '@repo/shared/lib/frontend-logger'

const logger = createLogger({ component: 'ClientAPI' })

/**
 * Get auth headers with Supabase JWT token
 * Extracted for reuse across fetch calls
 *
 * @param additionalHeaders - Custom headers to merge with auth headers
 * @param requireAuth - Whether to throw error if no session exists (default: true)
 */
async function getAuthHeaders(
	additionalHeaders?: Record<string, string>,
	requireAuth: boolean = true
): Promise<Record<string, string>> {
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		...additionalHeaders
	}

	const supabase = createClient()
	const {
		data: { session }
	} = await supabase.auth.getSession()

	if (session?.access_token) {
		headers['Authorization'] = `Bearer ${session.access_token}`
	} else if (requireAuth) {
		// Log warning - caller should handle error appropriately for their context
		logger.warn('Authentication session expired', {
			metadata: {
				hasSession: !!session,
				requireAuth
			}
		})
		throw new Error('Authentication session expired. Please log in again.')
	} else {
		// Log warning for optional auth endpoints
		logger.warn('No valid session found for API request', {
			metadata: {
				hasSession: !!session,
				requireAuth
			}
		})
	}

	return headers
}

/**
 * Client-side fetch with Supabase authentication
 *
 * The backend returns responses in two formats:
 * 1. Wrapped: { success: true, data: T } or { success: false, error: string }
 * 2. Direct: T (for some endpoints)
 *
 * Usage in TanStack Query hooks:
 * ```typescript
 * queryFn: () => clientFetch<Property>('/api/v1/properties/123')
 * mutationFn: (data) => clientFetch<Property>('/api/v1/properties', {
 *   method: 'POST',
 *   body: JSON.stringify(data)
 * })
 * // For public endpoints (no auth required)
 * queryFn: () => clientFetch<Data>('/api/v1/public/data', { requireAuth: false })
 * ```
 */
export async function clientFetch<T>(
	endpoint: string,
	options?: RequestInit & { requireAuth?: boolean }
): Promise<T> {
	const { requireAuth = true, ...fetchOptions } = options || {}

	// Build headers from options
	const customHeaders: Record<string, string> = {}
	if (fetchOptions?.headers) {
		Object.entries(fetchOptions.headers).forEach(([key, value]) => {
			if (typeof value === 'string') {
				customHeaders[key] = value
			}
		})
	}

	// Get auth headers (includes Authorization + custom headers)
	const headers = await getAuthHeaders(customHeaders, requireAuth)

	const response = await fetch(`${API_BASE_URL}${endpoint}`, {
		...fetchOptions,
		headers
	})

	if (!response.ok) {
		const errorText = await response.text()
		// Log error - caller should handle error appropriately for their context
		logger.error('API request failed', {
			metadata: {
				endpoint,
				status: response.status,
				statusText: response.statusText,
				error: errorText
			}
		})
		throw new Error(
			`API Error (${response.status}): ${errorText || response.statusText}`
		)
	}

	const data = await response.json()

	// Handle API response format (success/data pattern)
	if ('success' in data && data.success === false) {
		// Log error - caller should handle error appropriately for their context
		logger.error('API returned error response', {
			metadata: {
				endpoint,
				error: data.error || data.message,
				data
			}
		})
		throw new Error(data.error || data.message || 'API request failed')
	}

	if ('data' in data) {
		return data.data as T
	}

	return data as T
}
