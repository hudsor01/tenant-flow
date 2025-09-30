import { z } from 'zod'
import { Constants, type Database } from '../types/supabase-generated.js'
import
  {
    nonEmptyStringSchema,
    nonNegativeNumberSchema,
    positiveNumberSchema,
    requiredString,
    uuidSchema
  } from './common.js'

// Unit status enum - uses auto-generated Supabase enums
export const unitStatusSchema = z.enum(
	Constants.public.Enums.UnitStatus as readonly [string, ...string[]]
)

// Base unit input schema (for forms and API creation) - matches database exactly
export const unitInputSchema = z.object({
	propertyId: uuidSchema,

	unitNumber: nonEmptyStringSchema
		.min(1, 'Unit number is required')
		.max(20, 'Unit number cannot exceed 20 characters'),

	bedrooms: positiveNumberSchema
		.int('Bedrooms must be a whole number')
		.max(20, 'Maximum 20 bedrooms allowed')
		.default(1),

	bathrooms: positiveNumberSchema
		.max(20, 'Maximum 20 bathrooms allowed')
		.default(1),

	squareFeet: positiveNumberSchema
		.int('Square feet must be a whole number')
		.max(50000, 'Square feet seems unrealistic')
		.optional(),

	rent: nonNegativeNumberSchema.max(100000, 'Rent amount seems unrealistic'),

	lastInspectionDate: z.string().optional()
})

// Full unit schema (includes server-generated fields)
export const unitSchema = unitInputSchema.extend({
	id: uuidSchema,
	status: unitStatusSchema.default('VACANT' as const),
	createdAt: z.string(),
	updatedAt: z.string()
})

// Unit update schema (partial input)
export const unitUpdateSchema = unitInputSchema.partial().extend({
	status: unitStatusSchema.optional()
})

// Unit query schema (for search/filtering)
export const unitQuerySchema = z.object({
	search: z.string().optional(),
	propertyId: uuidSchema.optional(),
	status: unitStatusSchema.optional(),
	minRent: nonNegativeNumberSchema.optional(),
	maxRent: nonNegativeNumberSchema.optional(),
	bedrooms: positiveNumberSchema.int().optional(),
	bathrooms: positiveNumberSchema.optional(),
	minSquareFeet: positiveNumberSchema.int().optional(),
	maxSquareFeet: positiveNumberSchema.int().optional(),
	sortBy: z
		.enum([
			'unitNumber',
			'rent',
			'bedrooms',
			'bathrooms',
			'squareFeet',
			'createdAt'
		])
		.optional(),
	sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(10)
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
export type UnitStatus = z.infer<typeof unitStatusSchema>

// Frontend-specific form schema (handles string inputs from HTML forms) - matches database exactly
export const unitFormSchema = z.object({
	propertyId: requiredString,
	unitNumber: requiredString,
	bedrooms: z.string().optional(),
	bathrooms: z.string().optional(),
	squareFeet: z.string().optional(),
	rent: z.string().optional(),
	lastInspectionDate: z.string().optional(),
	status: unitStatusSchema.optional()
})

// Transform function for converting form data to API format - matches database exactly
export const transformUnitFormData = (data: UnitFormData) => ({
	propertyId: data.propertyId,
	unitNumber: data.unitNumber,
	bedrooms: data.bedrooms ? parseInt(data.bedrooms, 10) : 1,
	bathrooms: data.bathrooms ? parseFloat(data.bathrooms) : 1,
	squareFeet: data.squareFeet ? parseInt(data.squareFeet, 10) : undefined,
	rent: data.rent ? parseFloat(data.rent) : 0,
	lastInspectionDate:
		data.lastInspectionDate && data.lastInspectionDate !== ''
			? data.lastInspectionDate
			: undefined,
	status: data.status as Database['public']['Enums']['UnitStatus']
})

export type UnitFormData = z.infer<typeof unitFormSchema>
export type TransformedUnitData = ReturnType<typeof transformUnitFormData>
