/**
 * Data Access Layer (DAL) - Next.js 16 Security Pattern
 *
 * CRITICAL: This file implements the Next.js 16 Data Access Layer pattern
 * for securing Server Components and preventing data exposure.
 *
 * Purpose:
 * - Provide data access for Server Components
 * - Cache user fetching per request
 * - Prevent secrets from reaching Client Components
 *
 * Security Architecture:
 * 1. Proxy (proxy.ts): HTTP-level auth enforcement with getClaims()
 * 2. DAL (this file): Data access only (no redirects)
 * 3. RLS Policies: Database-level access control
 *
 * Documentation:
 * https://nextjs.org/docs/app/guides/data-security
 */

import 'server-only' // Prevents accidental Client Component imports

import { cache } from 'react'
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptionsWithName } from '@supabase/ssr'
import {
	SUPABASE_URL,
	SUPABASE_PUBLISHABLE_KEY,
	assertSupabaseConfig
} from '@repo/shared/config/supabase'
import type { Database } from '@repo/shared/types/supabase'

/**
 * JWT Claims interface from Supabase
 */
interface JWTClaims {
	sub: string
	email?: string
	app_metadata?: Record<string, unknown>
	user_metadata?: Record<string, unknown>
	[key: string]: unknown
}

/**
 * Create server Supabase client for DAL operations
 *
 * INTERNAL USE ONLY - Do not export
 */
async function createDALClient() {
	const cookieStore = await cookies()

	assertSupabaseConfig()

	return createServerClient<Database>(
		SUPABASE_URL!,
		SUPABASE_PUBLISHABLE_KEY!,
		{
			cookies: {
				getAll() {
					return cookieStore.getAll()
				},
				setAll(cookiesToSet: CookieOptionsWithName[]) {
					cookiesToSet.forEach((cookie) => {
						const cookieWithProps = cookie as typeof cookie & { name: string; value: string }
						const name = cookieWithProps.name
						const value = cookieWithProps.value
						const { name: _, value: __, ...options } = cookieWithProps
						const typedOptions = options as Parameters<typeof cookieStore.set>[2]

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
 * Get authenticated claims and access token for Server Components
 *
 * CRITICAL SECURITY: Use getClaims() not getUser()
 *
 * Per Supabase docs: "Always use getClaims() to protect pages and user data."
 * getClaims() validates JWT signatures on every call and is more performant
 * than getUser() since it doesn't fetch the full user object.
 *
 * Proxy enforces auth - this just fetches claims data.
 * Use when you need user context in Server Components.
 *
 * Uses React cache() to prevent duplicate fetches in same request.
 */
export const getClaims = cache(async () => {
	const supabase = await createDALClient()

	// Get JWT claims for user context
	const claimsResult = await supabase.auth.getClaims()
	const claims = claimsResult.data as JWTClaims | null

	// Get session for access token
	const { data: sessionData } = await supabase.auth.getSession()
	const accessToken = sessionData?.session?.access_token

	return { claims, accessToken }
})
