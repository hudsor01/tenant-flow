import { z } from 'zod'

/**
 * Common schema components for reuse across all endpoints
 * Eliminates duplication of pagination, filtering, and validation patterns
 */

// Pagination schema - used by all list endpoints
export const paginationSchema = z.object({
  page: z.string().optional().transform((val) => val ? parseInt(val) : undefined),
  limit: z.string().optional().transform((val) => val ? parseInt(val) : undefined),
  offset: z.string().optional().transform((val) => val ? parseInt(val) : undefined)
})

// Search schema - common text search pattern
export const searchSchema = z.object({
  search: z.string().optional()
})

// Sort schema - common sorting pattern
export const sortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
})

// UUID validation schema
export const uuidSchema = z.string().uuid()

// ID parameter schema
export const idParamSchema = z.object({
  id: uuidSchema
})

// Status filter schema factory
export function createStatusSchema<T extends readonly [string, ...string[]]>(
  statuses: T
) {
  return z.object({
    status: z.enum(statuses).optional()
  })
}

// Date range schema
export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
})

// File upload schema
export const fileUploadSchema = z.object({
  file: z.string().min(1), // Base64 encoded file content
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().positive().max(10 * 1024 * 1024) // 10MB max
})

// Image upload schema
export const imageUploadSchema = fileUploadSchema.extend({
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
})

/**
 * Factory function to create a list query schema
 * Combines pagination, search, and custom filters
 */
export function createListQuerySchema<T extends z.ZodObject<z.ZodRawShape>>(
  filterSchema?: T
) {
  const baseSchema = paginationSchema.merge(searchSchema).merge(sortSchema)
  
  if (filterSchema) {
    return baseSchema.merge(filterSchema)
  }
  
  return baseSchema
}

/**
 * Factory function to create a paginated response schema
 */
export function createPaginatedResponseSchema<T extends z.ZodTypeAny>(
  itemSchema: T
) {
  return z.object({
    items: z.array(itemSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    totalPages: z.number().int().nonnegative()
  })
}

/**
 * Factory function to create CRUD schemas for an entity
 */
export interface CrudSchemas<
  TCreate extends z.ZodObject<z.ZodRawShape>,
  TUpdate extends z.ZodObject<z.ZodRawShape>,
  TFilters extends z.ZodObject<z.ZodRawShape> = z.ZodObject<Record<string, never>>
> {
  id: typeof idParamSchema
  list: ReturnType<typeof createListQuerySchema<TFilters>>
  create: TCreate
  update: TUpdate
  delete: typeof idParamSchema
}

export function createCrudSchemas<
  TCreate extends z.ZodObject<z.ZodRawShape>,
  TFilters extends z.ZodObject<z.ZodRawShape> = z.ZodObject<Record<string, never>>
>(config: {
  createSchema: TCreate
  filterSchema?: TFilters
  requiredOnUpdate?: (keyof z.infer<TCreate>)[]
}): CrudSchemas<TCreate, z.ZodObject<Record<string, z.ZodTypeAny>>, TFilters> {
  const { createSchema, filterSchema, requiredOnUpdate = [] } = config
  
  // Update schema is partial of create schema, with some fields potentially required
  const updateSchemaShape = Object.entries(createSchema.shape).reduce<Record<string, z.ZodTypeAny>>(
    (acc, [key, schema]) => {
      if (requiredOnUpdate.includes(key as keyof z.infer<TCreate>)) {
        acc[key] = schema as z.ZodTypeAny
      } else {
        acc[key] = (schema as z.ZodTypeAny).optional()
      }
      return acc
    },
    {}
  )
  
  return {
    id: idParamSchema,
    list: createListQuerySchema(filterSchema),
    create: createSchema,
    update: z.object(updateSchemaShape),
    delete: idParamSchema
  }
}

// Common validation helpers
export const positiveIntSchema = z.number().int().positive()
export const nonNegativeIntSchema = z.number().int().nonnegative()
export const percentageSchema = z.number().min(0).max(100)
export const emailSchema = z.string().email()
export const urlSchema = z.string().url()
export const phoneSchema = z.string().regex(/^\+?[1-9]\d{1,14}$/)

// Money/currency schema (cents)
export const moneySchema = z.number().int().nonnegative()

// Address schema component
export const addressSchema = z.object({
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  zipCode: z.string().min(1),
  country: z.string().default('US')
})