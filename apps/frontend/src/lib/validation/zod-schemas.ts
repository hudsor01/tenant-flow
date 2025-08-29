/**
 * Frontend-Specific Validation Schemas
 * Uses shared validation from @repo/shared and adds frontend-specific form handling
 */

import { z } from 'zod'

// Re-export shared validation schemas for convenience
export {
	// Property validation
	propertyInputSchema,
	propertyFormSchema,
	propertyQuerySchema,
	propertyTypeSchema,
	propertyStatusSchema,

	// Tenant validation
	tenantInputSchema,
	tenantFormSchema,
	tenantQuerySchema,
	tenantStatusSchema,

	// Unit validation
	unitInputSchema,
	unitFormSchema,
	unitQuerySchema,
	unitStatusSchema,

	// Maintenance validation
	maintenanceRequestInputSchema,
	maintenanceRequestFormSchema,
	maintenanceRequestQuerySchema,
	maintenancePrioritySchema,
	maintenanceStatusSchema,
	maintenanceCategorySchema,

	// Lease validation
	leaseInputSchema,
	leaseStatusEnum,

	// Common validation
	uuidSchema,
	emailSchema,
	nonEmptyStringSchema,
	positiveNumberSchema,
	nonNegativeNumberSchema,
	phoneSchema,
	urlSchema
} from '@repo/shared/validation'

// Re-export types for convenience
export type {
	PropertyInput,
	PropertyFormData,
	TenantInput,
	TenantFormData,
	UnitInput,
	UnitFormData,
	MaintenanceRequestInput,
	MaintenanceRequestFormData,
	LeaseFormData
} from '@repo/shared/validation'

// ========================================
// Auto-Generated Authentication Schemas (Single Source of Truth)
// ========================================

// Import generated authentication schemas from backend JSON schemas
export {
	loginSchema,
	signupSchema, // alias for registerSchema
	registerSchema,
	forgotPasswordSchema,
	resetPasswordSchema,
	changePasswordSchema,
	refreshTokenSchema,
	authResponseSchema,
	userProfileResponseSchema,
	// Export types as well
	type LoginRequest,
	type RegisterRequest,
	type ForgotPasswordRequest,
	type ResetPasswordRequest,
	type ChangePasswordRequest,
	type RefreshTokenRequest,
	type AuthResponse,
	type UserProfileResponse,
	// Legacy type aliases
	type LoginFormData,
	type SignupFormData,
	type ForgotPasswordFormData,
	type ResetPasswordFormData,
	type ChangePasswordFormData
} from './generated-auth-schemas'

// Frontend-specific form UI schemas (for complex form interactions)
export const dateInputSchema = z
	.string()
	.refine(val => !isNaN(Date.parse(val)), 'Please enter a valid date')
	.transform(val => new Date(val))

export const futureDateSchema = z
	.string()
	.refine(val => !isNaN(Date.parse(val)), 'Please enter a valid date')
	.transform(val => new Date(val))
	.refine(date => date > new Date(), 'Date must be in the future')

export const currencyInputSchema = z.union([
	z.number().min(0, 'Amount cannot be negative'),
	z
		.string()
		.regex(/^\d+(\.\d{1,2})?$/, 'Invalid currency format')
		.transform(val => parseFloat(val))
		.refine(val => val >= 0, 'Amount cannot be negative')
])

// Frontend-specific search/filter schemas
export const searchInputSchema = z.object({
	query: z.string().max(200, 'Search term is too long').optional(),
	sortBy: z.string().optional(),
	sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(10)
})

// Export types for frontend use  
export type SearchInputData = z.infer<typeof searchInputSchema>
// Note: Authentication types are now exported from ./generated-auth-schemas

// CLAUDE.md NO_ABSTRACTIONS: Legacy aliases DELETED
// Use direct imports from @repo/shared/validation instead
