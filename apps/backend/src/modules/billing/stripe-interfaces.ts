/**
 * Minimal Request Interfaces
 * Only for request validation - use native Stripe types for responses
 */

import type Stripe from 'stripe'

// Type helper for Invoice with subscription field
// The subscription field exists but may be null for one-off invoices
export interface InvoiceWithSubscription extends Stripe.Invoice {
	subscription?: string | Stripe.Subscription | null
}

// Type helper for Subscription with period fields
// These fields exist in the API but TypeScript doesn't recognize them
export interface SubscriptionWithPeriod extends Stripe.Subscription {
	current_period_end?: number
	current_period_start?: number
}

export interface CreatePaymentIntentRequest {
	amount: Stripe.PaymentIntentCreateParams['amount']
	currency?: Stripe.PaymentIntentCreateParams['currency']
	tenantId: string
	propertyId?: string
	subscriptionType?: string
}

export interface CreateSetupIntentRequest {
	tenantId: string
	customerId?: string
	customerEmail?: string
	customerName?: string
}

export type {
	CreateCheckoutSessionRequest,
	CreateConnectedPaymentRequest,
	CreateSubscriptionRequest
} from '@repo/shared/types/core'

// Keep smaller local interfaces that are backend-specific
export interface EmbeddedCheckoutRequest {
	priceId?: string // Required for payment/subscription, not needed for setup
	domain: string
	mode: 'payment' | 'subscription' | 'setup' // Required - no default
}

export interface CreateBillingPortalRequest {
	customerId: string
	returnUrl: string
}

export interface VerifyCheckoutSessionRequest {
	sessionId: string
}
