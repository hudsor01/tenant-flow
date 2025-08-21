'use server'

import { revalidateTag } from 'next/cache'
import { z } from 'zod'
import { createActionClient } from '@/lib/supabase/action-client'
import type { AuthUser } from '@/lib/supabase/client'
import { trackServerSideEvent } from '@/lib/analytics/posthog-server'
import { commonValidations } from '@/lib/validation/schemas'
import { sanitizeErrorMessage } from '@/lib/auth/error-sanitizer'
import { requireCSRFToken } from '@/lib/auth/csrf'
import { logger } from '@/lib/logger'
import { redirect } from 'next/navigation'

// ========================
// Schema Definitions
// ========================

const LoginSchema = z.object({
	email: commonValidations.email,
	password: z.string().min(6, 'Password must be at least 6 characters')
})

const SignupSchema = z
	.object({
		email: commonValidations.email,
		password: z.string().min(8, 'Password must be at least 8 characters'),
		confirmPassword: z.string().min(8, 'Password must be at least 8 characters'),
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
		confirmPassword: z.string().min(8, 'Password must be at least 8 characters')
	})
	.refine(data => data.password === data.confirmPassword, {
		message: "Passwords don't match",
		path: ['confirmPassword']
	})

// ========================
// Type Definitions
// ========================

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

// ========================
// Rate Limiting
// ========================

class RateLimiter {
	private attempts: Map<string, { count: number; lastAttempt: number }> = new Map()
	private readonly maxAttempts: number
	private readonly windowMs: number

	constructor(maxAttempts = 5, windowMinutes = 5) {
		this.maxAttempts = maxAttempts
		this.windowMs = windowMinutes * 60 * 1000
	}

	check(key: string): { success: boolean; reason?: string } {
		const now = Date.now()
		const entry = this.attempts.get(key)

		if (entry) {
			// Reset count if window expired
			if (now - entry.lastAttempt > this.windowMs) {
				this.attempts.set(key, { count: 1, lastAttempt: now })
				return { success: true }
			}

			// Check if limit exceeded
			if (entry.count >= this.maxAttempts) {
				const minutesRemaining = Math.ceil((this.windowMs - (now - entry.lastAttempt)) / 60000)
				return {
					success: false,
					reason: `Too many attempts. Please wait ${minutesRemaining} minute${minutesRemaining > 1 ? 's' : ''} before trying again.`
				}
			}

			// Increment count
			entry.count += 1
			entry.lastAttempt = now
			return { success: true }
		}

		// First attempt
		this.attempts.set(key, { count: 1, lastAttempt: now })
		return { success: true }
	}

	clear(key: string): void {
		this.attempts.delete(key)
	}

	// Cleanup old entries periodically
	cleanup(): void {
		const now = Date.now()
		for (const [key, entry] of this.attempts.entries()) {
			if (now - entry.lastAttempt > this.windowMs) {
				this.attempts.delete(key)
			}
		}
	}
}

// Create rate limiter instances
const loginRateLimiter = new RateLimiter(5, 5)
const signupRateLimiter = new RateLimiter(3, 15) // Stricter for signup
const passwordResetRateLimiter = new RateLimiter(3, 15)

// Cleanup old entries every 10 minutes
if (typeof setInterval !== 'undefined') {
	setInterval(() => {
		loginRateLimiter.cleanup()
		signupRateLimiter.cleanup()
		passwordResetRateLimiter.cleanup()
	}, 10 * 60 * 1000)
}

// ========================
// Auth Actions
// ========================

/**
 * Login action with CSRF protection and rate limiting
 */
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

	// Check rate limit
	const rateLimitResult = loginRateLimiter.check(result.data.email)
	if (!rateLimitResult.success) {
		return {
			errors: {
				_form: [rateLimitResult.reason || 'Too many login attempts. Please try again later.']
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
			loginRateLimiter.clear(result.data.email)
			await trackServerSideEvent('user_signed_in', data.user.id, {
				method: 'email',
				email: data.user.email,
				user_id: data.user.id,
				session_id: data.session?.access_token?.slice(-8)
			})
		}

		// Revalidate auth-related caches
		revalidateTag('user')
		revalidateTag('session')

		return {
			success: true,
			message: 'Successfully signed in!',
			data: {
				user: {
					id: data.user.id,
					email: data.user.email || '',
					name: data.user.user_metadata?.full_name || data.user.email || 'Unknown User'
				},
				session: data.session ? {
					access_token: data.session.access_token,
					refresh_token: data.session.refresh_token
				} : undefined
			}
		}
	} catch (error: unknown) {
		logger.error('Login error:', error instanceof Error ? error : new Error(String(error)), {
			component: 'AuthActions',
			email: result.data.email
		})

		return {
			errors: {
				_form: [sanitizeErrorMessage(error, 'login')]
			}
		}
	}
}

/**
 * Signup action with comprehensive validation and tracking
 */
export async function signupAction(
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

	// Extract email for rate limiting
	const email = formData.get('email') as string

	// Check rate limit
	const rateLimitResult = signupRateLimiter.check(email || 'global')
	if (!rateLimitResult.success) {
		return {
			errors: {
				_form: [rateLimitResult.reason || 'Too many signup attempts. Please try again later.']
			}
		}
	}

	// Check if terms are accepted
	const acceptTerms = formData.get('terms') === 'on'
	if (!acceptTerms) {
		return {
			errors: {
				_form: ['You must accept the terms and conditions to create an account']
			}
		}
	}

	const rawData = {
		email,
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
		const supabase = await createActionClient()
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
			signupRateLimiter.clear(email)
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
				session: data.session ? {
					access_token: data.session.access_token,
					refresh_token: data.session.refresh_token
				} : undefined
			}
		}
	} catch (error: unknown) {
		logger.error('Signup error:', error instanceof Error ? error : new Error(String(error)), {
			component: 'AuthActions'
		})

		return {
			errors: {
				_form: [sanitizeErrorMessage(error, 'signup')]
			}
		}
	}
}

/**
 * Logout action with proper cleanup
 */
export async function logoutAction(): Promise<AuthFormState> {
	try {
		const supabase = await createActionClient()
		
		// Get current user for tracking before logout
		const { data: { user } } = await supabase.auth.getUser()

		// Perform logout
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

		return {
			success: true,
			message: 'Successfully signed out!'
		}
	} catch (error: unknown) {
		logger.error('Logout error:', error instanceof Error ? error : new Error(String(error)), {
			component: 'AuthActions'
		})

		return {
			errors: {
				_form: [sanitizeErrorMessage(error, 'logout')]
			}
		}
	}
}

/**
 * Forgot password action with rate limiting
 */
export async function forgotPasswordAction(
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
		email: formData.get('email')
	}

	const result = ResetPasswordSchema.safeParse(rawData)

	if (!result.success) {
		return {
			errors: result.error.flatten().fieldErrors
		}
	}

	// Check rate limit
	const rateLimitResult = passwordResetRateLimiter.check(result.data.email)
	if (!rateLimitResult.success) {
		return {
			errors: {
				_form: [rateLimitResult.reason || 'Too many password reset attempts. Please try again later.']
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
			// Track failed password reset
			await trackServerSideEvent('password_reset_failed', undefined, {
				error_message: error.message,
				email_domain: result.data.email.split('@')[1]
			})

			return {
				errors: {
					_form: [sanitizeErrorMessage(error, 'password-reset')]
				}
			}
		}

		// Track successful password reset request
		await trackServerSideEvent('password_reset_requested', undefined, {
			email_domain: result.data.email.split('@')[1]
		})

		return {
			success: true,
			message: 'Password reset email sent! Check your inbox for instructions.'
		}
	} catch (error: unknown) {
		logger.error('Password reset error:', error instanceof Error ? error : new Error(String(error)), {
			component: 'AuthActions'
		})

		return {
			errors: {
				_form: [sanitizeErrorMessage(error, 'password-reset')]
			}
		}
	}
}

/**
 * Update password action
 */
export async function updatePasswordAction(
	_prevState: AuthFormState,
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
		
		// Get current user
		const { data: { user } } = await supabase.auth.getUser()
		
		// Update password
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

		// Track password update
		if (user) {
			await trackServerSideEvent('password_updated', user.id, {
				user_id: user.id,
				method: 'reset_link'
			})
		}

		// Revalidate user data
		revalidateTag('user')

		return {
			success: true,
			message: 'Password updated successfully!'
		}
	} catch (error: unknown) {
		logger.error('Password update error:', error instanceof Error ? error : new Error(String(error)), {
			component: 'AuthActions'
		})

		return {
			errors: {
				_form: [sanitizeErrorMessage(error, 'password-update')]
			}
		}
	}
}

// ========================
// Auth Helper Functions
// ========================

/**
 * Get current authenticated user (server-side)
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
	try {
		const supabase = await createActionClient()
		const { data: { user } } = await supabase.auth.getUser()

		if (!user) return null

		return {
			id: user.id,
			email: user.email || '',
			name: user.user_metadata?.full_name || user.email || 'Unknown User',
			avatar_url: user.user_metadata?.avatar_url
		}
	} catch (error) {
		logger.error('Get current user error:', error instanceof Error ? error : new Error(String(error)), {
			component: 'AuthActions'
		})
		return null
	}
}

/**
 * Require authentication or redirect to login
 */
export async function requireAuth(): Promise<AuthUser> {
	const user = await getCurrentUser()

	if (!user) {
		redirect('/login')
	}

	return user
}

/**
 * Check if user has a specific role
 */
export async function hasRole(requiredRole: string): Promise<boolean> {
	try {
		const user = await getCurrentUser()
		if (!user) return false

		const supabase = await createActionClient()
		const { data } = await supabase
			.from('User')
			.select('role')
			.eq('id', user.id)
			.single()

		return data?.role === requiredRole
	} catch (error) {
		logger.error('Role check error:', error instanceof Error ? error : new Error(String(error)), {
			component: 'AuthActions',
			requiredRole
		})
		return false
	}
}