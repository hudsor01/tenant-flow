/**
 * Server-side API client for Next.js App Router
 * Uses existing Supabase authentication pattern
 */
import type { Database } from '@repo/shared/types/supabase-generated'
import { API_BASE_URL } from '#lib/api-config'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import {
	SUPABASE_URL,
	SUPABASE_PUBLISHABLE_KEY
} from '@repo/shared/config/supabase'
import { isProduction } from '#config/env'

const logger = createLogger({ component: 'ServerAPI' })

/**
 * Server-side fetch with Supabase authentication
 * Pattern copied from login/actions.ts
 *
 * SECURITY FIX: Added session validation to prevent using stale/expired sessions
 */
export async function serverFetch<T>(
	endpoint: string,
	options?: RequestInit
): Promise<T> {
	const cookieStore = await cookies()

	// Create Supabase client with cookie handling (pattern from login/actions.ts)
	const supabase = createServerClient<Database>(
		SUPABASE_URL,
		SUPABASE_PUBLISHABLE_KEY,
		{
			cookies: {
				getAll() {
					return cookieStore.getAll()
				},
				setAll(cookiesToSet) {
					try {
						cookiesToSet.forEach(({ name, value, options }) =>
							cookieStore.set(name, value, options)
						)
					} catch {
						// The `setAll` method was called from a Server Component.
						// This can be ignored if you have middleware refreshing
						// user sessions.
					}
				}
			}
		}
	)

	// SECURITY FIX: Validate session before using it
	// Get session first (atomic operation)
	const {
		data: { session },
		error: sessionError
	} = await supabase.auth.getSession()

	// Validate session before using token
	let accessToken: string | null = null
	if (session?.access_token) {
		// SECURITY: Verify session is still valid by checking if we can get user
		// This ensures the token hasn't been revoked or expired
		const {
			data: { user },
			error: userError
		} = await supabase.auth.getUser()

		if (!userError && user) {
			accessToken = session.access_token
		} else {
			// Session exists but user validation failed - token might be expired or revoked
			logger.warn('Session token invalid during validation', {
				metadata: {
					hasSession: !!session,
					hasUser: !!user,
					userError: userError?.message
				}
			})
		}
	}

	// Make API request with Bearer token if available
	const headers: Record<string, string> = {
		'Content-Type': 'application/json'
	}

	// Add any additional headers from options
	if (options?.headers) {
		Object.entries(options.headers).forEach(([key, value]) => {
			if (typeof value === 'string') {
				headers[key] = value
			}
		})
	}

	// Add auth header if valid session exists
	if (accessToken) {
		headers['Authorization'] = `Bearer ${accessToken}`
	} else {
		logger.warn('No valid session found for API request', {
			metadata: {
				endpoint,
				cookieCount: cookieStore.getAll().length,
				hasSession: !!session,
				sessionError: sessionError?.message
			}
		})
	}

	const response = await fetch(`${API_BASE_URL}${endpoint}`, {
		...options,
		headers,
		cache: options?.cache ?? 'no-store',
		next: options?.next ?? { revalidate: 0 }
	})

	if (!response.ok) {
		// Log the error details for debugging
		const errorText = await response.text()
		logger.error('API request failed', {
			metadata: {
				status: response.status,
				endpoint,
				statusText: response.statusText,
				errorText: errorText.substring(0, 500) // Log first 500 chars for debugging
			}
		})

		// Preserve status code for error handling utilities (isConflictError, isNotFoundError)
		const errorMessage =
			isProduction()
				? `API request failed with status ${response.status}`
				: `API Error (${response.status}): ${errorText || response.statusText}`

		const error = new Error(errorMessage) as Error & {
			status: number
			statusCode: number
		}
		error.status = response.status
		error.statusCode = response.status
		throw error
	}

	const data = await response.json()

	// Handle API response format (success/data pattern)
	if (data.success === false) {
		const error = new Error(
			data.error || data.message || 'API request failed'
		) as Error & { status: number; statusCode: number }
		error.status = response.status
		error.statusCode = response.status
		throw error
	}

	// Return data directly or the whole response based on API format
	return data.data || data
}
