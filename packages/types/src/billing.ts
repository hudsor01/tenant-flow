/**
 * Billing and subscription management types
 * All types related to subscriptions, plans, invoices, and billing
 */

// Plan type enum - 4-tier system
export type PlanType = 
  | 'FREE'
  | 'STARTER'
  | 'GROWTH'
  | 'ENTERPRISE'

export const PLAN_TYPE = {
  FREE: 'FREE',
  STARTER: 'STARTER',
  GROWTH: 'GROWTH',
  ENTERPRISE: 'ENTERPRISE'
} as const

export const PLAN_TYPE_OPTIONS = Object.values(PLAN_TYPE)

// Subscription status enum
export type SubStatus = 
  | 'ACTIVE'
  | 'CANCELLED'
  | 'PAST_DUE'
  | 'UNPAID'
  | 'INCOMPLETE'
  | 'INCOMPLETE_EXPIRED'
  | 'TRIALING'
  | 'PAUSED'

export const SUB_STATUS = {
  ACTIVE: 'ACTIVE',
  CANCELLED: 'CANCELLED',
  PAST_DUE: 'PAST_DUE',
  UNPAID: 'UNPAID',
  INCOMPLETE: 'INCOMPLETE',
  INCOMPLETE_EXPIRED: 'INCOMPLETE_EXPIRED',
  TRIALING: 'TRIALING',
  PAUSED: 'PAUSED'
} as const

export const SUB_STATUS_OPTIONS = Object.values(SUB_STATUS)

// Plan display helpers
export const getPlanTypeLabel = (plan: PlanType): string => {
  const labels: Record<PlanType, string> = {
    FREE: 'Free Trial',
    STARTER: 'Starter',
    GROWTH: 'Growth',
    ENTERPRISE: 'Enterprise'
  }
  return labels[plan] || plan
}

// Subscription entity types
export interface Subscription {
  id: string
  userId: string
  plan: string
  status: string
  startDate: Date
  endDate: Date | null
  cancelledAt: Date | null
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  stripePriceId: string | null
  planId: string | null
  billingPeriod: string | null
  currentPeriodStart: Date | null
  currentPeriodEnd: Date | null
  trialStart: Date | null
  trialEnd: Date | null
  cancelAtPeriodEnd: boolean | null
  canceledAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface Invoice {
  id: string
  userId: string
  subscriptionId: string | null
  stripeInvoiceId: string
  amountPaid: number
  amountDue: number
  currency: string
  status: string
  invoiceDate: Date
  dueDate: Date | null
  paidAt: Date | null
  invoiceUrl: string | null
  invoicePdf: string | null
  description: string | null
  createdAt: Date
  updatedAt: Date
}

// Stripe configuration types - 4-tier system
export interface StripePricing {
  id: string
  priceFree: string
  priceStarter: string
  priceGrowth: string
  priceEnterprise: string
  productFree: string
  productStarter: string
  productGrowth: string
  productEnterprise: string
  pricingTableId: string
  customerPortalUrl: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface WebhookEvent {
  id: string
  stripeEventId: string
  eventType: string
  processed: boolean
  processingTime: number | null
  errorMessage: string | null
  retryCount: number
  createdAt: Date
  updatedAt: Date
}

// Plan interface - 4-tier system
export interface Plan {
  id: PlanType
  name: string
  description?: string
  price: number
  propertyLimit: number
  tenantLimit?: number
  stripePriceId?: string
  features?: string[]
}

// Simple usage metrics interface
export interface UsageMetrics {
  properties: number
  tenants?: number
}

// Billing history interface
export interface BillingHistory {
  invoices: Invoice[]
  totalSpent: number
  currentBalance: number
}

// Subscription create request/response types
export interface SubscriptionCreateRequest {
  planId: PlanType
  paymentMethodId?: string
}

export interface SubscriptionCreateResponse {
  subscription: Subscription
  clientSecret?: string
  requiresPaymentMethod: boolean
}

// Customer portal types
export interface CustomerPortalRequest {
  returnUrl?: string
}

export interface CustomerPortalResponse {
  url: string
}

// Stripe error handling types
export type StripeErrorType = 
  | 'StripeCardError'
  | 'StripeRateLimitError'
  | 'StripeInvalidRequestError'
  | 'StripeAPIError'
  | 'StripeConnectionError'
  | 'StripeAuthenticationError'

export interface StripeWebhookError {
  type: StripeErrorType
  message: string
  stack?: string
}