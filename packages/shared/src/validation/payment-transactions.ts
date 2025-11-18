import { z } from 'zod'
import {
  uuidSchema,
  requiredString,
  positiveNumberSchema,
  nonNegativeNumberSchema
} from './common.js'
import { VALIDATION_LIMITS } from '@repo/shared/constants/billing'

// Payment transaction status enum validation
export const paymentTransactionStatusSchema = z.enum([
  'pending',
  'processing',
  'succeeded',
  'failed',
  'canceled',
  'refunded',
  'partially_refunded'
])

// Payment method type enum validation
export const paymentMethodTypeSchema = z.enum([
  'card',
  'bank_account',
  'paypal',
  'ach',
  'other'
])

// Base payment transaction input schema (matches database exactly)
export const paymentTransactionInputSchema = z.object({
  rent_payment_id: uuidSchema,
  amount: positiveNumberSchema
    .max(VALIDATION_LIMITS.RENT_MAXIMUM_VALUE, 'Transaction amount seems unrealistic'),

  status: paymentTransactionStatusSchema,

  stripe_payment_intent_id: z.string()
    .min(1, 'Stripe payment intent ID is required')
    .max(255, 'Stripe payment intent ID is too long'),

  payment_method_id: uuidSchema.optional(),

  attempted_at: z.string().optional(),
  last_attempted_at: z.string().optional(),

  failure_reason: z.string()
    .max(500, 'Failure reason cannot exceed 500 characters')
    .optional(),

  retry_count: z.number()
    .int('Retry count must be a whole number')
    .min(0, 'Retry count cannot be negative')
    .max(10, 'Retry count cannot exceed 10 attempts')
    .default(0)
})

// Full payment transaction schema (includes server-generated fields)
export const paymentTransactionSchema = paymentTransactionInputSchema.extend({
  id: uuidSchema,
  created_at: z.string(),
  updated_at: z.string()
})

// Payment transaction update schema (partial input)
export const paymentTransactionUpdateSchema = paymentTransactionInputSchema.partial().extend({
  id: uuidSchema.optional(),
  status: paymentTransactionStatusSchema.optional(),
  failure_reason: z.string().max(500, 'Failure reason cannot exceed 500 characters').optional(),
  retry_count: z.number().int().min(0).max(10).optional()
})

// Payment transaction query schema (for search/filtering)
export const paymentTransactionQuerySchema = z.object({
  search: z.string().optional(),
  rent_payment_id: uuidSchema.optional(),
  payment_method_id: uuidSchema.optional(),
  status: paymentTransactionStatusSchema.optional(),
  min_amount: nonNegativeNumberSchema.optional(),
  max_amount: nonNegativeNumberSchema.optional(),
  created_after: z.string().optional(),
  created_before: z.string().optional(),
  attempted_after: z.string().optional(),
  attempted_before: z.string().optional(),
  has_failure: z.boolean().optional(),
  sort_by: z.enum([
    'created_at',
    'amount',
    'status',
    'attempted_at'
  ]).optional(),
  sort_order: z.enum(['asc', 'desc']).optional().default('asc'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(VALIDATION_LIMITS.API_QUERY_MAX_LIMIT).default(20)
})

// Payment transaction creation schema
export const paymentTransactionCreateSchema = paymentTransactionInputSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  attempted_at: true,
  last_attempted_at: true,
  retry_count: true
}).extend({
  status: paymentTransactionStatusSchema.default('pending'),
  retry_count: z.number().int().min(0).max(10).default(0)
})

// Payment transaction retry schema
export const paymentTransactionRetrySchema = z.object({
  max_attempts: z.number()
    .int('Max attempts must be a whole number')
    .min(1, 'Max attempts must be at least 1')
    .max(5, 'Max attempts cannot exceed 5'),
  reason: z.string()
    .max(500, 'Retry reason cannot exceed 500 characters')
    .optional()
})

// Payment transaction refund schema
export const paymentTransactionRefundSchema = z.object({
  amount: positiveNumberSchema
    .max(VALIDATION_LIMITS.RENT_MAXIMUM_VALUE, 'Refund amount seems unrealistic'),
  reason: z.string()
    .max(500, 'Refund reason cannot exceed 500 characters')
    .optional(),
  refund_reason: z.string()
    .max(500, 'Refund reason cannot exceed 50 characters')
    .optional()
})

// Payment transaction webhook schema (for Stripe webhook handling)
export const paymentTransactionWebhookSchema = z.object({
  stripe_event_id: z.string().min(1, 'Stripe event ID is required'),
  stripe_payment_intent_id: z.string().min(1, 'Stripe payment intent ID is required'),
  status: paymentTransactionStatusSchema,
  amount: positiveNumberSchema,
  failure_code: z.string().optional(),
  failure_message: z.string().optional(),
  payment_method_type: paymentMethodTypeSchema.optional()
})

// Export types
export type PaymentTransactionInput = z.infer<typeof paymentTransactionInputSchema>
export type PaymentTransaction = z.infer<typeof paymentTransactionSchema>
export type PaymentTransactionUpdate = z.infer<typeof paymentTransactionUpdateSchema>
export type PaymentTransactionQuery = z.infer<typeof paymentTransactionQuerySchema>
export type PaymentTransactionCreate = z.infer<typeof paymentTransactionCreateSchema>
export type PaymentTransactionRetry = z.infer<typeof paymentTransactionRetrySchema>
export type PaymentTransactionRefund = z.infer<typeof paymentTransactionRefundSchema>
export type PaymentTransactionWebhook = z.infer<typeof paymentTransactionWebhookSchema>

// Frontend-specific form schemas
export const paymentTransactionFormSchema = z.object({
  rent_payment_id: requiredString,
  amount: z.string().min(1, 'Amount is required'),
  stripe_payment_intent_id: requiredString,
  payment_method_id: z.string().optional(),
  status: paymentTransactionStatusSchema.optional()
})

// Transform functions for form data
export const transformPaymentTransactionFormData = (data: PaymentTransactionFormData) => ({
  rent_payment_id: data.rent_payment_id,
 amount: parseFloat(data.amount),
  stripe_payment_intent_id: data.stripe_payment_intent_id,
  payment_method_id: data.payment_method_id || undefined,
  status: data.status
})

export type PaymentTransactionFormData = z.infer<typeof paymentTransactionFormSchema>
export type TransformedPaymentTransactionData = ReturnType<typeof transformPaymentTransactionFormData>
