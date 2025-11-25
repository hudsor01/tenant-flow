/**
 * Authentication validation schemas - CONSOLIDATED SHARED VALIDATION
 *
 * These schemas provide shared validation for authentication flows
 * Used across frontend and backend for consistency
 */

import { z } from 'zod'
import { VALIDATION_LIMITS } from '@repo/shared/constants/billing'

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
			.min(VALIDATION_LIMITS.PASSWORD_MIN_LENGTH, `Password must be at least ${VALIDATION_LIMITS.PASSWORD_MIN_LENGTH} characters`)
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
		first_name: z.string().min(1, 'First name is required'),
		last_name: z.string().min(1, 'Last name is required'),
		company: z.string().min(1, 'Company name is required'),
		email: z.string().email('Please enter a valid email address'),
		password: z
			.string()
			.min(VALIDATION_LIMITS.PASSWORD_MIN_LENGTH, `Password must be at least ${VALIDATION_LIMITS.PASSWORD_MIN_LENGTH} characters`)
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
		created_at: z.string().datetime({ offset: true }),
		updated_at: z.string().datetime({ offset: true })
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
	created_at: z.string().datetime({ offset: true }),
	updated_at: z.string().datetime({ offset: true })
})

// Contact form schema (shared across frontend/backend)
export const contactFormZodSchema = z.object({
	name: z
		.string()
		.min(1, 'Name is required')
		.max(VALIDATION_LIMITS.CONTACT_FORM_NAME_MAX_LENGTH, `Name must be less than ${VALIDATION_LIMITS.CONTACT_FORM_NAME_MAX_LENGTH} characters`)
		.regex(
			/^[a-zA-Z\s\-']+$/,
			'Name can only contain letters, spaces, hyphens, and apostrophes'
		),
	email: z
		.string()
		.email('Please enter a valid email address')
		.max(VALIDATION_LIMITS.CONTACT_FORM_EMAIL_MAX_LENGTH, `Email must be less than ${VALIDATION_LIMITS.CONTACT_FORM_EMAIL_MAX_LENGTH} characters`),
	subject: z
		.string()
		.min(1, 'Subject is required')
		.max(VALIDATION_LIMITS.CONTACT_FORM_SUBJECT_MAX_LENGTH, `Subject must be less than ${VALIDATION_LIMITS.CONTACT_FORM_SUBJECT_MAX_LENGTH} characters`),
	message: z
		.string()
		.min(VALIDATION_LIMITS.CONTACT_FORM_MESSAGE_MIN_LENGTH, `Message must be at least ${VALIDATION_LIMITS.CONTACT_FORM_MESSAGE_MIN_LENGTH} characters`)
		.max(VALIDATION_LIMITS.CONTACT_FORM_MESSAGE_MAX_LENGTH, `Message must be less than ${VALIDATION_LIMITS.CONTACT_FORM_MESSAGE_MAX_LENGTH} characters`),
	type: z.enum(['sales', 'support', 'general'], {
		message: 'Please select a contact type'
	})
})

export const contactFormResponseZodSchema = z.object({
	message: z.string()
})