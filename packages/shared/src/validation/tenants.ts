import { z } from 'zod'
import {
  uuidSchema,
  requiredString,
  phoneSchema
} from './common.js'
import { VALIDATION_LIMITS } from '@repo/shared/constants/billing'

// Tenant status enum validation
export const tenantStatusSchema = z.enum([
  'active',
  'inactive',
  'pending',
  'SUSPENDED',
  'DELETED'
])

// Base tenant input schema (matches database exactly)
export const tenantInputSchema = z.object({
  user_id: uuidSchema,

  date_of_birth: z.string().optional(),

  emergency_contact_name: z.string()
    .max(100, 'Emergency contact name cannot exceed 100 characters')
    .optional(),

  emergency_contact_phone: phoneSchema.optional(),

  emergency_contact_relationship: z.string()
    .max(50, 'Emergency contact relationship cannot exceed 50 characters')
    .optional(),

  identity_verified: z.boolean().optional(),

  ssn_last_four: z.string()
    .regex(/^\d{4}$/, 'SSN last four must be 4 digits')
    .optional(),

  stripe_customer_id: z.string()
    .min(1, 'Stripe customer ID is required')
    .max(255, 'Stripe customer ID is too long')
})

// Full tenant schema (includes server-generated fields)
export const tenantSchema = tenantInputSchema.extend({
  id: uuidSchema,
  created_at: z.string(),
  updated_at: z.string()
})

// Tenant update schema (partial input)
export const tenantUpdateSchema = tenantInputSchema.partial().extend({
  id: uuidSchema.optional()
})

// Tenant query schema (for search/filtering)
export const tenantQuerySchema = z.object({
  search: z.string().optional(),
  user_id: uuidSchema.optional(),
  identity_verified: z.boolean().optional(),
  created_after: z.string().optional(),
  created_before: z.string().optional(),
  sort_by: z.enum([
    'created_at',
    'user_id',
    'identity_verified'
  ]).optional(),
  sort_order: z.enum(['asc', 'desc']).optional().default('asc'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(VALIDATION_LIMITS.API_QUERY_MAX_LIMIT).default(20)
})

// Tenant creation schema
export const tenantCreateSchema = tenantInputSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  stripe_customer_id: true
}).extend({
  stripe_customer_id: z.string()
    .min(1, 'Stripe customer ID is required')
    .max(255, 'Stripe customer ID is too long')
})

// Aliases for request schemas (used in DTOs)
export const createTenantRequestSchema = tenantCreateSchema
export const updateTenantRequestSchema = tenantUpdateSchema

// Payment reminder schema
export const sendPaymentReminderSchema = z.object({
  tenant_id: uuidSchema,
  lease_id: uuidSchema.optional()
})

// Emergency contact validation schema
export const emergencyContactSchema = z.object({
  name: z.string()
    .min(1, 'Emergency contact name is required')
    .max(100, 'Emergency contact name cannot exceed 100 characters'),
  phone: phoneSchema,
  relationship: z.string()
    .min(1, 'Emergency contact relationship is required')
    .max(50, 'Emergency contact relationship cannot exceed 50 characters')
})

// Tenant verification schema
export const tenantVerificationSchema = z.object({
  identity_verified: z.boolean(),
  verification_date: z.string().optional()
})

// Export types
export type TenantInput = z.infer<typeof tenantInputSchema>
export type Tenant = z.infer<typeof tenantSchema>
export type TenantUpdate = z.infer<typeof tenantUpdateSchema>
export type TenantQuery = z.infer<typeof tenantQuerySchema>
export type TenantCreate = z.infer<typeof tenantCreateSchema>
export type EmergencyContact = z.infer<typeof emergencyContactSchema>
export type TenantVerification = z.infer<typeof tenantVerificationSchema>

// Frontend-specific form schemas
export const tenantFormSchema = z.object({
  user_id: requiredString,
  date_of_birth: z.string().optional(),
  emergency_contact_name: z.string().max(100).optional(),
  emergency_contact_phone: z.string().optional(),
  emergency_contact_relationship: z.string().max(50).optional(),
  identity_verified: z.boolean().optional(),
  ssn_last_four: z.string().regex(/^\d{4}$/).optional()
})

// Frontend-specific form schema for tenant updates (user_id not required)
export const tenantFormUpdateSchema = z.object({
  user_id: requiredString.optional().nullable(),
  date_of_birth: z.string().optional(),
  emergency_contact_name: z.string().max(100).optional(),
  emergency_contact_phone: z.string().optional(),
  emergency_contact_relationship: z.string().max(50).optional(),
  identity_verified: z.boolean().optional(),
  ssn_last_four: z.string().regex(/^\d{4}$/).optional()
})

// Transform functions for form data
export const transformTenantFormData = (data: TenantFormData) => ({
  user_id: data.user_id,
  date_of_birth: data.date_of_birth || undefined,
  emergency_contact_name: data.emergency_contact_name || undefined,
  emergency_contact_phone: data.emergency_contact_phone || undefined,
  emergency_contact_relationship: data.emergency_contact_relationship || undefined,
  identity_verified: data.identity_verified,
  ssn_last_four: data.ssn_last_four || undefined
})

export type TenantFormData = z.infer<typeof tenantFormSchema>
export type TransformedTenantData = ReturnType<typeof transformTenantFormData>

// ============================================================================
// TENANT INVITATION SCHEMAS (Separate from Lease)
// ============================================================================

// Invitation type enum
export const invitationTypeSchema = z.enum([
  'platform_access',  // Just inviting to create account on platform
  'lease_signing'     // Inviting to sign a specific lease
])

// Invitation status enum
export const invitationStatusSchema = z.enum([
  'pending',    // Created but not yet sent
  'sent',       // Email sent to tenant
  'accepted',   // Tenant accepted and created account
  'expired',    // Invitation expired
  'cancelled'   // Owner cancelled
])

// Schema for inviting a tenant to the platform (NO lease required)
// Flat structure - used for simple validation
export const inviteTenantSchema = z.object({
  email: z.string().email('Valid email is required'),
  first_name: z.string().trim().min(1, 'First name is required').max(100),
  last_name: z.string().trim().min(1, 'Last name is required').max(100),
  phone: phoneSchema.optional(),
  // Property is REQUIRED - can't invite tenant without a property
  property_id: uuidSchema,
  unit_id: uuidSchema.optional()
})

// Nested structure - matches backend DTO (InviteWithLeaseDto)
// Used for API requests
export const inviteTenantRequestSchema = z.object({
  tenantData: z.object({
    email: z.string().email('Valid email is required'),
    first_name: z.string().trim().min(1, 'First name is required').max(100),
    last_name: z.string().trim().min(1, 'Last name is required').max(100),
    phone: phoneSchema.optional()
  }),
  leaseData: z.object({
    // Property is REQUIRED - can't invite tenant without a property
    property_id: uuidSchema,
    unit_id: uuidSchema.optional()
  })
})

// Schema for inviting tenant to sign a specific lease
export const inviteToSignLeaseSchema = z.object({
  lease_id: uuidSchema,
  email: z.string().email('Valid email is required'),
  message: z.string().max(1000, 'Message cannot exceed 1000 characters').optional()
})

// Full invitation response schema
export const tenantInvitationSchema = z.object({
  id: uuidSchema,
  email: z.string().email(),
  property_owner_id: uuidSchema,
  unit_id: uuidSchema.nullable().optional(),
  property_id: uuidSchema.nullable().optional(),
  lease_id: uuidSchema.nullable().optional(),
  invitation_code: z.string(),
  invitation_url: z.string().url(),
  status: invitationStatusSchema,
  type: invitationTypeSchema,
  expires_at: z.string(),
  accepted_at: z.string().nullable().optional(),
  accepted_by_user_id: uuidSchema.nullable().optional(),
  created_at: z.string()
})

// Export invitation types
export type InvitationType = z.infer<typeof invitationTypeSchema>
export type InvitationStatus = z.infer<typeof invitationStatusSchema>
export type InviteTenant = z.infer<typeof inviteTenantSchema>
export type InviteTenantRequest = z.infer<typeof inviteTenantRequestSchema>
export type InviteToSignLease = z.infer<typeof inviteToSignLeaseSchema>
export type TenantInvitation = z.infer<typeof tenantInvitationSchema>
