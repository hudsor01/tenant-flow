import { z } from 'zod'

// Common validation schemas
export const uuidSchema = z.string().uuid()
export const emailSchema = z.string().email()
export const nonEmptyStringSchema = z.string().min(1)
export const positiveNumberSchema = z.number().positive()
export const nonNegativeNumberSchema = z.number().nonnegative()

// Pagination schemas
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

// Date schemas
export const dateStringSchema = z.string().datetime()
export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
})

// Generic schemas
export const idSchema = z.string().uuid()
export const timestampFieldsSchema = z.object({
  createdAt: z.date(),
  updatedAt: z.date()
})

export const statusSchema = z.enum(['active', 'inactive', 'pending'])
export const sortOrderSchema = z.enum(['asc', 'desc']).default('desc')

// Query schemas
export const searchSchema = z.object({
  query: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: sortOrderSchema
})

export const baseQuerySchema = paginationQuerySchema.merge(searchSchema)

// Response schemas
export const successResponseSchema = z.object({
  success: z.literal(true),
  message: z.string().optional()
})

export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  code: z.string().optional()
})

export const metadataSchema = z.record(z.unknown())
export const auditFieldsSchema = z.object({
  createdBy: z.string().uuid().optional(),
  updatedBy: z.string().uuid().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
})

// Helper functions
export const createPaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    pagination: paginationResponseSchema
  })

export const createApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    message: z.string().optional()
  })

export const createListResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    totalCount: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number()
  })