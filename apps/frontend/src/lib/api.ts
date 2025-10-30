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
	let resolvedToken = token

	// Build full URL
	const url = `${getApiBaseUrl()}/api/v1/${endpoint.startsWith('/') ? endpoint.slice(1) : endpoint}`

	// If we're in the browser without an explicit token, fetch it from Supabase
	if (!resolvedToken && typeof window !== 'undefined') {
		try {
			const { createBrowserClient } = await import('@supabase/ssr')
			const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
			const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

			if (!supabaseUrl || !supabaseAnonKey) {
				throw new Error('Missing Supabase environment variables')
			}

			const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)
			const {
				data: { session },
				error
			} = await supabase.auth.getSession()

			if (error) {
				// Log to console to aid debugging in the browser without breaking flow
				console.warn('[api] Supabase session lookup failed', error.message)
			}

			resolvedToken = session?.access_token || undefined
		} catch (err) {
			// Avoid throwing here to keep behaviour consistent with previous implementation
			const message =
				err instanceof Error ? err.message : 'Unknown Supabase client error'
			console.warn('[api] Unable to resolve Supabase access token', message)
		}
	}

	const headers = new Headers(fetchOptions.headers as HeadersInit | undefined)

	// Only set JSON content type when the body isn't FormData and header not provided
	if (!(fetchOptions.body instanceof FormData) && !headers.has('Content-Type')) {
		headers.set('Content-Type', 'application/json')
	}

	if (resolvedToken) {
		headers.set('Authorization', `Bearer ${resolvedToken}`)
	}

	const finalOptions: RequestInit = {
		...fetchOptions,
		headers,
		...(resolvedToken
			? {}
			: {
					credentials:
						(fetchOptions.credentials as RequestCredentials | undefined) ??
						('include' as RequestCredentials)
			  })
	}

	const response = await fetch(url, finalOptions)

	if (!response.ok) {
		let errorPayload: unknown
		try {
			errorPayload = await response.json()
		} catch {
			errorPayload = await response.text()
		}

		const errorMessage =
			typeof errorPayload === 'string'
				? errorPayload
				: (errorPayload as { message?: string })?.message ??
				  `HTTP ${response.status}`

		const error = new Error(errorMessage)
		Object.assign(error, {
			status: response.status,
			payload: errorPayload
		})
		throw error
	}

	if (response.status === 204) {
		return undefined as T
	}

	return response.json()
}
