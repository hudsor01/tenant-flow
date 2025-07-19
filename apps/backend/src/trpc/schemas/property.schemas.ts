import { z } from 'zod'

// Property types enum - must match Prisma PropertyType enum
export const propertyTypeSchema = z.enum([
	'SINGLE_FAMILY',
	'MULTI_UNIT',
	'APARTMENT',
	'COMMERCIAL'
])

// Create property schema
export const createPropertySchema = z.object({
	name: z.string().min(1, 'Property name is required').max(255),
	address: z.string().min(1, 'Address is required').max(500),
	city: z.string().min(1, 'City is required').max(100),
	state: z.string().min(1, 'State is required').max(50),
	zipCode: z.string().min(5, 'Zip code must be at least 5 characters').max(10),
	description: z.string().max(1000).optional(),
	propertyType: propertyTypeSchema.optional(),
})

// Update property schema
export const updatePropertySchema = z.object({
	id: z.string().uuid('Invalid property ID'),
	name: z.string().min(1).max(255).optional(),
	address: z.string().min(1).max(500).optional(),
	city: z.string().min(1).max(100).optional(),
	state: z.string().min(1).max(50).optional(),
	zipCode: z.string().min(5).max(10).optional(),
	description: z.string().max(1000).optional(),
	propertyType: propertyTypeSchema.optional(),
	imageUrl: z.string().url().optional(),
})

// Property query schema
export const propertyQuerySchema = z.object({
	propertyType: propertyTypeSchema.optional(),
	status: z.string().optional(),
	search: z.string().optional(),
	limit: z.string().optional(),
	offset: z.string().optional(),
})

// Property ID schema
export const propertyIdSchema = z.object({
	id: z.string().uuid('Invalid property ID'),
})

// Base64 file upload schema for tRPC
export const base64FileSchema = z.object({
	filename: z.string().min(1, 'Filename is required'),
	mimeType: z.string().min(1, 'MIME type is required'),
	size: z.number().positive('File size must be positive'),
	data: z.string().min(1, 'File data is required').describe('Base64 encoded file data'),
})

export const uploadImageSchema = z.object({
	propertyId: z.string().uuid('Invalid property ID'),
	file: base64FileSchema,
})

export const uploadResultSchema = z.object({
	url: z.string(),
	path: z.string(),
	filename: z.string(),
	size: z.number(),
	mimeType: z.string(),
})

// Response schemas
export const propertySchema = z.object({
	id: z.string(),
	name: z.string(),
	address: z.string(),
	city: z.string(),
	state: z.string(),
	zipCode: z.string(),
	description: z.string().nullable(),
	propertyType: propertyTypeSchema,
	imageUrl: z.string().nullable(),
	ownerId: z.string(),
	createdAt: z.date(),
	updatedAt: z.date(),
})

export const propertyListSchema = z.object({
	properties: z.array(propertySchema),
	total: z.number(),
	limit: z.number(),
	offset: z.number(),
})

export const propertyStatsSchema = z.object({
	totalProperties: z.number(),
	totalUnits: z.number(),
	occupiedUnits: z.number(),
	vacantUnits: z.number(),
	totalRent: z.number(),
	collectedRent: z.number(),
	pendingRent: z.number(),
})