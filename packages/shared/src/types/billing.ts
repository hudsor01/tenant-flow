/**
 * BILLING TYPES - All Stripe and subscription-related interfaces
 * CONSOLIDATED from 20+ scattered billing/Stripe definitions
 */

// =============================================================================
// SUBSCRIPTION TYPES - CONSOLIDATED duplicates
// =============================================================================

export interface Subscription {
  id: string
  user_id: string
  stripe_subscription_id: string
  stripe_customer_id: string
  status: SubscriptionStatus
  plan_id: string
  current_period_start: string
  current_period_end: string
  trial_end?: string
  created_at: string
  updated_at: string
}

// CONSOLIDATED from multiple files that defined variations
export type SubscriptionStatus = 
  | 'active' 
  | 'canceled' 
  | 'incomplete' 
  | 'incomplete_expired' 
  | 'past_due' 
  | 'trialing' 
  | 'unpaid'

export type BillingInterval = 'month' | 'year'

// =============================================================================
// USER FORM DATA - CONSOLIDATED from frontend Stripe forms  
// =============================================================================

export interface UserFormData {
	fullName: string
	email: string
	password: string
}

// =============================================================================
// STRIPE ELEMENTS & PROVIDER TYPES - CONSOLIDATED from frontend
// Note: EnhancedElementsProviderProps moved to ui.ts due to React dependency
// =============================================================================

// =============================================================================
// STRIPE WEBHOOK TYPES - CONSOLIDATED from frontend webhook processors
// =============================================================================

// Consolidate webhook event types - COMPREHENSIVE from all webhook files
export type StripeWebhookEventType =
	| 'customer.subscription.created'
	| 'customer.subscription.updated'
	| 'customer.subscription.deleted'
	| 'invoice.payment_succeeded'
	| 'invoice.payment_failed'
	| 'payment_intent.succeeded'
	| 'payment_intent.payment_failed'
	| 'customer.updated'
	| 'payment_method.attached'
	| 'payment_method.detached'

export interface WebhookNotification {
	id: string
	type: 'success' | 'error' | 'info' | 'warning'
	title: string
	message: string
	timestamp: Date
	metadata?: Record<string, unknown>
}

export interface WebhookProcessorFunction {
event: StripeWebhookEventType
processor: (event: unknown) => Promise<WebhookNotification[]>
}

export interface WebhookProcessor {
	processWebhook(event: StripeWebhookEventType, data: unknown): Promise<void>
	validateWebhook(body: string, signature: string): boolean
}

// =============================================================================
// STRIPE TYPES - CONSOLIDATED from backend schemas
// =============================================================================

export interface CreateCheckoutRequest {
  priceId: string
  successUrl: string
  cancelUrl: string
  customerEmail?: string
}

export interface CreateEmbeddedCheckoutRequest {
  priceId: string
  returnUrl: string
  customerEmail?: string
}

export interface CreatePortalRequest {
  returnUrl: string
}

export interface CheckoutResponse {
  sessionId?: string
  clientSecret?: string
  url?: string
}

export interface PortalResponse {
  url: string
}

export interface SubscriptionStatusResponse {
  status: SubscriptionStatus
  currentPeriodEnd: string
  trialEnd?: string
  plan: {
    id: string
    name: string
    price: number
    interval: BillingInterval
  }
}

/* =============================================================================
   STRIPE WEBHOOK EVENTS (from backend) - use canonical type from stripe.ts
   ============================================================================= */
import type { StripeWebhookEvent as CoreStripeWebhookEvent } from './stripe'
export type StripeWebhookEvent = CoreStripeWebhookEvent

export type StripeErrorType = 
  | 'card_error'
  | 'invalid_request_error'  
  | 'api_error'
  | 'authentication_error'
  | 'rate_limit_error'

// =============================================================================
// PAYMENT TYPES
// =============================================================================

export interface PaymentMethod {
  id: string
  type: 'card'
  card?: {
    brand: string
    last4: string
    exp_month: number
    exp_year: number
  }
}

export interface Invoice {
  id: string
  amount_due: number
  amount_paid: number
  currency: string
  status: InvoiceStatus
  created: number
  due_date?: number
  hosted_invoice_url?: string
  invoice_pdf?: string
}

export type InvoiceStatus = 
  | 'draft'
  | 'open' 
  | 'paid'
  | 'uncollectible'
  | 'void'

// =============================================================================
// BILLING PLAN TYPES
// =============================================================================

export interface BillingPlan {
  id: string
  name: string
  description: string
  price: number
  interval: BillingInterval
  features: string[]
  limits: {
    properties: number
    units: number
    tenants: number
    storage: string
  }
  stripePriceId: string
  popular?: boolean
}

export interface PlanWithUIMapping extends BillingPlan {
  buttonText: string
  ctaVariant: 'primary' | 'secondary'
  badge?: string
}

// =============================================================================
// USAGE & LIMITS
// =============================================================================

export interface UsageLimits {
  properties: { used: number; limit: number }
  units: { used: number; limit: number }
  tenants: { used: number; limit: number }
  storage: { used: number; limit: string }
}

export interface BillingUsage {
  period: {
    start: string
    end: string
  }
  limits: UsageLimits
  overages: {
    properties: number
    units: number
    tenants: number
  }
}

// =============================================================================
// EMAIL TYPES - CONSOLIDATED from email templates
// =============================================================================

export interface PaymentSuccessEmailProps {
  customerName: string
  amount: number
  currency: string
  invoiceUrl: string
  planName: string
}

export interface PaymentFailedEmailProps {
  customerName: string
  amount: number
  currency: string
  retryUrl: string
  updatePaymentUrl: string
}

export interface SubscriptionCanceledEmailProps {
  customerName: string
  planName: string
  endDate: string
  reactivateUrl: string
}

// =============================================================================
// LEGACY TYPE ALIASES - For backward compatibility during migration
// =============================================================================

export type Plan = BillingPlan
export type SubStatus = SubscriptionStatus
export type SubscriptionCreateRequest = CreateCheckoutRequest
export type SubscriptionCreateResponse = CheckoutResponse

// Legacy interfaces for extended billing - keeping during transition
export interface UpdateSubscriptionParams {
  subscriptionId: string
  priceId?: string
  quantity?: number
}

export interface SubscriptionSyncResult {
  success: boolean
  subscription?: Subscription
  error?: string
}

// Missing types referenced in billing-extended.ts
export interface UsageMetricsExtended {
  period: string
  usage: number
  limit: number
  percentage: number
}

export interface BillingHistoryEvent {
  id: string
  type: 'payment' | 'subscription_change' | 'invoice'
  date: string
  description: string
  amount?: number
}

// =============================================================================
// PAYMENT NOTIFICATIONS - CONSOLIDATED from backend services
// =============================================================================

export interface PaymentNotificationData {
userId: string
subscriptionId: string
amount: number
currency: string
status: 'succeeded' | 'failed' | 'canceled'
attemptCount?: number
failureReason?: string
invoiceUrl?: string | null
invoicePdf?: string | null
cancelAtPeriodEnd?: boolean
currentPeriodEnd?: Date
}

export interface AuthenticatedUser {
	id: string
	email: string
}

// =============================================================================
// WEBHOOK MINIMAL TYPES - CONSOLIDATED from backend webhook controller
// =============================================================================

export interface MinimalInvoice {
	currency: string
	amount_due?: number
	amount_paid?: number
	customer: string | { id: string }
}

export interface MinimalSubscription {
	id: string
	customer: string | { id: string }
}

// =============================================================================
// ADDITIONAL BILLING TYPES - MIGRATED from inline definitions
// =============================================================================

export interface CreateSubscriptionDto {
	priceId: string
	customerId?: string
	trialDays?: number
}

export interface BillingFormState {
	success: boolean
	error?: string
	message?: string
}

export interface StripeInvoiceWithSubscription {
	id: string
	subscription?: MinimalSubscription
	customer: string | { id: string }
	amount_due: number
	amount_paid: number
	currency: string
	status: InvoiceStatus
}

export interface StripeSubscriptionWithPeriods {
	id: string
	customer: string | { id: string }
	current_period_start: number
	current_period_end: number
	trial_start?: number
	trial_end?: number
	status: SubscriptionStatus
}

// =============================================================================
// SUBSCRIPTION EVENTS - MIGRATED from backend subscription.events.ts
// =============================================================================

export enum SubscriptionEventType {
	SUBSCRIPTION_CREATED = 'subscription.created',
	SUBSCRIPTION_UPDATED = 'subscription.updated', 
	SUBSCRIPTION_CANCELED = 'subscription.canceled',
	TRIAL_WILL_END = 'subscription.trial_will_end',
	PAYMENT_FAILED = 'invoice.payment_failed',
	PAYMENT_SUCCEEDED = 'invoice.payment_succeeded'
}

export interface BaseSubscriptionEvent {
	eventType: SubscriptionEventType
	userId: string
	subscriptionId: string
	timestamp: Date
}

export interface SubscriptionCreatedEvent extends BaseSubscriptionEvent {
	eventType: SubscriptionEventType.SUBSCRIPTION_CREATED
	planId: string
	trialEnd?: Date
}

export interface SubscriptionUpdatedEvent extends BaseSubscriptionEvent {
	eventType: SubscriptionEventType.SUBSCRIPTION_UPDATED
	previousPlanId: string
	newPlanId: string
	proratedAmount?: number
}

export interface SubscriptionCanceledEvent extends BaseSubscriptionEvent {
	eventType: SubscriptionEventType.SUBSCRIPTION_CANCELED
	cancellationReason?: string
	endOfBillingPeriod: Date
	immediateCancel: boolean
}

export interface TrialWillEndEvent extends BaseSubscriptionEvent {
	eventType: SubscriptionEventType.TRIAL_WILL_END
	trialEndDate: Date
	daysRemaining: number
}

export interface PaymentFailedEvent extends BaseSubscriptionEvent {
	eventType: SubscriptionEventType.PAYMENT_FAILED
	attemptCount: number
	nextRetryDate?: Date
}

export interface PaymentSucceededEvent extends BaseSubscriptionEvent {
	eventType: SubscriptionEventType.PAYMENT_SUCCEEDED
	amountPaid: number
	currency: string
}
