/**
 * Authentication validation schemas - CONSOLIDATED SHARED VALIDATION
 *
 * These schemas provide shared validation for authentication flows
 * Used across frontend and backend for consistency
 *
 * Zod 4 Best Practices:
 * - Use top-level validators: z.email(), z.uuid(), z.url()
 */

import { z } from 'zod'
import { VALIDATION_LIMITS } from '#lib/constants/billing.js'

// AUTH FORM VALIDATION SCHEMAS

// Login form validation schema
export const loginZodSchema = z.object({
	email: z.email({ message: 'Please enter a valid email address' }),
	password: z.string().min(1, 'Password is required')
})

// Register form validation schema
export const registerZodSchema = z
	.object({
		email: z.email({ message: 'Please enter a valid email address' }),
		password: z
			.string()
			.min(
				VALIDATION_LIMITS.PASSWORD_MIN_LENGTH,
				`Password must be at least ${VALIDATION_LIMITS.PASSWORD_MIN_LENGTH} characters`
			)
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
		email: z.email({ message: 'Please enter a valid email address' }),
		password: z
			.string()
			.min(
				VALIDATION_LIMITS.PASSWORD_MIN_LENGTH,
				`Password must be at least ${VALIDATION_LIMITS.PASSWORD_MIN_LENGTH} characters`
			)
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

// NOTE: Contact form validation is in contact.ts (contactFormSchema)
// Do not duplicate here - import from '#lib/validation/contact' instead
