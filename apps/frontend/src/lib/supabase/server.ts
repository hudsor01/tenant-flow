import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import {
	SB_URL,
	SB_PUBLISHABLE_KEY
} from '@repo/shared/config/supabase'
import { applySupabaseCookies } from '#lib/supabase/cookies'

/**
 * If using Fluid compute: Don't put this client in a global variable. Always create a new client within each
 * function when using it.
 */
export async function createClient() {
	const cookieStore = await cookies()

	return createServerClient(SB_URL, SB_PUBLISHABLE_KEY, {
		cookies: {
			getAll() {
				return cookieStore.getAll()
			},
			setAll(cookiesToSet) {
				try {
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
				} catch {
					// The `setAll` method was called from a Server Component.
					// This can be ignored if you have middleware refreshing
					// user sessions.
				}
			}
		}
	})
}
