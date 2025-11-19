import { z } from 'zod'
import {
  uuidSchema,
  requiredString,
  positiveNumberSchema,
  nonNegativeNumberSchema
} from './common.js'
import { VALIDATION_LIMITS } from '@repo/shared/constants/billing'

// Lease status enum validation
export const lease_statusSchema = z.enum([
  'draft',
  'pending',
  'active',
  'terminated',
  'expired',
  'completed'
])

// Lease payment day validation (1-31 for day of month)
export const paymentDaySchema = z.number()
  .int('Payment day must be a whole number')
  .min(1, 'Payment day must be between 1 and 31')
  .max(31, 'Payment day must be between 1 and 31')

// Base lease input schema (matches database exactly)
export const leaseInputSchema = z.object({
  unit_id: uuidSchema,
  primary_tenant_id: uuidSchema,

  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),

  rent_amount: positiveNumberSchema
    .max(VALIDATION_LIMITS.RENT_MAXIMUM_VALUE, 'Rent amount seems unrealistic'),

  rent_currency: z.string()
    .min(3, 'Currency code must be 3 characters')
    .max(3, 'Currency code must be 3 characters')
    .default('USD'),

  security_deposit: nonNegativeNumberSchema
    .max(VALIDATION_LIMITS.RENT_MAXIMUM_VALUE, 'Security deposit seems unrealistic'),

  payment_day: paymentDaySchema,

  grace_period_days: z.number()
    .int('Grace period must be a whole number')
    .min(0, 'Grace period cannot be negative')
    .max(30, 'Grace period cannot exceed 30 days')
    .optional(),

  late_fee_amount: nonNegativeNumberSchema
    .max(VALIDATION_LIMITS.RENT_MAXIMUM_VALUE, 'Late fee amount seems unrealistic')
    .optional(),

  late_fee_days: z.number()
    .int('Late fee days must be a whole number')
    .min(0, 'Late fee days cannot be negative')
    .max(30, 'Late fee days cannot exceed 30 days')
    .optional(),

  lease_status: lease_statusSchema.default('draft'),

  auto_pay_enabled: z.boolean().default(false),

  stripe_subscription_id: z.string().optional()
})

// Full lease schema (includes server-generated fields)
export const leaseSchema = leaseInputSchema.extend({
  id: uuidSchema,
  created_at: z.string(),
  updated_at: z.string()
})

// Lease update schema (partial input)
export const leaseUpdateSchema = leaseInputSchema.partial().extend({
  id: uuidSchema.optional(),
  lease_status: lease_statusSchema.optional()
})

// Lease query schema (for search/filtering)
export const leaseQuerySchema = z.object({
 search: z.string().optional(),
  unit_id: uuidSchema.optional(),
  primary_tenant_id: uuidSchema.optional(),
  lease_status: lease_statusSchema.optional(),
  start_after: z.string().optional(),
  start_before: z.string().optional(),
  end_after: z.string().optional(),
  end_before: z.string().optional(),
  min_rent: nonNegativeNumberSchema.optional(),
  max_rent: nonNegativeNumberSchema.optional(),
  has_auto_pay: z.boolean().optional(),
  sort_by: z.enum([
    'start_date',
    'end_date',
    'rent_amount',
    'created_at',
    'lease_status'
  ]).optional(),
  sort_order: z.enum(['asc', 'desc']).optional().default('asc'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(VALIDATION_LIMITS.API_QUERY_MAX_LIMIT).default(20)
})

// Lease creation schema (for API requests)
export const leaseCreateSchema = leaseInputSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  lease_status: true,
  stripe_subscription_id: true
}).extend({
  tenant_ids: z.array(uuidSchema).min(1, 'At least one tenant is required'),
  lease_status: lease_statusSchema.default('pending')
})

// Lease termination schema
export const leaseTerminationSchema = z.object({
  termination_date: z.string().min(1, 'Termination date is required'),
  termination_reason: z.string()
    .min(1, 'Termination reason is required')
    .max(500, 'Termination reason cannot exceed 500 characters'),
  final_inspection_date: z.string().optional(),
  final_inspection_notes: z.string().max(2000, 'Inspection notes cannot exceed 2000 characters').optional(),
  outstanding_amount: nonNegativeNumberSchema.default(0)
})

// Lease renewal schema
export const leaseRenewalSchema = z.object({
  new_end_date: z.string().min(1, 'New end date is required'),
  new_rent_amount: positiveNumberSchema
    .max(VALIDATION_LIMITS.RENT_MAXIMUM_VALUE, 'New rent amount seems unrealistic'),
  renewal_notes: z.string().max(2000, 'Renewal notes cannot exceed 200 characters').optional()
})

// Lease payment schedule schema
export const leasePaymentScheduleSchema = z.object({
  frequency: z.enum(['monthly', 'quarterly', 'annually']),
  next_payment_date: z.string().min(1, 'Next payment date is required'),
  is_active: z.boolean().default(true)
})

// Export types
export type LeaseInput = z.infer<typeof leaseInputSchema>
export type Lease = z.infer<typeof leaseSchema>
export type LeaseUpdate = z.infer<typeof leaseUpdateSchema>
export type LeaseQuery = z.infer<typeof leaseQuerySchema>
export type LeaseCreate = z.infer<typeof leaseCreateSchema>
export type LeaseTermination = z.infer<typeof leaseTerminationSchema>
export type LeaseRenewal = z.infer<typeof leaseRenewalSchema>
export type LeasePaymentSchedule = z.infer<typeof leasePaymentScheduleSchema>

// Frontend-specific form schemas
export const leaseFormSchema = z.object({
 unit_id: requiredString,
  primary_tenant_id: requiredString,
  start_date: requiredString,
  end_date: requiredString,
  rent_amount: z.string().min(1, 'Rent amount is required'),
  security_deposit: z.string().optional(),
  payment_day: z.string().min(1, 'Payment day is required'),
  grace_period_days: z.string().optional(),
  late_fee_amount: z.string().optional(),
  late_fee_days: z.string().optional(),
  auto_pay_enabled: z.boolean().optional().default(false)
})

export const leaseCreateFormSchema = leaseFormSchema.extend({
  tenant_ids: z.array(uuidSchema).min(1, 'At least one tenant is required')
})

// Transform functions for form data
export const transformLeaseFormData = (data: LeaseFormData) => ({
  unit_id: data.unit_id,
  primary_tenant_id: data.primary_tenant_id,
  start_date: data.start_date,
  end_date: data.end_date,
  rent_amount: parseFloat(data.rent_amount),
  security_deposit: data.security_deposit ? parseFloat(data.security_deposit) : 0,
  payment_day: parseInt(data.payment_day, 10),
  grace_period_days: data.grace_period_days ? parseInt(data.grace_period_days, 10) : undefined,
  late_fee_amount: data.late_fee_amount ? parseFloat(data.late_fee_amount) : undefined,
  late_fee_days: data.late_fee_days ? parseInt(data.late_fee_days, 10) : undefined,
  auto_pay_enabled: data.auto_pay_enabled || false
})

export type LeaseFormData = z.infer<typeof leaseFormSchema>
export type LeaseCreateFormData = z.infer<typeof leaseCreateFormSchema>
export type TransformedLeaseData = ReturnType<typeof transformLeaseFormData>
