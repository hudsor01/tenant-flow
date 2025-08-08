/**
 * Stripe Pricing Component Types
 * Based on official Stripe documentation and best practices
 */

// Import types from consolidated stripe.ts
import type { StripeError, BillingPeriod } from './stripe'

// Import ProductTierConfig for modern pricing types
import type { ProductTierConfig } from '../types/billing'

// Use BillingPeriod from stripe.ts, but maintain backwards compatibility alias
export type BillingInterval = BillingPeriod

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


// Pricing Component Props
export interface PricingComponentProps {
  currentPlan?: string
  customerId?: string
  customerEmail?: string
  onPlanSelect?: (tier: ProductTierConfig, billingInterval: BillingInterval) => void
  onError?: (error: StripeError) => void
  className?: string
}

// Pricing Card Props
export interface PricingCardProps {
  tier: ProductTierConfig
  billingInterval: BillingInterval
  isCurrentPlan?: boolean
  loading?: boolean
  onSubscribe: () => void
  className?: string
}

// Price Display Utility
/**
 * @deprecated Use formatPriceFromCents from '@repo/shared/utils' instead
 */
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

// Tier data validation
export const validatePricingPlan = (tier: ProductTierConfig): boolean => {
  return !!(
    tier.id &&
    tier.name &&
    tier.description &&
    tier.price.monthly >= 0 &&
    tier.price.annual >= 0 &&
    Array.isArray(tier.features) &&
    (tier.stripePriceIds.monthly || tier.stripePriceIds.annual)
  )
}