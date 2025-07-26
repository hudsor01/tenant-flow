/**
 * Billing & Subscription Types
 * Centralized type definitions for billing, subscriptions, and Stripe integration
 */

// Plan type enum (matching Prisma schema)
export const PLAN_TYPE = {
  FREE: 'FREE',
  STARTER: 'STARTER',
  GROWTH: 'GROWTH',
  ENTERPRISE: 'ENTERPRISE'
} as const

export type PlanType = typeof PLAN_TYPE[keyof typeof PLAN_TYPE]

// Billing period enum
export const BILLING_PERIOD = {
  MONTHLY: 'MONTHLY',
  ANNUAL: 'ANNUAL'
} as const

export type BillingPeriod = typeof BILLING_PERIOD[keyof typeof BILLING_PERIOD]

// Subscription status enum
export const SUB_STATUS = {
  ACTIVE: 'ACTIVE',
  CANCELLED: 'CANCELLED',
  PAST_DUE: 'PAST_DUE',
  INCOMPLETE: 'INCOMPLETE',
  INCOMPLETE_EXPIRED: 'INCOMPLETE_EXPIRED',
  TRIALING: 'TRIALING',
  UNPAID: 'UNPAID'
} as const

export type SubStatus = typeof SUB_STATUS[keyof typeof SUB_STATUS]

// Core subscription interface
export interface Subscription {
  id: string
  userId: string
  planType: PlanType
  status: SubStatus
  billingPeriod: BillingPeriod
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
  stripeSubscriptionId: string | null
  stripeCustomerId: string | null
  stripePriceId: string | null
  createdAt: Date
  updatedAt: Date
}

// Plan interface
export interface Plan {
  id: PlanType
  name: string
  price: number
  propertyLimit: number
  stripePriceId: string | null
  stripeMonthlyPriceId: string | null
  stripeAnnualPriceId: string | null
}

// Usage metrics interface
export interface UsageMetrics {
  id: string
  userId: string
  properties: number
  units: number
  tenants: number
  storageUsed: number
  apiCalls: number
  period: Date
  createdAt: Date
}

// Billing history interface
export interface BillingHistory {
  id: string
  userId: string
  subscriptionId: string
  amount: number
  currency: string
  status: 'PAID' | 'PENDING' | 'FAILED'
  stripeInvoiceId: string | null
  billingDate: Date
  createdAt: Date
}

// Plan limits interface
export interface PlanLimits {
  properties: number
  units: number
  tenants: number
  storage: number
  apiCalls: number
}

// Subscription request/response types
export interface SubscriptionCreateRequest {
  planType: PlanType
  billingPeriod: BillingPeriod
  paymentMethodId?: string
}

export interface SubscriptionCreateResponse {
  subscription: Subscription
  clientSecret?: string
  requiresPaymentMethod: boolean
}

export interface CustomerPortalRequest {
  returnUrl: string
}

export interface CustomerPortalResponse {
  url: string
}

// Stripe-specific types
export interface CreateCheckoutSessionParams {
  priceId: string
  userId: string
  planType: PlanType
  billingInterval?: 'monthly' | 'annual'
  uiMode?: string
  successUrl?: string
  cancelUrl?: string
  collectPaymentMethod?: boolean
}

export interface CreatePortalSessionParams {
  customerId: string
  returnUrl: string
}

export interface SubscriptionData {
  id: string
  status: string
  current_period_start: number
  current_period_end: number
  cancel_at_period_end: boolean
}

export interface PreviewInvoiceParams {
  customerId: string
  priceId: string
  quantity?: number
}

export interface UpdateSubscriptionParams {
  subscriptionId: string
  priceId: string
  prorationBehavior?: 'create_prorations' | 'none'
}

// Webhook types
export interface WebhookEventHandler {
  [eventType: string]: (event: StripeWebhookEvent) => Promise<void>
}

export type WebhookEventType = string

export interface StripeWebhookEvent {
  id: string
  object: 'event'
  api_version: string
  created: number
  data: {
    object: Record<string, unknown>
    previous_attributes?: Record<string, unknown>
  }
  livemode: boolean
  pending_webhooks: number
  request: {
    id: string | null
    idempotency_key: string | null
  }
  type: string
}

// Stripe error constants
export const STRIPE_ERRORS = {
  CARD_DECLINED: 'card_declined',
  EXPIRED_CARD: 'expired_card',
  INSUFFICIENT_FUNDS: 'insufficient_funds',
  PROCESSING_ERROR: 'processing_error',
  CONFIGURATION_ERROR: 'configuration_error',
  SUBSCRIPTION_ERROR: 'subscription_error',
  WEBHOOK_ERROR: 'webhook_error',
  WEBHOOK_SIGNATURE_INVALID: 'webhook_signature_invalid',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  INVALID_REQUEST: 'invalid_request',
  API_CONNECTION_ERROR: 'api_connection_error',
  AUTHENTICATION_FAILED: 'authentication_failed'
} as const

export type StripeError = typeof STRIPE_ERRORS[keyof typeof STRIPE_ERRORS]

// Billing plan type
export type BillingPlan = {
	id: PlanType
	name: string
	price: number
	propertyLimit: number
	stripePriceId: string | null
	stripeMonthlyPriceId: string | null
	stripeAnnualPriceId: string | null
}

// Billing Plans Configuration
export const BILLING_PLANS: Record<PlanType, BillingPlan> = {
	[PLAN_TYPE.FREE]: {
		id: PLAN_TYPE.FREE,
		name: 'Free Trial',
		price: 0,
		propertyLimit: 2,
		stripePriceId: null, // Free trial uses Starter plan with trial period
		stripeMonthlyPriceId: null,
		stripeAnnualPriceId: null
	},
	[PLAN_TYPE.STARTER]: {
		id: PLAN_TYPE.STARTER,
		name: 'Starter',
		price: 19,
		propertyLimit: 10,
		stripePriceId: null,
		stripeMonthlyPriceId: null,
		stripeAnnualPriceId: null
	},
	[PLAN_TYPE.GROWTH]: {
		id: PLAN_TYPE.GROWTH,
		name: 'Growth',
		price: 49,
		propertyLimit: 50,
		stripePriceId: null,
		stripeMonthlyPriceId: null,
		stripeAnnualPriceId: null
	},
	[PLAN_TYPE.ENTERPRISE]: {
		id: PLAN_TYPE.ENTERPRISE,
		name: 'Enterprise',
		price: 149,
		propertyLimit: -1, // unlimited
		stripePriceId: null,
		stripeMonthlyPriceId: null,
		stripeAnnualPriceId: null
	}
}

// Helper functions for billing plans
export function getPlanById(planId: string): BillingPlan | undefined {
	// Use Object.values to find the plan safely
	switch (planId) {
		case PLAN_TYPE.FREE:
			return BILLING_PLANS[PLAN_TYPE.FREE]
		case PLAN_TYPE.STARTER:
			return BILLING_PLANS[PLAN_TYPE.STARTER]
		case PLAN_TYPE.GROWTH:
			return BILLING_PLANS[PLAN_TYPE.GROWTH]
		case PLAN_TYPE.ENTERPRISE:
			return BILLING_PLANS[PLAN_TYPE.ENTERPRISE]
		default:
			return undefined
	}
}

export function getPriceId(planId: string): string | undefined {
	const plan = getPlanById(planId)
	return plan?.stripePriceId ?? undefined
}