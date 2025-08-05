/**
 * Stripe Pricing Component Types
 * Based on official Stripe documentation and best practices
 */

// Stripe Error Types (Official Stripe error structure)
export interface StripeError {
  type: 'card_error' | 'rate_limit_error' | 'invalid_request_error' | 'api_error' | 'api_connection_error' | 'authentication_error' | 'idempotency_error'
  code?: string
  message: string
  decline_code?: string
}

// Pricing Plan Configuration
export interface PricingPlan {
  id: string
  name: string
  description: string
  prices: {
    monthly: number // Price in cents
    yearly: number  // Price in cents
  }
  features: string[]
  recommended: boolean
  stripePriceIds: {
    monthly: string
    yearly: string
  }
  lookupKeys: {
    monthly: string
    yearly: string
  }
  limits: {
    properties: number | null // null = unlimited
    tenants: number | null
    storage: number | null // in GB
  }
  cta: string // Call to action text
}

// Billing Interval
export type BillingInterval = 'monthly' | 'yearly'

// Checkout Session Request
export interface CreateCheckoutSessionRequest {
  priceId?: string
  lookupKey?: string
  billingInterval: BillingInterval
  customerId?: string
  customerEmail?: string
  successUrl?: string
  cancelUrl?: string
  mode?: 'payment' | 'subscription' | 'setup'
  allowPromotionCodes?: boolean
  metadata?: Record<string, string>
}

// Checkout Session Response
export interface CreateCheckoutSessionResponse {
  url: string
  sessionId: string
}

// Customer Portal Request
export interface CreatePortalSessionRequest {
  customerId: string
  returnUrl?: string
}

// Customer Portal Response
export interface CreatePortalSessionResponse {
  url: string
}

// Subscription Status
export type SubscriptionStatus = 
  | 'incomplete'
  | 'incomplete_expired'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'paused'

// User Subscription Info
export interface UserSubscription {
  id: string
  customerId: string
  subscriptionId: string
  planId: string
  status: SubscriptionStatus
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
  trialStart?: Date
  trialEnd?: Date
  billingInterval: BillingInterval
}

// Pricing Component Props
export interface PricingComponentProps {
  currentPlan?: string
  customerId?: string
  customerEmail?: string
  onPlanSelect?: (plan: PricingPlan, billingInterval: BillingInterval) => void
  onError?: (error: StripeError) => void
  className?: string
}

// Pricing Card Props
export interface PricingCardProps {
  plan: PricingPlan
  billingInterval: BillingInterval
  isCurrentPlan?: boolean
  loading?: boolean
  onSubscribe: () => void
  className?: string
}

// Price Display Utility
export const formatPrice = (priceInCents: number, currency = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(priceInCents / 100)
}

// Calculate yearly savings
export const calculateYearlySavings = (monthlyPrice: number, yearlyPrice: number): number => {
  const yearlyMonthlyEquivalent = monthlyPrice * 12
  const savings = yearlyMonthlyEquivalent - yearlyPrice
  return Math.round((savings / yearlyMonthlyEquivalent) * 100)
}

// Stripe error handling utility
export const getStripeErrorMessage = (error: StripeError): string => {
  switch (error.code) {
    case 'card_declined':
      return 'Your card was declined. Please try a different payment method.'
    case 'expired_card':
      return 'Your card has expired. Please use a different card.'
    case 'insufficient_funds':
      return 'Your card has insufficient funds. Please use a different card.'
    case 'incorrect_cvc':
      return 'Your card\'s security code is incorrect. Please try again.'
    case 'processing_error':
      return 'An error occurred while processing your card. Please try again.'
    case 'rate_limit_error':
      return 'Too many requests made too quickly. Please wait a moment and try again.'
    default:
      return error.message || 'An unexpected error occurred. Please try again.'
  }
}

// Plan data validation
export const validatePricingPlan = (plan: PricingPlan): boolean => {
  return !!(
    plan.id &&
    plan.name &&
    plan.description &&
    plan.prices.monthly >= 0 &&
    plan.prices.yearly >= 0 &&
    Array.isArray(plan.features) &&
    plan.stripePriceIds.monthly &&
    plan.stripePriceIds.yearly &&
    plan.lookupKeys.monthly &&
    plan.lookupKeys.yearly
  )
}