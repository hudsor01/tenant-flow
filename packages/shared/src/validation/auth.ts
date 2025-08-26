/**
 * Authentication validation schemas
 * Using Zod schemas as single source of truth instead of DTOs
 */

import { z } from 'zod'
import { emailSchema, requiredString } from './common'

// Login validation schema
export const loginSchema = z.object({
	email: emailSchema,
	password: requiredString.min(8, 'Password must be at least 8 characters')
})

// Register validation schema
export const registerSchema = z.object({
	email: emailSchema,
	password: requiredString.min(8, 'Password must be at least 8 characters'),
	name: requiredString.max(100, 'Name cannot exceed 100 characters')
})

// Refresh token validation schema
export const refreshTokenSchema = z.object({
	refresh_token: requiredString.min(10, 'Invalid refresh token format')
})

// Password reset validation schema
export const passwordResetSchema = z.object({
	email: emailSchema
})

// Password reset confirm validation schema
export const passwordResetConfirmSchema = z
	.object({
		token: requiredString.min(10, 'Invalid reset token'),
		password: requiredString.min(
			8,
			'Password must be at least 8 characters'
		),
		confirmPassword: requiredString.min(
			8,
			'Password confirmation is required'
		)
	})
	.refine(data => data.password === data.confirmPassword, {
		message: 'Passwords do not match',
		path: ['confirmPassword']
	})

// Change password validation schema
export const changePasswordSchema = z
	.object({
		currentPassword: requiredString.min(8, 'Current password is required'),
		newPassword: requiredString.min(
			8,
			'New password must be at least 8 characters'
		),
		confirmPassword: requiredString.min(
			8,
			'Password confirmation is required'
		)
	})
	.refine(data => data.newPassword === data.confirmPassword, {
		message: 'Passwords do not match',
		path: ['confirmPassword']
	})

// Type exports for TypeScript usage
export type LoginDto = z.infer<typeof loginSchema>
export type RegisterDto = z.infer<typeof registerSchema>
export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>
export type PasswordResetDto = z.infer<typeof passwordResetSchema>
export type PasswordResetConfirmDto = z.infer<typeof passwordResetConfirmSchema>
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>
