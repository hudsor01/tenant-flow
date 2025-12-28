import { z } from 'zod'
import {
	nonEmptyStringSchema,
	nonNegativeNumberSchema,
	positiveNumberSchema,
	requiredString,
	uuidSchema
} from './common'
import { VALIDATION_LIMITS } from '@repo/shared/constants/billing'

// Unit status enum - matches PostgreSQL enum values exactly
// Values: 'available', 'occupied', 'maintenance', 'reserved'
export const unitStatusSchema = z.enum([
	'available',
	'occupied',
	'maintenance',
	'reserved'
])

// Base unit input schema (for forms and API creation) - matches database exactly
export const unitInputSchema = z.object({
	property_id: uuidSchema,

	unit_number: nonEmptyStringSchema
		.min(1, 'Unit number is required')
		.max(
			VALIDATION_LIMITS.UNIT_NUMBER_MAX_LENGTH,
			`Unit number cannot exceed ${VALIDATION_LIMITS.UNIT_NUMBER_MAX_LENGTH} characters`
		),

	bedrooms: positiveNumberSchema
		.int('Bedrooms must be a whole number')
		.max(
			VALIDATION_LIMITS.UNIT_MAX_BEDROOMS,
			`Maximum ${VALIDATION_LIMITS.UNIT_MAX_BEDROOMS} bedrooms allowed`
		)
		.default(1),

	bathrooms: positiveNumberSchema
		.max(
			VALIDATION_LIMITS.UNIT_MAX_BATHROOMS,
			`Maximum ${VALIDATION_LIMITS.UNIT_MAX_BATHROOMS} bathrooms allowed`
		)
		.default(1),

	square_feet: positiveNumberSchema
		.int('Square feet must be a whole number')
		.max(
			VALIDATION_LIMITS.UNIT_MAX_SQUARE_FEET,
			'Square feet seems unrealistic'
		)
		.optional(),

	rent_amount: nonNegativeNumberSchema.max(
		VALIDATION_LIMITS.UNIT_RENT_MAXIMUM,
		'Rent amount seems unrealistic'
	),

	rent_currency: z.string().default('USD'),

	rent_period: z.string().default('monthly'),

	status: z.string().default('available')
})

// Full unit schema (includes server-generated fields)
export const unitSchema = unitInputSchema.extend({
	id: uuidSchema,
	created_at: z.string(),
	updated_at: z.string()
})

// Unit update schema (partial input)
export const unitUpdateSchema = unitInputSchema.partial()

// Unit query schema (for search/filtering)
export const unitQuerySchema = z.object({
	search: z.string().optional(),
	property_id: uuidSchema.optional(),
	status: unitStatusSchema.optional(),
	min_rent_amount: nonNegativeNumberSchema.optional(),
	max_rent_amount: nonNegativeNumberSchema.optional(),
	bedrooms: positiveNumberSchema.int().optional(),
	bathrooms: positiveNumberSchema.optional(),
	minsquare_feet: positiveNumberSchema.int().optional(),
	maxsquare_feet: positiveNumberSchema.int().optional(),
	sortBy: z
		.enum([
			'unit_number',
			'rent_amount',
			'bedrooms',
			'bathrooms',
			'square_feet',
			'created_at'
		])
		.optional(),
	sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
	page: z.coerce
		.number()
		.int()
		.positive()
		.default(VALIDATION_LIMITS.API_QUERY_DEFAULT_PAGE),
	limit: z.coerce
		.number()
		.int()
		.positive()
		.max(VALIDATION_LIMITS.API_QUERY_MAX_LIMIT)
		.default(VALIDATION_LIMITS.API_QUERY_DEFAULT_LIMIT)
})

// Unit statistics schema
export const unitStatsSchema = z.object({
	total: z.number().nonnegative(),
	vacant: z.number().nonnegative(),
	occupied: z.number().nonnegative(),
	maintenance: z.number().nonnegative(),
	unavailable: z.number().nonnegative(),
	occupancyRate: z.number().min(0).max(100),
	average_rent_amount: z.number().nonnegative(),
	total_rent_amount: z.number().nonnegative()
})

// Export types
export type UnitInput = z.infer<typeof unitInputSchema>
export type Unit = z.infer<typeof unitSchema>
export type UnitUpdate = z.infer<typeof unitUpdateSchema>
export type UnitQuery = z.infer<typeof unitQuerySchema>
export type UnitStats = z.infer<typeof unitStatsSchema>

// Frontend-specific form schema (handles string inputs from HTML forms) - matches database exactly
export const unitFormSchema = z.object({
	property_id: requiredString,
	unit_number: requiredString,
	bedrooms: z.string().optional(),
	bathrooms: z.string().optional(),
	square_feet: z.string().optional(),
	rent_amount: z.string().optional(),
	status: z.string().optional()
})

// Transform function for converting form data to API format - matches database exactly
export const transformUnitFormData = (data: UnitFormData) => ({
	property_id: data.property_id,
	unit_number: data.unit_number,
	bedrooms: data.bedrooms ? parseInt(data.bedrooms, 10) : 1,
	bathrooms: data.bathrooms ? parseFloat(data.bathrooms) : 1,
	square_feet: data.square_feet ? parseInt(data.square_feet, 10) : undefined,
	rent_amount: data.rent_amount ? parseFloat(data.rent_amount) : 0,
	status: data.status || 'available'
})

export type UnitFormData = z.infer<typeof unitFormSchema>
export type TransformedUnitData = ReturnType<typeof transformUnitFormData>
