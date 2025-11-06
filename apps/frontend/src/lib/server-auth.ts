/**
 * Server-side authentication helpers
 * MUST be used in Server Components only
 *
 * NOTE: Middleware now handles auth validation and token refresh
 * This helper just retrieves the authenticated user from cookies
 */
import { createServerClient } from '@supabase/ssr'
import type { User } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import {
	SUPABASE_URL,
	SUPABASE_PUBLISHABLE_KEY
} from '@repo/shared/config/supabase'

/**
 * Get authenticated user session
 *
 * SECURITY: Uses getUser() to validate the session with Supabase Auth server
 * This prevents using potentially-tampered user data from cookies
 *
 * @returns Authenticated user object and access token
 * @throws Redirects to /login if no valid session
 */
export async function requireSession(): Promise<{
	user: User
	accessToken: string
}> {
	const cookieStore = await cookies()
	const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
		cookies: {
			getAll: () => cookieStore.getAll(),
			setAll: cookiesToSet => {
				cookiesToSet.forEach(({ name, value, options }) => {
					cookieStore.set(name, value, options)
				})
			}
		}
	})

	// SECURITY FIX: Use getUser() to validate the session with Supabase Auth server
	// getSession() reads from storage (cookies) which could be tampered with
	// getUser() validates the token by contacting Supabase Auth server
	const {
		data: { user },
		error: userError
	} = await supabase.auth.getUser()

	if (userError || !user) {
		// User validation failed - redirect to login
		redirect('/login')
	}

	// Now get the access token from the session
	// We trust the token here because getUser() already validated it
	const {
		data: { session }
	} = await supabase.auth.getSession()

	if (!session?.access_token) {
		// No access token - redirect to login
		redirect('/login')
	}

	return { user, accessToken: session.access_token }
}

/**
 * Require primary property (onboarding complete)
 * @throws Redirects to /manage/onboarding if no property
 * @returns Primary property or null
 */
export async function requirePrimaryProperty(userId: string) {
	const cookieStore = await cookies()
	const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
		cookies: {
			getAll: () => cookieStore.getAll(),
			setAll: cookiesToSet => {
				cookiesToSet.forEach(({ name, value, options }) => {
					cookieStore.set(name, value, options)
				})
			}
		}
	})

	const { data: property, error } = await supabase
		.from('property')
		.select('*')
		.eq('ownerId', userId)
		.limit(1)
		.single()

	if (error || !property) {
		// Server-side redirect - client can show UI based on searchParams if needed
		redirect('/manage')
	}

	return property
}
