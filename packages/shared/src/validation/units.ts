import { z } from 'zod'
import type { UnitStatus } from '../constants/status-types.js'
import { UNIT_STATUS } from '../constants/status-types.js'
import {
  nonEmptyStringSchema,
  nonNegativeNumberSchema,
  positiveNumberSchema,
  requiredString,
  uuidSchema
} from './common'
import { VALIDATION_LIMITS } from '@repo/shared/constants/billing'

// Unit status enum - uses auto-generated Supabase enums
export const unitStatusSchema = z.enum(
	Object.values(UNIT_STATUS) as unknown as readonly [string, ...string[]]
)

// Base unit input schema (for forms and API creation) - matches database exactly
export const unitInputSchema = z.object({
	property_id: uuidSchema,

	unit_number: nonEmptyStringSchema
		.min(1, 'Unit number is required')
		.max(VALIDATION_LIMITS.UNIT_NUMBER_MAX_LENGTH, `Unit number cannot exceed ${VALIDATION_LIMITS.UNIT_NUMBER_MAX_LENGTH} characters`),

	bedrooms: positiveNumberSchema
		.int('Bedrooms must be a whole number')
		.max(VALIDATION_LIMITS.UNIT_MAX_BEDROOMS, `Maximum ${VALIDATION_LIMITS.UNIT_MAX_BEDROOMS} bedrooms allowed`)
		.default(1),

	bathrooms: positiveNumberSchema
		.max(VALIDATION_LIMITS.UNIT_MAX_BATHROOMS, `Maximum ${VALIDATION_LIMITS.UNIT_MAX_BATHROOMS} bathrooms allowed`)
		.default(1),

	square_feet: positiveNumberSchema
		.int('Square feet must be a whole number')
		.max(VALIDATION_LIMITS.UNIT_MAX_SQUARE_FEET, 'Square feet seems unrealistic')
		.optional(),

	rent: nonNegativeNumberSchema.max(VALIDATION_LIMITS.UNIT_RENT_MAXIMUM, 'Rent amount seems unrealistic'),

	lastInspectionDate: z.string().optional()
})

// Full unit schema (includes server-generated fields)
export const unitSchema = unitInputSchema.extend({
	id: uuidSchema,
	status: unitStatusSchema.default('VACANT' as const),
	created_at: z.string(),
	updated_at: z.string()
})

// Unit update schema (partial input)
export const unitUpdateSchema = unitInputSchema.partial().extend({
	status: unitStatusSchema.optional()
})

// Unit query schema (for search/filtering)
export const unitQuerySchema = z.object({
	search: z.string().optional(),
	property_id: uuidSchema.optional(),
	status: unitStatusSchema.optional(),
	minRent: nonNegativeNumberSchema.optional(),
	maxRent: nonNegativeNumberSchema.optional(),
	bedrooms: positiveNumberSchema.int().optional(),
	bathrooms: positiveNumberSchema.optional(),
	minsquare_feet: positiveNumberSchema.int().optional(),
	maxsquare_feet: positiveNumberSchema.int().optional(),
	sortBy: z
		.enum([
			'unit_number',
			'rent',
			'bedrooms',
			'bathrooms',
			'square_feet',
			'created_at'
		])
		.optional(),
	sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
	page: z.coerce.number().int().positive().default(VALIDATION_LIMITS.API_QUERY_DEFAULT_PAGE),
	limit: z.coerce.number().int().positive().max(VALIDATION_LIMITS.API_QUERY_MAX_LIMIT).default(VALIDATION_LIMITS.API_QUERY_DEFAULT_LIMIT)
})

// Unit statistics schema
export const unitStatsSchema = z.object({
	total: z.number().nonnegative(),
	vacant: z.number().nonnegative(),
	occupied: z.number().nonnegative(),
	maintenance: z.number().nonnegative(),
	unavailable: z.number().nonnegative(),
	occupancyRate: z.number().min(0).max(100),
	averageRent: z.number().nonnegative(),
	totalRent: z.number().nonnegative()
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
	rent: z.string().optional(),
	lastInspectionDate: z.string().optional(),
	status: unitStatusSchema.optional()
})

// Transform function for converting form data to API format - matches database exactly
export const transformUnitFormData = (data: UnitFormData) => ({
	property_id: data.property_id,
	unit_number: data.unit_number,
	bedrooms: data.bedrooms ? parseInt(data.bedrooms, 10) : 1,
	bathrooms: data.bathrooms ? parseFloat(data.bathrooms) : 1,
	square_feet: data.square_feet ? parseInt(data.square_feet, 10) : undefined,
	rent: data.rent ? parseFloat(data.rent) : 0,
	lastInspectionDate:
		data.lastInspectionDate && data.lastInspectionDate !== ''
			? data.lastInspectionDate
			: undefined,
	status: data.status as UnitStatus
})

export type UnitFormData = z.infer<typeof unitFormSchema>
export type TransformedUnitData = ReturnType<typeof transformUnitFormData>
