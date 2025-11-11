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
import { ApiError } from './api-error'

const logger = createLogger({ component: 'ClientAPI' })

/**
 * Get auth headers with Supabase JWT token
 * Extracted for reuse across fetch calls
 *
 * SECURITY: Validates session and extracts token in a single atomic operation
 * This prevents race conditions between user validation and token extraction
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

	// SECURITY FIX: Get session first (atomic operation) then validate
	// This prevents race conditions where session might expire between calls
	const {
		data: { session },
		error: sessionError
	} = await supabase.auth.getSession()

	// Validate session before using token
	if (session?.access_token) {
		// SECURITY: Verify session is still valid by checking if we can get user
		// This ensures the token hasn't been revoked or expired
		const {
			data: { user },
			error: userError
		} = await supabase.auth.getUser()

		if (!userError && user) {
			headers['Authorization'] = `Bearer ${session.access_token}`
		} else {
			// Session exists but user validation failed - token might be expired or revoked
			logger.warn('Session token invalid during validation', {
				metadata: {
					hasSession: !!session,
					hasUser: !!user,
					userError: userError?.message,
					requireAuth
				}
			})

			if (requireAuth) {
				throw new Error(ERROR_MESSAGES.AUTH_SESSION_EXPIRED)
			}
		}
	} else if (requireAuth) {
		// No session found
		logger.warn('No authentication session found', {
			metadata: {
				hasSession: !!session,
				sessionError: sessionError?.message,
				requireAuth
			}
		})
		throw new Error(ERROR_MESSAGES.AUTH_SESSION_EXPIRED)
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
	options?: RequestInit & {
		requireAuth?: boolean
		omitJsonContentType?: boolean
	}
): Promise<T> {
	const {
		requireAuth = true,
		omitJsonContentType = false,
		...fetchOptions
	} = options || {}

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
	const headers = await getAuthHeaders(
		customHeaders,
		requireAuth,
		omitJsonContentType
	)

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
		let errorData: { code?: string; message?: string; error?: string } | null =
			null
		let errorText = ''

		try {
			errorText = await response.text()
			errorData = JSON.parse(errorText)
		} catch (parseError) {
			// Log parsing errors to help diagnose unexpected response formats
			logger.warn('Failed to parse API error response as JSON', {
				metadata: {
					endpoint,
					status: response.status,
					contentType: response.headers.get('content-type'),
					responseLength: errorText.length,
					responsePreview: errorText.substring(0, 200),
					parseError:
						parseError instanceof Error
							? parseError.message
							: String(parseError)
				}
			})
			// Not JSON, use text directly
		}

		const code = errorData?.code
		const message =
			errorData?.message || errorData?.error || errorText || response.statusText

		// Log error - caller should handle error appropriately for their context
		logger.error('API request failed', {
			metadata: {
				endpoint,
				status: response.status,
				statusText: response.statusText,
				code,
				error: message
			}
		})

		throw new ApiError(message, code, response.status, errorData)
	}

	const data = await response.json()

	// Handle API response format (success/data pattern)
	if ('success' in data && data.success === false) {
		const code = data.code
		const message = data.error || data.message || 'API request failed'

		// Log error - caller should handle error appropriately for their context
		logger.error('API returned error response', {
			metadata: {
				endpoint,
				code,
				error: message,
				data
			}
		})

		throw new ApiError(message, code, data.statusCode, data)
	}

	if ('data' in data) {
		return data.data as T
	}

	return data as T
}
