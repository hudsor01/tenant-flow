/**
 * Server-side authentication helpers
 * MUST be used in Server Components only - enforces auth before rendering
 * Prevents client-side useEffect redirect flashes (150ms+ wasted hydration)
 */
import { createServerClient } from '@supabase/ssr'
import type { User } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

/**
 * Require authenticated user session
 * @throws Redirects to /sign-in if no session
 * @returns Authenticated user object and access token
 */
export async function requireSession(): Promise<{ user: User; accessToken: string }> {
	const cookieStore = await cookies()
	const supabase = createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

	const {
		data: { user },
		error
	} = await supabase.auth.getUser()

	const {
		data: { session }
	} = await supabase.auth.getSession()

	if (error || !user || !session) {
		redirect('/login') // 307 redirect, no client flash
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
	const supabase = createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
		// Redirect to dashboard - user can add properties via dashboard CTAs
		redirect('/manage')
	}

	return property
}
