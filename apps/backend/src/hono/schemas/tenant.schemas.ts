import { z } from 'zod'
import { TENANT_STATUS } from '@tenantflow/shared/constants/tenants'
import {
  createCrudSchemas,
  uuidSchema,
  emailSchema,
  phoneSchema,
  fileUploadSchema,
  idParamSchema
} from './common.schemas'

// Tenant-specific filter schema
const tenantFilterSchema = z.object({
  status: z.nativeEnum(TENANT_STATUS).optional(),
  propertyId: uuidSchema.optional(),
  unitId: uuidSchema.optional()
})

// Create tenant schema
export const createTenantSchema = z.object({
  email: emailSchema,
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: phoneSchema,
  propertyId: uuidSchema.optional(),
  unitId: uuidSchema.optional(),
  dateOfBirth: z.string().datetime().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: phoneSchema.optional(),
  notes: z.string().optional()
})

// Generate CRUD schemas using factory
export const tenantSchemas = createCrudSchemas({
  createSchema: createTenantSchema,
  filterSchema: tenantFilterSchema,
  requiredOnUpdate: ['email'] // Email stays required on update
})

// Export individual schemas for backward compatibility
export const tenantIdSchema = idParamSchema
export const tenantListQuerySchema = tenantSchemas.list
export const updateTenantSchema = tenantSchemas.update

// Additional tenant-specific schemas
export const uploadDocumentSchema = fileUploadSchema.extend({
  documentType: z.string()
})

export const tenantDocumentIdSchema = z.object({
  id: uuidSchema,
  documentId: uuidSchema
})
