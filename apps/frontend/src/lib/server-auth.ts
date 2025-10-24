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
 * @returns Authenticated user object
 */
export async function requireSession(): Promise<User> {
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

	if (error || !user) {
		redirect('/sign-in') // 307 redirect, no client flash
	}

	return user
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
		.eq('owner_id', userId)
		.limit(1)
		.single()

	if (error || !property) {
		// Redirect to onboarding (outside protected layout, no infinite loop)
		redirect('/properties/new')
	}

	return property
}
