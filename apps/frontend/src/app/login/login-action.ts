'use server'

import { createServerClient } from '@supabase/ssr'
import type { Database } from '@repo/shared/types/supabase'
import {
	SUPABASE_URL,
	SUPABASE_PUBLISHABLE_KEY
} from '@repo/shared/config/supabase'
import { cookies } from 'next/headers'
import { createLogger } from '@repo/shared/lib/frontend-logger'

const logger = createLogger({ component: 'LoginAction' })

export async function loginWithPassword(email: string, password: string) {
	try {
		const cookieStore = await cookies()
		const supabase = createServerClient<Database>(
			SUPABASE_URL,
			SUPABASE_PUBLISHABLE_KEY,
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

		// Authenticate with email and password
		const { data, error } = await supabase.auth.signInWithPassword({
			email,
			password
		})

		if (error) {
			logger.error('Server-side login failed', {
				action: 'email_login_failed',
				error: error.message
			})
			return {
				success: false,
				error: error.message,
				user: null
			}
		}

		if (!data.session) {
			logger.error('Server-side login: no session in response', {
				action: 'email_login_no_session'
			})
			return {
				success: false,
				error: 'No session returned from authentication',
				user: null
			}
		}

		logger.info('Server-side login successful', {
			action: 'email_login_success',
			userId: data.user?.id
		})

		// Cookies are automatically set by the Supabase client via setAll()
		return {
			success: true,
			error: null,
			user: data.user
		}
	} catch (err) {
		logger.error('Server-side login exception', {
			action: 'email_login_exception',
			error: err instanceof Error ? err.message : String(err)
		})
		return {
			success: false,
			error: err instanceof Error ? err.message : 'Unknown error',
			user: null
		}
	}
}
