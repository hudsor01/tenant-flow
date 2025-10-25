/**
 * Shared API client using native fetch
 * Works in BOTH browser and server contexts
 * Follows backend error handling standards from global-exception.filter.ts
 */
import type { Json } from '../types/supabase-generated.js'

export interface FetchResponse<T = Json> {
	success: boolean
	data?: T
	error?: string
	message?: string
	statusCode?: number
}

/**
 * Universal API client that works in both server and browser
 * - Browser: Gets token from Supabase session automatically
 * - Server: Expects token via serverToken option
 */
export async function apiClient<T = Json>(
	url: string,
	options?: RequestInit & { serverToken?: string }
): Promise<T> {
	// Get token from whatever environment we're in
	let token: string | undefined

	if (typeof window !== 'undefined') {
		// ✅ BROWSER: Use Supabase session
		const { createBrowserClient } = await import('@supabase/ssr')
		const supabase = createBrowserClient(
			process.env.NEXT_PUBLIC_SUPABASE_URL!,
			process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
		)
		const {
			data: { session }
		} = await supabase.auth.getSession()
		token = session?.access_token
	} else {
		// ✅ SERVER: Use passed token
		token = options?.serverToken
	}

	const baseHeaders: Record<string, string> = {}

	// Only set Content-Type for JSON if body is not FormData
	// (FormData needs browser-generated boundary in Content-Type)
	if (!(options?.body instanceof FormData)) {
		baseHeaders['Content-Type'] = 'application/json'
	}

	// Add authorization header if token exists
	if (token) {
		baseHeaders['Authorization'] = `Bearer ${token}`
	}

	// Add custom headers if provided
	if (options?.headers) {
		const customHeaders = options.headers as Record<string, string>
		Object.assign(baseHeaders, customHeaders)
	}

	const response = await fetch(url, {
		...options,
		headers: baseHeaders
	})

	// Handle network/connection errors
	if (!response) {
		throw new Error('Network error: Unable to connect to server')
	}

	let data: FetchResponse<T>

	try {
		data = (await response.json()) as FetchResponse<T>
	} catch (parseError) {
		// Handle non-JSON responses
		const text = await response.text()
		throw new Error(`Invalid response format: ${text.substring(0, 100)}...`)
	}

	// Only check response.ok - backend returns raw objects on success (201), not { success: true }
	if (!response.ok) {
		// Create detailed error message based on status code
		let errorMessage = data.error || data.message || 'Request failed'

		// Add status code context for better error categorization
		if (response.status === 429) {
			errorMessage = `Rate limit exceeded: Too many requests. Please try again later.`
		} else if (response.status >= 500) {
			errorMessage = `Server error (${response.status}): ${errorMessage}`
		} else if (response.status === 404) {
			errorMessage = `Not found (404): ${errorMessage}`
		} else if (response.status === 401) {
			errorMessage = `Unauthorized: ${errorMessage}`
		} else if (response.status === 403) {
			errorMessage = `Forbidden: ${errorMessage}`
		} else if (response.status === 422) {
			errorMessage = `Validation error: ${errorMessage}`
		} else if (response.status >= 400) {
			errorMessage = `Client error (${response.status}): ${errorMessage}`
		}

		const error = Object.assign(new Error(errorMessage), {
			statusCode: response.status,
			response: data
		})
		throw error
	}

	// Return data.data if wrapped, otherwise return data directly (backend returns raw objects on 201)
	return (data.data ?? data) as T
}

// Convenience methods with optional serverToken support
export const get = <T>(url: string, serverToken?: string) =>
	apiClient<T>(url, serverToken ? { serverToken } : undefined)

export const post = <T>(url: string, body: Json, serverToken?: string) =>
	apiClient<T>(
		url,
		serverToken
			? { method: 'POST', body: JSON.stringify(body), serverToken }
			: { method: 'POST', body: JSON.stringify(body) }
	)

export const put = <T>(url: string, body: Json, serverToken?: string) =>
	apiClient<T>(
		url,
		serverToken
			? { method: 'PUT', body: JSON.stringify(body), serverToken }
			: { method: 'PUT', body: JSON.stringify(body) }
	)

export const del = <T>(url: string, serverToken?: string) =>
	apiClient<T>(url, serverToken ? { method: 'DELETE', serverToken } : { method: 'DELETE' })
