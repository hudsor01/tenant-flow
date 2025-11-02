import { z } from 'zod'
import { Constants, type Database } from '../types/supabase-generated.js'
import type { CreatePropertyRequest } from '../types/backend-domain.js'
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
	propertyId: z.string().optional(), // Optional propertyId for form.setFieldValue
	// Frontend-specific UI fields
	hasGarage: z.boolean().optional(),
	hasPool: z.boolean().optional(),
	numberOfUnits: z.string().optional(),
	createUnitsNow: z.boolean().optional()
})

// Transform function for converting form data to API format
// NOTE: Does NOT include ownerId - backend extracts from authenticated user
export const transformPropertyFormData = (
	data: PropertyFormData
): CreatePropertyRequest => {
	const result: CreatePropertyRequest = {
		name: data.name,
		address: data.address,
		city: data.city,
		state: data.state,
		zipCode: data.zipCode,
		propertyType: data.propertyType as Database['public']['Enums']['PropertyType']
	}

	// Only include optional fields if they have truthy values (exactOptionalPropertyTypes)
	if (data.description) {
		result.description = data.description
	}

	if (data.imageUrl) {
		result.imageUrl = data.imageUrl
	}

	return result
}

// Frontend-specific form schema for updates (handles string inputs from HTML forms)
export const propertyUpdateFormSchema = z.object({
	name: z.string().optional(),
	address: z.string().optional(),
	city: z.string().optional(),
	state: z.string().optional(),
	zipCode: z.string().optional(),
	propertyType: z
		.enum(Constants.public.Enums.PropertyType as readonly [string, ...string[]])
		.optional(),
	status: z
		.enum(
			Constants.public.Enums.PropertyStatus as readonly [string, ...string[]]
		)
		.optional()
})

// Transform function for converting update form data to API format
export const transformPropertyUpdateData = (data: PropertyUpdateFormData) => {
	const result: {
		name?: string
		address?: string
		city?: string
		state?: string
		zipCode?: string
		propertyType?: Database['public']['Enums']['PropertyType']
		status?: Database['public']['Enums']['PropertyStatus']
	} = {}

	if (data.name !== undefined) result.name = data.name
	if (data.address !== undefined) result.address = data.address
	if (data.city !== undefined) result.city = data.city
	if (data.state !== undefined) result.state = data.state
	if (data.zipCode !== undefined) result.zipCode = data.zipCode
	if (data.propertyType !== undefined) {
		result.propertyType =
			data.propertyType as Database['public']['Enums']['PropertyType']
	}
	if (data.status !== undefined) {
		result.status = data.status as Database['public']['Enums']['PropertyStatus']
	}

	return result
}

export type PropertyFormData = z.infer<typeof propertyFormSchema>
export type PropertyUpdateFormData = z.infer<typeof propertyUpdateFormSchema>
export type TransformedPropertyData = ReturnType<
	typeof transformPropertyFormData
>
export type TransformedPropertyUpdateData = ReturnType<
	typeof transformPropertyUpdateData
>

// Property sold schema (for marking properties as sold with required compliance fields)
export const propertyMarkedSoldSchema = z.object({
	dateSold: z.string().refine(
		val => {
			const date = new Date(val)
			return !isNaN(date.getTime()) && date <= new Date()
		},
		'Sale date must be valid and cannot be in the future'
	),
	salePrice: positiveNumberSchema
		.max(100000000, 'Sale price seems unrealistic')
		.refine(val => val > 0, 'Sale price must be greater than $0'),
	saleNotes: z
		.string()
		.max(2000, 'Sale notes cannot exceed 2000 characters')
		.optional()
		.or(z.literal(''))
})

export type PropertyMarkedSold = z.infer<typeof propertyMarkedSoldSchema>

// Backend DTO schemas - match CreatePropertyRequest/UpdatePropertyRequest from backend-domain.ts
export const createPropertyRequestSchema = z.object({
	name: z.string().trim().min(1, 'Property name is required'),
	address: z.string().trim().min(1, 'Address is required'),
	city: z.string().trim().min(1, 'City is required'),
	state: z
		.string()
		.trim()
		.length(2, 'State must be exactly 2 characters')
		.regex(/^[A-Z]{2}$/, 'State must be 2 uppercase letters'),
	zipCode: z
		.string()
		.trim()
		.regex(
			/^\d{5}(-\d{4})?$/,
			'Please enter a valid ZIP code (12345 or 12345-6789)'
		),
	// NOTE: ownerId is NOT in request - backend derives from authenticated user for security
	unitCount: z.number().int().positive().optional(),
	description: z.string().optional(),
	propertyType: z.enum(
		Constants.public.Enums.PropertyType as readonly [string, ...string[]]
	),
	amenities: z.array(z.string()).optional(),
	imageUrl: z
		.union([z.string().url(), z.literal(''), z.null(), z.undefined()])
		.transform(val => (val === '' || val === null ? undefined : val))
		.optional()
})

export const updatePropertyRequestSchema = z.object({
	name: z.string().trim().min(1, 'Property name is required').optional(),
	address: z.string().trim().min(1, 'Address is required').optional(),
	city: z.string().trim().min(1, 'City is required').optional(),
	state: z
		.string()
		.trim()
		.length(2, 'State must be exactly 2 characters')
		.regex(/^[A-Z]{2}$/, 'State must be 2 uppercase letters')
		.optional(),
	zipCode: z
		.string()
		.trim()
		.regex(
			/^\d{5}(-\d{4})?$/,
			'Please enter a valid ZIP code (12345 or 12345-6789)'
		)
		.optional(),
	unitCount: z.number().int().positive().optional(),
	description: z.string().optional(),
	propertyType: propertyTypeSchema.optional(),
	amenities: z.array(z.string()).optional(),
	imageUrl: z
		.union([z.string().url(), z.literal(''), z.null(), z.undefined()])
		.transform(val => (val === '' || val === null ? undefined : val))
		.optional(),
	version: z.number().optional()
})

// Property image upload schema
export const propertyImageUploadSchema = z.object({
	isPrimary: z
		.union([
			z.boolean(),
			z
				.string()
				.toLowerCase()
				.transform(val => val.trim())
				.refine(
					val => ['true', 'false', '1', '0', 'yes', 'no'].includes(val),
					{
						message:
							'isPrimary must be one of: true, false, 1, 0, yes, no (case-insensitive)'
					}
				)
				.transform(val => ['true', '1', 'yes'].includes(val))
		])
		.default(false),
	caption: z
		.string()
		.trim()
		.max(255, 'Caption cannot exceed 255 characters')
		.optional()
		.transform(val => (val && val.length > 0 ? val : undefined))
})

export type PropertyImageUpload = z.infer<typeof propertyImageUploadSchema>
