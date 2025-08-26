import { z } from 'zod'

// ===== BASIC VALIDATION SCHEMAS =====

// Most commonly used validation building blocks
export const requiredString = z.string().min(1, 'This field is required')

export const uuidSchema = z.string().uuid('Invalid ID format')

export const emailSchema = z.string().email('Invalid email format')

// Alias for backward compatibility
export const nonEmptyStringSchema = requiredString

export const positiveNumberSchema = z
	.number()
	.positive({ message: 'Must be a positive number' })

export const nonNegativeNumberSchema = z
	.number()
	.nonnegative({ message: 'Cannot be negative' })

// Common string validation patterns with customizable messages
export const requiredStringField = (fieldName: string) =>
	z.string().min(1, `${fieldName} is required`)

export const requiredName = requiredString
	.max(100, 'Name cannot exceed 100 characters')

export const requiredTitle = requiredString
	.max(200, 'Title too long')

export const requiredDescription = requiredString
	.max(1000, 'Description too long')

// ===== PAGINATION SCHEMAS =====
// Backend-compatible pagination schemas

export const paginationSchema = z.object({
	page: z.number().int().positive().default(1),
	limit: z.number().int().positive().max(100).default(10)
})

export const paginationQuerySchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(10)
})

export const paginationResponseSchema = z.object({
	totalCount: z.number(),
	totalPages: z.number(),
	currentPage: z.number(),
	hasNextPage: z.boolean(),
	hasPreviousPage: z.boolean()
})

// ===== DATE VALIDATION SCHEMAS =====

export const dateStringSchema = z
	.string()
	.refine(val => !val || !isNaN(Date.parse(val)), {
		message: 'Invalid date format'
	})

export const dateRangeSchema = z.object({
	startDate: dateStringSchema.optional(),
	endDate: dateStringSchema.optional()
})

// ===== COMMON FIELD SCHEMAS =====

export const idSchema = z.object({
	id: uuidSchema
})

export const timestampFieldsSchema = z.object({
	createdAt: dateStringSchema,
	updatedAt: dateStringSchema
})

// ===== STATUS ENUMS =====

export const statusSchema = z.enum([
	'ACTIVE',
	'INACTIVE',
	'PENDING',
	'COMPLETED',
	'FAILED'
])

export const sortOrderSchema = z
	.enum(['asc', 'desc'])
	.optional()
	.default('desc')

// ===== SEARCH AND FILTER SCHEMAS =====

export const searchSchema = z.object({
	search: z.string().optional(),
	sortBy: z.string().optional(),
	sortOrder: sortOrderSchema
})

export const baseQuerySchema = z.object({
	...paginationSchema.shape,
	...searchSchema.shape,
	...dateRangeSchema.shape
})

// ===== RESPONSE WRAPPER SCHEMAS =====

export const successResponseSchema = z.object({
	success: z.boolean(),
	message: z.string().optional()
})

export const errorResponseSchema = z.object({
	error: z.string(),
	message: z.string(),
	code: z.string().optional()
})

// ===== METADATA SCHEMAS =====

// Secure metadata schema with constrained value types
export const metadataValueSchema = z.union([
	z.string().max(1000, 'Metadata string value too long'),
	z.number().finite('Metadata number must be finite'),
	z.boolean(),
	z.null(),
	z
		.array(z.string().max(255, 'Metadata array string too long'))
		.max(50, 'Too many metadata array items'),
	z
		.record(
			z.string(),
			z.string().max(255, 'Nested metadata value too long')
		)
		.refine(
			obj => Object.keys(obj).length <= 20,
			'Too many nested metadata properties'
		)
])

export const metadataSchema = z
	.record(z.string().max(100, 'Metadata key too long'), metadataValueSchema)
	.refine(
		obj => Object.keys(obj).length <= 50,
		'Too many metadata properties'
	)

export const auditFieldsSchema = z.object({
	createdBy: z
		.string()
		.refine(
			val =>
				!val ||
				/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
					val
				),
			{ message: 'Invalid UUID format' }
		)
		.optional(),
	updatedBy: z
		.string()
		.refine(
			val =>
				!val ||
				/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
					val
				),
			{ message: 'Invalid UUID format' }
		)
		.optional(),
	createdAt: z.date(),
	updatedAt: z.date()
})


// ===== REACT 19 ACTION STATE SCHEMAS =====

// Secure action data schema with specific allowed types
export const actionDataSchema = z.union([
	z.string().max(10000, 'Action data string too long'),
	z.number().finite('Action data number must be finite'),
	z.boolean(),
	z.null(),
	z
		.object({})
		.passthrough()
		.refine(obj => {
			const jsonStr = JSON.stringify(obj)
			return jsonStr.length <= 50000 // 50KB limit
		}, 'Action data object too large'),
	z.array(z.unknown()).max(1000, 'Too many items in action data array')
])

export const actionStateSchema = z.object({
	success: z.boolean().optional(),
	loading: z.boolean().optional(),
	error: z.string().max(1000, 'Error message too long').optional(),
	message: z.string().max(1000, 'Message too long').optional(),
	data: actionDataSchema.optional()
})

export const formActionStateSchema = actionStateSchema.extend({
	fieldErrors: z.record(z.string(), z.array(z.string())).optional()
})

export const serverActionResponseSchema = z.object({
	success: z.boolean(),
	data: actionDataSchema.optional(),
	error: z.string().max(1000, 'Error message too long').optional(),
	message: z.string().max(1000, 'Message too long').optional(),
	redirect: z.string().url('Invalid redirect URL').optional()
})

// ===== ENHANCED COMMON SCHEMAS =====

// Phone number validation
export const phoneSchema = z
	.string()
	.regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')

// Currency amount validation
export const currencyAmountSchema = z
	.number()
	.min(0, 'Amount cannot be negative')
	.max(999999999.99, 'Amount is too large')

// Percentage validation
export const percentageSchema = z
	.number()
	.min(0, 'Percentage cannot be negative')
	.max(100, 'Percentage cannot exceed 100')

// URL validation
export const urlSchema = z.string().refine(
	val => {
		try {
			new URL(val)
			return true
		} catch {
			return false
		}
	},
	{ message: 'Invalid URL format' }
)

// File validation schemas
export const fileTypeSchema = z.enum([
	'image/jpeg',
	'image/png',
	'image/gif',
	'image/webp',
	'application/pdf',
	'text/plain',
	'text/csv',
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	'application/vnd.ms-excel'
])

export const fileSizeSchema = z
	.number()
	.min(1, 'File cannot be empty')
	.max(10 * 1024 * 1024, 'File size cannot exceed 10MB') // 10MB

export const uploadedFileSchema = z.object({
	name: z.string(),
	size: fileSizeSchema,
	type: fileTypeSchema,
	lastModified: z.number(),
	data: z.string().optional() // base64 data
})

// Address validation
export const addressSchema = z.object({
	street: nonEmptyStringSchema,
	city: nonEmptyStringSchema,
	state: nonEmptyStringSchema,
	zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code format'),
	country: z
		.string()
		.length(2, 'Country code must be 2 letters')
		.default('US')
})

// Coordinate validation
export const coordinatesSchema = z.object({
	latitude: z.number().min(-90).max(90),
	longitude: z.number().min(-180).max(180)
})

// ===== ENHANCED QUERY SCHEMAS =====

export const sortSchema = z.object({
	field: z.string(),
	direction: z.enum(['asc', 'desc']).default('desc')
})

// Secure filter value schema with constrained types
export const filterValueSchema = z.union([
	z.string().max(500, 'Filter string value too long'),
	z.number().finite('Filter number must be finite'),
	z.boolean(),
	z.null(),
	z
		.array(z.string().max(255, 'Filter array string too long'))
		.max(20, 'Too many filter array items'),
	z.array(z.number().finite()).max(20, 'Too many filter number items')
])

export const advancedSearchSchema = searchSchema.extend({
	filters: z
		.record(z.string().max(100, 'Filter key too long'), filterValueSchema)
		.refine(
			obj => Object.keys(obj).length <= 20,
			'Too many filter properties'
		)
		.optional(),
	sort: z.array(sortSchema).max(5, 'Too many sort criteria').optional(),
	include: z
		.array(z.string().max(100, 'Include field name too long'))
		.max(50, 'Too many include fields')
		.optional(),
	exclude: z
		.array(z.string().max(100, 'Exclude field name too long'))
		.max(50, 'Too many exclude fields')
		.optional()
})

export const timeRangeSchema = z.object({
	from: dateStringSchema.optional(),
	to: dateStringSchema.optional(),
	preset: z
		.enum([
			'today',
			'yesterday',
			'last7days',
			'last30days',
			'thisMonth',
			'lastMonth',
			'thisYear',
			'lastYear'
		])
		.optional()
})

// ===== BULK OPERATION SCHEMAS =====

export const bulkOperationSchema = z.object({
	action: z.enum(['create', 'update', 'delete', 'archive', 'restore']),
	ids: z
		.array(uuidSchema)
		.min(1, 'At least one ID is required')
		.max(100, 'Too many IDs for bulk operation'),
	data: actionDataSchema.optional()
})

export const bulkResponseSchema = z.object({
	successful: z.array(uuidSchema),
	failed: z.array(
		z.object({
			id: uuidSchema,
			error: z.string()
		})
	),
	totalProcessed: z.number(),
	successCount: z.number(),
	failureCount: z.number()
})

// ===== WEBHOOK SCHEMAS =====

export const webhookEventSchema = z.object({
	id: uuidSchema,
	type: z.string().max(100, 'Webhook event type too long'),
	data: actionDataSchema,
	timestamp: dateStringSchema,
	version: z
		.string()
		.regex(/^\d+\.\d+$/, 'Invalid version format')
		.default('1.0')
})

export const webhookDeliverySchema = z.object({
	id: uuidSchema,
	url: urlSchema,
	event: webhookEventSchema,
	attempts: z.number().min(1),
	status: z.enum(['pending', 'delivered', 'failed']),
	response: z
		.object({
			status: z.number(),
			headers: z.record(z.string(), z.string()),
			body: z.string()
		})
		.optional(),
	nextRetry: dateStringSchema.optional()
})
