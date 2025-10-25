'use server'

import type { LoginCredentials } from '@repo/shared/types/auth'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function loginAction(
	credentials: LoginCredentials,
	redirectTo?: string
) {
	const cookieStore = await cookies()

	const supabase = createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
		{
			cookies: {
				getAll: () => {
					return cookieStore.getAll()
				},
				setAll: cookieArray => {
					cookieArray.forEach(({ name, value, options }) => {
						cookieStore.set({ name, value, ...options })
					})
				}
			}
		}
	)

	const { data, error } = await supabase.auth.signInWithPassword({
		email: credentials.email,
		password: credentials.password
	})

	if (error) {
		return {
			success: false,
			error: error.message,
			needsEmailConfirmation: error.message.includes('Email not confirmed')
		}
	}

	if (data.user) {
		// Fetch user role from database to determine redirect
		const { data: userProfile } = await supabase
			.from('users')
			.select('role')
			.eq('supabaseId', data.user.id)
			.single()

		// Determine destination based on user role
		let destination = '/manage' // Default for OWNER, MANAGER, ADMIN

		if (userProfile?.role === 'TENANT') {
			destination = '/tenant'
		}

		// Honor explicit redirectTo if provided (unless it conflicts with role)
		if (
			redirectTo &&
			redirectTo.startsWith('/') &&
			!redirectTo.startsWith('//')
		) {
			destination = redirectTo
		}

		redirect(destination)
	}

	return {
		success: false,
		error: 'Login failed'
	}
}
