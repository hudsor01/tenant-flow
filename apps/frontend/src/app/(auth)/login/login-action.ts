'use server'

import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@repo/shared/config/supabase'

interface LoginActionResponse {
	success: boolean
	error?: string
}

/**
 * Login server action with role-based redirect
 *
 * Next.js 16 Pattern:
 * 1. Authenticate with Supabase
 * 2. Get user role from database
 * 3. Redirect to appropriate dashboard based on role
 */
export async function loginAction(
	email: string,
	password: string
): Promise<LoginActionResponse> {
	const cookieStore = await cookies()

	const supabase = createServerClient(
		SUPABASE_URL!,
		SUPABASE_PUBLISHABLE_KEY!,
		{
			cookies: {
				getAll() {
					return cookieStore.getAll()
				},
				setAll(cookiesToSet) {
					cookiesToSet.forEach(({ name, value, options }) => {
						cookieStore.set(name, value, options)
					})
				}
			}
		}
	)

	const { data, error } = await supabase.auth.signInWithPassword({
		email,
		password
	})

	if (error) {
		return { success: false, error: error.message }
	}

	if (!data.user) {
		return { success: false, error: 'Login failed - no user returned' }
	}

	// Get user role from JWT (custom access token hook sets in app_metadata)
	// SECURITY: Never fall back to user_metadata - it's user-editable!
	const appMetadata = data.user.app_metadata as import('#types/supabase-metadata').SupabaseAppMetadata
	const userType = appMetadata?.user_type

	if (!userType) {
		// No role assigned - log out and show error
		await supabase.auth.signOut()
		return { success: false, error: 'Account setup incomplete. Please contact support.' }
	}

	// Redirect based on role - DIRECT to destination (no intermediate redirect)
	if (userType === 'OWNER') {
		redirect('/dashboard')  // Owner dashboard (direct, avoids login → / → /dashboard timeout)
	} else if (userType === 'TENANT') {
		redirect('/portal')  // Tenant portal
	} else {
		// Unknown role - log out and show error
		await supabase.auth.signOut()
		return {
			success: false,
			error: 'Account not properly configured. Please contact support.'
		}
	}
}
