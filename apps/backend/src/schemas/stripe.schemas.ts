/**
 * Stripe/Billing Schemas
 *
 * Zod schema definitions for Stripe and billing endpoints.
 * Ultra-native approach per CLAUDE.md - no class-validator DTOs.
 */

import { z } from 'zod'

// Plan ID enum schema based on shared types
const planIdSchema = z.enum(['STARTER', 'GROWTH', 'TENANTFLOW_MAX'])

// Billing interval schema
const billingIntervalSchema = z.enum(['monthly', 'annual'])

/**
 * Create checkout session request
 */
export const createCheckoutSchema = z.object({
	planId: planIdSchema,
	interval: billingIntervalSchema,
	successUrl: z.string().url().optional(),
	cancelUrl: z.string().url().optional()
})

export type CreateCheckoutRequest = z.infer<typeof createCheckoutSchema>

/**
 * Create embedded checkout session request
 */
export const createEmbeddedCheckoutSchema = z.object({
	priceId: z.string().regex(/^price_[a-zA-Z0-9_]+$/),
	quantity: z.number().int().min(1).max(1000).default(1).optional(),
	customerId: z.string().regex(/^cus_[a-zA-Z0-9_]+$/).optional(),
	trialPeriodDays: z.number().int().min(0).max(365).optional(),
	couponId: z.string().regex(/^[a-zA-Z0-9_-]+$/).optional(),
	metadata: z.record(z.string(), z.string()).optional()
})

export type CreateEmbeddedCheckoutRequest = z.infer<typeof createEmbeddedCheckoutSchema>

/**
 * Create customer portal session request
 */
export const createPortalSchema = z.object({
	returnUrl: z.string().url().optional()
})

export type CreatePortalRequest = z.infer<typeof createPortalSchema>

/**
 * Checkout session response
 */
export const checkoutResponseSchema = z.object({
	sessionId: z.string().regex(/^cs_[a-zA-Z0-9_]+$/),
	url: z.string().url().optional(),
	clientSecret: z.string().optional()
})

export type CheckoutResponse = z.infer<typeof checkoutResponseSchema>

/**
 * Customer portal response
 */
export const portalResponseSchema = z.object({
	url: z.string().url()
})

export type PortalResponse = z.infer<typeof portalResponseSchema>

/**
 * Webhook event schema for Stripe webhooks
 */
export const stripeWebhookEventSchema = z.object({
	id: z.string().regex(/^evt_[a-zA-Z0-9_]+$/),
	object: z.literal('event'),
	type: z.string(),
	created: z.number(),
	data: z.object({
		object: z.record(z.string(), z.unknown()),
		previous_attributes: z.record(z.string(), z.unknown()).optional()
	}),
	livemode: z.boolean(),
	pending_webhooks: z.number(),
	request: z.object({
		id: z.string().nullable(),
		idempotency_key: z.string().nullable()
	})
})

export type StripeWebhookEvent = z.infer<typeof stripeWebhookEventSchema>