/**
 * Minimal Request Interfaces
 * Only for request validation - use native Stripe types for responses
 */

export interface CreatePaymentIntentRequest {
	amount: number
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

// Import large interfaces from shared types
export type {
	CreateCheckoutSessionRequest,
	CreateConnectedPaymentRequest,
	CreateSubscriptionRequest
} from '@repo/shared'

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

// Use Stripe.StripeError directly instead of custom interface
