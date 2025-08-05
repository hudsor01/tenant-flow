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
export const createPaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T): z.ZodObject<{
  data: z.ZodArray<T>
  pagination: typeof paginationResponseSchema
}> =>
  z.object({
    data: z.array(itemSchema),
    pagination: paginationResponseSchema
  })

// Create a standard API response schema
export const createApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T): z.ZodObject<{
  success: z.ZodBoolean
  data: z.ZodOptional<T>
  error: z.ZodOptional<z.ZodString>
  message: z.ZodOptional<z.ZodString>
}> =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    message: z.string().optional()
  })

// Create a list response with total count
export const createListResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T): z.ZodObject<{
  items: z.ZodArray<T>
  totalCount: z.ZodNumber
  page: z.ZodNumber
  pageSize: z.ZodNumber
}> =>
  z.object({
    items: z.array(itemSchema),
    totalCount: z.number(),
    page: z.number(),
    pageSize: z.number(),
    totalPages: z.number()
  })

// ===== REACT 19 ACTION STATE SCHEMAS =====

export const actionStateSchema = z.object({
  success: z.boolean().optional(),
  loading: z.boolean().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
  data: z.unknown().optional()
})

export const formActionStateSchema = actionStateSchema.extend({
  fieldErrors: z.record(z.string(), z.array(z.string())).optional()
})

export const serverActionResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
  redirect: z.string().optional()
})

// ===== ENHANCED COMMON SCHEMAS =====

// Phone number validation
export const phoneSchema = z.string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')

// Currency amount validation
export const currencyAmountSchema = z.number()
  .min(0, 'Amount cannot be negative')
  .max(999999999.99, 'Amount is too large')

// Percentage validation
export const percentageSchema = z.number()
  .min(0, 'Percentage cannot be negative')
  .max(100, 'Percentage cannot exceed 100')

// URL validation
export const urlSchema = z.string().url('Invalid URL format')

// File validation schemas
export const fileTypeSchema = z.enum([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf', 'text/plain', 'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel'
])

export const fileSizeSchema = z.number()
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
  country: z.string().length(2, 'Country code must be 2 letters').default('US')
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

export const advancedSearchSchema = searchSchema.extend({
  filters: z.record(z.string(), z.unknown()).optional(),
  sort: z.array(sortSchema).optional(),
  include: z.array(z.string()).optional(),
  exclude: z.array(z.string()).optional()
})

export const timeRangeSchema = z.object({
  from: dateStringSchema.optional(),
  to: dateStringSchema.optional(),
  preset: z.enum(['today', 'yesterday', 'last7days', 'last30days', 'thisMonth', 'lastMonth', 'thisYear', 'lastYear']).optional()
})

// ===== BULK OPERATION SCHEMAS =====

export const bulkOperationSchema = z.object({
  action: z.enum(['create', 'update', 'delete', 'archive', 'restore']),
  ids: z.array(uuidSchema).min(1, 'At least one ID is required'),
  data: z.unknown().optional()
})

export const bulkResponseSchema = z.object({
  successful: z.array(uuidSchema),
  failed: z.array(z.object({
    id: uuidSchema,
    error: z.string()
  })),
  totalProcessed: z.number(),
  successCount: z.number(),
  failureCount: z.number()
})

// ===== WEBHOOK SCHEMAS =====

export const webhookEventSchema = z.object({
  id: uuidSchema,
  type: z.string(),
  data: z.unknown(),
  timestamp: dateStringSchema,
  version: z.string().default('1.0')
})

export const webhookDeliverySchema = z.object({
  id: uuidSchema,
  url: urlSchema,
  event: webhookEventSchema,
  attempts: z.number().min(1),
  status: z.enum(['pending', 'delivered', 'failed']),
  response: z.object({
    status: z.number(),
    headers: z.record(z.string(), z.string()),
    body: z.string()
  }).optional(),
  nextRetry: dateStringSchema.optional()
})