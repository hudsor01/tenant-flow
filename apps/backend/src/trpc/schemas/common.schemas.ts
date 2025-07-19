import { z } from 'zod'

// ===== BASIC VALIDATION SCHEMAS =====

export const uuidSchema = z.string().uuid('Invalid UUID format')

export const emailSchema = z.string().email('Invalid email format')

export const nonEmptyStringSchema = z.string().min(1, 'Required field cannot be empty')

export const positiveNumberSchema = z.number().positive('Must be a positive number')

export const nonNegativeNumberSchema = z.number().min(0, 'Cannot be negative')

// ===== PAGINATION SCHEMAS =====

export const paginationSchema = z.object({
  offset: z.string().optional().default('0'),
  limit: z.string().optional().default('10'),
})

export const paginationQuerySchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
})

export const paginationResponseSchema = z.object({
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
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

export const sortOrderSchema = z.enum(['asc', 'desc']).default('desc')

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

export const metadataSchema = z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional()

export const auditFieldsSchema = z.object({
  createdBy: uuidSchema.optional(),
  updatedBy: uuidSchema.optional(),
}).merge(timestampFieldsSchema)

// ===== UTILITY FUNCTIONS =====

// Create a paginated response schema for any data type
export const createPaginatedResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: z.array(dataSchema),
    pagination: paginationResponseSchema,
  })

// Create a standard API response schema
export const createApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema,
    message: z.string().optional(),
  })

// Create a list response with total count
export const createListResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number(),
    totalAmount: z.number().optional(),
  })