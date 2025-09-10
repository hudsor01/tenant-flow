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

export interface CreateSubscriptionRequest {
  customerId: string
  tenantId: string
  amount: number
  productId: string
  subscriptionType?: string
}

export interface CreateCheckoutSessionRequest {
  productName: string
  amount: number
  tenantId: string
  domain: string
  description?: string
  isSubscription?: boolean
}

export interface CreateBillingPortalRequest {
  customerId: string
  returnUrl: string
}

export interface CreateConnectedPaymentRequest {
  amount: number
  tenantId: string
  connectedAccountId: string
  platformFee?: number
  propertyOwnerAccount?: string
  propertyId?: string
}

export interface VerifyCheckoutSessionRequest {
  sessionId: string
}

// Use Stripe.StripeError directly instead of custom interface