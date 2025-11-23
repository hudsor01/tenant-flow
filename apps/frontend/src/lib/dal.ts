import 'server-only'
import { cache } from 'react'
import { cookies } from 'next/headers'
import { connection } from 'next/server'
import { createServerClient, type CookieOptionsWithName } from '@supabase/ssr'
import {
	SB_URL,
	SB_PUBLISHABLE_KEY,
	assertSupabaseConfig
} from '@repo/shared/config/supabase'
import type { Database } from '@repo/shared/types/supabase'
import type { User } from '@supabase/supabase-js'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { NextResponse } from 'next/server'

const logger = createLogger({ component: 'DAL' })

/**
 * Data Access Layer (DAL) - Next.js 16 Pattern
 *
 * This module provides a security boundary for all data access operations.
 * ALL Server Components and Server Actions should use these functions instead
 * of directly accessing Supabase or external APIs.
 *
 * Architecture:
 * - proxy.ts: Primary auth (getClaims() for session sync)
 * - DAL (this file): Secondary auth (defense in depth)
 * - Server Components/Actions: Call DAL functions
 *
 * Security Benefits:
 * 1. Centralized authorization checks
 * 2. Minimal DTO exposure (only safe fields)
 * 3. Cached verification (React.cache per request)
 * 4. Server-only execution (prevented by 'server-only' import)
 */

/**
 * Verify user session - CACHED per request
 *
 * This is the core authentication function for the DAL.
 * Call this at the start of every data access function.
 *
 * Uses React's cache() to memoize the result for the entire request lifecycle,
 * preventing multiple Supabase API calls for the same request.
 *
 * @returns User object if authenticated, null otherwise
 */
export const verifySession = cache(async (): Promise<User | null> => {
	// Signal that this function needs dynamic rendering
	await connection()
	const cookieStore = await cookies()

	// Validate config before creating client
	assertSupabaseConfig()

	const supabase = createServerClient<Database>(
		SB_URL!, // Non-null: validated by assertSupabaseConfig()
		SB_PUBLISHABLE_KEY!, // Non-null: validated by assertSupabaseConfig()
		{
			cookies: {
				getAll() {
					return cookieStore.getAll()
				},
				setAll(cookiesToSet: CookieOptionsWithName[]) {
					cookiesToSet.forEach((cookie) => {
						// Type assertion: CookieOptionsWithName has name and value
						const cookieWithProps = cookie as typeof cookie & { name: string; value: string }
						const name = cookieWithProps.name
						const value = cookieWithProps.value
						const { name: _, value: __, ...options } = cookieWithProps
						const typedOptions = options as Parameters<typeof cookieStore.set>[2]
						// Only pass options if they exist (some properties might be set)
						if (typedOptions && Object.keys(typedOptions).length > 0) {
							cookieStore.set(name, value, typedOptions)
						} else {
							cookieStore.set(name, value)
						}
					})
				}
			}
		}
	)

	try {
		// Verify session with Supabase (secure check)
		const {
			data: { user },
			error
		} = await supabase.auth.getUser()

		if (error) {
			logger.warn('[DAL_AUTH_ERROR]', { error: error.message })
			return null
		}

		if (!user) {
			logger.info('[DAL_NO_USER]')
			return null
		}

		logger.info('[DAL_USER_VERIFIED]', {
			userId: user.id,
			email: user.email
		})

		return user
	} catch (err) {
		logger.error('[DAL_AUTH_EXCEPTION]', {
			error: err instanceof Error ? err.message : String(err)
		})
		return null
	}
})

/**
 * Get current user session with type safety
 *
 * @throws Error if not authenticated (use this when auth is required)
 * @returns User object
 */
export async function requireUser(): Promise<User> {
	const user = await verifySession()

	if (!user) {
		throw new Error('Unauthorized: No valid session')
	}

	return user
}

/**
 * Get authenticated user session with access token
 * Replaces server-auth.ts requireSession()
 *
 * @returns User object and access token
 * @throws Redirects to /login if no valid session
 */
export async function requireSession(): Promise<{
	user: User
	accessToken: string
}> {
	const user = await verifySession()

	if (!user) {
		const { redirect } = await import('next/navigation')
		redirect('/login')
		// TypeScript doesn't know redirect() throws, so we need this
		throw new Error('Redirecting to login')
	}

	const cookieStore = await cookies()

	// Validate config before creating client
	assertSupabaseConfig()

	const supabase = createServerClient<Database>(
		SB_URL!, // Non-null: validated by assertSupabaseConfig()
		SB_PUBLISHABLE_KEY!, // Non-null: validated by assertSupabaseConfig()
		{
			cookies: {
				getAll() {
					return cookieStore.getAll()
				},
				setAll(cookiesToSet: CookieOptionsWithName[]) {
					cookiesToSet.forEach((cookie) => {
						// Type assertion: CookieOptionsWithName has name and value
						const cookieWithProps = cookie as typeof cookie & { name: string; value: string }
						const name = cookieWithProps.name
						const value = cookieWithProps.value
						const { name: _, value: __, ...options } = cookieWithProps
						const typedOptions = options as Parameters<typeof cookieStore.set>[2]
						// Only pass options if they exist (some properties might be set)
						if (typedOptions && Object.keys(typedOptions).length > 0) {
							cookieStore.set(name, value, typedOptions)
						} else {
							cookieStore.set(name, value)
						}
					})
				}
			}
		}
	)

	const {
		data: { session }
	} = await supabase.auth.getSession()

	if (!session?.access_token) {
		logger.error('[DAL_NO_ACCESS_TOKEN]', {
			function: 'requireSession'
		})
		const { redirect } = await import('next/navigation')
		redirect('/login')
		throw new Error('Redirecting to login')
	}

	return { user, accessToken: session.access_token }
}

/**
 * Create a server-side Supabase client for data access
 *
 * Use this in DAL functions after verifying the session.
 * Do NOT export this function - keep Supabase access internal to DAL.
 *
 * @returns Supabase client configured for server-side use
 */
async function createDALClient() {
	const cookieStore = await cookies()

	// Validate config before creating client
	assertSupabaseConfig()

	return createServerClient<Database>(
		SB_URL!, // Non-null: validated by assertSupabaseConfig()
		SB_PUBLISHABLE_KEY!, // Non-null: validated by assertSupabaseConfig()
		{
			cookies: {
				getAll() {
					return cookieStore.getAll()
				},
				setAll(cookiesToSet: CookieOptionsWithName[]) {
					cookiesToSet.forEach((cookie) => {
						// Type assertion: CookieOptionsWithName has name and value
						const cookieWithProps = cookie as typeof cookie & { name: string; value: string }
						const name = cookieWithProps.name
						const value = cookieWithProps.value
						const { name: _, value: __, ...options } = cookieWithProps
						const typedOptions = options as Parameters<typeof cookieStore.set>[2]
						// Only pass options if they exist (some properties might be set)
						if (typedOptions && Object.keys(typedOptions).length > 0) {
							cookieStore.set(name, value, typedOptions)
						} else {
							cookieStore.set(name, value)
						}
					})
				}
			}
		}
	)
}

/**
 * Example: Get user info from auth
 *
 * This demonstrates the DAL pattern:
 * 1. Verify session first
 * 2. Return minimal user data from auth system
 *
 * @param userId - The user ID to fetch
 * @returns User DTO or null
 */
export async function getUserInfo(userId: string) {
	// 1. Verify session
	const user = await verifySession()

	if (!user) {
		logger.warn('[DAL_UNAUTHORIZED]', { function: 'getUserInfo' })
		return null
	}

	// 2. Authorization check
	if (user.id !== userId) {
		logger.warn('[DAL_FORBIDDEN]', {
			function: 'getUserInfo',
			requestedUserId: userId,
			actualUserId: user.id
		})
		throw new Error('Forbidden: Cannot access another user\'s info')
	}

	// 3. Return minimal DTO (only safe fields from auth)
	return {
		id: user.id,
		email: user.email,
		user_metadata: user.user_metadata,
		created_at: user.created_at
	}
}

/**
 * Example: Get user's tenants with authorization
 *
 * @returns Array of tenant DTOs
 */
export async function getUserTenants() {
	const user = await requireUser() // Throws if not authenticated

	const supabase = await createDALClient()

	const { data, error } = await supabase
		.from('tenants')
		.select('id, name, status, created_at')
		.eq('owner_id', user.id)
		.order('created_at', { ascending: false })

	if (error) {
		logger.error('[DAL_QUERY_ERROR]', {
			function: 'getUserTenants',
			error: error.message
		})
		throw new Error('Failed to fetch tenants')
	}

	return data ?? []
}

/**
 * Require primary property (onboarding complete)
 * Replaces server-auth.ts requirePrimaryProperty()
 *
 * @throws Redirects to /manage if no property
 * @returns Primary property
 */
export async function requirePrimaryProperty(user_id: string) {
	const user = await verifySession()

	if (!user) {
		const { redirect } = await import('next/navigation')
		redirect('/login')
		throw new Error('Redirecting to login')
	}

	// Authorization: user can only access their own properties
	if (user.id !== user_id) {
		logger.warn('[DAL_FORBIDDEN]', {
			function: 'requirePrimaryProperty',
			requestedUserId: user_id,
			actualUserId: user.id
		})
		throw new Error('Forbidden: Cannot access another user\'s property')
	}

	const supabase = await createDALClient()

	const { data: property, error } = await supabase
		.from('properties')
		.select('*')
		.eq('owner_id', user_id)
		.limit(1)
		.single()

	if (error || !property) {
		const { redirect } = await import('next/navigation')
		redirect('/manage')
		throw new Error('Redirecting to manage')
	}

	return property
}

// ==============================================================================
// API Route Helpers (Replaces api-auth.ts)
// ==============================================================================

/**
 * Require authentication for API routes
 * Returns 401 response if user is not authenticated
 * Replaces api-auth.ts requireAuth()
 *
 * @returns User and Supabase client, or NextResponse with 401
 */
export async function requireApiAuth(): Promise<
	| { user: User; supabase: Awaited<ReturnType<typeof createDALClient>> }
	| NextResponse
> {
	const user = await verifySession()

	if (!user) {
		return NextResponse.json(
			{
				success: false,
				error: 'Authentication required',
				message: 'User not authenticated'
			},
			{ status: 401 }
		)
	}

	const supabase = await createDALClient()

	return { user, supabase }
}

/**
 * Create error response for API routes
 * Replaces api-auth.ts createApiError()
 */
export function createApiError(
	message: string,
	status: number = 400,
	error?: string
): NextResponse {
	return NextResponse.json(
		{
			success: false,
			error: error || 'Request failed',
			message
		},
		{ status }
	)
}

/**
 * Create success response for API routes
 * Replaces api-auth.ts createApiSuccess()
 */
export function createApiSuccess<T = unknown>(
	data: T,
	message?: string
): NextResponse {
	return NextResponse.json({
		success: true,
		data,
		...(message && { message })
	})
}
