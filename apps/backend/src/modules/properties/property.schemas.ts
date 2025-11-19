import { z } from 'zod'

/**
 * Property Validation Schemas
 * Single source of truth for all property validation
 */

// Base property schema with common fields
const propertyBaseSchema = z.object({
	name: z
		.string()
		.min(1, 'Property name is required')
		.max(200, 'Property name must be less than 200 characters')
		.trim(),

	address: z
		.string()
		.min(1, 'Property address is required')
		.max(500, 'Address must be less than 500 characters')
		.trim(),

	city: z
		.string()
		.min(1, 'City is required')
		.max(100, 'City must be less than 100 characters')
		.trim(),

	state: z
		.string()
		.min(2, 'State must be at least 2 characters')
		.max(50, 'State must be less than 50 characters')
		.trim(),

	postal_code: z
		.string()
		.regex(
			/^\d{5}(-\d{4})?$/,
			'Valid zip code is required (12345 or 12345-6789)'
		)
		.trim(),

	description: z
		.string()
		.max(2000, 'Description must be less than 2000 characters')
		.optional()
		.transform(val => val?.trim() ?? undefined),

	property_type: z
		.enum([
			'SINGLE_FAMILY',
			'MULTI_FAMILY',
			'APARTMENT',
			'CONDO',
			'TOWNHOUSE',
			'COMMERCIAL'
		] as const)
		.default('SINGLE_FAMILY' as const),

	imageUrl: z
		.string()
		.url('Must be a valid URL')
		.optional()
		.or(z.literal(''))
		.transform(val => (val === '' ? undefined : val))
})

// Create property schema
export const createPropertySchema = propertyBaseSchema.extend({
	units: z
		.number()
		.int('Units must be a whole number')
		.min(0, 'Units cannot be negative')
		.max(1000, 'Units cannot exceed 1000')
		.optional(),

	stripe_customer_id: z
		.string()
		.optional()
		.refine(
			val => !val || val.startsWith('cus_'),
			'Invalid Stripe customer ID format'
		)
})

// Update property schema (all fields optional except validation rules)
export const updatePropertySchema = propertyBaseSchema.partial().extend({
	imageUrl: z
		.string()
		.url('Must be a valid URL')
		.optional()
		.or(z.literal(''))
		.transform(val => (val === '' ? undefined : val))
})

// Query property schema
export const queryPropertySchema = z
	.object({
		property_type: z
			.enum([
				'SINGLE_FAMILY',
				'MULTI_FAMILY',
				'APARTMENT',
				'CONDO',
				'TOWNHOUSE',
				'COMMERCIAL'
			] as const)
			.optional(),
		search: z
			.string()
			.max(200, 'Search term must be less than 200 characters')
			.optional(),
		city: z
			.string()
			.max(100, 'City must be less than 100 characters')
			.optional(),
		state: z
			.string()
			.max(50, 'State must be less than 50 characters')
			.optional(),
		status: z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE']).optional(),
		limit: z
			.number()
			.int('Limit must be a whole number')
			.min(1, 'Limit must be at least 1')
			.max(1000, 'Limit cannot exceed 1000')
			.default(50),
		offset: z
			.number()
			.int('Offset must be a whole number')
			.min(0, 'Offset cannot be negative')
			.default(0)
	})
	.transform(data => ({
		...data
	}))

// Owner ID validation schema
export const owner_idSchema = z
	.string()
	.uuid('Owner ID must be a valid UUID')
	.min(1, 'Owner ID is required')

// Property ID validation schema
export const property_idSchema = z
	.string()
	.uuid('Property ID must be a valid UUID')
	.min(1, 'Property ID is required')

// Export inferred types for use in services
export type CreatePropertyDto = z.infer<typeof createPropertySchema>
export type UpdatePropertyDto = z.infer<typeof updatePropertySchema>
export type QueryPropertyDto = z.infer<typeof queryPropertySchema>

// Validation functions that can be used in services
export const validateCreateProperty = (data: unknown): CreatePropertyDto => {
	return createPropertySchema.parse(data)
}

export const validateUpdateProperty = (data: unknown): UpdatePropertyDto => {
	return updatePropertySchema.parse(data)
}

export const validateQueryProperty = (data: unknown): QueryPropertyDto => {
	return queryPropertySchema.parse(data)
}

export const validateOwnerId = (id: unknown): string => {
	return owner_idSchema.parse(id)
}

export const validateproperty_id = (id: unknown): string => {
	return property_idSchema.parse(id)
}

// Safe parsing functions that return errors instead of throwing
export const safeValidateCreateProperty = (data: unknown) => {
	return createPropertySchema.safeParse(data)
}

export const safeValidateUpdateProperty = (data: unknown) => {
	return updatePropertySchema.safeParse(data)
}

export const safeValidateQueryProperty = (data: unknown) => {
	return queryPropertySchema.safeParse(data)
}
