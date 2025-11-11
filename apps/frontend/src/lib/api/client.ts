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
import { ERROR_MESSAGES } from '#lib/constants/error-messages'

const logger = createLogger({ component: 'ClientAPI' })

/**
 * Get auth headers with Supabase JWT token
 * Extracted for reuse across fetch calls
 *
 * SECURITY: Validates user with getUser() before extracting token from getSession()
 * This prevents using potentially-tampered session data from cookies
 *
 * @param additionalHeaders - Custom headers to merge with auth headers
 * @param requireAuth - Whether to throw error if no session exists (default: true)
 * @param omitContentType - Whether to omit Content-Type header (for FormData uploads)
 */
export async function getAuthHeaders(
	additionalHeaders?: Record<string, string>,
	requireAuth: boolean = true,
	omitContentType: boolean = false
): Promise<Record<string, string>> {
	const headers: Record<string, string> = omitContentType
		? { ...additionalHeaders }
		: {
				'Content-Type': 'application/json',
				...additionalHeaders
			}

	const supabase = createClient()

	// SECURITY FIX: Validate user with getUser() before extracting token
	// This ensures the session is authentic by contacting Supabase Auth server
	const {
		data: { user },
		error: userError
	} = await supabase.auth.getUser()

	// Get session for access token (only after user validation)
	const {
		data: { session }
	} = await supabase.auth.getSession()

	// Only use access token if user validation succeeded
	if (!userError && user && session?.access_token) {
		headers['Authorization'] = `Bearer ${session.access_token}`
	} else if (requireAuth) {
		// Log warning - caller should handle error appropriately for their context
		logger.warn('Authentication session expired', {
			metadata: {
				hasUser: !!user,
				hasSession: !!session,
				userError: userError?.message,
				requireAuth
			}
		})
		throw new Error(ERROR_MESSAGES.AUTH_SESSION_EXPIRED)
	} else {
		// Log warning for optional auth endpoints
		logger.warn('No valid session found for API request', {
			metadata: {
				hasUser: !!user,
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
 * // For FormData uploads (file uploads)
 * mutationFn: (formData) => clientFetch<Result>('/api/v1/upload', {
 *   method: 'POST',
 *   body: formData,
 *   omitJsonContentType: true
 * })
 * // For public endpoints (no auth required)
 * queryFn: () => clientFetch<Data>('/api/v1/public/data', { requireAuth: false })
 * ```
 */
export async function clientFetch<T>(
	endpoint: string,
	options?: RequestInit & { requireAuth?: boolean; omitJsonContentType?: boolean }
): Promise<T> {
	const { requireAuth = true, omitJsonContentType = false, ...fetchOptions } = options || {}

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
	// For FormData, omit Content-Type so browser sets multipart/form-data with boundary
	const headers = await getAuthHeaders(customHeaders, requireAuth, omitJsonContentType)

	// Ensure body is set for methods that require it
	const finalOptions = { ...fetchOptions, headers }
	if (
		fetchOptions.method &&
		['POST', 'PUT', 'PATCH'].includes(fetchOptions.method.toUpperCase()) &&
		!finalOptions.body
	) {
		logger.warn('Request body missing for mutation method', {
			metadata: { endpoint, method: fetchOptions.method }
		})
	}

	const response = await fetch(`${API_BASE_URL}${endpoint}`, finalOptions)

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
