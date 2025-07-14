import { z } from 'zod'

// Tenant invitation status enum
export const invitationStatusSchema = z.enum([
  'PENDING',
  'ACCEPTED',
  'EXPIRED',
  'CANCELLED'
])

// Create tenant schema (invitation)
export const createTenantSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  emergencyContact: z.string().max(500).optional(),
})

// Update tenant schema
export const updateTenantSchema = z.object({
  id: z.string().uuid('Invalid tenant ID'),
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  emergencyContact: z.string().max(500).optional(),
})

// Tenant query schema
export const tenantQuerySchema = z.object({
  status: z.string().optional(),
  search: z.string().optional(),
  limit: z.string().optional(),
  offset: z.string().optional(),
})

// Tenant ID schema
export const tenantIdSchema = z.object({
  id: z.string().uuid('Invalid tenant ID'),
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
  startDate: z.date(),
  endDate: z.date(),
  monthlyRent: z.number(),
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
  invitedAt: z.date().nullable(),
  acceptedAt: z.date().nullable(),
  expiresAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
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
    name: z.string(),
    email: z.string(),
  }),
  expiresAt: z.date().nullable(),
})

export const invitationAcceptanceSchema = z.object({
  success: z.boolean(),
  tenant: tenantSchema,
  user: userSchema,
})