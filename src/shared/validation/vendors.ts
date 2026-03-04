/**
 * Vendor Validation Schemas
 *
 * Vendors represent contractors and service providers managed by property owners.
 * Used for maintenance request assignment and contractor relationship management.
 *
 * Schema Pattern (Zod 4):
 * - vendorCreateSchema: User-provided fields for creating a vendor
 * - vendorUpdateSchema: Partial create schema extended with status
 * - vendorSchema: Full schema including server-generated fields
 */

import { z } from 'zod'
import { uuidSchema, nonEmptyStringSchema, positiveNumberSchema } from './common.js'

// Valid contractor trade specializations
export const vendorTradeSchema = z.enum([
  'plumbing',
  'electrical',
  'hvac',
  'carpentry',
  'painting',
  'landscaping',
  'appliance',
  'general',
  'other',
])

// Vendor lifecycle status
export const vendorStatusSchema = z.enum(['active', 'inactive'])

// Schema for creating a new vendor (user-provided fields only)
export const vendorCreateSchema = z.object({
  name: nonEmptyStringSchema.max(100, 'Name cannot exceed 100 characters'),
  email: z
    .string()
    .email('Invalid email')
    .optional()
    .or(z.literal(''))
    .transform(v => v || undefined),
  phone: z.string().max(20).optional(),
  trade: vendorTradeSchema,
  hourly_rate: positiveNumberSchema.optional(),
  notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional(),
})

// Schema for updating an existing vendor (all fields optional, status included)
export const vendorUpdateSchema = vendorCreateSchema.partial().extend({
  status: vendorStatusSchema.optional(),
})

// Full vendor schema including server-generated fields
export const vendorSchema = vendorCreateSchema.extend({
  id: uuidSchema,
  owner_user_id: uuidSchema,
  status: vendorStatusSchema.default('active'),
  created_at: z.string(),
  updated_at: z.string(),
})

export type VendorCreate = z.infer<typeof vendorCreateSchema>
export type VendorUpdate = z.infer<typeof vendorUpdateSchema>
export type Vendor = z.infer<typeof vendorSchema>
export type VendorTrade = z.infer<typeof vendorTradeSchema>
export type VendorStatus = z.infer<typeof vendorStatusSchema>
