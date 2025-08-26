/**
 * Server Actions for Authentication
 * Direct Supabase Auth integration
 */

'use server'

<<<<<<< HEAD
import { redirect } from 'next/navigation'
import { createActionClient } from '@/lib/supabase/action-client'

export async function getCurrentUser() {
	const supabase = await createActionClient()
=======
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@repo/shared/types/supabase'
import { config } from '@/lib/config'

async function createServerSupabaseClient() {
	const cookieStore = await cookies()

	return createServerClient<Database>(
		config.supabase.url,
		config.supabase.anonKey,
		{
			cookies: {
				getAll() {
					return cookieStore.getAll()
				},
				setAll(cookiesToSet) {
					try {
						cookiesToSet.forEach(({ name, value, options }) => {
							cookieStore.set(name, value, options)
						})
					} catch {
						// Cookie setting can fail in certain contexts
					}
				}
			}
		}
	)
}

export async function getCurrentUser() {
	const supabase = await createServerSupabaseClient()
>>>>>>> origin/main
	const {
		data: { user }
	} = await supabase.auth.getUser()
	return user
}

export async function signIn(email: string, password: string) {
<<<<<<< HEAD
	const supabase = await createActionClient()
	const { data: _data, error } = await supabase.auth.signInWithPassword({
=======
	const supabase = await createServerSupabaseClient()
	const { data, error } = await supabase.auth.signInWithPassword({
>>>>>>> origin/main
		email,
		password
	})

	if (error) {
		return { success: false, error: error.message }
	}

	return { success: true, message: 'Successfully signed in' }
}

export async function signUp(
	email: string,
	password: string,
	fullName?: string
) {
<<<<<<< HEAD
	const supabase = await createActionClient()
	const { data: _data, error } = await supabase.auth.signUp({
=======
	const supabase = await createServerSupabaseClient()
	const { data, error } = await supabase.auth.signUp({
>>>>>>> origin/main
		email,
		password,
		options: {
			data: {
				full_name: fullName
			}
		}
	})

	if (error) {
		return { success: false, error: error.message }
	}

	return {
		success: true,
		message:
			'Account created successfully. Please check your email to verify your account.'
	}
}

export async function signOut() {
<<<<<<< HEAD
	const supabase = await createActionClient()
=======
	const supabase = await createServerSupabaseClient()
>>>>>>> origin/main
	await supabase.auth.signOut()
	redirect('/auth/login')
}

export async function forgotPassword(email: string) {
<<<<<<< HEAD
	const supabase = await createActionClient()
=======
	const supabase = await createServerSupabaseClient()
>>>>>>> origin/main

	// Use environment variable or fallback to default URL
	const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tenantflow.app'

	const { error } = await supabase.auth.resetPasswordForEmail(email, {
		redirectTo: `${appUrl}/auth/reset-password`
	})

	if (error) {
		return { success: false, error: error.message }
	}

	// Redirect to a success page after sending the reset email
	redirect('/auth/forgot-password/success')
}

export async function updatePassword(newPassword: string) {
<<<<<<< HEAD
	const supabase = await createActionClient()
=======
	const supabase = await createServerSupabaseClient()
>>>>>>> origin/main
	const { error } = await supabase.auth.updateUser({
		password: newPassword
	})

	if (error) {
		return { success: false, error: error.message }
	}

	return { success: true, message: 'Password updated successfully' }
}

export async function updateProfile(
	prevState: AuthFormState,
	formData: FormData
): Promise<AuthFormState> {
	try {
<<<<<<< HEAD
		const supabase = await createActionClient()

		const updates: Record<string, string> = {}
=======
		const supabase = await createServerSupabaseClient()

		const updates: { [key: string]: string } = {}
>>>>>>> origin/main

		const name = formData.get('name') as string
		const phone = formData.get('phone') as string
		const bio = formData.get('bio') as string
		const company = formData.get('company') as string

<<<<<<< HEAD
		if (name) {
			updates.full_name = name
		}
		if (phone) {
			updates.phone = phone
		}
		if (bio) {
			updates.bio = bio
		}
		if (company) {
			updates.company = company
		}
=======
		if (name) updates.full_name = name
		if (phone) updates.phone = phone
		if (bio) updates.bio = bio
		if (company) updates.company = company
>>>>>>> origin/main

		const { error } = await supabase.auth.updateUser({
			data: updates
		})

		if (error) {
			return {
				success: false,
				error: error.message,
				errors: { _form: [error.message] }
			}
		}

		return { success: true, message: 'Profile updated successfully' }
	} catch (error) {
		const message =
			error instanceof Error ? error.message : 'Failed to update profile'
		return {
			success: false,
			error: message,
			errors: { _form: [message] }
		}
	}
}

export async function deleteAccount() {
<<<<<<< HEAD
	const supabase = await createActionClient()
=======
	const supabase = await createServerSupabaseClient()
>>>>>>> origin/main
	const {
		data: { user }
	} = await supabase.auth.getUser()

	if (!user) {
		return { success: false, error: 'No user found' }
	}

	// Note: User deletion requires server-side admin access
	// This is a placeholder - implement with backend API
	return {
		success: false,
		error: 'Account deletion must be done through support'
	}
}

// Form-compatible action wrappers for useActionState
export async function loginFormAction(
	prevState: AuthFormState,
	formData: FormData
): Promise<AuthFormState> {
	const email = formData.get('email') as string
	const password = formData.get('password') as string

	if (!email?.trim() || !password?.trim()) {
		return {
			success: false,
			error: 'Email and password are required',
			errors: {
				email: !email?.trim() ? ['Email is required'] : [],
				password: !password?.trim() ? ['Password is required'] : []
			}
		}
	}

	return await signIn(email, password)
}

export async function signupFormAction(
	prevState: AuthFormState,
	formData: FormData
): Promise<AuthFormState> {
	const email = formData.get('email') as string
	const password = formData.get('password') as string
	const fullName = formData.get('fullName') as string

	if (!email?.trim() || !password?.trim()) {
		return {
			success: false,
			error: 'Email and password are required',
			errors: {
				email: !email?.trim() ? ['Email is required'] : [],
				password: !password?.trim() ? ['Password is required'] : []
			}
		}
	}

	return await signUp(email, password, fullName)
}

export async function updatePasswordFormAction(
	prevState: AuthFormState,
	formData: FormData
): Promise<AuthFormState> {
	const newPassword = formData.get('password') as string

	if (!newPassword?.trim()) {
		return {
			success: false,
			error: 'New password is required',
			errors: { password: ['New password is required'] }
		}
	}

	return await updatePassword(newPassword)
}

// Additional exports for compatibility
export const login = signIn
export const loginAction = signIn
export const signup = signUp
export const logoutAction = signOut
export const updateProfileAction = updateProfile
export const updatePasswordAction = updatePassword

// Form state type
export interface AuthFormState {
	success: boolean
	error?: string
<<<<<<< HEAD
	errors?: Record<string, string[]>
=======
	errors?: { [key: string]: string[] }
>>>>>>> origin/main
	message?: string
}
