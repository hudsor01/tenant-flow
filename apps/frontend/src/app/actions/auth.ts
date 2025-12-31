'use server'

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

/**
 * Server Action: Sign out user
 *
 * This action:
 * 1. Creates a Supabase server client
 * 2. Signs out the user (clears session)
 * 3. Redirects to login page
 *
 * Usage:
 * - Can be called from Client Components via form action or transition
 * - Handles session cleanup server-side
 */
export async function signOut() {
	const cookieStore = await cookies()

	if (
		!process.env.NEXT_PUBLIC_SUPABASE_URL ||
		!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
	) {
		throw new Error('Missing Supabase configuration')
	}

	const supabase = createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL,
		process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
		{
			cookies: {
				getAll() {
					return cookieStore.getAll()
				},
				setAll(
					cookiesToSet: {
						name: string
						value: string
						options: CookieOptions
					}[]
				) {
					try {
						cookiesToSet.forEach(({ name, value, options }) =>
							cookieStore.set(name, value, options)
						)
					} catch {
						// Ignore errors (server component context)
					}
				}
			}
		}
	)

	await supabase.auth.signOut()
	redirect('/login')
}
