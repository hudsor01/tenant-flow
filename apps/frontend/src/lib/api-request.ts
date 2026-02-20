/**
 * Shared API Request Utility
 *
 * Native fetch wrapper with Supabase auth token injection.
 * Used by all TanStack Query hooks for NestJS API calls.
 *
 * Features:
 * - ApiError class for typed error handling
 * - AbortSignal support for query cancellation
 * - Smart error classification (retryable, client, server, network)
 */

import { createClient } from '#lib/supabase/client'
import { getApiBaseUrl } from '#lib/api-config'

// ============================================================================
// API ERROR CLASS
// ============================================================================

/**
 * Typed API Error with rich classification methods
 * Used by TanStack Query retry logic and error handlers
 */
export class ApiError extends Error {
	constructor(
		message: string,
		public readonly status: number,
		public readonly statusText: string,
		public readonly body: unknown,
		public readonly isNetworkError: boolean = false,
		public readonly isAborted: boolean = false
	) {
		super(message)
		this.name = 'ApiError'
	}

	/** True for 4xx status codes */
	get isClientError(): boolean {
		return this.status >= 400 && this.status < 500
	}

	/** True for 5xx status codes */
	get isServerError(): boolean {
		return this.status >= 500
	}

	/** True if request should be retried (5xx or network errors) */
	get isRetryable(): boolean {
		return this.isServerError || this.isNetworkError
	}

	/** True for 400 Bad Request or 422 Unprocessable Entity */
	get isValidationError(): boolean {
		return this.status === 400 || this.status === 422
	}

	/** True for 401 Unauthorized or 403 Forbidden */
	get isAuthError(): boolean {
		return this.status === 401 || this.status === 403
	}

	/** True for 404 Not Found */
	get isNotFound(): boolean {
		return this.status === 404
	}

	/** True for 409 Conflict (optimistic locking) */
	get isConflict(): boolean {
		return this.status === 409
	}
}

/**
 * Type guard to check if error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
	return error instanceof ApiError
}

/**
 * Type guard to check if error is an abort error
 */
export function isAbortError(error: unknown): boolean {
	if (error instanceof ApiError) return error.isAborted
	if (error instanceof DOMException && error.name === 'AbortError') return true
	return false
}

// ============================================================================
// API REQUEST FUNCTIONS
// ============================================================================

/**
 * Make an authenticated API request to NestJS backend
 * Automatically injects Supabase auth token
 *
 * @param endpoint - API endpoint (e.g., '/api/v1/properties')
 * @param options - Fetch options including optional AbortSignal
 */
export async function apiRequest<T>(
	endpoint: string,
	options?: RequestInit & { signal?: AbortSignal }
): Promise<T> {
	// Extract signal and headers to avoid duplication/conflicts
	const { signal, headers: customHeaders, ...fetchOptions } = options ?? {}

	const supabase = createClient()
	const {
		data: { session }
	} = await supabase.auth.getSession()

	try {
		// Properly handle headers without unsafe type assertion
		const headers = new Headers({
			'Content-Type': 'application/json'
		})

		// Merge custom headers if provided
		if (customHeaders) {
			const custom = new Headers(customHeaders)
			custom.forEach((value, key) => {
				headers.set(key, value)
			})
		}

		if (session?.access_token) {
			headers.set('Authorization', `Bearer ${session.access_token}`)
		}

		const res = await fetch(`${getApiBaseUrl()}${endpoint}`, {
			...fetchOptions,
			...(signal ? { signal } : {}),
			headers
		})

		if (!res.ok) {
			const body = await res.json().catch(() => ({}))
			// NestJS can serialize body.message as an object (e.g. ForbiddenException with payload).
			// Extract the human-readable string from body.message or body.message.message.
			const rawMessage = (body as Record<string, unknown>)?.message
			const message =
				typeof rawMessage === 'string'
					? rawMessage
					: typeof rawMessage === 'object' && rawMessage !== null
						? String((rawMessage as Record<string, unknown>).message ?? res.statusText)
						: res.statusText || `HTTP ${res.status}`
			throw new ApiError(message, res.status, res.statusText, body)
		}

		const text = await res.text()
		return text ? (JSON.parse(text) as T) : ({} as T)
	} catch (error) {
		// Re-throw ApiError as-is
		if (error instanceof ApiError) throw error

		// Handle abort errors
		if (error instanceof DOMException && error.name === 'AbortError') {
			throw new ApiError('Request aborted', 0, 'Aborted', null, false, true)
		}

		// Handle network errors (fetch failed completely)
		if (error instanceof TypeError && error.message.includes('fetch')) {
			throw new ApiError('Network error', 0, 'NetworkError', null, true, false)
		}

		// Re-throw unknown errors wrapped in ApiError
		throw new ApiError(
			error instanceof Error ? error.message : 'Unknown error',
			0,
			'UnknownError',
			null,
			true,
			false
		)
	}
}

/**
 * Make an authenticated API request with FormData (for file uploads)
 * Does not set Content-Type header - browser auto-sets multipart/form-data
 *
 * @param endpoint - API endpoint
 * @param formData - FormData body
 * @param options - Fetch options including optional AbortSignal
 */
export async function apiRequestFormData<T>(
	endpoint: string,
	formData: FormData,
	options?: Omit<RequestInit, 'body'> & { signal?: AbortSignal }
): Promise<T> {
	// Extract signal and headers to avoid duplication/conflicts
	const { signal, headers: customHeaders, ...fetchOptions } = options ?? {}

	const supabase = createClient()
	const {
		data: { session }
	} = await supabase.auth.getSession()

	try {
		// Properly handle headers without unsafe type assertion
		// Note: Don't set Content-Type - browser auto-sets multipart/form-data with boundary
		const headers = new Headers()

		// Merge custom headers if provided
		if (customHeaders) {
			const custom = new Headers(customHeaders)
			custom.forEach((value, key) => {
				headers.set(key, value)
			})
		}

		if (session?.access_token) {
			headers.set('Authorization', `Bearer ${session.access_token}`)
		}

		const res = await fetch(`${getApiBaseUrl()}${endpoint}`, {
			method: 'POST',
			...fetchOptions,
			...(signal ? { signal } : {}),
			headers,
			body: formData
		})

		if (!res.ok) {
			const body = await res.json().catch(() => ({}))
			throw new ApiError(
				(body as { message?: string }).message || res.statusText || `HTTP ${res.status}`,
				res.status,
				res.statusText,
				body
			)
		}

		const text = await res.text()
		return text ? (JSON.parse(text) as T) : ({} as T)
	} catch (error) {
		if (error instanceof ApiError) throw error
		if (error instanceof DOMException && error.name === 'AbortError') {
			throw new ApiError('Request aborted', 0, 'Aborted', null, false, true)
		}
		if (error instanceof TypeError && error.message.includes('fetch')) {
			throw new ApiError('Network error', 0, 'NetworkError', null, true, false)
		}
		throw new ApiError(
			error instanceof Error ? error.message : 'Unknown error',
			0,
			'UnknownError',
			null,
			true,
			false
		)
	}
}

/**
 * Make an authenticated API request that returns a blob (for file downloads)
 * Returns the raw Response so caller can handle blob/headers
 *
 * @param endpoint - API endpoint
 * @param options - Fetch options including optional AbortSignal
 */
export async function apiRequestRaw(
	endpoint: string,
	options?: RequestInit & { signal?: AbortSignal }
): Promise<Response> {
	// Extract signal and headers to avoid duplication/conflicts
	const { signal, headers: customHeaders, ...fetchOptions } = options ?? {}

	const supabase = createClient()
	const {
		data: { session }
	} = await supabase.auth.getSession()

	try {
		// Properly handle headers without unsafe type assertion
		const headers = new Headers()

		// Merge custom headers if provided
		if (customHeaders) {
			const custom = new Headers(customHeaders)
			custom.forEach((value, key) => {
				headers.set(key, value)
			})
		}

		if (session?.access_token) {
			headers.set('Authorization', `Bearer ${session.access_token}`)
		}

		const res = await fetch(`${getApiBaseUrl()}${endpoint}`, {
			...fetchOptions,
			...(signal ? { signal } : {}),
			headers
		})

		if (!res.ok) {
			const body = await res.json().catch(() => ({}))
			throw new ApiError(
				(body as { message?: string }).message || res.statusText || `HTTP ${res.status}`,
				res.status,
				res.statusText,
				body
			)
		}

		return res
	} catch (error) {
		if (error instanceof ApiError) throw error
		if (error instanceof DOMException && error.name === 'AbortError') {
			throw new ApiError('Request aborted', 0, 'Aborted', null, false, true)
		}
		if (error instanceof TypeError && error.message.includes('fetch')) {
			throw new ApiError('Network error', 0, 'NetworkError', null, true, false)
		}
		throw new ApiError(
			error instanceof Error ? error.message : 'Unknown error',
			0,
			'UnknownError',
			null,
			true,
			false
		)
	}
}
