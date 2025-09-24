import { z } from 'zod'
import {
	nonEmptyStringSchema,
	nonNegativeNumberSchema,
	urlSchema,
	uuidSchema
} from './common.js'

// Document type enum (should match database enum)
export const documentTypeSchema = z.enum([
	'LEASE',
	'INVOICE',
	'RECEIPT',
	'PROPERTY_PHOTO',
	'INSPECTION',
	'MAINTENANCE',
	'OTHER'
])

// Document input schema (for forms and API creation)
export const documentInputSchema = z.object({
	name: nonEmptyStringSchema
		.min(1, 'Document name is required')
		.max(255, 'Document name cannot exceed 255 characters'),

	description: z
		.string()
		.max(1000, 'Description cannot exceed 1000 characters')
		.optional(),

	type: documentTypeSchema.default('OTHER'),

	propertyId: uuidSchema.optional(),

	leaseId: uuidSchema.optional(),

	maintenanceRequestId: uuidSchema.optional(),

	// File metadata
	fileName: nonEmptyStringSchema,

	mimeType: nonEmptyStringSchema,

	fileSize: nonNegativeNumberSchema,

	// Storage location
	fileUrl: urlSchema,

	// Optional metadata
	tags: z.array(z.string()).optional().default([]),

	isPublic: z.boolean().default(false)
})

// Full document schema (includes server-generated fields)
export const documentSchema = documentInputSchema.extend({
	id: uuidSchema,
	ownerId: uuidSchema,
	uploadedBy: uuidSchema,
	uploadedAt: z.date(),
	createdAt: z.date(),
	updatedAt: z.date()
})

// Document update schema (partial input)
export const documentUpdateSchema = documentInputSchema.partial()

// Document query schema (for search/filtering)
export const documentQuerySchema = z.object({
	search: z.string().optional(),
	type: documentTypeSchema.optional(),
	propertyId: uuidSchema.optional(),
	leaseId: uuidSchema.optional(),
	maintenanceRequestId: uuidSchema.optional(),
	mimeType: z.string().optional(),
	isPublic: z.boolean().optional(),
	createdFrom: z
		.string()
		.optional()
		.refine((val: string | undefined) => !val || !isNaN(Date.parse(val)), {
			message: 'Invalid date format'
		}),
	createdTo: z
		.string()
		.optional()
		.refine((val: string | undefined) => !val || !isNaN(Date.parse(val)), {
			message: 'Invalid date format'
		}),
	minFileSize: nonNegativeNumberSchema.optional(),
	maxFileSize: nonNegativeNumberSchema.optional(),
	sortBy: z.enum(['name', 'type', 'createdAt', 'fileSize']).optional(),
	sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(10)
})

// Export types
export type DocumentInput = z.infer<typeof documentInputSchema>
export type Document = z.infer<typeof documentSchema>
export type DocumentUpdate = z.infer<typeof documentUpdateSchema>
export type DocumentQuery = z.infer<typeof documentQuerySchema>
export type DocumentType = z.infer<typeof documentTypeSchema>

// Backend DTO compatibility aliases
export type CreateDocumentInput = DocumentInput
export type UpdateDocumentInput = DocumentUpdate
export type DocumentQueryInput = DocumentQuery
