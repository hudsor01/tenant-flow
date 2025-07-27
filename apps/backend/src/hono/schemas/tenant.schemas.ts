import { z } from 'zod'
import { TenantStatus } from '@tenantflow/shared'

// Tenant ID schema
export const tenantIdSchema = z.object({
  id: z.string().uuid()
})

// Tenant list query schema
export const tenantListQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  status: z.nativeEnum(TenantStatus).optional(),
  propertyId: z.string().uuid().optional(),
  search: z.string().optional(),
  offset: z.string().optional()
})

// Create tenant schema
export const createTenantSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().min(1, 'Phone is required'),
  propertyId: z.string().uuid().optional(),
  unitId: z.string().uuid().optional(),
  dateOfBirth: z.string().datetime().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  notes: z.string().optional()
})

// Update tenant schema
export const updateTenantSchema = createTenantSchema.partial()

// Upload document schema
export const uploadDocumentSchema = z.object({
  filename: z.string(),
  mimeType: z.string(),
  size: z.number().positive(),
  documentType: z.string()
})

// Tenant document ID schema
export const tenantDocumentIdSchema = z.object({
  documentId: z.string().uuid()
})