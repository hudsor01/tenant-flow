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
// Frontend-Only Validation Schemas
// ========================================

// Authentication schemas (frontend-specific for forms)
export const loginSchema = z.object({
	email: z.string().email('Please enter a valid email address'),
	password: z.string().min(1, 'Password is required')
})

export const signupSchema = z
	.object({
		email: z.string().email('Please enter a valid email address'),
		password: z
			.string()
			.min(8, 'Password must be at least 8 characters')
			.regex(
				/(?=.*[a-z])/,
				'Password must contain at least one lowercase letter'
			)
			.regex(
				/(?=.*[A-Z])/,
				'Password must contain at least one uppercase letter'
			)
			.regex(/(?=.*\d)/, 'Password must contain at least one number'),
		confirmPassword: z.string(),
		firstName: z
			.string()
			.min(1, 'First name is required')
			.max(100, 'First name is too long'),
		lastName: z
			.string()
			.min(1, 'Last name is required')
			.max(100, 'Last name is too long'),
		acceptTerms: z
			.boolean()
			.refine(val => val === true, 'You must accept the terms of service')
	})
	.refine(data => data.password === data.confirmPassword, {
		message: 'Passwords do not match',
		path: ['confirmPassword']
	})

export const forgotPasswordSchema = z.object({
	email: z.string().email('Please enter a valid email address')
})

export const resetPasswordSchema = z
	.object({
		password: z
			.string()
			.min(8, 'Password must be at least 8 characters')
			.regex(
				/(?=.*[a-z])/,
				'Password must contain at least one lowercase letter'
			)
			.regex(
				/(?=.*[A-Z])/,
				'Password must contain at least one uppercase letter'
			)
			.regex(/(?=.*\d)/, 'Password must contain at least one number'),
		confirmPassword: z.string()
	})
	.refine(data => data.password === data.confirmPassword, {
		message: 'Passwords do not match',
		path: ['confirmPassword']
	})

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
export type LoginFormData = z.infer<typeof loginSchema>
export type SignupFormData = z.infer<typeof signupSchema>
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>
export type SearchInputData = z.infer<typeof searchInputSchema>

// Legacy aliases for backwards compatibility (to be removed gradually)
// Import and re-export directly from shared package
export { propertyFormSchema as createPropertyFormSchema } from '@repo/shared/validation'
export { unitFormSchema as createUnitFormSchema } from '@repo/shared/validation'
export { tenantFormSchema as createTenantFormSchema } from '@repo/shared/validation'
export { leaseInputSchema as createLeaseFormSchema } from '@repo/shared/validation'

// Legacy type aliases - re-export from shared
export type { PropertyFormData as PropertyFormInputData } from '@repo/shared/validation'
export type { PropertyFormData as PropertyAPIData } from '@repo/shared/validation'
export type { UnitFormData as CreateUnitFormData } from '@repo/shared/validation'
export type { TenantFormData as CreateTenantFormData } from '@repo/shared/validation'
export type { LeaseFormData as CreateLeaseFormData } from '@repo/shared/validation'
