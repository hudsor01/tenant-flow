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

/**
 * Get authenticated user session
 *
 * IMPORTANT: This assumes middleware already validated auth
 * If middleware redirected unauthenticated users, this will always have a user
 *
 * @returns Authenticated user object and access token
 * @throws Redirects to /login if no session (fallback - middleware should prevent this)
 */
export async function requireSession(): Promise<{
	user: User
	accessToken: string
}> {
	const cookieStore = await cookies()
	const supabase = createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
		{
			cookies: {
				getAll: () => cookieStore.getAll(),
				setAll: cookiesToSet => {
					cookiesToSet.forEach(({ name, value, options }) => {
						cookieStore.set(name, value, options)
					})
				}
			}
		}
	)

	// Middleware already validated with getUser(), so we can safely use getSession() here
	// This avoids duplicate validation calls (middleware did the work)
	const {
		data: { session }
	} = await supabase.auth.getSession()

	if (!session || !session.user) {
		// Fallback: shouldn't happen since middleware handles this
		redirect('/login')
	}

	return { user: session.user, accessToken: session.access_token }
}

/**
 * Require primary property (onboarding complete)
 * @throws Redirects to /manage/onboarding if no property
 * @returns Primary property or null
 */
export async function requirePrimaryProperty(userId: string) {
	const cookieStore = await cookies()
	const supabase = createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
		{
			cookies: {
				getAll: () => cookieStore.getAll(),
				setAll: cookiesToSet => {
					cookiesToSet.forEach(({ name, value, options }) => {
						cookieStore.set(name, value, options)
					})
				}
			}
		}
	)

	const { data: property, error } = await supabase
		.from('property')
		.select('*')
		.eq('ownerId', userId)
		.limit(1)
		.single()

	if (error || !property) {
		// Modern UX: show error toast before redirect
		if (typeof window !== 'undefined') {
			// Use a global error handler or toast system (e.g., React Query, TanStack, or custom)
			window.dispatchEvent(
				new CustomEvent('show-toast', {
					detail: {
						type: 'error',
						message:
							error?.message ||
							'No property found. Please add a property to continue.'
					}
				})
			)
		}
		redirect('/manage')
	}

	return property
}
