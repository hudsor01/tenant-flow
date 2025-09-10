import { z } from 'zod'
import { Constants } from '../types/supabase-generated'
import {
	nonEmptyStringSchema,
	nonNegativeNumberSchema,
	positiveNumberSchema,
	requiredString,
	uuidSchema
} from './common'

// Unit status enum - uses auto-generated Supabase enums
export const unitStatusSchema = z.enum(
	Constants.public.Enums.UnitStatus as readonly [string, ...string[]]
)

// Base unit input schema (for forms and API creation)
export const unitInputSchema = z.object({
	propertyId: uuidSchema,

	unitNumber: nonEmptyStringSchema
		.min(1, 'Unit number is required')
		.max(20, 'Unit number cannot exceed 20 characters'),

	bedrooms: positiveNumberSchema
		.int('Bedrooms must be a whole number')
		.max(20, 'Maximum 20 bedrooms allowed')
		.optional(),

	bathrooms: positiveNumberSchema
		.max(20, 'Maximum 20 bathrooms allowed')
		.optional(),

	squareFootage: positiveNumberSchema
		.int('Square footage must be a whole number')
		.max(50000, 'Square footage seems unrealistic')
		.optional(),

	rent: nonNegativeNumberSchema
		.max(100000, 'Rent amount seems unrealistic')
		.optional(),

	deposit: nonNegativeNumberSchema
		.max(100000, 'Deposit amount seems unrealistic')
		.optional(),

	description: z
		.string()
		.max(1000, 'Description cannot exceed 1000 characters')
		.optional(),

	amenities: z.array(z.string()).optional().default([]),

	images: z.array(z.string().url()).optional().default([]),

	// Optional current tenant assignment
	tenantId: uuidSchema.optional()
})

// Full unit schema (includes server-generated fields)
export const unitSchema = unitInputSchema.extend({
	id: uuidSchema,
	ownerId: uuidSchema,
	status: unitStatusSchema.default('VACANT' as const),
	createdAt: z.date(),
	updatedAt: z.date()
})

// Unit update schema (partial input)
export const unitUpdateSchema = unitInputSchema.partial().extend({
	status: unitStatusSchema.optional(),
	tenantId: uuidSchema.optional().or(z.null()) // Allow null to unassign tenant
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
	minSquareFootage: positiveNumberSchema.int().optional(),
	maxSquareFootage: positiveNumberSchema.int().optional(),
	tenantId: uuidSchema.optional(),
	isVacant: z.boolean().optional(),
	sortBy: z
		.enum([
			'unitNumber',
			'rent',
			'bedrooms',
			'bathrooms',
			'squareFootage',
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

// Frontend-specific form schema (handles string inputs from HTML forms)
export const unitFormSchema = z
	.object({
		propertyId: requiredString,
		unitNumber: requiredString,
		bedrooms: z
			.string()
			.optional()
			.transform((val: string | undefined) =>
				val ? parseInt(val, 10) : undefined
			),
		bathrooms: z
			.string()
			.optional()
			.transform((val: string | undefined) =>
				val ? parseFloat(val) : undefined
			),
		squareFootage: z
			.string()
			.optional()
			.transform((val: string | undefined) =>
				val ? parseInt(val, 10) : undefined
			),
		rent: z
			.string()
			.optional()
			.transform((val: string | undefined) =>
				val ? parseFloat(val) : undefined
			),
		deposit: z
			.string()
			.optional()
			.transform((val: string | undefined) =>
				val ? parseFloat(val) : undefined
			),
		description: z.string().optional(),
		tenantId: z.string().optional().or(z.literal(''))
	})
	.transform((data: { tenantId?: string; [key: string]: unknown }) => ({
		...data,
		tenantId: data.tenantId === '' ? undefined : data.tenantId
	}))

export type UnitFormData = z.input<typeof unitFormSchema>
export type UnitFormOutput = z.output<typeof unitFormSchema>
