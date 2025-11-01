/**
 * Client-side API utility for TanStack Query hooks
 * Mirrors server.ts pattern with Authorization header from Supabase session
 *
 * Pattern consistent with reports-client.ts and stripe-client.ts
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

	// Add Authorization header if session exists
	if (session?.access_token) {
		headers['Authorization'] = `Bearer ${session.access_token}`
	} else if (requireAuth) {
		// Fail fast if authentication is required but no session exists
		logger.error('Authentication required but no session found', {
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
		// Log error for debugging
		const errorText = await response.text()
		logger.error('API request failed', {
			metadata: {
				status: response.status,
				endpoint,
				statusText: response.statusText,
				errorText: errorText.substring(0, 500)
			}
		})

		// Throw error with status for error handling
		throw new Error(
			`API Error (${response.status}): ${errorText || response.statusText}`
		)
	}

	const data = await response.json()

	// Handle API response format (success/data pattern)
	// Check for explicit false to avoid treating falsy values as errors
	if ('success' in data && data.success === false) {
		throw new Error(data.error || data.message || 'API request failed')
	}

	// Return wrapped data or direct response
	// Use 'in' operator to check for data property existence
	// This prevents returning falsy values (0, false, '', null) incorrectly
	if ('data' in data) {
		return data.data as T
	}

	return data as T
}
