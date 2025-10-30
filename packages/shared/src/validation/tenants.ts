import { z } from 'zod'
import {
	emailSchema,
	nonEmptyStringSchema,
	phoneSchema,
	uuidSchema
} from './common.js'

// Emergency contact is just a text field in the database
export const emergencyContactSchema = z
	.string()
	.max(500, 'Emergency contact info cannot exceed 500 characters')
	.optional()

// Base tenant object schema - matches Supabase Tenant table exactly
const tenantBaseSchema = z.object({
	email: emailSchema,
	name: nonEmptyStringSchema
		.max(200, 'Name cannot exceed 200 characters')
		.optional(),
	firstName: nonEmptyStringSchema
		.max(100, 'First name cannot exceed 100 characters')
		.optional(),
	lastName: nonEmptyStringSchema
		.max(100, 'Last name cannot exceed 100 characters')
		.optional(),
	phone: phoneSchema.optional(),
	emergencyContact: emergencyContactSchema,
	avatarUrl: z.string().url().optional(),
	userId: uuidSchema.optional()
})

// Base tenant input schema (for forms and API creation)
export const tenantInputSchema = tenantBaseSchema

// Full tenant schema (includes server-generated fields)
export const tenantSchema = tenantBaseSchema.extend({
	id: uuidSchema,
	createdAt: z.date(),
	updatedAt: z.date()
})

// Tenant update schema (partial input)
export const tenantUpdateSchema = tenantBaseSchema.partial()

// Tenant query schema (for search/filtering)
export const tenantQuerySchema = z.object({
	search: z.string().optional(),
	userId: uuidSchema.optional(),
	sortBy: z
		.enum(['name', 'firstName', 'lastName', 'email', 'createdAt'])
		.optional(),
	sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(10)
})

// Tenant statistics schema
export const tenantStatsSchema = z.object({
	total: z.number().nonnegative()
})

// Export types
export type TenantInput = z.infer<typeof tenantInputSchema>
export type Tenant = z.infer<typeof tenantSchema>
export type TenantUpdate = z.infer<typeof tenantUpdateSchema>
export type TenantQuery = z.infer<typeof tenantQuerySchema>
export type TenantStats = z.infer<typeof tenantStatsSchema>
export type EmergencyContact = z.infer<typeof emergencyContactSchema>

// Enhanced frontend-specific form schema with better validation
export const tenantFormSchema = z.object({
	email: z
		.string()
		.min(1, 'Email is required')
		.email('Please enter a valid email address')
		.max(254, 'Email cannot exceed 254 characters'),
	name: z
		.string()
		.max(200, 'Name cannot exceed 200 characters')
		.optional()
		.transform(val => val?.trim() || undefined),
	firstName: z
		.string()
		.min(1, 'First name is required')
		.max(100, 'First name cannot exceed 100 characters')
		.regex(
			/^[a-zA-Z\s'-]+$/,
			'First name can only contain letters, spaces, hyphens, and apostrophes'
		)
		.optional()
		.transform(val => val?.trim() || undefined),
	lastName: z
		.string()
		.min(1, 'Last name is required')
		.max(100, 'Last name cannot exceed 100 characters')
		.regex(
			/^[a-zA-Z\s'-]+$/,
			'Last name can only contain letters, spaces, hyphens, and apostrophes'
		)
		.optional()
		.transform(val => val?.trim() || undefined),
	phone: z
		.string()
		.optional()
		.transform(val => val?.replace(/[^\d+()-\s]/g, '') || undefined)
		.refine(
			val => !val || phoneSchema.safeParse(val).success,
			'Please enter a valid phone number'
		),
	emergencyContact: z
		.string()
		.max(500, 'Emergency contact info cannot exceed 500 characters')
		.optional()
		.transform(val => val?.trim() || undefined),
	avatarUrl: z
		.string()
		.url('Please enter a valid URL')
		.optional()
		.transform(val => val?.trim() || undefined),
	userId: z.string().uuid('User ID must be a valid UUID').optional()
})

// Enhanced validation schema for tenant creation with stricter requirements
export const tenantCreateFormSchema = tenantFormSchema.partial().extend({
	email: z
		.string()
		.min(1, 'Email is required')
		.email('Please enter a valid email address')
		.max(254, 'Email cannot exceed 254 characters'),
	name: z
		.string()
		.min(1, 'Name is required')
		.max(200, 'Name cannot exceed 200 characters')
		.optional(),
	firstName: z
		.string()
		.max(100, 'First name cannot exceed 100 characters')
		.optional()
		.transform(val => val?.trim() || undefined),
	lastName: z
		.string()
		.max(100, 'Last name cannot exceed 100 characters')
		.optional()
		.transform(val => val?.trim() || undefined)
})

// Enhanced validation schema for tenant updates with optional fields
export const tenantUpdateFormSchema = tenantFormSchema.partial()

// Utility types for better form state management
export type TenantFormData = z.input<typeof tenantFormSchema>
export type TenantFormOutput = z.output<typeof tenantFormSchema>
export type TenantCreateFormData = z.input<typeof tenantCreateFormSchema>
export type TenantUpdateFormData = z.input<typeof tenantUpdateFormSchema>

// Type utilities for form validation results
export type TenantFormValidationResult<T = TenantFormOutput> = {
	success: boolean
	data?: T
	errors?: z.ZodError
}

// Enhanced error handling type
export type TenantFormError = {
	field: keyof TenantFormData
	message: string
	code?: string
}

// Validation utility functions
export const validateTenantForm = (
	data: TenantFormData
): TenantFormValidationResult<TenantFormOutput> => {
	const result = tenantFormSchema.safeParse(data)
	const validationResult: TenantFormValidationResult<TenantFormOutput> = {
		success: result.success
	}
	if (result.success) {
		validationResult.data = result.data
	} else {
		validationResult.errors = result.error
	}
	return validationResult
}

// Backend DTO schemas - match CreateTenantRequest/UpdateTenantRequest from backend-domain.ts
export const createTenantRequestSchema = z.object({
	firstName: nonEmptyStringSchema.max(100).optional(),
	lastName: nonEmptyStringSchema.max(100).optional(),
	email: emailSchema,
	phone: phoneSchema.optional(),
	dateOfBirth: z.string().optional(),
	ssn: z.string().optional(),
	name: nonEmptyStringSchema.max(200).optional(),
	emergencyContact: emergencyContactSchema,
	avatarUrl: z.string().url().optional()
})

export const updateTenantRequestSchema = z.object({
	firstName: nonEmptyStringSchema.max(100).optional(),
	lastName: nonEmptyStringSchema.max(100).optional(),
	email: emailSchema.optional(),
	phone: phoneSchema.optional(),
	dateOfBirth: z.string().optional(),
	name: nonEmptyStringSchema.max(200).optional(),
	emergencyContact: emergencyContactSchema
})

export const validateTenantCreateForm = (
	data: TenantCreateFormData
): TenantFormValidationResult<z.output<typeof tenantCreateFormSchema>> => {
	const result = tenantCreateFormSchema.safeParse(data)
	const validationResult: TenantFormValidationResult<
		z.output<typeof tenantCreateFormSchema>
	> = {
		success: result.success
	}
	if (result.success) {
		validationResult.data = result.data
	} else {
		validationResult.errors = result.error
	}
	return validationResult
}
