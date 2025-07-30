import { z } from 'zod'

// ===== BASIC VALIDATION SCHEMAS =====

export const uuidSchema = z.string({ 
  error: 'UUID is required'
}).uuid({ message: 'Invalid UUID format' })

export const emailSchema = z.string({ 
  error: 'Email is required'
}).email({ message: 'Invalid email format' })

export const nonEmptyStringSchema = z.string({ 
  error: 'This field is required'
}).min(1, { message: 'Field cannot be empty' })

export const positiveNumberSchema = z.number({ 
  error: 'This field is required'
}).positive({ message: 'Must be a positive number' })

export const nonNegativeNumberSchema = z.number({ 
  error: 'This field is required'
}).nonnegative({ message: 'Cannot be negative' })

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

export const dateStringSchema = z.string().datetime('Invalid date format')

export const dateRangeSchema = z.object({
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
})

// ===== COMMON FIELD SCHEMAS =====

export const idSchema = z.object({
  id: uuidSchema,
})

export const timestampFieldsSchema = z.object({
  createdAt: dateStringSchema,
  updatedAt: dateStringSchema,
})

// ===== STATUS ENUMS =====

export const statusSchema = z.enum(['ACTIVE', 'INACTIVE', 'PENDING', 'COMPLETED', 'FAILED'])

export const sortOrderSchema = z.enum(['asc', 'desc']).optional().default('desc')

// ===== SEARCH AND FILTER SCHEMAS =====

export const searchSchema = z.object({
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: sortOrderSchema,
})

export const baseQuerySchema = paginationSchema.merge(searchSchema).merge(dateRangeSchema)

// ===== RESPONSE WRAPPER SCHEMAS =====

export const successResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
})

export const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
  code: z.string().optional(),
})

// ===== METADATA SCHEMAS =====

export const metadataSchema = z.record(z.string(), z.unknown())

export const auditFieldsSchema = z.object({
  createdBy: z.string().uuid().optional(),
  updatedBy: z.string().uuid().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
})

// ===== UTILITY FUNCTIONS =====

// Create a paginated response schema for any data type
export const createPaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    pagination: paginationResponseSchema
  })

// Create a standard API response schema
export const createApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    message: z.string().optional()
  })

// Create a list response with total count
export const createListResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    totalCount: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number()
  })