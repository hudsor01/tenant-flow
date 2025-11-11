/**
 * Client-side API utility for TanStack Query hooks
 * Mirrors server.ts pattern with Authorization header from Supabase session
 *
 * Pattern consistent with reports-client.ts and stripe-client.ts
 *
 * NOTE: This utility can be called from both client and server contexts,
 * so it MUST NOT call browser-only APIs like toast()
 */
import { getSupabaseClientInstance } from '@repo/shared/lib/supabase-client'
import { API_BASE_URL } from '#lib/api-config'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { ERROR_MESSAGES } from '#lib/constants/error-messages'
import { ApiError, ApiErrorCode } from './api-error'

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

	const supabase = getSupabaseClientInstance()

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

	let response: Response

	try {
		response = await fetch(`${API_BASE_URL}${endpoint}`, finalOptions)
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : 'Network request failed'

		logger.error('Network error during API request', {
			metadata: {
				endpoint,
				error: errorMessage
			}
		})

		throw new ApiError(
			'Network request failed. Please check your connection and try again.',
			ApiErrorCode.NETWORK_ERROR,
			undefined,
			{
				endpoint,
				error: errorMessage
			}
		)
	}

	if (!response.ok) {
		let errorData: unknown = null
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

		const backendCode = extractBackendErrorCode(errorData)
		const message =
			(typeof errorData === 'object' && errorData && 'message' in errorData
				? String((errorData as { message?: unknown }).message)
				: undefined) ||
			(typeof errorData === 'object' && errorData && 'error' in errorData
				? String((errorData as { error?: unknown }).error)
				: undefined) ||
			errorText ||
			response.statusText

		// Log error - caller should handle error appropriately for their context
		logger.error('API request failed', {
			metadata: {
				endpoint,
				status: response.status,
				statusText: response.statusText,
				code: backendCode,
				error: message
			}
		})

		const details = buildErrorDetails(
			errorData,
			errorText,
			response.status,
			backendCode
		)

		throw new ApiError(
			message,
			mapStatusToApiErrorCode(response.status),
			response.status,
			details
		)
	}

	const contentType = response.headers.get('content-type')
	const contentLength = response.headers.get('content-length')
	const isNoContentStatus = response.status === 204 || response.status === 205
	const hasExplicitZeroLength =
		typeof contentLength === 'string' && Number(contentLength) === 0
	const shouldSkipParsing =
		isNoContentStatus || hasExplicitZeroLength || !contentType

	if (shouldSkipParsing) {
		return undefined as T
	}

	const data = await response.json()

	// Handle API response format (success/data pattern)
	if (
		data &&
		typeof data === 'object' &&
		'success' in data &&
		data.success === false
	) {
		const statusCode =
			typeof data.statusCode === 'number' ? data.statusCode : response.status
		const backendCode = extractBackendErrorCode(data)
		const message =
			(typeof data.error === 'string' && data.error) ||
			(typeof data.message === 'string' && data.message) ||
			'API request failed'

		// Log error - caller should handle error appropriately for their context
		logger.error('API returned error response', {
			metadata: {
				endpoint,
				code: backendCode,
				error: message,
				data
			}
		})

		const details = buildErrorDetails(data, '', statusCode, backendCode)

		throw new ApiError(
			message,
			mapStatusToApiErrorCode(statusCode),
			statusCode,
			details
		)
	}

	if (data && typeof data === 'object' && 'data' in data) {
		return (data as { data: T }).data
	}

	return data as T
}

function extractBackendErrorCode(payload: unknown): string | undefined {
	if (payload && typeof payload === 'object' && 'code' in payload) {
		const code = (payload as { code?: unknown }).code
		if (typeof code === 'string') {
			return code
		}
	}
	return undefined
}

function buildErrorDetails(
	payload: unknown,
	rawText: string,
	status?: number,
	backendCode?: string
): Record<string, unknown> | undefined {
	const details: Record<string, unknown> =
		payload && typeof payload === 'object'
			? { ...(payload as Record<string, unknown>) }
			: {}

	if (!Object.keys(details).length && rawText) {
		details.raw = rawText
	}

	if (backendCode) {
		details.code = backendCode
	}

	if (typeof status === 'number') {
		details.status = status
	}

	return Object.keys(details).length > 0 ? details : undefined
}

function mapStatusToApiErrorCode(status?: number): ApiErrorCode {
	switch (status) {
		case 400:
			return ApiErrorCode.API_BAD_REQUEST
		case 401:
		case 403:
			return ApiErrorCode.AUTH_UNAUTHORIZED
		case 404:
			return ApiErrorCode.API_NOT_FOUND
		case 429:
			return ApiErrorCode.API_RATE_LIMITED
		case 500:
			return ApiErrorCode.API_SERVER_ERROR
		case 503:
			return ApiErrorCode.API_SERVICE_UNAVAILABLE
		default:
			return ApiErrorCode.UNKNOWN_ERROR
	}
}
