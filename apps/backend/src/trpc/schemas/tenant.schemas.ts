import { z } from 'zod'
import { 
  uuidSchema, 
  emailSchema,
  nonEmptyStringSchema,
  paginationSchema 
} from './common.schemas'
import { INVITATION_STATUS_OPTIONS } from '@tenantflow/shared'

// Tenant invitation status enum - using centralized enum values
export const invitationStatusSchema = z.enum(INVITATION_STATUS_OPTIONS as [string, ...string[]])

// Create tenant schema (invitation)
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

// Accept invitation schema
export const acceptInvitationSchema = z.object({
  token: z.string().min(1, 'Invitation token is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  userInfo: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    name: z.string().optional(),
  }),
})

// Verify invitation schema
export const verifyInvitationSchema = z.object({
  token: z.string().min(1, 'Invitation token is required'),
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
  invitationStatus: invitationStatusSchema,
  invitedAt: z.string().datetime().nullable(),
  acceptedAt: z.string().datetime().nullable(),
  expiresAt: z.string().datetime().nullable(),
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
  pendingInvitations: z.number(),
})

export const invitationVerificationSchema = z.object({
  tenant: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    phone: z.string().nullable(),
  }),
  property: propertyReferenceSchema.nullable(),
  propertyOwner: z.object({
    id: z.string(),
    name: z.string().nullable(),
    email: z.string(),
  }),
  expiresAt: z.date().nullable(),
})

export const invitationAcceptanceSchema = z.object({
  success: z.boolean(),
  tenant: tenantSchema,
  user: userSchema,
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