/**
 * Minimal Request Interfaces
 * Only for request validation - use native Stripe types for responses
 */

import type Stripe from 'stripe'
import type {
	CreateCheckoutSessionRequest as CreateCheckoutSessionRequestType,
	CreateConnectedPaymentRequest as CreateConnectedPaymentRequestType
} from '@repo/shared/types/core'
import type {
	UpdateSubscriptionRequest as UpdateSubscriptionRequestType,
	CreateSubscriptionRequest as CreateSubscriptionRequestType
} from '@repo/shared/types/api-contracts'

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
	tenant_id: string
	property_id?: string
	subscriptionType?: string
}

export interface CreatePaymentMethodRequest {
	tenant_id: string
	customerId?: string
	customerEmail?: string
	customerName?: string
	setAsDefault?: boolean
}

export interface CreateConfirmationTokenRequest {
	amount: number
	currency?: string
	tenant_id: string
	customerId?: string
	returnUrl?: string
}

export interface AttachPaymentMethodRequest {
	payment_method_id: string
	set_as_default?: boolean
}

export type CreateCheckoutSessionRequest = CreateCheckoutSessionRequestType
export type CreateConnectedPaymentRequest = CreateConnectedPaymentRequestType
export type UpdateSubscriptionRequest = UpdateSubscriptionRequestType
export type CreateSubscriptionRequest = CreateSubscriptionRequestType

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
