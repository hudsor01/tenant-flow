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

const logger = createLogger({ component: 'ServerAPI' })

/**
 * Server-side fetch with Supabase authentication
 * Pattern copied from login/actions.ts
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

	// SECURITY FIX: Validate user with getUser() before extracting token
	// This ensures the session is authentic by contacting Supabase Auth server
	const {
		data: { user },
		error: userError
	} = await supabase.auth.getUser()

	// Get access token from session (only after validation)
	const {
		data: { session }
	} = await supabase.auth.getSession()

	// Debug authentication in production
	logger.debug('serverFetch session check', {
		metadata: {
			hasUser: !!user,
			hasSession: !!session,
			hasAccessToken: !!session?.access_token,
			endpoint,
			environment: process.env.NODE_ENV
		}
	})

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

	// Only use access token if user validation succeeded
	if (!userError && user && session?.access_token) {
		headers['Authorization'] = `Bearer ${session.access_token}`
	} else {
		logger.warn('No valid session found for API request', {
			metadata: {
				endpoint,
				hasUser: !!user,
				hasSession: !!session,
				userError: userError?.message,
				cookieCount: cookieStore.getAll().length
			}
		})
	}

	const response = await fetch(`${API_BASE_URL}${endpoint}`, {
		...options,
		headers,
		// Use revalidation caching instead of no-store to prevent excessive calls
		next: { revalidate: 30 }, // Cache for 30 seconds
		cache: options?.cache || 'default'
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

		// In production, don't expose detailed error messages to prevent leaking sensitive info
		if (process.env.NODE_ENV === 'production') {
			throw new Error(`API request failed with status ${response.status}`)
		} else {
			throw new Error(
				`API Error (${response.status}): ${errorText || response.statusText}`
			)
		}
	}

	const data = await response.json()

	// Handle API response format (success/data pattern)
	if (data.success === false) {
		throw new Error(data.error || data.message || 'API request failed')
	}

	// Return data directly or the whole response based on API format
	return data.data || data
}
