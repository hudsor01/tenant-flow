/**
 * Server-side API utilities for Server Components and Server Actions
 * Uses cookie-based authentication via Supabase server client
 * ULTRA-NATIVE: Direct fetch with server-side auth
 */
import { createActionClient } from '@/lib/supabase/action-client'
import { config } from '@/lib/config'
import type { ControllerApiResponse } from '@repo/shared'

export interface ApiError {
	message: string
	code?: string
	details?: Record<string, unknown>
	timestamp?: string
}

/**
 * Get auth headers for server-side API requests
 * Uses Supabase server client to get session from cookies
 */
export async function getServerAuthHeaders(): Promise<Record<string, string>> {
	try {
		const supabase = await createActionClient()
		const { data: { session } } = await supabase.auth.getSession()
		return session?.access_token
			? { Authorization: `Bearer ${session.access_token}` }
			: {}
	} catch {
		return {}
	}
}

/**
 * Build URL with search params
 */
export function buildApiUrl(
	path: string,
	params?: Record<string, string | number | boolean | string[] | undefined>
): string {
	const url = new URL(path, config.api.baseURL)
	if (params) {
		Object.entries(params).forEach(([key, value]) => {
			if (value !== undefined && value !== null) {
				if (Array.isArray(value)) {
					value.forEach(v => url.searchParams.append(key, String(v)))
				} else {
					url.searchParams.append(key, String(value))
				}
			}
		})
	}
	return url.toString()
}

/**
 * Handle API response with error handling and ControllerApiResponse unwrapping
 */
export async function handleApiResponse<T>(response: Response): Promise<T> {
	if (response.status === 401) {
		throw new Error('Authentication required')
	}

	if (!response.ok) {
		const errorText = await response.text()
		let errorData: ControllerApiResponse | undefined

		try {
			errorData = JSON.parse(errorText)
		} catch {
			// Not JSON, use text as message
		}

		const apiError: ApiError = {
			message: errorData?.message || `Request failed: ${response.status}`,
			code: response.status.toString(),
			details: errorData ? { ...errorData } : undefined,
			timestamp: new Date().toISOString()
		}
		throw new Error(`API Error: ${apiError.message}`)
	}

	const responseData: ControllerApiResponse<T> = await response.json()

	if (
		responseData &&
		typeof responseData === 'object' &&
		'success' in responseData
	) {
		if (!responseData.success) {
			throw new Error(responseData.message || 'Request failed')
		}
		if (responseData.data === undefined) {
			throw new Error('Response data is missing from successful request')
		}
		return responseData.data
	}

	throw new Error('Invalid response format from backend')
}

/**
 * Server-side API request with native fetch - GET
 */
export async function serverApiGet<T>(
	path: string,
	params?: Record<string, string | number | boolean | string[] | undefined>
): Promise<T> {
	const authHeaders = await getServerAuthHeaders()

	const response = await fetch(buildApiUrl(path, params), {
		method: 'GET',
		headers: {
			Accept: 'application/json',
			...authHeaders
		},
		// Important: forward cookies for auth
		credentials: 'include',
		// Cache configuration for server components
		next: {
			revalidate: 60 // Cache for 60 seconds by default
		}
	} as RequestInit)

	return handleApiResponse<T>(response)
}

/**
 * Server-side API request with native fetch - POST/PUT/PATCH/DELETE
 */
export async function serverApiMutate<T>(
	method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
	path: string,
	data?: unknown,
	params?: Record<string, string | number | boolean | string[] | undefined>
): Promise<T> {
	const authHeaders = await getServerAuthHeaders()
	const isFormData = data instanceof FormData

	const headers: Record<string, string> = {
		Accept: 'application/json',
		...authHeaders
	}

	if (!isFormData) {
		headers['Content-Type'] = 'application/json'
	}

	const response = await fetch(buildApiUrl(path, params), {
		method,
		headers,
		body: isFormData ? data : data ? JSON.stringify(data) : undefined,
		credentials: 'include'
	})

	return handleApiResponse<T>(response)
}