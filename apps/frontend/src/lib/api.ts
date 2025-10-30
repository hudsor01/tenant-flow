/**
 * Production-Ready API Client (October 2025)
 * 
 * PHILOSOPHY: Native fetch() with minimal utility helper
 * - Browser: Sends cookies automatically via `credentials: 'include'`
 * - Server: Requires explicit Authorization header with token
 * - No abstractions, no wrappers, just fetch()
 * 
 * Per Next.js 15 and TanStack Query v5 official docs
 */

import { getApiBaseUrl } from './api-config'

interface FetchOptions extends RequestInit {
	token?: string // Optional for Server Components
}

/**
 * Universal fetch helper for API calls
 * 
 * CLIENT USAGE (automatic cookie auth):
 * ```ts
 * const data = await api<Property[]>('properties')
 * ```
 * 
 * SERVER USAGE (manual token from requireSession):
 * ```ts
 * const { accessToken } = await requireSession()
 * const data = await api<Property[]>('properties', { token: accessToken })
 * ```
 */
export async function api<T = unknown>(
	endpoint: string,
	options?: FetchOptions
): Promise<T> {
	const { token, ...fetchOptions } = options || {}
	
	// Build full URL
	const url = `${getApiBaseUrl()}/api/v1/${endpoint.startsWith('/') ? endpoint.slice(1) : endpoint}`
	
	// Build headers
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		...((fetchOptions.headers as Record<string, string>) || {})
	}
	
	// Server Components: Use explicit Authorization header
	if (token) {
		headers['Authorization'] = `Bearer ${token}`
	}
	
	// Client Components: Send cookies via credentials
	const finalOptions: RequestInit = {
		...fetchOptions,
		headers,
		...(token ? {} : { credentials: 'include' as RequestCredentials })
	}
	
	const response = await fetch(url, finalOptions)
	
	// Handle errors
	if (!response.ok) {
		const errorText = await response.text()
		throw new Error(errorText || `HTTP ${response.status}`)
	}
	
	// Handle empty responses (204 No Content)
	if (response.status === 204) {
		return undefined as T
	}
	
	return response.json()
}
