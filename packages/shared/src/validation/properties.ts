import { z } from 'zod'
import { Constants } from '../types/supabase-generated.js'
import {
	nonEmptyStringSchema,
	nonNegativeNumberSchema,
	positiveNumberSchema,
	requiredString,
	urlSchema,
	uuidSchema
} from './common.js'

// Property type schema - uses auto-generated Supabase enums
export const propertyTypeSchema = z.enum(
	Constants.public.Enums.PropertyType as readonly [string, ...string[]]
)

export const propertyStatusSchema = z.enum(
	Constants.public.Enums.PropertyStatus as readonly [string, ...string[]]
)

// Base property input schema (for forms and API creation)
export const propertyInputSchema = z.object({
	name: nonEmptyStringSchema
		.min(3, 'Property name must be at least 3 characters')
		.max(100, 'Property name cannot exceed 100 characters'),

	description: z
		.string()
		.max(2000, 'Description cannot exceed 2000 characters')
		.optional()
		.or(z.literal('')),

	propertyType: propertyTypeSchema,

	address: nonEmptyStringSchema
		.min(5, 'Address must be at least 5 characters')
		.max(200, 'Address cannot exceed 200 characters'),

	city: nonEmptyStringSchema
		.min(2, 'City must be at least 2 characters')
		.max(50, 'City cannot exceed 50 characters'),

	state: z
		.string()
		.min(2, 'State is required')
		.max(2, 'State must be 2 characters')
		.regex(/^[A-Z]{2}$/, 'State must be 2 uppercase letters'),

	zipCode: z
		.string()
		.regex(
			/^\d{5}(-\d{4})?$/,
			'Please enter a valid ZIP code (12345 or 12345-6789)'
		),

	bedrooms: positiveNumberSchema
		.int('Bedrooms must be a whole number')
		.max(50, 'Maximum 50 bedrooms allowed')
		.optional(),

	bathrooms: positiveNumberSchema
		.max(50, 'Maximum 50 bathrooms allowed')
		.optional(),

	squareFootage: positiveNumberSchema
		.int('Square footage must be a whole number')
		.max(1000000, 'Square footage seems unrealistic')
		.optional(),

	rent: nonNegativeNumberSchema
		.max(1000000, 'Rent amount seems unrealistic')
		.optional(),

	deposit: nonNegativeNumberSchema
		.max(1000000, 'Deposit amount seems unrealistic')
		.optional(),

	images: z.array(urlSchema).optional(),

	amenities: z.array(z.string()).optional()
})

// Full property schema (includes server-generated fields)
export const propertySchema = propertyInputSchema.extend({
	id: uuidSchema,
	ownerId: uuidSchema,
	status: propertyStatusSchema,
	createdAt: z.date(),
	updatedAt: z.date()
})

// Property update schema (partial input)
export const propertyUpdateSchema = propertyInputSchema.partial().extend({
	status: propertyStatusSchema.optional()
})

// Property query schema (for search/filtering)
export const propertyQuerySchema = z.object({
	search: z.string().optional(),
	propertyType: propertyTypeSchema.optional(),
	city: z.string().optional(),
	state: z.string().optional(),
	minRent: nonNegativeNumberSchema.optional(),
	maxRent: nonNegativeNumberSchema.optional(),
	bedrooms: positiveNumberSchema.int().optional(),
	bathrooms: positiveNumberSchema.optional(),
	status: propertyStatusSchema.optional(),
	sortBy: z.enum(['name', 'createdAt', 'rent', 'city']).optional(),
	sortOrder: z.enum(['asc', 'desc']).optional(),
	page: z.coerce.number().int().positive().optional(),
	limit: z.coerce.number().int().positive().max(100).optional()
})

// Property statistics schema
export const propertyStatsSchema = z.object({
	total: nonNegativeNumberSchema,
	active: nonNegativeNumberSchema,
	inactive: nonNegativeNumberSchema,
	maintenance: nonNegativeNumberSchema,
	totalRent: nonNegativeNumberSchema,
	averageRent: nonNegativeNumberSchema
})

// Export types
export type PropertyInput = z.infer<typeof propertyInputSchema>
export type Property = z.infer<typeof propertySchema>
export type PropertyUpdate = z.infer<typeof propertyUpdateSchema>
export type PropertyQuery = z.infer<typeof propertyQuerySchema>
export type PropertyStats = z.infer<typeof propertyStatsSchema>
export type PropertyTypeValidation = z.infer<typeof propertyTypeSchema>
export type PropertyStatusValidation = z.infer<typeof propertyStatusSchema>

// Frontend-specific form schema (handles string inputs from HTML forms)
// Clean schema for React Hook Form zodResolver compatibility
export const propertyFormSchema = z.object({
	name: requiredString,
	description: z.string().optional(),
	propertyType: z.enum(
		Constants.public.Enums.PropertyType as readonly [string, ...string[]]
	),
	address: requiredString,
	city: requiredString,
	state: requiredString,
	zipCode: requiredString,
	bedrooms: z.string().optional(),
	bathrooms: z.string().optional(),
	squareFootage: z.string().optional(),
	rent: z.string().optional(),
	deposit: z.string().optional(),
	imageUrl: z.string().optional(), // Legacy single image field
	// Frontend-specific UI fields
	hasGarage: z.boolean().optional(),
	hasPool: z.boolean().optional(),
	numberOfUnits: z.string().optional(),
	createUnitsNow: z.boolean().optional()
})

// Transform function for converting form data to API format
// Separated from schema to avoid zodResolver conflicts
export const transformPropertyFormData = (
	data: PropertyFormData,
	ownerId: string = ''
): {
	name: string
	description: string
	propertyType: z.infer<typeof propertyTypeSchema>
	address: string
	city: string
	state: string
	zipCode: string
	ownerId: string
	bedrooms?: number
	bathrooms?: number
	squareFootage?: number
	rent?: number
	deposit?: number
	images: string[]
	amenities: string[]
} => ({
	name: data.name,
	description: data.description || '',
	propertyType: data.propertyType,
	address: data.address,
	city: data.city,
	state: data.state,
	zipCode: data.zipCode,
	ownerId,
	bedrooms: data.bedrooms ? parseInt(data.bedrooms, 10) : undefined,
	bathrooms: data.bathrooms ? parseFloat(data.bathrooms) : undefined,
	squareFootage: data.squareFootage
		? parseInt(data.squareFootage, 10)
		: undefined,
	rent: data.rent ? parseFloat(data.rent) : undefined,
	deposit: data.deposit ? parseFloat(data.deposit) : undefined,
	images: data.imageUrl ? [data.imageUrl] : [],
	amenities: [
		...(data.hasGarage ? ['garage'] : []),
		...(data.hasPool ? ['pool'] : [])
	]
})

export type PropertyFormData = z.infer<typeof propertyFormSchema>
export type TransformedPropertyData = ReturnType<
	typeof transformPropertyFormData
>
