/**
 * Server-side API client for Next.js App Router
 * Uses existing Supabase authentication pattern
 */
import type { Database } from '@repo/shared'
import { createLogger } from '@repo/shared'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const logger = createLogger({ component: 'ServerAPI' })

const API_BASE_URL =
	process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.tenantflow.app'

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
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
		{
			cookies: {
				getAll: () => cookieStore.getAll(),
				setAll: () => {} // Read-only for server components
			}
		}
	)

	// Get current session
	const {
		data: { session }
	} = await supabase.auth.getSession()

	// Debug authentication in production
	logger.debug('serverFetch session check', {
		metadata: {
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

	if (session?.access_token) {
		headers['Authorization'] = `Bearer ${session.access_token}`
	} else {
		logger.warn('No valid session found for API request', {
			metadata: {
				endpoint,
				hasSession: !!session,
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
		// In production, don't expose detailed error messages to prevent leaking sensitive info
		if (process.env.NODE_ENV === 'production') {
			logger.error('API request failed in production', {
				metadata: {
					status: response.status,
					endpoint,
					statusText: response.statusText
				}
			})
			throw new Error(`API request failed with status ${response.status}`)
		} else {
			const errorText = await response.text()
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
