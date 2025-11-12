/**
 * Rent Payment Validation Schemas
 * Used for validating rent payment, autopay, and subscription operations
 */

import { z } from 'zod'
import { uuidSchema } from './common'

// ============================================================================
// RENT PAYMENT SCHEMAS
// ============================================================================

/**
 * Schema for creating a one-time rent payment
 * SECURITY: Validates all required fields with strict types
 */
export const createRentPaymentSchema = z.object({
	tenantId: uuidSchema.describe('Tenant ID (UUID)'),
	leaseId: uuidSchema.describe('Lease ID (UUID)'),
	amount: z
		.number()
		.int('Amount must be an integer (cents)')
		.positive('Amount must be positive')
		.max(100_000_00, 'Amount cannot exceed $100,000')
		.describe('Payment amount in cents'),
	paymentMethodId: z
		.string()
		.min(1, 'Payment method ID is required')
		.regex(/^pm_[a-zA-Z0-9]+$/, 'Invalid Stripe payment method ID format')
		.describe('Stripe payment method ID')
})

/**
 * Schema for setting up autopay (recurring rent subscription)
 * SECURITY: Validates required fields, payment method optional
 */
export const setupAutopaySchema = z.object({
	tenantId: uuidSchema.describe('Tenant ID (UUID)'),
	leaseId: uuidSchema.describe('Lease ID (UUID)'),
	paymentMethodId: z
		.string()
		.min(1, 'Payment method ID is required')
		.regex(/^pm_[a-zA-Z0-9]+$/, 'Invalid Stripe payment method ID format')
		.optional()
		.describe('Optional Stripe payment method ID')
})

/**
 * Schema for canceling autopay
 * SECURITY: Validates required tenant and lease identifiers
 */
export const cancelAutopaySchema = z.object({
	tenantId: uuidSchema.describe('Tenant ID (UUID)'),
	leaseId: uuidSchema.describe('Lease ID (UUID)')
})

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CreateRentPaymentInput = z.infer<typeof createRentPaymentSchema>
export type SetupAutopayInput = z.infer<typeof setupAutopaySchema>
export type CancelAutopayInput = z.infer<typeof cancelAutopaySchema>
