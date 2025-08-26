import { z } from 'zod'

// Import authoritative types from shared package
export type {
	Property,
	Unit,
	CreatePropertyInput as CreatePropertyInputType,
	UpdatePropertyInput as UpdatePropertyInputType,
	PropertyType,
	UnitStatus
} from '@repo/shared'

// Zod schemas for runtime validation - these should match the shared types exactly
export const UnitSchema = z.object({
	id: z.string(),
	unitNumber: z.string(),
	propertyId: z.string(),
	bedrooms: z.number(),
	bathrooms: z.number(),
	squareFeet: z.union([z.number(), z.null()]),
	monthlyRent: z.number().optional(),
	status: z.string(),
	lastInspectionDate: z.union([z.string(), z.null()]).optional(),
	createdAt: z.string().transform(s => new Date(s)),
	updatedAt: z.string().transform(s => new Date(s))
})

export const UnitArraySchema = z.array(UnitSchema)

export const PropertySchema = z.object({
	id: z.string(),
	name: z.string(),
	address: z.string(),
	city: z.string(),
	state: z.string(),
	zipCode: z.string(),
	description: z.union([z.string(), z.null()]).optional(),
	imageUrl: z.union([z.string(), z.null()]).optional(),
	ownerId: z.string(),
	propertyType: z.string(),
	yearBuilt: z.union([z.number(), z.null()]).optional(),
	totalSize: z.union([z.number(), z.null()]).optional(),
	createdAt: z.string().transform(s => new Date(s)),
	updatedAt: z.string().transform(s => new Date(s)),
	units: z.array(UnitSchema).optional()
})

export const PropertyArraySchema = z.array(PropertySchema)

// Input validation schemas - aligned with shared types
export const CreatePropertyInputSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	address: z.string().min(1, 'Address is required'),
	city: z.string().min(1, 'City is required'),
	state: z.string().min(1, 'State is required'),
	zipCode: z.string().min(1, 'Zip code is required'),
	description: z.string().optional(),
	imageUrl: z.string().optional(),
	propertyType: z.string(),
	yearBuilt: z.number().optional(),
	totalSize: z.number().optional()
})

export const UpdatePropertyInputSchema = z.object({
	name: z.string().min(1, 'Name is required').optional(),
	address: z.string().min(1, 'Address is required').optional(),
	city: z.string().min(1, 'City is required').optional(),
	state: z.string().min(1, 'State is required').optional(),
	zipCode: z.string().min(1, 'Zip code is required').optional(),
	description: z.string().optional(),
	imageUrl: z.string().optional(),
	propertyType: z.string().optional(),
	yearBuilt: z.number().optional(),
	totalSize: z.number().optional()
})
