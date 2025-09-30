/**
 * Authentication validation schemas - CONSOLIDATED SHARED VALIDATION
 *
 * These schemas provide shared validation for authentication flows
 * Used across frontend and backend for consistency
 */

import { z } from 'zod'

// Re-export common validation utilities that auth schemas might need
export { emailSchema, requiredString } from './common.js'

// AUTH FORM VALIDATION SCHEMAS (moved from frontend)

// Login form validation schema
export const loginZodSchema = z.object({
	email: z.string().email('Please enter a valid email address'),
	password: z.string().min(1, 'Password is required')
})

// Register form validation schema
export const registerZodSchema = z
	.object({
		email: z.string().email('Please enter a valid email address'),
		password: z
			.string()
			.min(8, 'Password must be at least 8 characters')
			.regex(
				/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
				'Password must contain uppercase, lowercase, and number'
			),
		confirmPassword: z.string()
	})
	.refine(data => data.password === data.confirmPassword, {
		message: "Passwords don't match",
		path: ['confirmPassword']
	})

// Extended signup form validation schema with additional fields
export const signupFormSchema = z
	.object({
		firstName: z.string().min(1, 'First name is required'),
		lastName: z.string().min(1, 'Last name is required'),
		company: z.string().min(1, 'Company name is required'),
		email: z.string().email('Please enter a valid email address'),
		password: z
			.string()
			.min(8, 'Password must be at least 8 characters')
			.regex(
				/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
				'Password must contain uppercase, lowercase, and number'
			),
		confirmPassword: z.string()
	})
	.refine(data => data.password === data.confirmPassword, {
		message: "Passwords don't match",
		path: ['confirmPassword']
	})

// Auth response validation schema (moved from generated schemas)
export const authResponseZodSchema = z.object({
	user: z.object({
		id: z.string().uuid(),
		email: z.string().email(),
		name: z.string(),
		company: z.string().optional(),
		emailVerified: z.boolean(),
		createdAt: z.string().datetime({ offset: true }),
		updatedAt: z.string().datetime({ offset: true })
	}),
	tokens: z.object({
		accessToken: z.string(),
		refreshToken: z.string(),
		expiresIn: z.number(),
		tokenType: z.literal('Bearer')
	})
})

// User profile response validation schema (moved from generated schemas)
export const userProfileResponseZodSchema = z.object({
	id: z.string().uuid(),
	email: z.string().email(),
	name: z.string(),
	company: z.string().optional(),
	phone: z.string().optional(),
	bio: z.string().optional(),
	avatarUrl: z.string().url().optional(),
	emailVerified: z.boolean(),
	createdAt: z.string().datetime({ offset: true }),
	updatedAt: z.string().datetime({ offset: true })
})

// Contact form schema (shared across frontend/backend)
export const contactFormZodSchema = z.object({
	name: z
		.string()
		.min(1, 'Name is required')
		.max(100, 'Name must be less than 100 characters')
		.regex(
			/^[a-zA-Z\s\-']+$/,
			'Name can only contain letters, spaces, hyphens, and apostrophes'
		),
	email: z
		.string()
		.email('Please enter a valid email address')
		.max(254, 'Email must be less than 254 characters'),
	subject: z
		.string()
		.min(1, 'Subject is required')
		.max(200, 'Subject must be less than 200 characters'),
	message: z
		.string()
		.min(10, 'Message must be at least 10 characters')
		.max(5000, 'Message must be less than 5000 characters'),
	type: z.enum(['sales', 'support', 'general'], {
		message: 'Please select a contact type'
	})
})

export const contactFormResponseZodSchema = z.object({
	message: z.string()
})

// TYPE EXPORTS FOR TYPESCRIPT INFERENCE

export type LoginData = z.infer<typeof loginZodSchema>
export type RegisterData = z.infer<typeof registerZodSchema>
export type AuthResponseData = z.infer<typeof authResponseZodSchema>
export type UserProfileResponseData = z.infer<
	typeof userProfileResponseZodSchema
>
export type ContactFormData = z.infer<typeof contactFormZodSchema>
export type ContactFormResponseData = z.infer<
	typeof contactFormResponseZodSchema
>

// WARNING:  TEMPORARY: Legacy type aliases for backward compatibility during migration
// These will be removed in a future version
export type LoginDto = {
	email: string
	password: string
	rememberMe?: boolean
}

export type RegisterDto = {
	name: string
	email: string
	password: string
	company?: string
	acceptTerms?: boolean
}

export type RefreshTokenDto = {
	refresh_token: string
}

export type PasswordResetDto = {
	email: string
}

export type PasswordResetConfirmDto = {
	token: string
	newPassword: string
	confirmPassword: string
}

export type ChangePasswordDto = {
	currentPassword: string
	newPassword: string
	confirmPassword: string
}

/**
 * IMPORTANT: These schemas have been moved to generated files
 *
 * This file will be removed in a future version. Update your imports to use:
 * - Frontend: generated-auth-schemas.ts
 * - Backend: JSON schemas in auth.schemas.ts
 */
