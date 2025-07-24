import { z } from 'zod'
import { 
  uuidSchema, 
  emailSchema,
  nonEmptyStringSchema,
  paginationSchema 
} from './common.schemas'

// Create tenant schema
export const createTenantSchema = z.object({
  name: nonEmptyStringSchema.max(255),
  email: emailSchema,
  phone: z.string().optional(),
  emergencyContact: z.string().max(500).optional(),
})

// Update tenant schema
export const updateTenantSchema = z.object({
  id: uuidSchema,
  name: nonEmptyStringSchema.max(255).optional(),
  email: emailSchema.optional(),
  phone: z.string().optional(),
  emergencyContact: z.string().max(500).optional(),
})

// Tenant query schema
export const tenantQuerySchema = paginationSchema.extend({
  status: z.string().optional(),
  search: z.string().optional(),
})

// Tenant ID schema
export const tenantIdSchema = z.object({
  id: uuidSchema,
})

// Response schemas
export const userSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string(),
  avatarUrl: z.string().nullable(),
})

export const propertyReferenceSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  city: z.string().optional(),
  state: z.string().optional(),
})

export const unitReferenceSchema = z.object({
  id: z.string(),
  unitNumber: z.string(),
  Property: propertyReferenceSchema,
})

export const leaseReferenceSchema = z.object({
  id: z.string(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  rentAmount: z.number(),
  status: z.string(),
  Unit: unitReferenceSchema,
})

export const tenantSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  emergencyContact: z.string().nullable(),
  userId: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  User: userSchema.nullable(),
  Lease: z.array(leaseReferenceSchema).optional(),
})

export const tenantListSchema = z.object({
  tenants: z.array(tenantSchema),
  total: z.number(),
})

export const tenantStatsSchema = z.object({
  totalTenants: z.number(),
  activeTenants: z.number(),
})

// File upload schemas for tenants
export const base64FileSchema = z.object({
  filename: z.string().min(1, 'Filename is required'),
  mimeType: z.string().min(1, 'MIME type is required'),
  size: z.number().positive('File size must be positive'),
  data: z.string().min(1, 'File data is required').describe('Base64 encoded file data'),
})

export const uploadDocumentSchema = z.object({
  tenantId: z.string().uuid('Invalid tenant ID'),
  documentType: z.string().min(1, 'Document type is required'),
  file: base64FileSchema,
})

export const uploadResultSchema = z.object({
  url: z.string(),
  path: z.string(),
  filename: z.string(),
  size: z.number(),
  mimeType: z.string(),
})