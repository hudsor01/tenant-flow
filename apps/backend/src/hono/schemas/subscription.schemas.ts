import { z } from 'zod'

// Subscription schemas
export const createCheckoutSessionSchema = z.object({
  priceId: z.string().min(1, 'Price ID is required'),
  successUrl: z.string().url(),
  cancelUrl: z.string().url()
})

export const createPortalSessionSchema = z.object({
  returnUrl: z.string().url()
})

export const updateSubscriptionSchema = z.object({
  subscriptionId: z.string().min(1, 'Subscription ID is required'),
  priceId: z.string().min(1, 'Price ID is required')
})

export const cancelSubscriptionSchema = z.object({
  subscriptionId: z.string().min(1, 'Subscription ID is required'),
  reason: z.string().optional(),
  feedback: z.string().optional()
})

// Billing portal session schema
export const createBillingPortalSessionSchema = z.object({
  returnUrl: z.string().url()
})

// Payment method schemas
export const createPaymentMethodSchema = z.object({
  paymentMethodId: z.string().min(1, 'Payment method ID is required')
})

export const updatePaymentMethodSchema = z.object({
  paymentMethodId: z.string().min(1, 'Payment method ID is required')
})