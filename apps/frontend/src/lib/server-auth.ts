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
	SB_URL,
	SB_PUBLISHABLE_KEY
} from '@repo/shared/config/supabase'
import { applySupabaseCookies } from '#lib/supabase/cookies'
import { createLogger } from '@repo/shared/lib/frontend-logger'

const logger = createLogger({ component: 'ServerAuth' })

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
	try {
		const cookieStore = await cookies()
		const supabase = createServerClient(SB_URL, SB_PUBLISHABLE_KEY, {
			cookies: {
				getAll: () => cookieStore.getAll(),
				setAll: cookiesToSet => {
					applySupabaseCookies(
					(name, value, options) => {
						if (options) {
							cookieStore.set(name, value, options)
						} else {
							cookieStore.set(name, value)
						}
					},
					cookiesToSet
				)
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

		if (userError) {
			logger.error('getUser() error', {
				action: 'requireSession',
				metadata: {
					message: userError.message,
					status: userError.status,
					name: userError.name
				}
			})
		}

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
			logger.error('No access token in session', {
				action: 'requireSession'
			})
			// No access token - redirect to login
			redirect('/login')
		}

		return { user, accessToken: session.access_token }
	} catch (error) {
		// Log the error for debugging (won't show in production build logs, but will show in server logs)
		logger.error('Unexpected error', {
			action: 'requireSession'
		}, error)
		// Redirect to login on any error
		redirect('/login')
	}
}

/**
 * Require primary property (onboarding complete)
 * @throws Redirects to /manage/onboarding if no property
 * @returns Primary property or null
 */
export async function requirePrimaryProperty(user_id: string) {
	const cookieStore = await cookies()
	const supabase = createServerClient(SB_URL, SB_PUBLISHABLE_KEY, {
		cookies: {
			getAll: () => cookieStore.getAll(),
			setAll: cookiesToSet => {
				applySupabaseCookies(
					(name, value, options) => {
						if (options) {
							cookieStore.set(name, value, options)
						} else {
							cookieStore.set(name, value)
						}
					},
					cookiesToSet
				)
			}
		}
	})

	const { data: property, error } = await supabase
		.from('properties')
		.select('*')
		.eq('owner_id', user_id)
		.limit(1)
		.single()

	if (error || !property) {
		// Server-side redirect - client can show UI based on searchParams if needed
		redirect('/manage')
	}

	return property
}
