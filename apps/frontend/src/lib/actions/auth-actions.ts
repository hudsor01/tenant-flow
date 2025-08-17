'use server'

import { revalidateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createActionClient } from '@/lib/supabase/action-client'
import type { AuthUser } from '@/lib/supabase/client'
import { trackServerSideEvent } from '@/lib/analytics/posthog-server'
import { commonValidations } from '@/lib/validation/schemas'
import {
	loginRateLimiter,
	signupRateLimiter,
	passwordResetRateLimiter,
	clearRateLimit
} from '@/lib/auth/rate-limiter'
import { sanitizeErrorMessage } from '@/lib/auth/error-sanitizer'
import { requireCSRFToken } from '@/lib/auth/csrf'
import { logger } from '@/lib/logger'

// Auth form schemas using consolidated validations
const LoginSchema = z.object({
	email: commonValidations.email,
	password: z.string().min(6, 'Password must be at least 6 characters')
})

const SignupSchema = z
	.object({
		email: commonValidations.email,
		password: z.string().min(8, 'Password must be at least 8 characters'),
		confirmPassword: z
			.string()
			.min(8, 'Password must be at least 8 characters'),
		fullName: commonValidations.name,
		companyName: z.string().nullable().optional()
	})
	.refine(data => data.password === data.confirmPassword, {
		message: "Passwords don't match",
		path: ['confirmPassword']
	})

const ResetPasswordSchema = z.object({
	email: commonValidations.email
})

const UpdatePasswordSchema = z
	.object({
		password: z.string().min(8, 'Password must be at least 8 characters'),
		confirmPassword: z
			.string()
			.min(8, 'Password must be at least 8 characters')
	})
	.refine(data => data.password === data.confirmPassword, {
		message: "Passwords don't match",
		path: ['confirmPassword']
	})

export interface AuthFormState {
	errors?: {
		email?: string[]
		password?: string[]
		confirmPassword?: string[]
		fullName?: string[]
		companyName?: string[]
		_form?: string[]
	}
	success?: boolean
	message?: string
	data?: {
		user?: {
			id: string
			email: string
			name?: string
		}
		session?: {
			access_token: string
			refresh_token: string
		}
	}
}

export async function loginAction(
	_prevState: AuthFormState,
	formData: FormData
): Promise<AuthFormState> {
	try {
		// Validate CSRF token first
		await requireCSRFToken(formData)
	} catch (error) {
		return {
			errors: {
				_form: [sanitizeErrorMessage(error, 'csrf-validation')]
			}
		}
	}

	const rawData = {
		email: formData.get('email'),
		password: formData.get('password')
	}

	const result = LoginSchema.safeParse(rawData)

	if (!result.success) {
		return {
			errors: result.error.flatten().fieldErrors
		}
	}

	// Check rate limit before attempting login
	const rateLimitResult = await loginRateLimiter(result.data.email)
	if (!rateLimitResult.success) {
		return {
			errors: {
				_form: [
					rateLimitResult.reason ||
						'Too many login attempts. Please try again later.'
				]
			}
		}
	}

	try {
		const supabase = await createActionClient()
		const { data, error } = await supabase.auth.signInWithPassword({
			email: result.data.email,
			password: result.data.password
		})

		if (error) {
			// Track failed login attempt
			await trackServerSideEvent('user_login_failed', undefined, {
				error_message: error.message,
				email_domain: result.data.email.split('@')[1],
				method: 'email'
			})

			return {
				errors: {
					_form: [sanitizeErrorMessage(error, 'login')]
				}
			}
		}

		// Track successful login and clear rate limit
		if (data.user) {
			await clearRateLimit(result.data.email)
			await trackServerSideEvent('user_signed_in', data.user.id, {
				method: 'email',
				email: data.user.email,
				user_id: data.user.id,
				session_id: data.session?.access_token?.slice(-8) // Last 8 chars for identification
			})
		}

		// Revalidate auth-related caches
		revalidateTag('user')
		revalidateTag('session')

		// Return success instead of redirecting - let client handle redirect
		return {
			success: true,
			message: 'Successfully signed in!',
			data: {
				user: {
					id: data.user.id,
					email: data.user.email!,
					name: data.user.user_metadata?.full_name || data.user.email!
				},
				session: {
					access_token: data.session!.access_token,
					refresh_token: data.session!.refresh_token
				}
			}
		}
	} catch (error: unknown) {
		return {
			errors: {
				_form: [sanitizeErrorMessage(error, 'login')]
			}
		}
	}
}

export async function signupAction(
	prevState: AuthFormState,
	formData: FormData
): Promise<AuthFormState> {
	try {
		// Validate CSRF token first
		await requireCSRFToken(formData)
	} catch (error) {
		return {
			errors: {
				_form: [sanitizeErrorMessage(error, 'csrf-validation')]
			}
		}
	}

	// Check rate limit before processing signup
	const signupRateLimit = await signupRateLimiter()
	if (!signupRateLimit.success) {
		return {
			errors: {
				_form: [
					signupRateLimit.reason ||
						'Too many signup attempts. Please try again later.'
				]
			}
		}
	}

	// Check if terms are accepted
	const acceptTerms = formData.get('terms') === 'on'
	if (!acceptTerms) {
		return {
			errors: {
				_form: [
					'You must accept the terms and conditions to create an account'
				]
			}
		}
	}

	const rawData = {
		email: formData.get('email'),
		password: formData.get('password'),
		confirmPassword: formData.get('confirmPassword'),
		fullName: formData.get('fullName'),
		companyName: formData.get('companyName'),
		phone: formData.get('phone'),
		companyType: formData.get('companyType'),
		companySize: formData.get('companySize')
	}

	const result = SignupSchema.safeParse(rawData)

	if (!result.success) {
		return {
			errors: result.error.flatten().fieldErrors
		}
	}

	try {
		let supabase
		try {
			supabase = await createActionClient()
		} catch {
			throw new Error('Authentication service unavailable')
		}

		const { data, error } = await supabase.auth.signUp({
			email: result.data.email,
			password: result.data.password,
			options: {
				data: {
					full_name: result.data.fullName,
					company_name: result.data.companyName,
					phone: (rawData.phone as string) || '',
					company_type: (rawData.companyType as string) || 'LANDLORD',
					company_size: (rawData.companySize as string) || '1-10'
				},
				emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`
			}
		})

		if (error) {
			// Track failed signup attempt
			await trackServerSideEvent('user_signup_failed', undefined, {
				error_message: error.message,
				email_domain: result.data.email.split('@')[1],
				has_company_name: !!result.data.companyName
			})

			return {
				errors: {
					_form: [sanitizeErrorMessage(error, 'signup')]
				}
			}
		}

		// Track successful signup
		if (data.user) {
			await trackServerSideEvent('user_signed_up', data.user.id, {
				method: 'email',
				email: data.user.email,
				user_id: data.user.id,
				has_company_name: !!result.data.companyName,
				full_name: result.data.fullName,
				company_type: (rawData.companyType as string) || 'LANDLORD',
				company_size: (rawData.companySize as string) || '1-10',
				has_phone: !!rawData.phone,
				needs_email_verification: !data.user.email_confirmed_at
			})
		}

		// If email confirmation is required, inform the user
		// Note: Removed auto-signin bypass for security - users must verify email first

		return {
			success: true,
			message: data.session
				? 'Account created! Redirecting to dashboard...'
				: 'Account created! Please check your email to verify your account.',
			data: {
				user: {
					id: data.user?.id || '',
					email: data.user?.email || result.data.email,
					name: result.data.fullName
				},
				session: data.session
					? {
							access_token: data.session.access_token,
							refresh_token: data.session.refresh_token
						}
					: undefined
			}
		}
	} catch (error: unknown) {
		return {
			errors: {
				_form: [sanitizeErrorMessage(error, 'signup')]
			}
		}
	}
}

export async function logoutAction(): Promise<AuthFormState> {
	try {
		const supabase = await createActionClient()
		// Get current user for tracking before logout
		const {
			data: { user }
		} = await supabase.auth.getUser()

		await supabase.auth.signOut()

		// Track logout event
		if (user) {
			await trackServerSideEvent('user_signed_out', user.id, {
				user_id: user.id,
				email: user.email,
				logout_method: 'manual'
			})
		}

		// Clear all cached data
		revalidateTag('user')
		revalidateTag('session')
		revalidateTag('properties')
		revalidateTag('tenants')
		revalidateTag('leases')
		revalidateTag('maintenance')

		// Return success - let client handle redirect
		return {
			success: true,
			message: 'Successfully signed out!'
		}
	} catch (error: unknown) {
		// Log error internally but don't expose details
		logger.error(
			'Logout error:',
			error instanceof Error ? error : new Error(String(error)),
			{
				component: 'AuthActions'
			}
		)

		return {
			errors: {
				_form: [sanitizeErrorMessage(error, 'logout')]
			}
		}
	}
}

export async function forgotPasswordAction(
	prevState: AuthFormState,
	formData: FormData
): Promise<AuthFormState> {
	try {
		// Validate CSRF token first
		await requireCSRFToken(formData)
	} catch (error) {
		return {
			errors: {
				_form: [sanitizeErrorMessage(error, 'csrf-validation')]
			}
		}
	}

	const rawData = {
		email: formData.get('email')
	}

	const result = ResetPasswordSchema.safeParse(rawData)

	if (!result.success) {
		return {
			errors: result.error.flatten().fieldErrors
		}
	}

	// Check rate limit for password reset
	const resetRateLimit = await passwordResetRateLimiter(result.data.email)
	if (!resetRateLimit.success) {
		return {
			errors: {
				_form: [
					resetRateLimit.reason ||
						'Too many password reset attempts. Please try again later.'
				]
			}
		}
	}

	try {
		const supabase = await createActionClient()
		const { error } = await supabase.auth.resetPasswordForEmail(
			result.data.email,
			{
				redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/update-password`
			}
		)

		if (error) {
			return {
				errors: {
					_form: [sanitizeErrorMessage(error, 'password-reset')]
				}
			}
		}

		return {
			success: true,
			message:
				'Password reset email sent! Check your inbox for instructions.'
		}
	} catch (error: unknown) {
		return {
			errors: {
				_form: [sanitizeErrorMessage(error, 'password-reset')]
			}
		}
	}
}

export async function updatePasswordAction(
	prevState: AuthFormState,
	formData: FormData
): Promise<AuthFormState> {
	const rawData = {
		password: formData.get('password'),
		confirmPassword: formData.get('confirmPassword')
	}

	const result = UpdatePasswordSchema.safeParse(rawData)

	if (!result.success) {
		return {
			errors: result.error.flatten().fieldErrors
		}
	}

	try {
		const supabase = await createActionClient()
		const { error } = await supabase.auth.updateUser({
			password: result.data.password
		})

		if (error) {
			return {
				errors: {
					_form: [sanitizeErrorMessage(error, 'password-update')]
				}
			}
		}

		// Revalidate user data
		revalidateTag('user')

		return {
			success: true,
			message: 'Password updated successfully!'
		}
	} catch (error: unknown) {
		return {
			errors: {
				_form: [sanitizeErrorMessage(error, 'password-update')]
			}
		}
	}
}

// Server-side auth helpers
export async function getCurrentUser(): Promise<AuthUser | null> {
	try {
		const supabase = await createActionClient()
		const {
			data: { user }
		} = await supabase.auth.getUser()

		if (!user) return null

		return {
			id: user.id,
			email: user.email!,
			name: user.user_metadata?.full_name || user.email!,
			avatar_url: user.user_metadata?.avatar_url
		}
	} catch (error) {
		// Don't log sensitive errors in production
		if (process.env.NODE_ENV !== 'production') {
			logger.error(
				'Get current user error:',
				error instanceof Error ? error : new Error(String(error)),
				{
					component: 'AuthActions'
				}
			)
		}
		return null
	}
}

export async function requireAuth(): Promise<AuthUser> {
	const user = await getCurrentUser()

	if (!user) {
		redirect('/login')
	}

	return user
}

// OAuth actions
