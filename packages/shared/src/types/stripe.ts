/**
 * Unified Stripe Type System
 *
 * Single source of truth for all Stripe-related types in TenantFlow.
 * This file consolidates and standardizes Stripe types to eliminate conflicts
 * between different type definitions across the codebase.
 *
 * @fileoverview Unified Stripe type definitions for TenantFlow
 */

// Import official Stripe types if available, otherwise define our own
import type { Stripe as StripeSDK } from 'stripe'

// ========================
// Official Stripe Type Aliases (when Stripe SDK is available)
// ========================

/**
 * Official Stripe Subscription type (when available)
<<<<<<< HEAD
 * Extended to include current_period properties that are confirmed in Stripe API docs
 */
export type StripeSubscription = StripeSDK.Subscription & {
	current_period_start?: number
	current_period_end?: number
}
=======
 */
export type StripeSubscription = StripeSDK.Subscription
>>>>>>> origin/main

/**
 * Official Stripe Customer type (when available)
 */
export type StripeCustomer = StripeSDK.Customer

/**
 * Official Stripe Invoice type (when available)
 */
export type StripeInvoice = StripeSDK.Invoice

/**
 * Official Stripe PaymentMethod type (when available)
<<<<<<< HEAD
 * Use this instead of custom PaymentMethod interfaces
 */
export type StripePaymentMethod = StripeSDK.PaymentMethod
export type PaymentMethod = StripePaymentMethod
=======
 */
export type StripePaymentMethod = StripeSDK.PaymentMethod
>>>>>>> origin/main

/**
 * Official Stripe Price type (when available)
 */
export type StripePrice = StripeSDK.Price

/**
 * Official Stripe Product type (when available)
 */
export type StripeProduct = StripeSDK.Product

/**
 * Official Stripe Event type (when available)
 */
export type StripeEvent = StripeSDK.Event

// ========================
// Fallback Type Definitions (when Stripe SDK is not available)
// ========================

// These types mirror the official Stripe API types for compatibility

/**
 * Stripe Subscription status enumeration
 */
export type StripeSubscriptionStatus =
	| 'active'
	| 'canceled'
	| 'incomplete'
	| 'incomplete_expired'
	| 'past_due'
	| 'paused'
	| 'trialing'
	| 'unpaid'

/**
 * Stripe Collection method enumeration
 */
export type StripeCollectionMethod = 'charge_automatically' | 'send_invoice'

/**
 * Stripe Currency enumeration (subset of commonly used currencies)
 */
export type StripeCurrency = 'usd' | 'eur' | 'gbp' | 'cad' | 'aud' | 'jpy'

/**
 * Stripe Billing interval enumeration
 */
export type StripeBillingInterval = 'day' | 'week' | 'month' | 'year'
export type BillingInterval = StripeBillingInterval

/**
 * Stripe Payment method types enumeration
 */
export type StripePaymentMethodType =
	| 'card'
	| 'bank_account'
	| 'sepa_debit'
	| 'sofort'
	| 'ideal'
	| 'giropay'
	| 'p24'
	| 'bancontact'
	| 'eps'
	| 'multibanco'
	| 'alipay'
	| 'boleto'
	| 'oxxo'
	| 'konbini'
	| 'wechat_pay'
	| 'paynow'
	| 'pix'
	| 'promptpay'
	| 'link'
	| 'us_bank_account'
	| 'cashapp'
	| 'revolut_pay'
	| 'amazon_pay'
	| 'affirm'
	| 'afterpay_clearpay'
	| 'klarna'
	| 'paypal'

// ========================
// TenantFlow Application Types
// ========================

/**
 * User subscription type for TenantFlow application
 * This is the application-specific subscription type that includes
 * TenantFlow-specific properties and relationships
 */
export interface Subscription {
	// Primary identifiers
	id: string
	userId: string

	// Plan and billing information
	planType: 'FREETRIAL' | 'STARTER' | 'GROWTH' | 'TENANTFLOW_MAX' | null
	planId?: string | null
	billingPeriod: 'monthly' | 'annual' | null

	// Stripe integration
	stripeCustomerId: string | null
	stripeSubscriptionId: string | null
	stripePriceId: string | null

	// Status and lifecycle
	status: StripeSubscriptionStatus
	currentPeriodStart: Date | null
	currentPeriodEnd: Date | null
	trialStart: Date | null
	trialEnd: Date | null
	cancelAtPeriodEnd: boolean | null
	canceledAt: Date | null

	// Metadata
	createdAt: Date
	updatedAt: Date
	metadata?: Record<string, string>
}

/**
 * Stripe subscription data for API operations
 * Used when working directly with Stripe API responses
 */
export interface StripeSubscriptionData {
	id: string
	object: 'subscription'
	status: StripeSubscriptionStatus
	current_period_start: number
	current_period_end: number
	cancel_at_period_end: boolean
	canceled_at?: number | null
	trial_start?: number | null
	trial_end?: number | null
	created: number
	customer: string
	items: {
		object: 'list'
<<<<<<< HEAD
		data: Array<{
=======
		data: {
>>>>>>> origin/main
			id: string
			price: {
				id: string
				product: string
				unit_amount: number
				currency: StripeCurrency
				recurring?: {
					interval: StripeBillingInterval
					interval_count: number
				}
			}
			quantity: number
<<<<<<< HEAD
		}>
=======
		}[]
>>>>>>> origin/main
	}
	metadata?: Record<string, string>
}

// ========================
// StripeSubscription Helper Functions
// ========================

/**
 * Check if subscription is active
 */
export function isSubscriptionActive(
	subscription: StripeSubscription
): boolean {
	return subscription.status === 'active'
}

/**
 * Check if subscription is trialing
 */
export function isSubscriptionTrialing(
	subscription: StripeSubscription
): boolean {
	return subscription.status === 'trialing'
}

/**
 * Check if subscription is canceled
 */
export function isSubscriptionCanceled(
	subscription: StripeSubscription
): boolean {
	return subscription.status === 'canceled'
}

/**
 * Check if subscription is past due
 */
export function isSubscriptionPastDue(
	subscription: StripeSubscription
): boolean {
	return subscription.status === 'past_due'
}

/**
 * Check if subscription is paused
 */
export function isSubscriptionPaused(
	subscription: StripeSubscription
): boolean {
	return subscription.status === 'paused'
}

/**
 * Check if subscription will cancel at period end
 */
export function willCancelAtPeriodEnd(
	subscription: StripeSubscription
): boolean {
<<<<<<< HEAD
	return subscription.cancel_at_period_end
=======
	return subscription.cancel_at_period_end === true
>>>>>>> origin/main
}

/**
 * Get current billing period dates
 */
export function getSubscriptionCurrentPeriod(
	subscription: StripeSubscription
): {
	start: Date
	end: Date
} | null {
<<<<<<< HEAD
	if (
		!subscription.current_period_start ||
		!subscription.current_period_end
	) {
=======
	const sub = subscription as any
	if (!sub.current_period_start || !sub.current_period_end) {
>>>>>>> origin/main
		return null
	}

	return {
<<<<<<< HEAD
		start: new Date(subscription.current_period_start * 1000),
		end: new Date(subscription.current_period_end * 1000)
=======
		start: new Date(sub.current_period_start * 1000),
		end: new Date(sub.current_period_end * 1000)
>>>>>>> origin/main
	}
}

/**
 * Check if subscription is in trial
 */
export function isInTrial(subscription: StripeSubscription): boolean {
<<<<<<< HEAD
	if (!subscription.trial_end) {
		return false
	}
=======
	if (!subscription.trial_end) {return false}
>>>>>>> origin/main
	return new Date(subscription.trial_end * 1000) > new Date()
}

/**
 * Get days remaining in trial
 */
export function getTrialDaysRemaining(
	subscription: StripeSubscription
): number {
<<<<<<< HEAD
	if (!subscription.trial_end) {
		return 0
	}
=======
	if (!subscription.trial_end) {return 0}
>>>>>>> origin/main

	const trialEnd = new Date(subscription.trial_end * 1000)
	const now = new Date()
	const diffTime = trialEnd.getTime() - now.getTime()
	const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

	return Math.max(0, diffDays)
}

/**
 * Type guard for StripeSubscription
 */
export function isStripeSubscription(obj: unknown): obj is StripeSubscription {
	return (
		obj !== null &&
		typeof obj === 'object' &&
		'object' in obj &&
		obj.object === 'subscription' &&
		'id' in obj &&
		typeof obj.id === 'string'
	)
}

/**
 * Get subscription status
 */
export function getSubscriptionStatus(
	subscription: StripeSubscription
): SubscriptionStatus {
	return subscription.status
}

/**
 * Get subscription price ID (from first item)
 */
export function getSubscriptionPriceId(
	subscription: StripeSubscription
): string | null {
<<<<<<< HEAD
	return subscription.items.data[0]?.price.id ?? null
=======
	return subscription.items?.data?.[0]?.price?.id || null
>>>>>>> origin/main
}

/**
 * Get subscription quantity (from first item)
 */
export function getSubscriptionQuantity(
	subscription: StripeSubscription
): number | null {
<<<<<<< HEAD
	return subscription.items.data[0]?.quantity ?? null
=======
	return subscription.items?.data?.[0]?.quantity || null
>>>>>>> origin/main
}

/**
 * Get subscription interval (from first item's price)
 */
export function getSubscriptionInterval(
	subscription: StripeSubscription
): string | null {
<<<<<<< HEAD
	return subscription.items.data[0]?.price.recurring?.interval ?? null
=======
	return subscription.items?.data?.[0]?.price?.recurring?.interval || null
>>>>>>> origin/main
}

/**
 * Get subscription trial end date
 */
export function getSubscriptionTrialEnd(
	subscription: StripeSubscription
): Date | null {
	return subscription.trial_end
		? new Date(subscription.trial_end * 1000)
		: null
}

/**
 * Get subscription cancel at date
 */
export function getSubscriptionCancelAt(
	subscription: StripeSubscription
): Date | null {
	return subscription.cancel_at
		? new Date(subscription.cancel_at * 1000)
		: null
}

/**
 * Get subscription start date
 */
export function getSubscriptionStartDate(
	subscription: StripeSubscription
): Date {
	return new Date(subscription.start_date * 1000)
}

/**
 * Get subscription end date
 */
export function getSubscriptionEndDate(
	subscription: StripeSubscription
): Date | null {
	return subscription.ended_at ? new Date(subscription.ended_at * 1000) : null
}

/**
 * Calculate Monthly Recurring Revenue (MRR) from subscription
 */
export function calculateSubscriptionMRR(
	subscription: StripeSubscription
): number {
<<<<<<< HEAD
	const item = subscription.items.data[0]
	if (!item?.price) {
		return 0
	}

	const amount = item.price.unit_amount ?? 0
	const quantity = item.quantity ?? 1
=======
	const item = subscription.items?.data?.[0]
	if (!item?.price) {return 0}

	const amount = item.price.unit_amount || 0
	const quantity = item.quantity || 1
>>>>>>> origin/main
	const interval = item.price.recurring?.interval

	// Convert to monthly recurring revenue
	switch (interval) {
		case 'month':
			return (amount * quantity) / 100 // Convert from cents
		case 'year':
			return (amount * quantity) / 100 / 12 // Convert yearly to monthly
		case 'week':
			return ((amount * quantity) / 100) * 4.33 // Convert weekly to monthly
		case 'day':
			return ((amount * quantity) / 100) * 30 // Convert daily to monthly
<<<<<<< HEAD
		case undefined:
			return 0 // One-time payment, no recurring revenue
=======
>>>>>>> origin/main
		default:
			return 0
	}
}

/**
 * Format subscription period for display
 */
export function formatSubscriptionPeriod(
	subscription: StripeSubscription
): string {
	const period = getSubscriptionCurrentPeriod(subscription)
<<<<<<< HEAD
	if (!period) {
		return 'Unknown period'
	}
=======
	if (!period) {return 'Unknown period'}
>>>>>>> origin/main

	return `${period.start.toLocaleDateString()} - ${period.end.toLocaleDateString()}`
}

/**
 * Get days until subscription renewal
 */
export function getDaysUntilRenewal(subscription: StripeSubscription): number {
	const period = getSubscriptionCurrentPeriod(subscription)
<<<<<<< HEAD
	if (!period) {
		return 0
	}
=======
	if (!period) {return 0}
>>>>>>> origin/main

	const now = new Date()
	const diffTime = period.end.getTime() - now.getTime()
	const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

	return Math.max(0, diffDays)
}

/**
 * Get days until trial end
 */
export function getDaysUntilTrialEnd(subscription: StripeSubscription): number {
	return getTrialDaysRemaining(subscription)
}

/**
 * Check if payment should be retried
 */
export function shouldRetryPayment(subscription: StripeSubscription): boolean {
	return subscription.status === 'past_due'
}

/**
 * Get retry delay in hours
 */
export function getRetryDelayHours(_subscription: StripeSubscription): number {
	// Default retry delay - this would be configurable in production
	return 24
}

/**
 * Check if subscription needs dunning
 */
export function needsDunning(subscription: StripeSubscription): boolean {
	return subscription.status === 'past_due'
}

/**
 * Check if subscription can be reactivated
 */
export function canReactivate(subscription: StripeSubscription): boolean {
	return subscription.status === 'canceled' && !subscription.ended_at
}

/**
 * Check if subscription items can be changed
 */
export function canChangeItems(subscription: StripeSubscription): boolean {
	return (
		subscription.status === 'active' || subscription.status === 'trialing'
	)
}

/**
 * Check if subscription collection can be paused
 */
export function canPauseCollection(subscription: StripeSubscription): boolean {
	return subscription.status === 'active'
}

/**
 * Calculate proration amount (placeholder - requires more complex logic)
 */
export function calculateProrationAmount(
	_subscription: StripeSubscription
): number {
	// This would require more complex logic based on subscription changes
	// For now, return 0 as a placeholder
	return 0
}

// Removed duplicate - using SDK type alias defined above
// interface StripePaymentMethod {
// 	id: string
// 	object: 'payment_method'
// 	type: string
// 	created: number
// 	customer: string | null
// 	livemode: boolean
// 	metadata: Record<string, string>
// }

export interface StripeCheckoutSession {
	id: string
	object: 'checkout.session'
	created: number
	customer: string | null
	livemode: boolean
	metadata: Record<string, string>
	mode: string
	status: string | null
	url: string | null
}

export interface StripeCustomerCreateParams {
	email?: string
	name?: string
	metadata?: Record<string, string>
}

/**
 * Payment method information for TenantFlow
 */
export interface PaymentMethodInfo {
	id: string
	type: StripePaymentMethodType
	card?: {
		brand: string
		last4: string
		exp_month: number
		exp_year: number
		funding: string
	}
	billing_details?: {
		name?: string | null
		email?: string | null
	}
	isDefault: boolean
}

/**
 * Invoice information for TenantFlow
 */
export interface InvoiceInfo {
	id: string
	stripeInvoiceId: string
	amountPaid: number
	amountDue: number
	currency: StripeCurrency
	status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void'
	invoiceDate: Date
	dueDate: Date | null
	paidAt: Date | null
	hostedInvoiceUrl?: string | null
	invoicePdf?: string | null
}

// ========================
// Type Conversion Utilities
// ========================

/**
 * Convert Unix timestamp to Date
 */
export function unixTimestampToDate(timestamp: number): Date {
	return new Date(timestamp * 1000)
}

/**
 * Convert Date to Unix timestamp
 */
export function dateToUnixTimestamp(date: Date): number {
	return Math.floor(date.getTime() / 1000)
}

/**
 * Convert Stripe subscription status to standardized status
 */
export function normalizeSubscriptionStatus(
	status: string
): StripeSubscriptionStatus {
	const validStatuses: StripeSubscriptionStatus[] = [
		'active',
		'canceled',
		'incomplete',
		'incomplete_expired',
		'past_due',
		'paused',
		'trialing',
		'unpaid'
	]

	return validStatuses.includes(status as StripeSubscriptionStatus)
		? (status as StripeSubscriptionStatus)
		: 'incomplete'
}

/**
 * Convert camelCase property names to snake_case for Stripe API
 */
export function camelToSnake(str: string): string {
	return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
}

/**
 * Convert snake_case property names to camelCase for application use
 */
export function snakeToCamel(str: string): string {
	return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

// ========================
// Type Guards and Validators
// ========================

/**
 * Type guard to check if a value is a valid Stripe subscription status
 */
export function isStripeSubscriptionStatus(
	value: unknown
): value is StripeSubscriptionStatus {
	const validStatuses: StripeSubscriptionStatus[] = [
		'active',
		'canceled',
		'incomplete',
		'incomplete_expired',
		'past_due',
		'paused',
		'trialing',
		'unpaid'
	]

	return (
		typeof value === 'string' &&
		validStatuses.includes(value as StripeSubscriptionStatus)
	)
}

/**
 * Type guard to check if a value is a valid Stripe currency
 */
export function isStripeCurrency(value: unknown): value is StripeCurrency {
	const validCurrencies: StripeCurrency[] = [
		'usd',
		'eur',
		'gbp',
		'cad',
		'aud',
		'jpy'
	]

	return (
		typeof value === 'string' &&
		validCurrencies.includes(value as StripeCurrency)
	)
}

/**
 * Type guard to check if a value is a valid billing interval
 */
export function isStripeBillingInterval(
	value: unknown
): value is StripeBillingInterval {
	const validIntervals: StripeBillingInterval[] = [
		'day',
		'week',
		'month',
		'year'
	]

	return (
		typeof value === 'string' &&
		validIntervals.includes(value as StripeBillingInterval)
	)
}

// ========================
// Constants
// ========================

/**
 * Stripe subscription statuses for easy reference
 */
export const STRIPE_SUBSCRIPTION_STATUSES = {
	ACTIVE: 'active',
	CANCELED: 'canceled',
	INCOMPLETE: 'incomplete',
	INCOMPLETE_EXPIRED: 'incomplete_expired',
	PAST_DUE: 'past_due',
	PAUSED: 'paused',
	TRIALING: 'trialing',
	UNPAID: 'unpaid'
} as const

/**
 * Stripe plan types for TenantFlow
 */
export const TENANTFLOW_PLAN_TYPES = {
	FREETRIAL: 'FREETRIAL',
	STARTER: 'STARTER',
	GROWTH: 'GROWTH',
	TENANTFLOW_MAX: 'TENANTFLOW_MAX'
} as const

/**
 * Billing periods for TenantFlow subscriptions
 */
export const BILLING_PERIODS = {
	MONTHLY: 'monthly',
	ANNUAL: 'annual',
	// Backward compatibility alias - prefer ANNUAL
	YEARLY: 'yearly'
} as const

export type BillingPeriod =
	(typeof BILLING_PERIODS)[keyof typeof BILLING_PERIODS]

/**
 * Subscription statuses aligned with Stripe's subscription status values
 * Based on official Stripe Subscriptions API documentation
 */
export const SUBSCRIPTION_STATUSES = {
	INCOMPLETE: 'incomplete',
	INCOMPLETE_EXPIRED: 'incomplete_expired',
	TRIALING: 'trialing',
	ACTIVE: 'active',
	PAST_DUE: 'past_due',
	CANCELED: 'canceled',
	UNPAID: 'unpaid',
	PAUSED: 'paused'
} as const

export type SubscriptionStatus =
	(typeof SUBSCRIPTION_STATUSES)[keyof typeof SUBSCRIPTION_STATUSES]

/**
 * Subscription proration behavior aligned with Stripe API
 */
export const PRORATION_BEHAVIORS = {
	CREATE_PRORATIONS: 'create_prorations',
	NONE: 'none',
	ALWAYS_INVOICE: 'always_invoice'
} as const

export type ProrationBehavior =
	(typeof PRORATION_BEHAVIORS)[keyof typeof PRORATION_BEHAVIORS]

/**
 * Subscription collection methods from Stripe API
 */
export const COLLECTION_METHODS = {
	CHARGE_AUTOMATICALLY: 'charge_automatically',
	SEND_INVOICE: 'send_invoice'
} as const

export type CollectionMethod =
	(typeof COLLECTION_METHODS)[keyof typeof COLLECTION_METHODS]

/**
 * Invoice statuses from Stripe API
 */
export const INVOICE_STATUSES = {
	DRAFT: 'draft',
	OPEN: 'open',
	PAID: 'paid',
	UNCOLLECTIBLE: 'uncollectible',
	VOID: 'void'
} as const

export type InvoiceStatus =
	(typeof INVOICE_STATUSES)[keyof typeof INVOICE_STATUSES]

/**
 * Payment method types supported by Stripe
 */
export const PAYMENT_METHOD_TYPES = {
	CARD: 'card',
	SEPA_DEBIT: 'sepa_debit',
	US_BANK_ACCOUNT: 'us_bank_account',
	ACSS_DEBIT: 'acss_debit',
	BANCONTACT: 'bancontact',
	IDEAL: 'ideal',
	GIROPAY: 'giropay',
	SOFORT: 'sofort',
	EPS: 'eps',
	P24: 'p24',
	KLARNA: 'klarna',
	AFTERPAY_CLEARPAY: 'afterpay_clearpay',
	AFFIRM: 'affirm'
} as const

export type PaymentMethodType =
	(typeof PAYMENT_METHOD_TYPES)[keyof typeof PAYMENT_METHOD_TYPES]

/**
 * Currency codes supported by Stripe (subset of most common ones)
 */
export const SUPPORTED_CURRENCIES = {
	USD: 'usd',
	EUR: 'eur',
	GBP: 'gbp',
	CAD: 'cad',
	AUD: 'aud',
	JPY: 'jpy',
	CHF: 'chf',
	SEK: 'sek',
	NOK: 'nok',
	DKK: 'dkk'
} as const

export type SupportedCurrency =
	(typeof SUPPORTED_CURRENCIES)[keyof typeof SUPPORTED_CURRENCIES]

/**
 * Plan configuration interface with comprehensive metadata
 */
export interface PlanConfig {
	readonly id: PlanType
	readonly name: string
	readonly description: string
	readonly price: {
		readonly monthly: number
		readonly annual: number
	}
	readonly features: readonly string[]
	readonly limits: {
		readonly properties: number
		readonly tenants: number
		readonly storage: number // in MB
		readonly apiCalls: number // per month
	}
	readonly priority: boolean
	readonly isPopular?: boolean
	readonly stripeIds: {
		readonly monthlyPriceId: string | null
		readonly annualPriceId: string | null
		readonly productId: string | null
	}
}

/**
 * User subscription data with full context
 */
export interface UserSubscription {
	readonly id: string
	readonly userId: string
	readonly planType: PlanType
	readonly status: SubscriptionStatus
	readonly billingPeriod: BillingPeriod
	readonly stripeCustomerId: string | null
	readonly stripeSubscriptionId: string | null
	readonly stripePriceId: string | null
	readonly currentPeriodStart: Date | null
	readonly currentPeriodEnd: Date | null
	readonly trialStart: Date | null
	readonly trialEnd: Date | null
	readonly cancelAtPeriodEnd: boolean
	readonly canceledAt: Date | null
	readonly createdAt: Date
	readonly updatedAt: Date
}

// ========================
// Webhook Event Types
// ========================

/**
 * Comprehensive webhook event types that TenantFlow handles
 */
export const WEBHOOK_EVENT_TYPES = {
	// Customer events
	CUSTOMER_CREATED: 'customer.created',
	CUSTOMER_UPDATED: 'customer.updated',
	CUSTOMER_DELETED: 'customer.deleted',

	// Subscription events
	SUBSCRIPTION_CREATED: 'customer.subscription.created',
	SUBSCRIPTION_UPDATED: 'customer.subscription.updated',
	SUBSCRIPTION_DELETED: 'customer.subscription.deleted',
	SUBSCRIPTION_TRIAL_WILL_END: 'customer.subscription.trial_will_end',
	SUBSCRIPTION_PAUSED: 'customer.subscription.paused',
	SUBSCRIPTION_RESUMED: 'customer.subscription.resumed',

	// Invoice events
	INVOICE_CREATED: 'invoice.created',
	INVOICE_FINALIZED: 'invoice.finalized',
	INVOICE_PAYMENT_SUCCEEDED: 'invoice.payment_succeeded',
	INVOICE_PAYMENT_FAILED: 'invoice.payment_failed',
	INVOICE_PAYMENT_ACTION_REQUIRED: 'invoice.payment_action_required',
	INVOICE_UPCOMING: 'invoice.upcoming',

	// Payment events
	PAYMENT_INTENT_CREATED: 'payment_intent.created',
	PAYMENT_INTENT_SUCCEEDED: 'payment_intent.succeeded',
	PAYMENT_INTENT_PAYMENT_FAILED: 'payment_intent.payment_failed',
	PAYMENT_INTENT_REQUIRES_ACTION: 'payment_intent.requires_action',

	// Charge events
	CHARGE_FAILED: 'charge.failed',

	// Checkout events
	CHECKOUT_SESSION_COMPLETED: 'checkout.session.completed',
	CHECKOUT_SESSION_EXPIRED: 'checkout.session.expired',

	// Payment Method events
	PAYMENT_METHOD_ATTACHED: 'payment_method.attached',
	PAYMENT_METHOD_DETACHED: 'payment_method.detached',

	// Setup intent events
	SETUP_INTENT_SUCCEEDED: 'setup_intent.succeeded',
	SETUP_INTENT_SETUP_FAILED: 'setup_intent.setup_failed'
} as const

export type WebhookEventType =
	(typeof WEBHOOK_EVENT_TYPES)[keyof typeof WEBHOOK_EVENT_TYPES]

/**
 * Standardized webhook event structure
 */
export interface StripeWebhookEvent {
	readonly id: string
	readonly object: 'event'
	readonly api_version: string
	readonly created: number
	readonly data: {
		readonly object: Record<string, unknown>
		readonly previous_attributes?: Record<string, unknown>
	}
	readonly livemode: boolean
	readonly pending_webhooks: number
	readonly request: {
		readonly id: string | null
		readonly idempotency_key: string | null
	}
	readonly type: WebhookEventType
}

/**
 * Type-safe webhook event handlers
 * Using StripeEvent for better compatibility across environments
 */
export interface WebhookEventHandlers {
	[WEBHOOK_EVENT_TYPES.CUSTOMER_CREATED]: (
		event: StripeEvent
	) => Promise<void>
	[WEBHOOK_EVENT_TYPES.CUSTOMER_UPDATED]: (
		event: StripeEvent
	) => Promise<void>
	[WEBHOOK_EVENT_TYPES.CUSTOMER_DELETED]: (
		event: StripeEvent
	) => Promise<void>
	[WEBHOOK_EVENT_TYPES.SUBSCRIPTION_CREATED]: (
		event: StripeEvent
	) => Promise<void>
	[WEBHOOK_EVENT_TYPES.SUBSCRIPTION_UPDATED]: (
		event: StripeEvent
	) => Promise<void>
	[WEBHOOK_EVENT_TYPES.SUBSCRIPTION_DELETED]: (
		event: StripeEvent
	) => Promise<void>
	[WEBHOOK_EVENT_TYPES.SUBSCRIPTION_TRIAL_WILL_END]: (
		event: StripeEvent
	) => Promise<void>
	[WEBHOOK_EVENT_TYPES.SUBSCRIPTION_PAUSED]: (
		event: StripeEvent
	) => Promise<void>
	[WEBHOOK_EVENT_TYPES.SUBSCRIPTION_RESUMED]: (
		event: StripeEvent
	) => Promise<void>
	[WEBHOOK_EVENT_TYPES.INVOICE_CREATED]: (event: StripeEvent) => Promise<void>
	[WEBHOOK_EVENT_TYPES.INVOICE_FINALIZED]: (
		event: StripeEvent
	) => Promise<void>
	[WEBHOOK_EVENT_TYPES.INVOICE_PAYMENT_SUCCEEDED]: (
		event: StripeEvent
	) => Promise<void>
	[WEBHOOK_EVENT_TYPES.INVOICE_PAYMENT_FAILED]: (
		event: StripeEvent
	) => Promise<void>
	[WEBHOOK_EVENT_TYPES.INVOICE_UPCOMING]: (
		event: StripeEvent
	) => Promise<void>
	[WEBHOOK_EVENT_TYPES.PAYMENT_INTENT_CREATED]: (
		event: StripeEvent
	) => Promise<void>
	[WEBHOOK_EVENT_TYPES.PAYMENT_INTENT_SUCCEEDED]: (
		event: StripeEvent
	) => Promise<void>
	[WEBHOOK_EVENT_TYPES.PAYMENT_INTENT_PAYMENT_FAILED]: (
		event: StripeEvent
	) => Promise<void>
	[WEBHOOK_EVENT_TYPES.CHECKOUT_SESSION_COMPLETED]: (
		event: StripeEvent
	) => Promise<void>
	[WEBHOOK_EVENT_TYPES.CHECKOUT_SESSION_EXPIRED]: (
		event: StripeEvent
	) => Promise<void>
	[WEBHOOK_EVENT_TYPES.SETUP_INTENT_SUCCEEDED]: (
		event: StripeEvent
	) => Promise<void>
	[WEBHOOK_EVENT_TYPES.SETUP_INTENT_SETUP_FAILED]: (
		event: StripeEvent
	) => Promise<void>
}

// ========================
// Configuration Types
// ========================

/**
 * Unified Stripe configuration interface
 */
export interface StripeConfig {
	readonly secretKey: string
	readonly publishableKey: string
	readonly webhookSecret: string
	readonly apiVersion: StripeApiVersion
	readonly automaticTax: boolean
	readonly defaultTrialDays: number
	readonly environment: 'test' | 'live'
}

/**
 * Environment-specific configuration
 */
export interface StripeEnvironmentConfig extends StripeConfig {
	readonly isDevelopment: boolean
	readonly isProduction: boolean
	readonly isTest: boolean
	readonly webhookEndpoint: string
}

/**
 * Plan price ID configuration for all tiers
 */
export interface StripePlanPriceIds {
	readonly starter: {
		readonly monthly: string
		readonly annual: string
	}
	readonly growth: {
		readonly monthly: string
		readonly annual: string
	}
	readonly tenantflow_max: {
		readonly monthly: string
		readonly annual: string
	}
}

// ========================
// Error Handling Types
// ========================

/**
 * Error categories for systematic error handling
 */
export const STRIPE_ERROR_CATEGORIES = {
	PAYMENT_METHOD: 'payment_method',
	INFRASTRUCTURE: 'infrastructure',
	CLIENT_ERROR: 'client_error',
	STRIPE_SERVICE: 'stripe_service',
	CONFIGURATION: 'configuration',
	UNKNOWN: 'unknown'
} as const

export type StripeErrorCategory =
	(typeof STRIPE_ERROR_CATEGORIES)[keyof typeof STRIPE_ERROR_CATEGORIES]

/**
 * Error severity levels for alerting and monitoring
 */
export const STRIPE_ERROR_SEVERITIES = {
	LOW: 'low',
	MEDIUM: 'medium',
	HIGH: 'high',
	CRITICAL: 'critical'
} as const

export type StripeErrorSeverity =
	(typeof STRIPE_ERROR_SEVERITIES)[keyof typeof STRIPE_ERROR_SEVERITIES]

/**
 * Comprehensive error context for debugging and analytics
 */
export interface StripeErrorContext {
	readonly operation: string
	readonly resource: string
	readonly userId?: string
	readonly requestId?: string
	readonly metadata?: Record<string, unknown>
	readonly timestamp: Date
}

/**
 * Stripe error codes
 */
export type StripeErrorCode = string

/**
 * Stripe decline codes
 */
export type StripeDeclineCode = string

/**
 * Stripe API version
 */
export type StripeApiVersion = string

/**
 * Standardized error structure with full context
 */
export interface StandardizedStripeError {
	readonly code: StripeErrorCode
	readonly message: string
	readonly userMessage: string
	readonly details?: string
	readonly errorId: string
	readonly category: StripeErrorCategory
	readonly severity: StripeErrorSeverity
	readonly retryable: boolean
	readonly retryAfter?: number
	readonly stripeErrorType?: string
	readonly httpStatusCode?: number
	readonly context: StripeErrorContext
}

/**
 * Retry configuration for error recovery
 */
export interface StripeRetryConfig {
	readonly maxAttempts: number
	readonly baseDelayMs: number
	readonly maxDelayMs: number
	readonly exponentialBase: number
	readonly jitterMs: number
}

/**
 * Error analytics for monitoring and alerting
 */
export interface StripeErrorAnalytics {
	readonly category: StripeErrorCategory
	readonly severity: StripeErrorSeverity
	readonly actionRequired: boolean
	readonly escalateToStripe: boolean
	readonly affectedUsers: number
	readonly errorRate: number
	readonly avgResponseTime: number
}

// ========================
// Idempotency and Request Management
// ========================

/**
 * Idempotency key configuration for safe request retries
 * Based on Stripe's idempotent requests documentation
 */
export interface IdempotencyConfig {
	readonly enabled: boolean
	readonly keyPrefix?: string
	readonly maxRetries: number
	readonly retryDelayMs: number
	readonly keyExpirationHours: number // Stripe keys expire after 24 hours
}

/**
 * Request ID for tracking and debugging Stripe API calls
 * Every Stripe API response includes a request_id for support
 */
export type StripeRequestId = `req_${string}`

/**
 * Idempotency key format - must be unique and up to 255 characters
 * Stripe recommendation: use UUID v4 or timestamp + random string
 */
export type IdempotencyKey = string

/**
 * Metadata constraints based on Stripe documentation
 * - Up to 50 keys per object
 * - Key names: Maximum 40 characters
 * - Key values: Maximum 500 characters
 * - Keys and values stored as strings
 * - Prohibited: Square brackets ([ and ]) in key names
 * - Best practice: Don't store sensitive information
 * - Use for: Unique identifiers, tracking information, internal references
 */
// Base Stripe metadata type - all values must be strings per Stripe API
export type StripeMetadata = Record<string, string>

// TenantFlow-specific metadata helper type for strongly typed metadata creation
export interface TenantFlowMetadata {
	readonly tenantflow_user_id?: string
	readonly tenantflow_organization_id?: string
	readonly tenantflow_plan_type?: string
	readonly tenantflow_operation?: string
	readonly tenantflow_correlation_id?: string
	readonly tenantflow_environment?: 'development' | 'staging' | 'production'
	readonly tenantflow_version?: string
	readonly tenantflow_feature_flag?: string
	readonly tenantflow_created_by?: string
	readonly tenantflow_source?: string
	readonly tenantflow_billing_cycle?: string
	readonly tenantflow_trial_days?: string
	readonly tenantflow_promotion_code?: string
}

/**
 * Base interface for all Stripe API requests with idempotency and metadata
 */
export interface StripeApiRequestBase {
	readonly idempotencyKey?: IdempotencyKey
	readonly metadata?: StripeMetadata
	readonly expand?: readonly string[]
}

/**
 * Enhanced error interface with request ID for debugging
 */
export interface StripeErrorWithRequestId extends StripeError {
	readonly requestId?: StripeRequestId
	readonly idempotencyKey?: IdempotencyKey
	readonly retryable: boolean
	readonly retryAfter?: number
}

/**
 * Customer Session object from Stripe API
 * Used for client-side operations with limited scope
 */
export interface StripeCustomerSession {
	readonly object: 'customer_session'
	readonly client_secret: string
	readonly created: number
	readonly customer: string
	readonly expires_at: number
	readonly livemode: boolean
	readonly components: {
		readonly buy_button?: {
			readonly enabled: boolean
		}
		readonly pricing_table?: {
			readonly enabled: boolean
		}
		readonly payment_element?: {
			readonly enabled: boolean
			readonly features?: {
<<<<<<< HEAD
				readonly payment_method_allow_redisplay_filters?: Array<
					'always' | 'limited' | 'unspecified'
				>
=======
				readonly payment_method_allow_redisplay_filters?: (
					| 'always'
					| 'limited'
					| 'unspecified'
				)[]
>>>>>>> origin/main
				readonly payment_method_redisplay?: 'disabled' | 'enabled'
				readonly payment_method_redisplay_limit?: number
				readonly payment_method_remove?: 'disabled' | 'enabled'
				readonly payment_method_save?: 'disabled' | 'enabled'
				readonly payment_method_save_usage?:
					| 'off_session'
					| 'on_session'
			}
		}
	}
}

/**
<<<<<<< HEAD
=======
 * Comprehensive Stripe Invoice interface based on official API
 * @deprecated Use the SDK type alias StripeInvoice instead
 * @internal Not exported - kept for reference only
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
interface _StripeInvoiceDetailed {
	readonly id: string
	readonly object: 'invoice'
	readonly account_country?: string | null
	readonly account_name?: string | null
	readonly account_tax_ids?: string[] | null
	readonly amount_due: number
	readonly amount_paid: number
	readonly amount_remaining: number
	readonly amount_shipping: number
	readonly application?: string | null
	readonly application_fee_amount?: number | null
	readonly attempt_count: number
	readonly attempted: boolean
	readonly auto_advance?: boolean
	readonly automatic_tax: {
		readonly enabled: boolean
		readonly liability?: {
			readonly account?: string | null
			readonly type: 'account' | 'self'
		} | null
		readonly status?:
			| 'complete'
			| 'failed'
			| 'requires_location_inputs'
			| null
	}
	readonly billing_reason?:
		| 'automatic_pending_invoice_item_invoice'
		| 'manual'
		| 'quote_accept'
		| 'subscription'
		| 'subscription_create'
		| 'subscription_cycle'
		| 'subscription_threshold'
		| 'subscription_update'
		| 'upcoming'
		| null
	readonly charge?: string | null
	readonly collection_method: CollectionMethod
	readonly created: number
	readonly currency: SupportedCurrency
	readonly custom_fields?:
		| {
				readonly name: string
				readonly value: string
		  }[]
		| null
	readonly customer?: string | StripeCustomer | null
	readonly customer_address?: {
		readonly city?: string | null
		readonly country?: string | null
		readonly line1?: string | null
		readonly line2?: string | null
		readonly postal_code?: string | null
		readonly state?: string | null
	} | null
	readonly customer_email?: string | null
	readonly customer_name?: string | null
	readonly customer_phone?: string | null
	readonly customer_shipping?: {
		readonly address?: {
			readonly city?: string | null
			readonly country?: string | null
			readonly line1?: string | null
			readonly line2?: string | null
			readonly postal_code?: string | null
			readonly state?: string | null
		} | null
		readonly carrier?: string | null
		readonly name?: string | null
		readonly phone?: string | null
		readonly tracking_number?: string | null
	} | null
	readonly customer_tax_exempt?: 'exempt' | 'none' | 'reverse' | null
	readonly customer_tax_ids?:
		| {
				readonly type:
					| 'ad_nrt'
					| 'ae_trn'
					| 'ar_cuit'
					| 'au_abn'
					| 'au_arn'
					| 'bg_uic'
					| 'bh_vat'
					| 'bo_tin'
					| 'br_cnpj'
					| 'br_cpf'
					| 'ca_bn'
					| 'ca_gst_hst'
					| 'ca_pst_bc'
					| 'ca_pst_mb'
					| 'ca_pst_sk'
					| 'ca_qst'
					| 'ch_vat'
					| 'cl_tin'
					| 'cn_tin'
					| 'co_nit'
					| 'cr_tin'
					| 'do_rcn'
					| 'ec_ruc'
					| 'eg_tin'
					| 'es_cif'
					| 'eu_oss_vat'
					| 'eu_vat'
					| 'gb_vat'
					| 'ge_vat'
					| 'hk_br'
					| 'hu_tin'
					| 'id_npwp'
					| 'il_vat'
					| 'in_gst'
					| 'is_vat'
					| 'jp_cn'
					| 'jp_rn'
					| 'jp_trn'
					| 'ke_pin'
					| 'kr_brn'
					| 'kz_bin'
					| 'li_uid'
					| 'mx_rfc'
					| 'my_frp'
					| 'my_itn'
					| 'my_sst'
					| 'ng_tin'
					| 'no_vat'
					| 'no_voec'
					| 'nz_gst'
					| 'om_vat'
					| 'pe_ruc'
					| 'ph_tin'
					| 'ro_tin'
					| 'rs_pib'
					| 'ru_inn'
					| 'ru_kpp'
					| 'sa_vat'
					| 'sg_gst'
					| 'sg_uen'
					| 'si_tin'
					| 'sv_nit'
					| 'th_vat'
					| 'tr_tin'
					| 'tw_vat'
					| 'ua_vat'
					| 'us_ein'
					| 'uy_ruc'
					| 've_rif'
					| 'vn_tin'
					| 'za_vat'
				readonly value?: string | null
		  }[]
		| null
	readonly default_payment_method?: string | null
	readonly default_source?: string | null
	readonly default_tax_rates: {
		readonly id: string
		readonly object: 'tax_rate'
		readonly active: boolean
		readonly country?: string | null
		readonly created: number
		readonly description?: string | null
		readonly display_name: string
		readonly effective_percentage?: number | null
		readonly inclusive: boolean
		readonly jurisdiction?: string | null
		readonly jurisdiction_level?:
			| 'city'
			| 'country'
			| 'county'
			| 'district'
			| 'multiple'
			| 'state'
			| null
		readonly livemode: boolean
		readonly metadata: Record<string, string>
		readonly percentage: number
		readonly state?: string | null
		readonly tax_type?:
			| 'amusement_tax'
			| 'communications_tax'
			| 'gst'
			| 'hst'
			| 'igst'
			| 'jct'
			| 'lease_tax'
			| 'pst'
			| 'qst'
			| 'rst'
			| 'sales_tax'
			| 'vat'
			| null
	}[]
	readonly description?: string | null
	readonly discount?: {
		readonly id: string
		readonly object: 'discount'
		readonly checkout_session?: string | null
		readonly coupon: {
			readonly id: string
			readonly object: 'coupon'
			readonly amount_off?: number | null
			readonly applies_to?: {
				readonly products: string[]
			} | null
			readonly created: number
			readonly currency?: SupportedCurrency | null
			readonly currency_options?: Record<
				string,
				{
					readonly amount_off: number
				}
			>
			readonly duration: 'forever' | 'once' | 'repeating'
			readonly duration_in_months?: number | null
			readonly livemode: boolean
			readonly max_redemptions?: number | null
			readonly metadata: Record<string, string>
			readonly name?: string | null
			readonly percent_off?: number | null
			readonly redeem_by?: number | null
			readonly times_redeemed: number
			readonly valid: boolean
		}
		readonly customer?: string | null
		readonly end?: number | null
		readonly invoice?: string | null
		readonly invoice_item?: string | null
		readonly promotion_code?: string | null
		readonly start: number
		readonly subscription?: string | null
		readonly subscription_item?: string | null
	} | null
	readonly due_date?: number | null
	readonly effective_at?: number | null
	readonly ending_balance?: number | null
	readonly footer?: string | null
	readonly from_invoice?: {
		readonly action: 'revision'
		readonly invoice: string
	} | null
	readonly hosted_invoice_url?: string | null
	readonly invoice_pdf?: string | null
	readonly issuer: {
		readonly account?: string | null
		readonly type: 'account' | 'self'
	}
	readonly last_finalization_error?: {
		readonly code?: string
		readonly doc_url?: string
		readonly message?: string
		readonly param?: string
		readonly type:
			| 'api_error'
			| 'card_error'
			| 'idempotency_error'
			| 'invalid_request_error'
	} | null
	readonly latest_revision?: string | null
	readonly lines: {
		readonly object: 'list'
		readonly data: {
			readonly id: string
			readonly object: 'line_item'
			readonly amount: number
			readonly amount_excluding_tax?: number | null
			readonly currency: SupportedCurrency
			readonly description?: string | null
			readonly discount_amounts?:
				| {
						readonly amount: number
						readonly discount: string
				  }[]
				| null
			readonly discountable: boolean
			readonly discounts?: string[] | null
			readonly invoice_item?: string
			readonly livemode: boolean
			readonly metadata: Record<string, string>
			readonly period: {
				readonly end: number
				readonly start: number
			}
			readonly plan?: {
				readonly id: string
				readonly object: 'plan'
				readonly active: boolean
				readonly aggregate_usage?:
					| 'last_during_period'
					| 'last_ever'
					| 'max'
					| 'sum'
					| null
				readonly amount?: number | null
				readonly amount_decimal?: string | null
				readonly billing_scheme: 'per_unit' | 'tiered'
				readonly created: number
				readonly currency: SupportedCurrency
				readonly interval: 'day' | 'month' | 'week' | 'year'
				readonly interval_count: number
				readonly livemode: boolean
				readonly metadata: Record<string, string>
				readonly nickname?: string | null
				readonly product?: string | null
				readonly tiers?:
					| {
							readonly flat_amount?: number | null
							readonly flat_amount_decimal?: string | null
							readonly unit_amount?: number | null
							readonly unit_amount_decimal?: string | null
							readonly up_to?: number | 'inf' | null
					  }[]
					| null
				readonly tiers_mode?: 'graduated' | 'volume' | null
				readonly transform_usage?: {
					readonly divide_by: number
					readonly round: 'down' | 'up'
				} | null
				readonly trial_period_days?: number | null
				readonly usage_type: 'licensed' | 'metered'
			} | null
			readonly price?: {
				readonly id: string
				readonly object: 'price'
				readonly active: boolean
				readonly billing_scheme: 'per_unit' | 'tiered'
				readonly created: number
				readonly currency: SupportedCurrency
				readonly custom_unit_amount?: {
					readonly maximum?: number | null
					readonly minimum?: number | null
					readonly preset?: number | null
				} | null
				readonly livemode: boolean
				readonly lookup_key?: string | null
				readonly metadata: Record<string, string>
				readonly nickname?: string | null
				readonly product: string
				readonly recurring?: {
					readonly aggregate_usage?:
						| 'sum'
						| 'last_during_period'
						| 'last_ever'
						| 'max'
						| null
					readonly interval: 'day' | 'week' | 'month' | 'year'
					readonly interval_count: number
					readonly trial_period_days?: number | null
					readonly usage_type: 'licensed' | 'metered'
				} | null
				readonly tax_behavior?:
					| 'exclusive'
					| 'inclusive'
					| 'unspecified'
					| null
				readonly tiers?:
					| {
							readonly flat_amount?: number | null
							readonly flat_amount_decimal?: string | null
							readonly unit_amount?: number | null
							readonly unit_amount_decimal?: string | null
							readonly up_to?: number | 'inf' | null
					  }[]
					| null
				readonly tiers_mode?: 'graduated' | 'volume' | null
				readonly transform_quantity?: {
					readonly divide_by: number
					readonly round: 'down' | 'up'
				} | null
				readonly type: 'one_time' | 'recurring'
				readonly unit_amount?: number | null
				readonly unit_amount_decimal?: string | null
			} | null
			readonly proration: boolean
			readonly proration_details?: {
				readonly credited_items?: {
					readonly invoice: string
					readonly invoice_line_items: string[]
				} | null
			} | null
			readonly quantity?: number | null
			readonly subscription?: string | null
			readonly subscription_item?: string | null
			readonly tax_amounts?:
				| {
						readonly amount: number
						readonly inclusive: boolean
						readonly tax_rate: string
						readonly taxability_reason?:
							| 'customer_exempt'
							| 'not_collecting'
							| 'not_subject_to_tax'
							| 'not_supported'
							| 'portion_product_exempt'
							| 'portion_reduced_rated'
							| 'portion_standard_rated'
							| 'product_exempt'
							| 'product_exempt_holiday'
							| 'proportionally_rated'
							| 'reduced_rated'
							| 'reverse_charge'
							| 'standard_rated'
							| 'taxable_basis_reduced'
							| 'zero_rated'
							| null
						readonly taxable_amount?: number | null
				  }[]
				| null
			readonly tax_rates: {
				readonly id: string
				readonly object: 'tax_rate'
				readonly active: boolean
				readonly country?: string | null
				readonly created: number
				readonly description?: string | null
				readonly display_name: string
				readonly effective_percentage?: number | null
				readonly inclusive: boolean
				readonly jurisdiction?: string | null
				readonly jurisdiction_level?:
					| 'city'
					| 'country'
					| 'county'
					| 'district'
					| 'multiple'
					| 'state'
					| null
				readonly livemode: boolean
				readonly metadata: Record<string, string>
				readonly percentage: number
				readonly state?: string | null
				readonly tax_type?:
					| 'amusement_tax'
					| 'communications_tax'
					| 'gst'
					| 'hst'
					| 'igst'
					| 'jct'
					| 'lease_tax'
					| 'pst'
					| 'qst'
					| 'rst'
					| 'sales_tax'
					| 'vat'
					| null
			}[]
			readonly type: 'invoice_item' | 'subscription'
			readonly unit_amount_excluding_tax?: string | null
		}[]
		readonly has_more: boolean
		readonly total_count: number
		readonly url: string
	}
	readonly livemode: boolean
	readonly metadata: Record<string, string>
	readonly next_payment_attempt?: number | null
	readonly number?: string | null
	readonly on_behalf_of?: string | null
	readonly paid: boolean
	readonly paid_out_of_band: boolean
	readonly payment_intent?: string | null
	readonly payment_settings: {
		readonly default_mandate?: string | null
		readonly payment_method_options?: {
			readonly acss_debit?: {
				readonly mandate_options?: {
					readonly transaction_type?: 'business' | 'personal' | null
				}
				readonly verification_method?:
					| 'automatic'
					| 'instant'
					| 'microdeposits'
					| null
			} | null
			readonly bancontact?: {
				readonly preferred_language?: 'de' | 'en' | 'fr' | 'nl' | null
			} | null
			readonly card?: {
				readonly installments?: {
					readonly enabled?: boolean | null
					readonly plan?: {
						readonly count: number
						readonly interval: 'month'
						readonly type: 'fixed_count'
					} | null
				} | null
				readonly request_three_d_secure?:
					| 'any'
					| 'automatic'
					| 'challenge'
					| null
			} | null
			readonly customer_balance?: {
				readonly bank_transfer?: {
					readonly eu_bank_transfer?: {
						readonly country: string
					} | null
					readonly type?: string | null
				} | null
				readonly funding_type?: 'bank_transfer' | null
			} | null
			readonly konbini?: Record<string, never> | null
			readonly sepa_debit?: Record<string, never> | null
			readonly us_bank_account?: {
				readonly financial_connections?: {
					readonly filters?: {
						readonly account_subcategory?:
							| ('checking' | 'savings')[]
							| null
					} | null
					readonly permissions?:
						| (
								| 'balances'
								| 'ownership'
								| 'payment_method'
								| 'transactions'
						  )[]
						| null
					readonly prefetch?:
						| ('balances' | 'ownership' | 'transactions')[]
						| null
					readonly return_url?: string | null
				} | null
				readonly verification_method?:
					| 'automatic'
					| 'instant'
					| 'microdeposits'
					| null
			} | null
		} | null
		readonly payment_method_types?: PaymentMethodType[] | null
	}
	readonly period_end: number
	readonly period_start: number
	readonly post_payment_credit_notes_amount: number
	readonly pre_payment_credit_notes_amount: number
	readonly quote?: string | null
	readonly receipt_number?: string | null
	readonly rendering?: {
		readonly amount_tax_display?:
			| 'exclude_tax'
			| 'include_inclusive_tax'
			| null
		readonly pdf?: {
			readonly page_size?: 'a4' | 'auto' | 'letter' | null
		} | null
		readonly template?: string | null
		readonly template_version?: number | null
	} | null
	readonly shipping_cost?: {
		readonly amount_subtotal: number
		readonly amount_tax: number
		readonly amount_total: number
		readonly shipping_rate?: string | null
		readonly taxes?:
			| {
					readonly amount: number
					readonly rate: {
						readonly id: string
						readonly object: 'tax_rate'
						readonly active: boolean
						readonly country?: string | null
						readonly created: number
						readonly description?: string | null
						readonly display_name: string
						readonly effective_percentage?: number | null
						readonly inclusive: boolean
						readonly jurisdiction?: string | null
						readonly jurisdiction_level?:
							| 'city'
							| 'country'
							| 'county'
							| 'district'
							| 'multiple'
							| 'state'
							| null
						readonly livemode: boolean
						readonly metadata: Record<string, string>
						readonly percentage: number
						readonly state?: string | null
						readonly tax_type?:
							| 'amusement_tax'
							| 'communications_tax'
							| 'gst'
							| 'hst'
							| 'igst'
							| 'jct'
							| 'lease_tax'
							| 'pst'
							| 'qst'
							| 'rst'
							| 'sales_tax'
							| 'vat'
							| null
					}
					readonly taxability_reason?:
						| 'customer_exempt'
						| 'not_collecting'
						| 'not_subject_to_tax'
						| 'not_supported'
						| 'portion_product_exempt'
						| 'portion_reduced_rated'
						| 'portion_standard_rated'
						| 'product_exempt'
						| 'product_exempt_holiday'
						| 'proportionally_rated'
						| 'reduced_rated'
						| 'reverse_charge'
						| 'standard_rated'
						| 'taxable_basis_reduced'
						| 'zero_rated'
						| null
					readonly taxable_amount?: number | null
			  }[]
			| null
	} | null
	readonly shipping_details?: {
		readonly address?: {
			readonly city?: string | null
			readonly country?: string | null
			readonly line1?: string | null
			readonly line2?: string | null
			readonly postal_code?: string | null
			readonly state?: string | null
		} | null
		readonly carrier?: string | null
		readonly name?: string | null
		readonly phone?: string | null
		readonly tracking_number?: string | null
	} | null
	readonly starting_balance: number
	readonly statement_descriptor?: string | null
	readonly status?: InvoiceStatus | null
	readonly status_transitions: {
		readonly finalized_at?: number | null
		readonly marked_uncollectible_at?: number | null
		readonly paid_at?: number | null
		readonly voided_at?: number | null
	}
	readonly subscription?: string | null
	readonly subscription_details?: {
		readonly metadata?: Record<string, string> | null
	} | null
	readonly subscription_proration_date?: number | null
	readonly subtotal: number
	readonly subtotal_excluding_tax?: number | null
	readonly tax?: number | null
	readonly test_clock?: string | null
	readonly total: number
	readonly total_discount_amounts?:
		| {
				readonly amount: number
				readonly discount: string
		  }[]
		| null
	readonly total_excluding_tax?: number | null
	readonly total_tax_amounts: {
		readonly amount: number
		readonly inclusive: boolean
		readonly tax_rate: string
		readonly taxability_reason?:
			| 'customer_exempt'
			| 'not_collecting'
			| 'not_subject_to_tax'
			| 'not_supported'
			| 'portion_product_exempt'
			| 'portion_reduced_rated'
			| 'portion_standard_rated'
			| 'product_exempt'
			| 'product_exempt_holiday'
			| 'proportionally_rated'
			| 'reduced_rated'
			| 'reverse_charge'
			| 'standard_rated'
			| 'taxable_basis_reduced'
			| 'zero_rated'
			| null
		readonly taxable_amount?: number | null
	}[]
	readonly transfer_data?: {
		readonly amount?: number | null
		readonly destination: string
	} | null
	readonly webhooks_delivered_at?: number | null
}

/**
>>>>>>> origin/main
 * Comprehensive Stripe Payment Intent interface based on official API
 */
export interface StripePaymentIntent {
	readonly id: string
	readonly object: 'payment_intent'
	readonly amount: number
	readonly amount_capturable?: number
	readonly amount_details?: {
		readonly tip?: {
			readonly amount?: number | null
		} | null
	} | null
	readonly amount_received?: number
	readonly application?: string | null
	readonly application_fee_amount?: number | null
	readonly automatic_payment_methods?: {
		readonly allow_redirects?: 'always' | 'never' | null
		readonly enabled?: boolean | null
	} | null
	readonly canceled_at?: number | null
	readonly cancellation_reason?:
		| 'abandoned'
		| 'automatic'
		| 'duplicate'
		| 'failed_invoice'
		| 'fraudulent'
		| 'requested_by_customer'
		| 'void_invoice'
		| null
	readonly capture_method: 'automatic' | 'automatic_async' | 'manual'
	readonly client_secret?: string | null
	readonly confirmation_method: 'automatic' | 'manual'
	readonly created: number
	readonly currency: SupportedCurrency
	readonly customer?: string | null
	readonly description?: string | null
	readonly invoice?: string | null
	readonly last_payment_error?: {
		readonly charge?: string | null
		readonly code?: string | null
		readonly decline_code?: string | null
		readonly doc_url?: string | null
		readonly message?: string | null
		readonly param?: string | null
		readonly payment_intent?: {
			readonly id: string
			readonly object: 'payment_intent'
		} | null
		readonly payment_method?: {
			readonly id: string
			readonly object: 'payment_method'
		} | null
		readonly payment_method_type?: string | null
		readonly request_log_url?: string | null
		readonly setup_intent?: {
			readonly id: string
			readonly object: 'setup_intent'
		} | null
		readonly source?: {
			readonly id: string
			readonly object: 'source'
		} | null
		readonly type:
			| 'api_error'
			| 'card_error'
			| 'idempotency_error'
			| 'invalid_request_error'
	} | null
	readonly latest_charge?: string | null
	readonly livemode: boolean
	readonly metadata: Record<string, string>
	readonly next_action?: {
		readonly alipay_handle_redirect?: {
			readonly native_data?: string | null
			readonly native_url?: string | null
			readonly return_url?: string | null
			readonly url?: string | null
		} | null
		readonly boleto_display_details?: {
			readonly expires_at?: number | null
			readonly hosted_voucher_url?: string | null
			readonly number?: string | null
			readonly pdf?: string | null
		} | null
		readonly card_await_notification?: {
			readonly charge_attempt_at?: number | null
			readonly customer_approval_url?: string | null
		} | null
		readonly cashapp_handle_redirect_or_display_qr_code?: {
			readonly hosted_instructions_url?: string | null
			readonly mobile_auth_url?: string | null
			readonly qr_code?: {
				readonly expires_at?: number | null
				readonly image_url_png?: string | null
				readonly image_url_svg?: string | null
			} | null
		} | null
		readonly display_bank_transfer_instructions?: {
			readonly amount_remaining?: number | null
			readonly currency?: SupportedCurrency | null
<<<<<<< HEAD
			readonly financial_addresses?: Array<{
				readonly aba?: {
					readonly account_holder_type?:
						| 'company'
						| 'individual'
						| null
					readonly account_number?: string | null
					readonly account_type?: 'checking' | 'savings' | null
					readonly bank_name?: string | null
					readonly routing_number?: string | null
				} | null
				readonly iban?: {
					readonly account_holder_name?: string | null
					readonly bic?: string | null
					readonly country?: string | null
					readonly iban?: string | null
				} | null
				readonly sort_code?: {
					readonly account_holder_name?: string | null
					readonly account_number?: string | null
					readonly sort_code?: string | null
				} | null
				readonly spei?: {
					readonly bank_code?: string | null
					readonly bank_name?: string | null
					readonly clabe?: string | null
				} | null
				readonly supported_networks?: Array<
					| 'ach'
					| 'bacs'
					| 'domestic_wire_us'
					| 'fps'
					| 'sepa'
					| 'spei'
					| 'swift'
					| 'zengin'
				> | null
				readonly swift?: {
					readonly account_number?: string | null
					readonly bank_name?: string | null
					readonly swift_code?: string | null
				} | null
				readonly type:
					| 'aba'
					| 'iban'
					| 'sort_code'
					| 'spei'
					| 'swift'
					| 'zengin'
				readonly zengin?: {
					readonly account_holder_name?: string | null
					readonly account_number?: string | null
					readonly account_type?: string | null
					readonly bank_code?: string | null
					readonly bank_name?: string | null
					readonly branch_code?: string | null
					readonly branch_name?: string | null
				} | null
			}> | null
=======
			readonly financial_addresses?:
				| {
						readonly aba?: {
							readonly account_holder_type?:
								| 'company'
								| 'individual'
								| null
							readonly account_number?: string | null
							readonly account_type?:
								| 'checking'
								| 'savings'
								| null
							readonly bank_name?: string | null
							readonly routing_number?: string | null
						} | null
						readonly iban?: {
							readonly account_holder_name?: string | null
							readonly bic?: string | null
							readonly country?: string | null
							readonly iban?: string | null
						} | null
						readonly sort_code?: {
							readonly account_holder_name?: string | null
							readonly account_number?: string | null
							readonly sort_code?: string | null
						} | null
						readonly spei?: {
							readonly bank_code?: string | null
							readonly bank_name?: string | null
							readonly clabe?: string | null
						} | null
						readonly supported_networks?:
							| (
									| 'ach'
									| 'bacs'
									| 'domestic_wire_us'
									| 'fps'
									| 'sepa'
									| 'spei'
									| 'swift'
									| 'zengin'
							  )[]
							| null
						readonly swift?: {
							readonly account_number?: string | null
							readonly bank_name?: string | null
							readonly swift_code?: string | null
						} | null
						readonly type:
							| 'aba'
							| 'iban'
							| 'sort_code'
							| 'spei'
							| 'swift'
							| 'zengin'
						readonly zengin?: {
							readonly account_holder_name?: string | null
							readonly account_number?: string | null
							readonly account_type?: string | null
							readonly bank_code?: string | null
							readonly bank_name?: string | null
							readonly branch_code?: string | null
							readonly branch_name?: string | null
						} | null
				  }[]
				| null
>>>>>>> origin/main
			readonly hosted_instructions_url?: string | null
			readonly reference?: string | null
			readonly type:
				| 'eu_bank_transfer'
				| 'gb_bank_transfer'
				| 'jp_bank_transfer'
				| 'mx_bank_transfer'
				| 'us_bank_transfer'
		} | null
		readonly konbini_display_details?: {
			readonly expires_at?: number | null
			readonly hosted_voucher_url?: string | null
			readonly stores?: {
				readonly familymart?: {
					readonly confirmation_number?: string | null
					readonly payment_code?: string | null
				} | null
				readonly lawson?: {
					readonly confirmation_number?: string | null
					readonly payment_code?: string | null
				} | null
				readonly ministop?: {
					readonly confirmation_number?: string | null
					readonly payment_code?: string | null
				} | null
				readonly seicomart?: {
					readonly confirmation_number?: string | null
					readonly payment_code?: string | null
				} | null
			} | null
		} | null
		readonly multibanco_display_details?: {
			readonly entity?: string | null
			readonly expires_at?: number | null
			readonly hosted_voucher_url?: string | null
			readonly reference?: string | null
		} | null
		readonly oxxo_display_details?: {
			readonly expires_after?: number | null
			readonly hosted_voucher_url?: string | null
			readonly number?: string | null
		} | null
		readonly paynow_display_qr_code?: {
			readonly data?: string | null
			readonly hosted_instructions_url?: string | null
			readonly image_url_png?: string | null
			readonly image_url_svg?: string | null
		} | null
		readonly pix_display_qr_code?: {
			readonly data?: string | null
			readonly expires_at?: number | null
			readonly hosted_instructions_url?: string | null
			readonly image_url_png?: string | null
			readonly image_url_svg?: string | null
		} | null
		readonly promptpay_display_qr_code?: {
			readonly data?: string | null
			readonly hosted_instructions_url?: string | null
			readonly image_url_png?: string | null
			readonly image_url_svg?: string | null
		} | null
		readonly redirect_to_url?: {
			readonly return_url?: string | null
			readonly url?: string | null
		} | null
		readonly swish_handle_redirect_or_display_qr_code?: {
			readonly hosted_instructions_url?: string | null
			readonly qr_code?: {
				readonly data?: string | null
				readonly image_url_png?: string | null
				readonly image_url_svg?: string | null
			} | null
		} | null
		readonly type:
			| 'redirect_to_url'
			| 'use_stripe_sdk'
			| 'alipay_handle_redirect'
			| 'boleto_display_details'
			| 'card_await_notification'
			| 'cashapp_handle_redirect_or_display_qr_code'
			| 'display_bank_transfer_instructions'
			| 'konbini_display_details'
			| 'multibanco_display_details'
			| 'oxxo_display_details'
			| 'paynow_display_qr_code'
			| 'pix_display_qr_code'
			| 'promptpay_display_qr_code'
			| 'swish_handle_redirect_or_display_qr_code'
<<<<<<< HEAD
=======
			 
>>>>>>> origin/main
			| 'verify_with_microdeposits'
			| 'wechat_pay_display_qr_code'
			| 'wechat_pay_redirect_to_android_app'
			| 'wechat_pay_redirect_to_ios_app'
		readonly use_stripe_sdk?: Record<string, unknown> | null
		readonly verify_with_microdeposits?: {
			readonly arrival_date?: number | null
			readonly hosted_verification_url?: string | null
			readonly microdeposit_type?: 'amounts' | 'descriptor_code' | null
		} | null
		readonly wechat_pay_display_qr_code?: {
			readonly data?: string | null
			readonly hosted_instructions_url?: string | null
			readonly image_data_url?: string | null
			readonly image_url_png?: string | null
			readonly image_url_svg?: string | null
		} | null
		readonly wechat_pay_redirect_to_android_app?: {
			readonly app_id?: string | null
			readonly nonce_str?: string | null
			readonly package?: string | null
			readonly partner_id?: string | null
			readonly prepay_id?: string | null
			readonly sign?: string | null
			readonly timestamp?: string | null
		} | null
		readonly wechat_pay_redirect_to_ios_app?: {
			readonly native_url?: string | null
		} | null
	} | null
	readonly on_behalf_of?: string | null
	readonly payment_method?: string | null
	readonly payment_method_configuration_details?: {
		readonly id?: string | null
		readonly parent?: string | null
	} | null
	readonly payment_method_options?: {
		readonly acss_debit?: {
			readonly mandate_options?: {
				readonly custom_mandate_url?: string | null
				readonly interval_description?: string | null
				readonly payment_schedule?:
					| 'combined'
					| 'interval'
					| 'sporadic'
					| null
				readonly transaction_type?: 'business' | 'personal' | null
			} | null
			readonly setup_future_usage?:
				| 'none'
				| 'off_session'
				| 'on_session'
				| null
			readonly verification_method?:
				| 'automatic'
				| 'instant'
				| 'microdeposits'
				| null
		} | null
		readonly affirm?: {
			readonly capture_method?: 'manual' | null
			readonly preferred_locale?: string | null
			readonly setup_future_usage?: 'none' | null
		} | null
		readonly afterpay_clearpay?: {
			readonly capture_method?: 'manual' | null
			readonly reference?: string | null
			readonly setup_future_usage?: 'none' | null
		} | null
		readonly alipay?: {
			readonly setup_future_usage?: 'none' | 'off_session' | null
		} | null
		readonly au_becs_debit?: {
			readonly setup_future_usage?:
				| 'none'
				| 'off_session'
				| 'on_session'
				| null
		} | null
		readonly bacs_debit?: {
			readonly setup_future_usage?:
				| 'none'
				| 'off_session'
				| 'on_session'
				| null
		} | null
		readonly bancontact?: {
			readonly preferred_language?: 'de' | 'en' | 'fr' | 'nl' | null
			readonly setup_future_usage?: 'none' | 'off_session' | null
		} | null
		readonly blik?: {
			readonly setup_future_usage?: 'none' | null
		} | null
		readonly boleto?: {
			readonly expires_after_days?: number | null
			readonly setup_future_usage?:
				| 'none'
				| 'off_session'
				| 'on_session'
				| null
		} | null
		readonly card?: {
			readonly capture_method?: 'manual' | null
			readonly installments?: {
				readonly enabled?: boolean | null
				readonly plan?: {
					readonly count?: number | null
					readonly interval?: 'month' | null
					readonly type?: 'fixed_count' | null
				} | null
			} | null
			readonly mandate_options?: {
				readonly amount?: number | null
				readonly amount_type?: 'fixed' | 'maximum' | null
				readonly description?: string | null
				readonly end_date?: number | null
				readonly interval?:
					| 'day'
					| 'month'
					| 'sporadic'
					| 'week'
					| 'year'
					| null
				readonly interval_count?: number | null
				readonly reference?: string | null
				readonly start_date?: number | null
<<<<<<< HEAD
				readonly supported_types?: Array<'india'> | null
=======
				readonly supported_types?: 'india'[] | null
>>>>>>> origin/main
			} | null
			readonly network?:
				| 'amex'
				| 'cartes_bancaires'
				| 'diners'
				| 'discover'
				| 'eftpos_au'
				| 'interac'
				| 'jcb'
				| 'mastercard'
				| 'unionpay'
				| 'unknown'
				| 'visa'
				| null
			readonly request_three_d_secure?:
				| 'any'
				| 'automatic'
				| 'challenge'
				| null
			readonly require_cvc_recollection?: boolean | null
			readonly setup_future_usage?:
				| 'none'
				| 'off_session'
				| 'on_session'
				| null
			readonly statement_descriptor_suffix_kana?: string | null
			readonly statement_descriptor_suffix_kanji?: string | null
		} | null
		readonly card_present?: {
			readonly request_extended_authorization?: boolean | null
			readonly request_incremental_authorization_support?: boolean | null
		} | null
		readonly cashapp?: {
			readonly capture_method?: 'manual' | null
			readonly setup_future_usage?:
				| 'none'
				| 'off_session'
				| 'on_session'
				| null
		} | null
		readonly customer_balance?: {
			readonly bank_transfer?: {
				readonly eu_bank_transfer?: {
					readonly country?: string | null
				} | null
<<<<<<< HEAD
				readonly requested_address_types?: Array<
					| 'aba'
					| 'iban'
					| 'sepa'
					| 'sort_code'
					| 'spei'
					| 'swift'
					| 'zengin'
				> | null
=======
				readonly requested_address_types?:
					| (
							| 'aba'
							| 'iban'
							| 'sepa'
							| 'sort_code'
							| 'spei'
							| 'swift'
							| 'zengin'
					  )[]
					| null
>>>>>>> origin/main
				readonly type?:
					| 'eu_bank_transfer'
					| 'gb_bank_transfer'
					| 'jp_bank_transfer'
					| 'mx_bank_transfer'
					| 'us_bank_transfer'
					| null
			} | null
			readonly funding_type?: 'bank_transfer' | null
			readonly setup_future_usage?: 'none' | null
		} | null
		readonly eps?: {
			readonly setup_future_usage?: 'none' | null
		} | null
		readonly fpx?: {
			readonly setup_future_usage?: 'none' | null
		} | null
		readonly giropay?: {
			readonly setup_future_usage?: 'none' | null
		} | null
		readonly grabpay?: {
			readonly setup_future_usage?: 'none' | null
		} | null
		readonly ideal?: {
			readonly setup_future_usage?: 'none' | 'off_session' | null
		} | null
		readonly interac_present?: Record<string, unknown> | null
		readonly klarna?: {
			readonly capture_method?: 'manual' | null
			readonly preferred_locale?: string | null
			readonly setup_future_usage?: 'none' | null
		} | null
		readonly konbini?: {
			readonly confirmation_number?: string | null
			readonly expires_after_days?: number | null
			readonly expires_at?: number | null
			readonly product_description?: string | null
			readonly setup_future_usage?: 'none' | null
		} | null
		readonly link?: {
			readonly capture_method?: 'manual' | null
			readonly persistent_token?: string | null
			readonly setup_future_usage?: 'none' | 'off_session' | null
		} | null
		readonly multibanco?: {
			readonly setup_future_usage?: 'none' | null
		} | null
		readonly oxxo?: {
			readonly expires_after_days?: number | null
			readonly setup_future_usage?: 'none' | null
		} | null
		readonly p24?: {
			readonly setup_future_usage?: 'none' | null
			readonly tos_shown_and_accepted?: boolean | null
		} | null
		readonly paynow?: {
			readonly setup_future_usage?: 'none' | null
		} | null
		readonly paypal?: {
			readonly capture_method?: 'manual' | null
			readonly preferred_locale?: string | null
			readonly reference?: string | null
			readonly setup_future_usage?: 'none' | 'off_session' | null
		} | null
		readonly pix?: {
			readonly expires_after_seconds?: number | null
			readonly expires_at?: number | null
			readonly setup_future_usage?: 'none' | null
		} | null
		readonly promptpay?: {
			readonly setup_future_usage?: 'none' | null
		} | null
		readonly revolut_pay?: {
			readonly capture_method?: 'manual' | null
			readonly setup_future_usage?: 'none' | 'off_session' | null
		} | null
		readonly sepa_debit?: {
			readonly mandate_options?: Record<string, unknown> | null
			readonly setup_future_usage?:
				| 'none'
				| 'off_session'
				| 'on_session'
				| null
		} | null
		readonly sofort?: {
			readonly preferred_language?:
				| 'de'
				| 'en'
				| 'es'
				| 'fr'
				| 'it'
				| 'nl'
				| 'pl'
				| null
			readonly setup_future_usage?: 'none' | 'off_session' | null
		} | null
		readonly swish?: {
			readonly reference?: string | null
			readonly setup_future_usage?: 'none' | null
		} | null
		readonly us_bank_account?: {
			readonly financial_connections?: {
				readonly filters?: {
<<<<<<< HEAD
					readonly account_subcategory?: Array<
						'checking' | 'savings'
					> | null
				} | null
				readonly permissions?: Array<
					'balances' | 'ownership' | 'payment_method' | 'transactions'
				> | null
				readonly prefetch?: Array<
					'balances' | 'ownership' | 'transactions'
				> | null
=======
					readonly account_subcategory?:
						| ('checking' | 'savings')[]
						| null
				} | null
				readonly permissions?:
					| (
							| 'balances'
							| 'ownership'
							| 'payment_method'
							| 'transactions'
					  )[]
					| null
				readonly prefetch?:
					| ('balances' | 'ownership' | 'transactions')[]
					| null
>>>>>>> origin/main
				readonly return_url?: string | null
			} | null
			readonly mandate_options?: {
				readonly collection_method?: 'paper' | null
			} | null
			readonly preferred_settlement_speed?: 'fastest' | 'standard' | null
			readonly setup_future_usage?:
				| 'none'
				| 'off_session'
				| 'on_session'
				| null
			readonly verification_method?:
				| 'automatic'
				| 'instant'
				| 'microdeposits'
				| null
		} | null
		readonly wechat_pay?: {
			readonly app_id?: string | null
			readonly client?: 'android' | 'ios' | 'web' | null
			readonly setup_future_usage?: 'none' | null
		} | null
		readonly zip?: {
			readonly setup_future_usage?: 'none' | null
		} | null
	} | null
	readonly payment_method_types: PaymentMethodType[]
	readonly processing?: {
		readonly card?: {
			readonly customer_notification?: {
				readonly approval_requested?: boolean | null
				readonly completes_at?: number | null
			} | null
		} | null
		readonly type: 'card'
	} | null
	readonly receipt_email?: string | null
	readonly review?: string | null
	readonly setup_future_usage?: 'off_session' | 'on_session' | null
	readonly shipping?: {
		readonly address?: {
			readonly city?: string | null
			readonly country?: string | null
			readonly line1?: string | null
			readonly line2?: string | null
			readonly postal_code?: string | null
			readonly state?: string | null
		} | null
		readonly carrier?: string | null
		readonly name?: string | null
		readonly phone?: string | null
		readonly tracking_number?: string | null
	} | null
	readonly source?: string | null
	readonly statement_descriptor?: string | null
	readonly statement_descriptor_suffix?: string | null
	readonly status:
		| 'canceled'
		| 'processing'
		| 'requires_action'
		| 'requires_capture'
		| 'requires_confirmation'
		| 'requires_payment_method'
		| 'succeeded'
	readonly transfer_data?: {
		readonly amount?: number | null
		readonly destination?: string | null
	} | null
	readonly transfer_group?: string | null
}

/**
 * Comprehensive Stripe Setup Intent interface based on official API
 */
export interface StripeSetupIntent {
	readonly id: string
	readonly object: 'setup_intent'
	readonly application?: string | null
	readonly attach_to_self?: boolean | null
	readonly automatic_payment_methods?: {
		readonly allow_redirects?: 'always' | 'never' | null
		readonly enabled?: boolean | null
	} | null
	readonly cancellation_reason?:
		| 'abandoned'
		| 'duplicate'
		| 'requested_by_customer'
		| null
	readonly client_secret?: string | null
	readonly created: number
	readonly customer?: string | null
	readonly description?: string | null
<<<<<<< HEAD
	readonly flow_directions?: Array<'inbound' | 'outbound'> | null
=======
	readonly flow_directions?: ('inbound' | 'outbound')[] | null
>>>>>>> origin/main
	readonly last_setup_error?: {
		readonly code?: string | null
		readonly decline_code?: string | null
		readonly doc_url?: string | null
		readonly message?: string | null
		readonly param?: string | null
		readonly payment_method?: {
			readonly id: string
			readonly object: 'payment_method'
		} | null
		readonly setup_intent?: {
			readonly id: string
			readonly object: 'setup_intent'
		} | null
		readonly source?: {
			readonly id: string
			readonly object: 'source'
		} | null
		readonly type:
			| 'api_error'
			| 'card_error'
			| 'idempotency_error'
			| 'invalid_request_error'
	} | null
	readonly latest_attempt?: string | null
	readonly livemode: boolean
	readonly mandate?: string | null
	readonly metadata: Record<string, string>
	readonly next_action?: {
		readonly cashapp_handle_redirect_or_display_qr_code?: {
			readonly hosted_instructions_url?: string | null
			readonly mobile_auth_url?: string | null
			readonly qr_code?: {
				readonly expires_at?: number | null
				readonly image_url_png?: string | null
				readonly image_url_svg?: string | null
			} | null
		} | null
		readonly redirect_to_url?: {
			readonly return_url?: string | null
			readonly url?: string | null
		} | null
		readonly type:
			| 'redirect_to_url'
			| 'use_stripe_sdk'
			| 'cashapp_handle_redirect_or_display_qr_code'
			| 'verify_with_microdeposits'
		readonly use_stripe_sdk?: Record<string, unknown> | null
		readonly verify_with_microdeposits?: {
			readonly arrival_date?: number | null
			readonly hosted_verification_url?: string | null
			readonly microdeposit_type?: 'amounts' | 'descriptor_code' | null
		} | null
	} | null
	readonly on_behalf_of?: string | null
	readonly payment_method?: string | null
	readonly payment_method_configuration_details?: {
		readonly id?: string | null
		readonly parent?: string | null
	} | null
	readonly payment_method_options?: {
		readonly acss_debit?: {
			readonly currency?: 'cad' | 'usd' | null
			readonly mandate_options?: {
				readonly custom_mandate_url?: string | null
<<<<<<< HEAD
				readonly default_for?: Array<'invoice' | 'subscription'> | null
=======
				readonly default_for?: ('invoice' | 'subscription')[] | null
>>>>>>> origin/main
				readonly interval_description?: string | null
				readonly payment_schedule?:
					| 'combined'
					| 'interval'
					| 'sporadic'
					| null
				readonly transaction_type?: 'business' | 'personal' | null
			} | null
			readonly verification_method?:
				| 'automatic'
				| 'instant'
				| 'microdeposits'
				| null
		} | null
		readonly amazon_pay?: {
			readonly mandate_options?: {
				readonly reference?: string | null
			} | null
		} | null
		readonly au_becs_debit?: {
			readonly currency?: 'aud' | null
			readonly mandate_options?: Record<string, unknown> | null
		} | null
		readonly bacs_debit?: {
			readonly mandate_options?: Record<string, unknown> | null
		} | null
		readonly card?: {
			readonly mandate_options?: {
				readonly amount?: number | null
				readonly amount_type?: 'fixed' | 'maximum' | null
				readonly currency?: SupportedCurrency | null
				readonly description?: string | null
				readonly end_date?: number | null
				readonly interval?:
					| 'day'
					| 'month'
					| 'sporadic'
					| 'week'
					| 'year'
					| null
				readonly interval_count?: number | null
				readonly reference?: string | null
				readonly start_date?: number | null
<<<<<<< HEAD
				readonly supported_types?: Array<'india'> | null
=======
				readonly supported_types?: 'india'[] | null
>>>>>>> origin/main
			} | null
			readonly network?:
				| 'amex'
				| 'cartes_bancaires'
				| 'diners'
				| 'discover'
				| 'eftpos_au'
				| 'interac'
				| 'jcb'
				| 'mastercard'
				| 'unionpay'
				| 'unknown'
				| 'visa'
				| null
			readonly request_three_d_secure?:
				| 'any'
				| 'automatic'
				| 'challenge'
				| null
		} | null
		readonly card_present?: {
<<<<<<< HEAD
			readonly mandate_options?: {
				readonly amount?: number | null
				readonly amount_type?: 'fixed' | 'maximum' | null
				readonly currency?: SupportedCurrency | null
				readonly description?: string | null
				readonly end_date?: number | null
				readonly interval?:
					| 'day'
					| 'month'
					| 'sporadic'
					| 'week'
					| 'year'
					| null
				readonly interval_count?: number | null
				readonly reference?: string | null
				readonly start_date?: number | null
				readonly supported_types?: Array<'india'> | null
			} | null
			readonly network?:
				| 'amex'
				| 'cartes_bancaires'
				| 'diners'
				| 'discover'
				| 'eftpos_au'
				| 'interac'
				| 'jcb'
				| 'mastercard'
				| 'unionpay'
				| 'unknown'
				| 'visa'
				| null
			readonly request_three_d_secure?:
				| 'any'
				| 'automatic'
				| 'challenge'
				| null
=======
			readonly request_extended_authorization?: boolean | null
			readonly request_incremental_authorization_support?: boolean | null
>>>>>>> origin/main
		} | null
		readonly cashapp?: {
			readonly mandate_options?: {
				readonly reference?: string | null
			} | null
		} | null
		readonly link?: {
			readonly persistent_token?: string | null
		} | null
		readonly paypal?: {
			readonly billing_agreement_id?: string | null
			readonly mandate_options?: {
				readonly reference?: string | null
			} | null
		} | null
		readonly revolut_pay?: Record<string, unknown> | null
		readonly sepa_debit?: {
			readonly mandate_options?: Record<string, unknown> | null
		} | null
		readonly us_bank_account?: {
			readonly financial_connections?: {
				readonly filters?: {
<<<<<<< HEAD
					readonly account_subcategory?: Array<
						'checking' | 'savings'
					> | null
				} | null
				readonly manual_entry?: Record<string, unknown> | null
				readonly permissions?: Array<
					'balances' | 'ownership' | 'payment_method' | 'transactions'
				> | null
				readonly prefetch?: Array<
					'balances' | 'ownership' | 'transactions'
				> | null
=======
					readonly account_subcategory?:
						| ('checking' | 'savings')[]
						| null
				} | null
				readonly manual_entry?: Record<string, unknown> | null
				readonly permissions?:
					| (
							| 'balances'
							| 'ownership'
							| 'payment_method'
							| 'transactions'
					  )[]
					| null
				readonly prefetch?:
					| ('balances' | 'ownership' | 'transactions')[]
					| null
>>>>>>> origin/main
				readonly return_url?: string | null
			} | null
			readonly mandate_options?: {
				readonly collection_method?: 'paper' | null
			} | null
			readonly verification_method?:
				| 'automatic'
				| 'instant'
				| 'microdeposits'
				| null
		} | null
	} | null
	readonly payment_method_types: PaymentMethodType[]
	readonly single_use_mandate?: string | null
	readonly status:
		| 'canceled'
		| 'processing'
		| 'requires_action'
		| 'requires_confirmation'
		| 'requires_payment_method'
		| 'succeeded'
	readonly usage: 'off_session' | 'on_session'
}

/**
 * Additional Stripe objects for comprehensive coverage
 */

/**
 * Stripe Tax Rate object
 */
export interface StripeTaxRate {
	readonly id: string
	readonly object: 'tax_rate'
	readonly active: boolean
	readonly country?: string | null
	readonly created: number
	readonly description?: string | null
	readonly display_name: string
	readonly effective_percentage?: number | null
	readonly inclusive: boolean
	readonly jurisdiction?: string | null
	readonly jurisdiction_level?:
		| 'city'
		| 'country'
		| 'county'
		| 'district'
		| 'multiple'
		| 'state'
		| null
	readonly livemode: boolean
	readonly metadata: Record<string, string>
	readonly percentage: number
	readonly state?: string | null
	readonly tax_type?:
		| 'amusement_tax'
		| 'communications_tax'
		| 'gst'
		| 'hst'
		| 'igst'
		| 'jct'
		| 'lease_tax'
		| 'pst'
		| 'qst'
		| 'rst'
		| 'sales_tax'
		| 'vat'
		| null
}

/**
 * Stripe Coupon object
 */
export interface StripeCoupon {
	readonly id: string
	readonly object: 'coupon'
	readonly amount_off?: number | null
	readonly applies_to?: {
		readonly products: string[]
	} | null
	readonly created: number
	readonly currency?: SupportedCurrency | null
	readonly currency_options?: Record<
		string,
		{
			readonly amount_off: number
		}
	>
	readonly duration: 'forever' | 'once' | 'repeating'
	readonly duration_in_months?: number | null
	readonly livemode: boolean
	readonly max_redemptions?: number | null
	readonly metadata: Record<string, string>
	readonly name?: string | null
	readonly percent_off?: number | null
	readonly redeem_by?: number | null
	readonly times_redeemed: number
	readonly valid: boolean
}

/**
 * Stripe Discount object
 */
export interface StripeDiscount {
	readonly id: string
	readonly object: 'discount'
	readonly checkout_session?: string | null
	readonly coupon: StripeCoupon
	readonly customer?: string | null
	readonly end?: number | null
	readonly invoice?: string | null
	readonly invoice_item?: string | null
	readonly promotion_code?: string | null
	readonly start: number
	readonly subscription?: string | null
	readonly subscription_item?: string | null
}

/**
 * Stripe Refund object
 */
export interface StripeRefund {
	readonly id: string
	readonly object: 'refund'
	readonly amount: number
	readonly charge?: string | null
	readonly created: number
	readonly currency: SupportedCurrency
	readonly destination_details?: {
		readonly card?: {
			readonly reference?: string | null
			readonly reference_status?:
				| 'available'
				| 'missing'
				| 'requested'
				| null
			readonly reference_type?:
				| 'acquirer_reference_number'
				| 'merchant_advice_code'
				| 'merchant_reference'
				| null
			readonly type?: 'refund' | 'reversal' | null
		} | null
		readonly type: 'card'
	} | null
	readonly failure_balance_transaction?: string | null
	readonly failure_reason?:
		| 'expired_or_canceled_card'
		| 'lost_or_stolen_card'
		| 'merchant_request'
		| 'unknown'
		| null
	readonly instructions_email?: string | null
	readonly metadata: Record<string, string>
	readonly next_action?: {
		readonly display_details?: {
			readonly email_sent?: {
				readonly email_sent_at?: number | null
				readonly email_sent_to?: string | null
			} | null
			readonly expires_at?: number | null
		} | null
		readonly type?: string | null
	} | null
	readonly payment_intent?: string | null
	readonly reason?:
		| 'duplicate'
		| 'fraudulent'
		| 'requested_by_customer'
		| 'expired_uncaptured_charge'
		| null
	readonly receipt_number?: string | null
	readonly source_transfer_reversal?: string | null
	readonly status?:
		| 'canceled'
		| 'failed'
		| 'pending'
		| 'requires_action'
		| 'succeeded'
		| null
	readonly transfer_reversal?: string | null
}

/**
 * Stripe Dispute object
 */
export interface StripeDispute {
	readonly id: string
	readonly object: 'dispute'
	readonly amount: number
<<<<<<< HEAD
	readonly balance_transactions: Array<{
=======
	readonly balance_transactions: {
>>>>>>> origin/main
		readonly id: string
		readonly object: 'balance_transaction'
		readonly amount: number
		readonly available_on: number
		readonly created: number
		readonly currency: SupportedCurrency
		readonly description?: string | null
		readonly exchange_rate?: number | null
		readonly fee: number
<<<<<<< HEAD
		readonly fee_details: Array<{
=======
		readonly fee_details: {
>>>>>>> origin/main
			readonly amount: number
			readonly currency: SupportedCurrency
			readonly description?: string | null
			readonly type:
				| 'application_fee'
				| 'payment_method_passthrough_fee'
				| 'stripe_fee'
				| 'tax'
<<<<<<< HEAD
		}>
=======
		}[]
>>>>>>> origin/main
		readonly net: number
		readonly reporting_category:
			| 'advance'
			| 'advance_funding'
			| 'anticipation_repayment'
			| 'chargeback'
			| 'connect_collection_transfer'
			| 'contribution'
			| 'converted_payout'
			| 'deposit'
			| 'dispute'
			| 'fee'
			| 'financing_paydown'
			| 'financing_paydown_reversal'
			| 'financing_payout'
			| 'financing_payout_reversal'
			| 'issuing_authorization_hold'
			| 'issuing_authorization_release'
			| 'issuing_dispute'
			| 'issuing_transaction'
			| 'network_cost'
			| 'other_adjustment'
			| 'partial_capture_reversal'
			| 'payout'
			| 'payout_reversal'
			| 'platform_earning'
			| 'platform_earning_refund'
			| 'refund'
			| 'refund_failure'
			| 'risk_reserved_funds'
			| 'tax'
			| 'topup'
			| 'topup_reversal'
			| 'transfer'
			| 'transfer_reversal'
		readonly source?: string | null
		readonly status: 'available' | 'pending'
		readonly type:
			| 'adjustment'
			| 'advance'
			| 'advance_funding'
			| 'anticipation_repayment'
			| 'application_fee'
			| 'application_fee_refund'
			| 'charge'
			| 'climate_order_purchase'
			| 'connect_collection_transfer'
			| 'contribution'
			| 'issuing_authorization_hold'
			| 'issuing_authorization_release'
			| 'issuing_dispute'
			| 'issuing_transaction'
			| 'payment'
			| 'payment_failure_refund'
			| 'payment_network_reserve_hold'
			| 'payment_network_reserve_release'
			| 'payment_refund'
			| 'payment_reversal'
			| 'payment_unreconciled'
			| 'payout'
			| 'payout_cancel'
			| 'payout_failure'
			| 'refund'
			| 'refund_failure'
			| 'reserve_transaction'
			| 'reserved_funds'
			| 'stripe_fee'
			| 'stripe_fx_fee'
			| 'tax_fee'
			| 'topup'
			| 'topup_reversal'
			| 'transfer'
			| 'transfer_cancel'
			| 'transfer_failure'
			| 'transfer_refund'
<<<<<<< HEAD
	}>
=======
	}[]
>>>>>>> origin/main
	readonly charge: string
	readonly created: number
	readonly currency: SupportedCurrency
	readonly evidence: {
		readonly access_activity_log?: string | null
		readonly billing_address?: string | null
		readonly cancellation_policy?: string | null
		readonly cancellation_policy_disclosure?: string | null
		readonly cancellation_rebuttal?: string | null
		readonly customer_communication?: string | null
		readonly customer_email_address?: string | null
		readonly customer_name?: string | null
		readonly customer_purchase_ip?: string | null
		readonly customer_signature?: string | null
		readonly duplicate_charge_documentation?: string | null
		readonly duplicate_charge_explanation?: string | null
		readonly duplicate_charge_id?: string | null
		readonly product_description?: string | null
		readonly receipt?: string | null
		readonly refund_policy?: string | null
		readonly refund_policy_disclosure?: string | null
		readonly refund_refusal_explanation?: string | null
		readonly service_date?: string | null
		readonly service_documentation?: string | null
		readonly shipping_address?: string | null
		readonly shipping_carrier?: string | null
		readonly shipping_date?: string | null
		readonly shipping_documentation?: string | null
		readonly shipping_tracking_number?: string | null
		readonly uncategorized_file?: string | null
		readonly uncategorized_text?: string | null
	}
	readonly evidence_details: {
		readonly due_by: number
		readonly has_evidence: boolean
		readonly past_due: boolean
		readonly submission_count: number
	}
	readonly is_charge_refundable: boolean
	readonly livemode: boolean
	readonly metadata: Record<string, string>
	readonly network_reason_code?: string | null
	readonly reason:
		| 'credit_not_processed'
		| 'duplicate'
		| 'fraudulent'
		| 'general'
		| 'incorrect_account_details'
		| 'insufficient_funds'
		| 'product_not_received'
		| 'product_unacceptable'
		| 'subscription_canceled'
		| 'unrecognized'
	readonly status:
		| 'warning_needs_response'
		| 'warning_under_review'
		| 'warning_closed'
		| 'needs_response'
		| 'under_review'
		| 'charge_refunded'
		| 'won'
		| 'lost'
}

/**
 * Stripe Charge object
 */
export interface StripeCharge {
	readonly id: string
	readonly object: 'charge'
	readonly amount: number
	readonly amount_captured: number
	readonly amount_refunded: number
	readonly application?: string | null
	readonly application_fee?: string | null
	readonly application_fee_amount?: number | null
	readonly balance_transaction?: string | null
	readonly billing_details: {
		readonly address?: {
			readonly city?: string | null
			readonly country?: string | null
			readonly line1?: string | null
			readonly line2?: string | null
			readonly postal_code?: string | null
			readonly state?: string | null
		} | null
		readonly email?: string | null
		readonly name?: string | null
		readonly phone?: string | null
	}
	readonly calculated_statement_descriptor?: string | null
	readonly captured: boolean
	readonly created: number
	readonly currency: SupportedCurrency
	readonly customer?: string | null
	readonly description?: string | null
	readonly destination?: string | null
	readonly dispute?: string | null
	readonly disputed: boolean
	readonly failure_balance_transaction?: string | null
	readonly failure_code?: string | null
	readonly failure_message?: string | null
	readonly fraud_details?: {
		readonly stripe_report?: 'fraudulent' | null
		readonly user_report?: 'fraudulent' | 'safe' | null
	} | null
	readonly invoice?: string | null
	readonly livemode: boolean
	readonly metadata: Record<string, string>
	readonly on_behalf_of?: string | null
	readonly order?: string | null
	readonly outcome?: {
		readonly network_status?:
			| 'approved_by_network'
			| 'declined_by_network'
			| 'not_sent_to_network'
			| 'reversed_after_approval'
			| null
		readonly reason?:
			| 'approved'
			| 'declined'
			| 'manual_review'
			| 'issuer_declined'
			| 'blocked'
			| 'invalid'
			| null
		readonly risk_level?: 'normal' | 'elevated' | 'highest' | null
		readonly risk_score?: number | null
		readonly seller_message?: string | null
		readonly type?:
			| 'authorized'
			| 'manual_review'
			| 'issuer_declined'
			| 'blocked'
			| 'invalid'
			| null
	} | null
	readonly paid: boolean
	readonly payment_intent?: string | null
	readonly payment_method?: string | null
	readonly payment_method_details?: {
		readonly ach_credit_transfer?: {
			readonly account_number?: string | null
			readonly bank_name?: string | null
			readonly routing_number?: string | null
			readonly swift_code?: string | null
		} | null
		readonly ach_debit?: {
			readonly account_holder_type?: 'company' | 'individual' | null
			readonly bank_name?: string | null
			readonly country?: string | null
			readonly fingerprint?: string | null
			readonly last4?: string | null
			readonly routing_number?: string | null
		} | null
		readonly acss_debit?: {
			readonly bank_name?: string | null
			readonly fingerprint?: string | null
			readonly institution_number?: string | null
			readonly last4?: string | null
			readonly mandate?: string | null
			readonly transit_number?: string | null
		} | null
		readonly affirm?: {
			readonly transaction_id?: string | null
		} | null
		readonly afterpay_clearpay?: {
			readonly order_id?: string | null
			readonly reference?: string | null
		} | null
		readonly alipay?: {
			readonly buyer_id?: string | null
			readonly fingerprint?: string | null
			readonly transaction_id?: string | null
		} | null
		readonly amazon_pay?: Record<string, unknown> | null
		readonly au_becs_debit?: {
			readonly bsb_number?: string | null
			readonly fingerprint?: string | null
			readonly last4?: string | null
			readonly mandate?: string | null
		} | null
		readonly bacs_debit?: {
			readonly fingerprint?: string | null
			readonly last4?: string | null
			readonly mandate?: string | null
			readonly sort_code?: string | null
		} | null
		readonly bancontact?: {
			readonly bank_code?: string | null
			readonly bank_name?: string | null
			readonly bic?: string | null
			readonly generated_sepa_debit?: string | null
			readonly generated_sepa_debit_mandate?: string | null
			readonly iban_last4?: string | null
			readonly preferred_language?: 'de' | 'en' | 'fr' | 'nl' | null
			readonly verified_name?: string | null
		} | null
		readonly blik?: Record<string, unknown> | null
		readonly boleto?: {
			readonly tax_id?: string | null
		} | null
		readonly card?: {
			readonly amount_authorized?: number | null
			readonly brand?:
				| 'amex'
				| 'diners'
				| 'discover'
				| 'eftpos_au'
				| 'jcb'
				| 'mastercard'
				| 'unionpay'
				| 'visa'
				| 'unknown'
				| null
			readonly capture_before?: number | null
			readonly checks?: {
				readonly address_line1_check?:
					| 'fail'
					| 'pass'
					| 'unavailable'
					| 'unchecked'
					| null
				readonly address_postal_code_check?:
					| 'fail'
					| 'pass'
					| 'unavailable'
					| 'unchecked'
					| null
				readonly cvc_check?:
					| 'fail'
					| 'pass'
					| 'unavailable'
					| 'unchecked'
					| null
			} | null
			readonly country?: string | null
			readonly exp_month?: number | null
			readonly exp_year?: number | null
			readonly extended_authorization?: {
				readonly status?: 'disabled' | 'enabled' | null
			} | null
			readonly fingerprint?: string | null
			readonly funding?: 'credit' | 'debit' | 'prepaid' | 'unknown' | null
			readonly incremental_authorization?: {
				readonly status?: 'available' | 'unavailable' | null
			} | null
			readonly installments?: {
				readonly plan?: {
					readonly count?: number | null
					readonly interval?: 'month' | null
					readonly type?: 'fixed_count' | null
				} | null
			} | null
			readonly last4?: string | null
			readonly mandate?: string | null
			readonly multicapture?: {
				readonly status?: 'available' | 'unavailable' | null
			} | null
			readonly network?:
				| 'amex'
				| 'cartes_bancaires'
				| 'diners'
				| 'discover'
				| 'eftpos_au'
				| 'interac'
				| 'jcb'
				| 'mastercard'
				| 'unionpay'
				| 'visa'
				| 'unknown'
				| null
			readonly network_token?: {
				readonly used?: boolean | null
			} | null
			readonly overcapture?: {
				readonly maximum_amount_capturable?: number | null
				readonly status?: 'available' | 'unavailable' | null
			} | null
			readonly three_d_secure?: {
				readonly authentication_flow?:
					| 'challenge'
					| 'frictionless'
					| null
				readonly electronic_commerce_indicator?:
					| '01'
					| '02'
					| '05'
					| '06'
					| '07'
					| null
				readonly result?:
					| 'attempt_acknowledged'
					| 'authenticated'
					| 'exempted'
					| 'failed'
					| 'not_supported'
					| 'processing_error'
					| null
				readonly result_reason?:
					| 'abandoned'
					| 'bypassed'
					| 'canceled'
					| 'card_not_enrolled'
					| 'network_not_supported'
					| 'protocol_error'
					| 'rejected'
					| null
				readonly transaction_id?: string | null
				readonly version?: '1.0.2' | '2.1.0' | '2.2.0' | null
			} | null
			readonly wallet?: {
				readonly amex_express_checkout?: Record<string, unknown> | null
				readonly apple_pay?: Record<string, unknown> | null
				readonly dynamic_last4?: string | null
				readonly google_pay?: Record<string, unknown> | null
				readonly link?: Record<string, unknown> | null
				readonly masterpass?: {
					readonly billing_address?: {
						readonly city?: string | null
						readonly country?: string | null
						readonly line1?: string | null
						readonly line2?: string | null
						readonly postal_code?: string | null
						readonly state?: string | null
					} | null
					readonly email?: string | null
					readonly name?: string | null
					readonly shipping_address?: {
						readonly city?: string | null
						readonly country?: string | null
						readonly line1?: string | null
						readonly line2?: string | null
						readonly postal_code?: string | null
						readonly state?: string | null
					} | null
				} | null
				readonly samsung_pay?: Record<string, unknown> | null
				readonly type?:
					| 'amex_express_checkout'
					| 'apple_pay'
					| 'google_pay'
					| 'link'
					| 'masterpass'
					| 'samsung_pay'
					| 'visa_checkout'
					| null
				readonly visa_checkout?: {
					readonly billing_address?: {
						readonly city?: string | null
						readonly country?: string | null
						readonly line1?: string | null
						readonly line2?: string | null
						readonly postal_code?: string | null
						readonly state?: string | null
					} | null
					readonly email?: string | null
					readonly name?: string | null
					readonly shipping_address?: {
						readonly city?: string | null
						readonly country?: string | null
						readonly line1?: string | null
						readonly line2?: string | null
						readonly postal_code?: string | null
						readonly state?: string | null
					} | null
				} | null
			} | null
		} | null
		readonly card_present?: {
			readonly amount_authorized?: number | null
			readonly brand?:
				| 'amex'
				| 'diners'
				| 'discover'
				| 'eftpos_au'
				| 'jcb'
				| 'mastercard'
				| 'unionpay'
				| 'visa'
				| 'unknown'
				| null
			readonly capture_before?: number | null
			readonly cardholder_name?: string | null
			readonly country?: string | null
			readonly emv_auth_data?: string | null
			readonly exp_month?: number | null
			readonly exp_year?: number | null
			readonly fingerprint?: string | null
			readonly funding?: 'credit' | 'debit' | 'prepaid' | 'unknown' | null
			readonly generated_card?: string | null
			readonly incremental_authorization?: {
				readonly status?: 'available' | 'unavailable' | null
			} | null
			readonly last4?: string | null
			readonly network?:
				| 'amex'
				| 'cartes_bancaires'
				| 'diners'
				| 'discover'
				| 'eftpos_au'
				| 'interac'
				| 'jcb'
				| 'mastercard'
				| 'unionpay'
				| 'visa'
				| 'unknown'
				| null
			readonly overcapture?: {
				readonly maximum_amount_capturable?: number | null
				readonly status?: 'available' | 'unavailable' | null
			} | null
			readonly read_method?:
				| 'contact_emv'
				| 'contactless_emv'
				| 'contactless_magstripe_mode'
				| 'magnetic_stripe_fallback'
				| 'magnetic_stripe_track2'
				| null
			readonly receipt?: {
				readonly account_type?:
					| 'checking'
					| 'credit'
					| 'prepaid'
					| 'unknown'
					| null
				readonly application_cryptogram?: string | null
				readonly application_preferred_name?: string | null
				readonly authorization_code?: string | null
				readonly authorization_response_code?: string | null
				readonly cardholder_verification_method?: string | null
				readonly dedicated_file_name?: string | null
				readonly terminal_verification_results?: string | null
				readonly transaction_status_information?: string | null
			} | null
		} | null
		readonly cashapp?: {
			readonly buyer_id?: string | null
			readonly cashtag?: string | null
		} | null
		readonly customer_balance?: Record<string, unknown> | null
		readonly eps?: {
			readonly bank?:
				| 'arzte_und_apotheker_bank'
				| 'austrian_anadi_bank_ag'
				| 'bank_austria'
				| 'bankhaus_carl_spangler'
				| 'bankhaus_schelhammer_und_schattera_ag'
				| 'bawag_psk_ag'
				| 'bks_bank_ag'
				| 'brull_kallmus_bank_ag'
				| 'btv_vier_lander_bank'
				| 'capital_bank_grawe_gruppe_ag'
				| 'deutsche_bank_ag'
				| 'dolomitenbank'
				| 'easybank_ag'
				| 'erste_bank_und_sparkassen'
				| 'hypo_alpeadriabank_international_ag'
				| 'hypo_bank_burgenland_aktiengesellschaft'
				| 'hypo_noe_lb_fur_niederosterreich_u_wien'
				| 'hypo_oberosterreich_salzburg_steiermark'
				| 'hypo_tirol_bank_ag'
				| 'hypo_vorarlberg_bank_ag'
				| 'marchfelder_bank'
				| 'oberbank_ag'
				| 'raiffeisen_bankengruppe_osterreich'
				| 'schoellerbank_ag'
				| 'sparda_bank_wien'
				| 'volksbank_gruppe'
				| 'volkskreditbank_ag'
				| 'vr_bank_braunau'
				| null
			readonly verified_name?: string | null
		} | null
		readonly fpx?: {
			readonly bank?:
				| 'affin_bank'
				| 'agrobank'
				| 'alliance_bank'
				| 'ambank'
				| 'bank_islam'
				| 'bank_muamalat'
				| 'bank_rakyat'
				| 'bsn'
				| 'cimb'
				| 'hong_leong_bank'
				| 'hsbc'
				| 'kfh'
				| 'maybank2u'
				| 'ocbc'
				| 'public_bank'
				| 'rhb'
				| 'standard_chartered'
				| 'uob'
				| 'deutsche_bank'
				| 'maybank2e'
				| 'pb_enterprise'
				| null
			readonly transaction_id?: string | null
		} | null
		readonly giropay?: {
			readonly bank_code?: string | null
			readonly bank_name?: string | null
			readonly bic?: string | null
			readonly verified_name?: string | null
		} | null
		readonly grabpay?: {
			readonly transaction_id?: string | null
		} | null
		readonly ideal?: {
			readonly bank?:
				| 'abn_amro'
				| 'asn_bank'
				| 'bunq'
				| 'handelsbanken'
				| 'ing'
				| 'knab'
				| 'moneyou'
				| 'n26'
				| 'nn'
				| 'rabobank'
				| 'regiobank'
				| 'revolut'
				| 'sns_bank'
				| 'triodos_bank'
				| 'van_lanschot'
				| 'yoursafe'
				| null
			readonly bic?:
				| 'abnanl2a'
				| 'asnbnl21'
				| 'bitsnl2a'
				| 'bunqnl2a'
				| 'fvlbnl22'
				| 'handnl2a'
				| 'ingbnl2a'
				| 'knabnl2h'
				| 'moyonl21'
				| 'nnbanl2g'
				| 'ntsbdeb1'
				| 'rabonl2u'
				| 'rbrbnl21'
				| 'revoie23'
				| 'snsbnl2a'
				| 'trionl2u'
				| null
			readonly generated_sepa_debit?: string | null
			readonly generated_sepa_debit_mandate?: string | null
			readonly iban_last4?: string | null
			readonly verified_name?: string | null
		} | null
		readonly interac_present?: {
			readonly brand?: string | null
			readonly cardholder_name?: string | null
			readonly country?: string | null
			readonly emv_auth_data?: string | null
			readonly exp_month?: number | null
			readonly exp_year?: number | null
			readonly fingerprint?: string | null
			readonly funding?: 'credit' | 'debit' | 'prepaid' | 'unknown' | null
			readonly generated_card?: string | null
			readonly last4?: string | null
			readonly network?: 'interac' | null
			readonly preferred_language?: 'en' | 'fr' | null
			readonly read_method?:
				| 'contact_emv'
				| 'contactless_emv'
				| 'contactless_magstripe_mode'
				| 'magnetic_stripe_fallback'
				| 'magnetic_stripe_track2'
				| null
			readonly receipt?: {
				readonly account_type?:
					| 'checking'
					| 'savings'
					| 'unknown'
					| null
				readonly application_cryptogram?: string | null
				readonly application_preferred_name?: string | null
				readonly authorization_code?: string | null
				readonly authorization_response_code?: string | null
				readonly cardholder_verification_method?: string | null
				readonly dedicated_file_name?: string | null
				readonly terminal_verification_results?: string | null
				readonly transaction_status_information?: string | null
			} | null
		} | null
		readonly klarna?: {
			readonly preferred_locale?: string | null
		} | null
		readonly konbini?: Record<string, unknown> | null
		readonly link?: {
			readonly country?: string | null
			readonly persistent_token?: string | null
		} | null
		readonly multibanco?: {
			readonly entity?: string | null
			readonly reference?: string | null
		} | null
		readonly oxxo?: {
			readonly number?: string | null
		} | null
		readonly p24?: {
			readonly bank?:
				| 'alior_bank'
				| 'bank_millennium'
				| 'bank_nowy_bfg_sa'
				| 'bank_pekao_sa'
				| 'banki_spbdzielcze'
				| 'blik'
				| 'bnp_paribas'
				| 'boz'
				| 'citi_handlowy'
				| 'credit_agricole'
				| 'envelobank'
				| 'etransfer_pocztowy24'
				| 'getin_bank'
				| 'ideabank'
				| 'ing'
				| 'inteligo'
				| 'mbank_mtransfer'
				| 'nest_przelew'
				| 'noble_pay'
				| 'pbac_z_ipko'
				| 'plus_bank'
				| 'santander_przelew24'
				| 'tmobile_usbugi_bankowe'
				| 'toyota_bank'
				| 'volkswagen_bank'
				| null
			readonly reference?: string | null
			readonly verified_name?: string | null
		} | null
		readonly paynow?: {
			readonly reference?: string | null
		} | null
		readonly paypal?: {
			readonly payer_email?: string | null
			readonly payer_id?: string | null
			readonly payer_name?: string | null
			readonly seller_protection?: {
<<<<<<< HEAD
				readonly dispute_categories?: Array<
					'fraudulent' | 'product_not_received'
				> | null
=======
				readonly dispute_categories?:
					| ('fraudulent' | 'product_not_received')[]
					| null
>>>>>>> origin/main
				readonly status?:
					| 'eligible'
					| 'not_eligible'
					| 'partially_eligible'
					| null
			} | null
			readonly transaction_id?: string | null
		} | null
		readonly pix?: {
			readonly bank_transaction_id?: string | null
		} | null
		readonly promptpay?: {
			readonly reference?: string | null
		} | null
		readonly revolut_pay?: Record<string, unknown> | null
		readonly sepa_credit_transfer?: {
			readonly bank_name?: string | null
			readonly bic?: string | null
			readonly iban?: string | null
		} | null
		readonly sepa_debit?: {
			readonly bank_code?: string | null
			readonly branch_code?: string | null
			readonly country?: string | null
			readonly fingerprint?: string | null
			readonly last4?: string | null
			readonly mandate?: string | null
		} | null
		readonly sofort?: {
			readonly bank_code?: string | null
			readonly bank_name?: string | null
			readonly bic?: string | null
			readonly country?: string | null
			readonly iban_last4?: string | null
			readonly preferred_language?:
				| 'de'
				| 'en'
				| 'es'
				| 'fr'
				| 'it'
				| 'nl'
				| 'pl'
				| null
			readonly verified_name?: string | null
		} | null
		readonly stripe_account?: Record<string, unknown> | null
		readonly swish?: {
			readonly fingerprint?: string | null
			readonly payment_reference?: string | null
			readonly verified_phone_last4?: string | null
		} | null
		readonly type: string
		readonly us_bank_account?: {
			readonly account_holder_type?: 'company' | 'individual' | null
			readonly account_type?: 'checking' | 'savings' | null
			readonly bank_name?: string | null
			readonly fingerprint?: string | null
			readonly last4?: string | null
			readonly mandate?: string | null
			readonly routing_number?: string | null
		} | null
		readonly wechat?: Record<string, unknown> | null
		readonly wechat_pay?: {
			readonly fingerprint?: string | null
			readonly transaction_id?: string | null
		} | null
		readonly zip?: Record<string, unknown> | null
	} | null
	readonly radar_options?: {
		readonly session?: string | null
	} | null
	readonly receipt_email?: string | null
	readonly receipt_number?: string | null
	readonly receipt_url?: string | null
	readonly refunded: boolean
	readonly refunds: {
		readonly object: 'list'
		readonly data: StripeRefund[]
		readonly has_more: boolean
		readonly total_count?: number | null
		readonly url: string
	}
	readonly review?: string | null
	readonly shipping?: {
		readonly address?: {
			readonly city?: string | null
			readonly country?: string | null
			readonly line1?: string | null
			readonly line2?: string | null
			readonly postal_code?: string | null
			readonly state?: string | null
		} | null
		readonly carrier?: string | null
		readonly name?: string | null
		readonly phone?: string | null
		readonly tracking_number?: string | null
	} | null
	readonly source?: Record<string, unknown> | null
	readonly source_transfer?: string | null
	readonly statement_descriptor?: string | null
	readonly statement_descriptor_suffix?: string | null
	readonly status: 'failed' | 'pending' | 'succeeded'
	readonly transfer_data?: {
		readonly amount?: number | null
		readonly destination?: string | null
	} | null
	readonly transfer_group?: string | null
}

/**
 * Stripe Invoice Rendering Template object
 */
export interface StripeInvoiceRenderingTemplate {
	readonly id: string
	readonly object: 'invoice_rendering_template'
	readonly created: number
	readonly livemode: boolean
	readonly metadata: Record<string, string>
	readonly nickname?: string | null
	readonly status: 'active' | 'archived'
	readonly version: number
}

/**
 * Customer Session creation parameters
 */
export interface CreateCustomerSessionParams extends StripeApiRequestBase {
	readonly customer: string
	readonly components?: {
		readonly buy_button?: {
			readonly enabled: boolean
		}
		readonly pricing_table?: {
			readonly enabled: boolean
		}
		readonly payment_element?: {
			readonly enabled: boolean
			readonly features?: {
<<<<<<< HEAD
				readonly payment_method_allow_redisplay_filters?: Array<
					'always' | 'limited' | 'unspecified'
				>
=======
				readonly payment_method_allow_redisplay_filters?: (
					| 'always'
					| 'limited'
					| 'unspecified'
				)[]
>>>>>>> origin/main
				readonly payment_method_redisplay?: 'disabled' | 'enabled'
				readonly payment_method_redisplay_limit?: number
				readonly payment_method_remove?: 'disabled' | 'enabled'
				readonly payment_method_save?: 'disabled' | 'enabled'
				readonly payment_method_save_usage?:
					| 'off_session'
					| 'on_session'
			}
		}
	}
}

// ========================
// API Request/Response Types
// ========================

/**
 * Checkout session creation parameters with idempotency support
 */
export interface CreateCheckoutSessionParams extends StripeApiRequestBase {
	readonly userId: string
	readonly planType: PlanType
	readonly billingInterval: BillingPeriod
	readonly successUrl: string
	readonly cancelUrl: string
	readonly priceId?: string
	readonly mode?: 'payment' | 'subscription' | 'setup'
	readonly currency?: SupportedCurrency
	readonly locale?: string
	readonly collectPaymentMethod?: boolean
	readonly uiMode?: 'embedded' | 'hosted'
	readonly allowPromotionCodes?: boolean
	readonly automaticTax?: {
		readonly enabled: boolean
	}
	readonly billingAddressCollection?: 'auto' | 'required'
	readonly consentCollection?: {
		readonly paymentMethodReuseAgreement?: {
			readonly position: 'auto' | 'hidden'
		}
		readonly promotions?: 'auto' | 'none'
		readonly termsOfService?: 'none' | 'required'
	}
<<<<<<< HEAD
	readonly customFields?: Array<{
=======
	readonly customFields?: {
>>>>>>> origin/main
		readonly key: string
		readonly label: {
			readonly custom: string
			readonly type: 'custom'
		}
		readonly type: 'dropdown' | 'numeric' | 'text'
		readonly dropdown?: {
<<<<<<< HEAD
			readonly options: Array<{
				readonly label: string
				readonly value: string
			}>
=======
			readonly options: {
				readonly label: string
				readonly value: string
			}[]
>>>>>>> origin/main
		}
		readonly numeric?: {
			readonly maximumLength?: number
			readonly minimumLength?: number
		}
		readonly optional?: boolean
		readonly text?: {
			readonly maximumLength?: number
			readonly minimumLength?: number
		}
<<<<<<< HEAD
	}>
=======
	}[]
>>>>>>> origin/main
	readonly customText?: {
		readonly afterSubmit?: {
			readonly message: string
		}
		readonly shippingAddress?: {
			readonly message: string
		}
		readonly submit?: {
			readonly message: string
		}
		readonly termsOfServiceAcceptance?: {
			readonly message: string
		}
	}
	readonly customerCreation?: 'always' | 'if_required'
	readonly customerUpdate?: {
		readonly address?: 'auto' | 'never'
		readonly name?: 'auto' | 'never'
		readonly shipping?: 'auto' | 'never'
	}
	readonly expiresAt?: number
	readonly invoiceCreation?: {
		readonly enabled: boolean
		readonly invoiceData?: {
			readonly accountTaxIds?: string[]
<<<<<<< HEAD
			readonly customFields?: Array<{
				readonly name: string
				readonly value: string
			}>
=======
			readonly customFields?: {
				readonly name: string
				readonly value: string
			}[]
>>>>>>> origin/main
			readonly description?: string
			readonly footer?: string
			readonly issuer?: {
				readonly account?: string
				readonly type?: 'account' | 'self'
			}
			readonly metadata?: StripeMetadata
			readonly renderingOptions?: {
				readonly amountTaxDisplay?:
					| 'exclude_tax'
					| 'include_inclusive_tax'
			}
		}
	}
	readonly paymentIntentData?: {
		readonly applicationFeeAmount?: number
		readonly captureMethod?: 'automatic' | 'automatic_async' | 'manual'
		readonly description?: string
		readonly onBehalfOf?: string
		readonly receiptEmail?: string
		readonly setupFutureUsage?: 'off_session' | 'on_session'
		readonly shipping?: {
			readonly address: {
				readonly city?: string
				readonly country?: string
				readonly line1?: string
				readonly line2?: string
				readonly postalCode?: string
				readonly state?: string
			}
			readonly carrier?: string
			readonly name: string
			readonly phone?: string
			readonly trackingNumber?: string
		}
		readonly statementDescriptor?: string
		readonly statementDescriptorSuffix?: string
		readonly transferData?: {
			readonly amount?: number
			readonly destination: string
		}
		readonly transferGroup?: string
	}
	readonly paymentMethodConfiguration?: string
	readonly paymentMethodTypes?: PaymentMethodType[]
	readonly phoneNumberCollection?: {
		readonly enabled: boolean
	}
	readonly redirectOnCompletion?: 'always' | 'if_required' | 'never'
	readonly returnUrl?: string
	readonly savedPaymentMethodOptions?: {
<<<<<<< HEAD
		readonly allowRedisplayFilters?: Array<
			'always' | 'limited' | 'unspecified'
		>
=======
		readonly allowRedisplayFilters?: (
			| 'always'
			| 'limited'
			| 'unspecified'
		)[]
>>>>>>> origin/main
		readonly paymentMethodRemove?: 'disabled' | 'enabled'
		readonly paymentMethodSave?: 'disabled' | 'enabled'
	}
	readonly shippingAddressCollection?: {
		readonly allowedCountries: string[]
	}
<<<<<<< HEAD
	readonly shippingOptions?: Array<{
=======
	readonly shippingOptions?: {
>>>>>>> origin/main
		readonly shippingRateData?: {
			readonly deliveryEstimate?: {
				readonly maximum?: {
					readonly unit:
						| 'business_day'
						| 'day'
						| 'hour'
						| 'month'
						| 'week'
					readonly value: number
				}
				readonly minimum?: {
					readonly unit:
						| 'business_day'
						| 'day'
						| 'hour'
						| 'month'
						| 'week'
					readonly value: number
				}
			}
			readonly displayName: string
			readonly fixedAmount?: {
				readonly amount: number
				readonly currency: SupportedCurrency
			}
			readonly metadata?: StripeMetadata
			readonly taxBehavior?: 'exclusive' | 'inclusive' | 'unspecified'
			readonly taxCode?: string
			readonly type: 'fixed_amount'
		}
		readonly shippingRate?: string
<<<<<<< HEAD
	}>
=======
	}[]
>>>>>>> origin/main
	readonly submitType?: 'auto' | 'book' | 'donate' | 'pay'
	readonly subscriptionData?: {
		readonly applicationFeePercent?: number
		readonly billingCycleAnchor?: number
		readonly defaultTaxRates?: string[]
		readonly description?: string
		readonly invoiceSettings?: {
			readonly issuer?: {
				readonly account?: string
				readonly type?: 'account' | 'self'
			}
		}
		readonly onBehalfOf?: string
		readonly prorationBehavior?: ProrationBehavior
		readonly transferData?: {
			readonly amountPercent?: number
			readonly destination: string
		}
		readonly trialEnd?: number
		readonly trialPeriodDays?: number
		readonly trialSettings?: {
			readonly endBehavior: {
				readonly missingPaymentMethod:
					| 'cancel'
					| 'create_invoice'
					| 'pause'
			}
		}
	}
	readonly taxIdCollection?: {
		readonly enabled: boolean
		readonly required?: 'if_supported' | 'never'
	}
}

/**
 * Customer portal session parameters
 */
export interface CreatePortalSessionParams {
	readonly customerId: string
	readonly returnUrl: string
	readonly configuration?: string
}

/**
 * Subscription management parameters based on Stripe API
 */
export interface UpdateSubscriptionParams {
	readonly userId: string
	readonly newPriceId: string
	readonly prorationBehavior?: ProrationBehavior
	readonly prorationDate?: Date | number
	readonly billingCycleAnchor?: 'now' | 'unchanged' | number
	readonly collectionMethod?: CollectionMethod
	readonly daysUntilDue?: number
	readonly defaultPaymentMethod?: string
	readonly paymentBehavior?:
		| 'allow_incomplete'
		| 'default_incomplete'
		| 'error_if_incomplete'
		| 'pending_if_incomplete'
	readonly metadata?: Record<string, string>
}

/**
 * Subscription creation parameters based on Stripe API
 */
export interface CreateSubscriptionParams {
	readonly customerId: string
<<<<<<< HEAD
	readonly items: Array<{
=======
	readonly items: {
>>>>>>> origin/main
		readonly price: string
		readonly quantity?: number
		readonly metadata?: Record<string, string>
		readonly taxRates?: string[]
<<<<<<< HEAD
	}>
	readonly addInvoiceItems?: Array<{
=======
	}[]
	readonly addInvoiceItems?: {
>>>>>>> origin/main
		readonly price?: string
		readonly priceData?: {
			readonly currency: SupportedCurrency
			readonly product: string
			readonly unitAmount?: number
			readonly unitAmountDecimal?: string
			readonly recurring?: {
				readonly interval: 'day' | 'week' | 'month' | 'year'
				readonly intervalCount?: number
			}
		}
		readonly quantity?: number
		readonly taxRates?: string[]
<<<<<<< HEAD
	}>
=======
	}[]
>>>>>>> origin/main
	readonly applicationFeePercent?: number
	readonly automaticTax?: {
		readonly enabled: boolean
		readonly liability?: {
			readonly account?: string
			readonly type: 'account' | 'self'
		}
	}
	readonly backdate?: Date | number
	readonly billingCycleAnchor?: Date | number
	readonly billingCycleAnchorConfig?: {
		readonly dayOfMonth?: number
		readonly hour?: number
		readonly minute?: number
		readonly month?: number
		readonly second?: number
	}
	readonly billingThresholds?: {
		readonly amountGte?: number
		readonly resetBillingCycleAnchor?: boolean
	}
	readonly cancelAt?: Date | number
	readonly cancelAtPeriodEnd?: boolean
	readonly collectionMethod?: CollectionMethod
	readonly coupon?: string
	readonly currency?: SupportedCurrency
	readonly daysUntilDue?: number
	readonly defaultPaymentMethod?: string
	readonly defaultSource?: string
	readonly defaultTaxRates?: string[]
	readonly description?: string
	readonly metadata?: Record<string, string>
	readonly offSession?: boolean
	readonly onBehalfOf?: string
	readonly paymentBehavior?:
		| 'allow_incomplete'
		| 'default_incomplete'
		| 'error_if_incomplete'
		| 'pending_if_incomplete'
	readonly paymentSettings?: {
		readonly paymentMethodOptions?: {
			readonly card?: {
				readonly mandateOptions?: {
					readonly amount?: number
					readonly amountType?: 'fixed' | 'maximum'
					readonly description?: string
				}
				readonly network?:
					| 'amex'
					| 'cartes_bancaires'
					| 'diners'
					| 'discover'
					| 'eftpos_au'
					| 'interac'
					| 'jcb'
					| 'mastercard'
					| 'unionpay'
					| 'unknown'
					| 'visa'
				readonly requestThreeDSecure?: 'any' | 'automatic' | 'challenge'
			}
			readonly acssDebit?: {
				readonly mandateOptions?: {
					readonly transactionType?: 'business' | 'personal'
				}
				readonly verificationMethod?:
					| 'automatic'
					| 'instant'
					| 'microdeposits'
			}
			readonly bancontact?: {
				readonly preferredLanguage?: 'de' | 'en' | 'fr' | 'nl'
			}
			readonly usBankAccount?: {
				readonly financialConnections?: {
<<<<<<< HEAD
					readonly permissions?: Array<
=======
					readonly permissions?: (
>>>>>>> origin/main
						| 'balances'
						| 'ownership'
						| 'payment_method'
						| 'transactions'
<<<<<<< HEAD
					>
					readonly prefetch?: Array<
						'balances' | 'ownership' | 'transactions'
					>
=======
					)[]
					readonly prefetch?: (
						| 'balances'
						| 'ownership'
						| 'transactions'
					)[]
>>>>>>> origin/main
					readonly returnUrl?: string
				}
				readonly verificationMethod?:
					| 'automatic'
					| 'instant'
					| 'microdeposits'
			}
		}
		readonly paymentMethodTypes?: PaymentMethodType[]
		readonly saveDefaultPaymentMethod?: 'off' | 'on_subscription'
	}
	readonly pendingInvoiceItemInterval?: {
		readonly interval: 'day' | 'week' | 'month' | 'year'
		readonly intervalCount?: number
	}
	readonly promotionCode?: string
	readonly prorationBehavior?: ProrationBehavior
	readonly prorationDate?: Date | number
	readonly transferData?: {
		readonly amountPercent?: number
		readonly destination: string
	}
	readonly trialEnd?: Date | number | 'now'
	readonly trialFromPlan?: boolean
	readonly trialPeriodDays?: number
	readonly trialSettings?: {
		readonly endBehavior: {
			readonly missingPaymentMethod: 'cancel' | 'create_invoice' | 'pause'
		}
	}
}

/**
 * Invoice preview parameters
 */
export interface PreviewInvoiceParams {
	readonly userId: string
	readonly newPriceId: string
	readonly prorationDate?: Date
}

/**
 * Subscription creation request
 */
export interface CreateSubscriptionRequest {
	readonly planType: PlanType
	readonly billingPeriod: BillingPeriod
	readonly paymentMethodId?: string
	readonly metadata?: Record<string, string>
}

/**
 * Subscription creation response
 */
export interface CreateSubscriptionResponse {
	readonly subscription: UserSubscription
	readonly clientSecret?: string
	readonly requiresPaymentMethod: boolean
	readonly success: boolean
}

// ========================
// Payment Method Types
// ========================

<<<<<<< HEAD
// PaymentMethod type is now defined using native Stripe SDK at the top of the file
=======
/**
 * Simplified payment method interface for cross-platform usage
 */
export interface PaymentMethod {
	readonly id: string
	readonly object: 'payment_method'
	readonly type: string
	readonly created: number
	readonly customer: string | null
	readonly livemode: boolean
	readonly metadata: Record<string, string>
	readonly card?: {
		readonly brand: string
		readonly last4: string
		readonly exp_month: number
		readonly exp_year: number
		readonly funding: string
		readonly country: string | null
	}
	readonly billing_details: {
		readonly address: {
			readonly city: string | null
			readonly country: string | null
			readonly line1: string | null
			readonly line2: string | null
			readonly postal_code: string | null
			readonly state: string | null
		}
		readonly email: string | null
		readonly name: string | null
		readonly phone: string | null
	}
}
>>>>>>> origin/main

/**
 * Payment method error with detailed context
 */
export interface PaymentMethodError {
	readonly code: StripeErrorCode
	readonly declineCode?: StripeDeclineCode
	readonly userMessage: string
	readonly retryable: boolean
	readonly suggestedActions: readonly string[]
}

// ========================
// Usage and Billing Types
// ========================

/**
 * Usage metrics for plan enforcement
 */
export interface UsageMetrics {
	readonly properties: number
	readonly tenants: number
	readonly leases: number
	readonly storageUsedMB: number
	readonly apiCallsCount: number
	readonly leaseGenerationsCount: number
	readonly month: string // YYYY-MM format
}

/**
 * Plan limits for subscription enforcement
 */
export interface PlanLimits {
	readonly properties: number
	readonly tenants: number
	readonly storage: number
	readonly apiCalls: number
}

/**
 * Limit check results
 */
export interface LimitChecks {
	readonly propertiesExceeded: boolean
	readonly tenantsExceeded: boolean
	readonly storageExceeded: boolean
	readonly apiCallsExceeded: boolean
}

/**
 * Complete usage data with limits
 */
export interface UsageData extends UsageMetrics {
	readonly limits: PlanLimits | null
	readonly limitChecks: LimitChecks | null
}

/**
 * Invoice information
 */
export interface Invoice {
	readonly id: string
	readonly userId: string
	readonly subscriptionId: string | null
	readonly stripeInvoiceId: string
	readonly amountPaid: number
	readonly amountDue: number
	readonly currency: string
	readonly status: string
	readonly invoiceDate: Date
	readonly dueDate: Date | null
	readonly paidAt: Date | null
	readonly invoiceUrl: string | null
	readonly invoicePdf: string | null
	readonly description: string | null
	readonly createdAt: Date
	readonly updatedAt: Date
}

/**
 * Billing history event for audit trail
 */
export interface BillingHistoryEvent {
	readonly id: string
	readonly userId: string
	readonly type:
		| 'subscription_created'
		| 'subscription_updated'
		| 'subscription_canceled'
		| 'payment_succeeded'
		| 'payment_failed'
		| 'invoice_created'
	readonly description: string
	readonly amount?: number
	readonly currency?: string
	readonly stripeEventId?: string
	readonly metadata?: Record<string, string | number | boolean>
	readonly createdAt: Date
}

// ========================
// API Response Types
// ========================

/**
 * Standardized success response wrapper
 */
export interface StripeSuccessResponse<T = unknown> {
	readonly success: true
	readonly data: T
	readonly metadata?: {
		readonly requestId?: string
		readonly timestamp: string
		readonly operation: string
		readonly resource: string
	}
}

/**
 * Standardized error response wrapper
 */
export interface StripeErrorResponse {
	readonly success: false
	readonly error: {
		readonly code: StripeErrorCode
		readonly message: string
		readonly userMessage: string
		readonly errorId: string
		readonly details?: string
		readonly retryable: boolean
		readonly retryAfter?: number
		readonly analytics?: StripeErrorAnalytics
	}
	readonly metadata?: {
		readonly requestId?: string
		readonly timestamp: string
		readonly operation: string
		readonly resource: string
	}
}

/**
 * Union type for all Stripe API responses
 */
export type StripeApiResponse<T = unknown> =
	| StripeSuccessResponse<T>
	| StripeErrorResponse

/**
 * Client-safe error interface (no sensitive details)
 */
export interface ClientSafeStripeError {
	readonly code: StripeErrorCode
	readonly userMessage: string
	readonly retryable: boolean
	readonly retryAfter?: number
	readonly errorId: string
	readonly category: StripeErrorCategory
	readonly severity: StripeErrorSeverity
}

// ========================
// Frontend Integration Types
// ========================

/**
 * Stripe Element event types for React components
 */
export interface StripeElementEvent {
	readonly elementType: string
	readonly empty: boolean
	readonly complete: boolean
	readonly error?: {
		readonly type: string
		readonly code: string
		readonly message: string
	}
}

/**
 * Card Element specific event
 */
export interface StripeCardElementEvent extends StripeElementEvent {
	readonly brand?: string
	readonly country?: string
}

/**
 * Payment Element specific event
 */
export interface StripePaymentElementEvent extends StripeElementEvent {
	readonly value?: {
		readonly type: string
	}
}

/**
 * Event callback types for React components
 */
export type StripeElementEventCallback = (event: StripeElementEvent) => void
export type StripeCardElementEventCallback = (
	event: StripeCardElementEvent
) => void
export type StripePaymentElementEventCallback = (
	event: StripePaymentElementEvent
) => void

// ========================
// Constants Export
// ========================

/**
 * Default retry configuration
 */
export const DEFAULT_STRIPE_RETRY_CONFIG: StripeRetryConfig = {
	maxAttempts: 3,
	baseDelayMs: 1000,
	maxDelayMs: 10000,
	exponentialBase: 2,
	jitterMs: 100
} as const

/**
 * Plan types for TenantFlow (moved from stripe-official.ts)
 */
export type PlanType = 'FREETRIAL' | 'STARTER' | 'GROWTH' | 'TENANTFLOW_MAX'

/**
 * Billing periods (moved from stripe-official.ts)
 * @deprecated Already defined above via BILLING_PERIODS const
 */
// export type BillingPeriod = 'monthly' | 'annual'

/**
 * Native Stripe Subscription type - uses official Stripe SDK types
 * This ensures compatibility with the official Stripe API
 */
export interface NativeStripeSubscription
	extends Omit<
		StripeSDK.Subscription,
		'canceled_at' | 'trial_start' | 'trial_end'
	> {
	// These properties exist in API responses with correct types
	current_period_start: number
	current_period_end: number
	trial_start: number | null
	trial_end: number | null
	cancel_at_period_end: boolean
	canceled_at: number | null
}

/**
 * Convert native Stripe Subscription to Subscription
 * Maps Stripe's official API format to our application format
 */
export function stripeSubscriptionToSubscription(
	stripeSubscription: NativeStripeSubscription,
	userId: string
): Subscription {
	// Extract the first price item (we only support single-item subscriptions)
<<<<<<< HEAD
	const subscriptionItem = stripeSubscription.items.data[0]
=======
	const subscriptionItem = stripeSubscription.items?.data?.[0]
>>>>>>> origin/main
	const price = subscriptionItem?.price
	const priceId = price?.id ?? null

	// Map Stripe plan to our plan types
<<<<<<< HEAD
	const planType = mapPriceIdToPlanType(priceId) ?? 'STARTER'
=======
	const planType = mapPriceIdToPlanType(priceId ?? undefined) ?? 'STARTER'
>>>>>>> origin/main

	// Extract customer ID (Stripe customer can be expanded or just ID)
	const customerId =
		typeof stripeSubscription.customer === 'string'
			? stripeSubscription.customer
<<<<<<< HEAD
			: stripeSubscription.customer.id
=======
			: (stripeSubscription.customer?.id ?? null)
>>>>>>> origin/main

	// Determine billing period from price recurring information
	const billingPeriod = price?.recurring
		? determineBillingPeriod(price)
		: 'monthly'

	return {
		id: stripeSubscription.id,
		userId,
		planType,
<<<<<<< HEAD
		planId: String(stripeSubscription.metadata.planId ?? ''),
		billingPeriod: billingPeriod,
		stripeCustomerId: String(customerId),
=======
		planId: String(stripeSubscription.metadata?.planId ?? ''),
		billingPeriod: billingPeriod,
		stripeCustomerId: String(customerId ?? ''),
>>>>>>> origin/main
		stripeSubscriptionId: stripeSubscription.id,
		stripePriceId: String(priceId ?? ''),
		status: normalizeSubscriptionStatus(stripeSubscription.status),
		currentPeriodStart: stripeSubscription.current_period_start
			? unixTimestampToDate(stripeSubscription.current_period_start)
			: null,
		currentPeriodEnd: stripeSubscription.current_period_end
			? unixTimestampToDate(stripeSubscription.current_period_end)
			: null,
		trialStart: stripeSubscription.trial_start
			? unixTimestampToDate(stripeSubscription.trial_start)
			: null,
		trialEnd: stripeSubscription.trial_end
			? unixTimestampToDate(stripeSubscription.trial_end)
			: null,
		cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
		canceledAt: stripeSubscription.canceled_at
			? unixTimestampToDate(stripeSubscription.canceled_at)
			: null,
		createdAt: unixTimestampToDate(stripeSubscription.created),
		updatedAt: new Date(),
<<<<<<< HEAD
		metadata: stripeSubscription.metadata as Record<string, string>
	}
}

/**
 * Stripe-related error types
 */
export interface StripeError extends Error {
	type: string
	code?: string
	decline_code?: string
	param?: string
}

/**
 * Stripe subscription data for API operations
 * Used when working directly with Stripe API responses
 */
export interface StripeSubscriptionData {
	id: string
	object: 'subscription'
	status: StripeSubscriptionStatus
	current_period_start: number
	current_period_end: number
	cancel_at_period_end: boolean
	canceled_at?: number | null
	trial_start?: number | null
	trial_end?: number | null
	created: number
	customer: string
	items: {
		object: 'list'
		data: Array<{
			id: string
			price: {
				id: string
				product: string
				unit_amount: number
				currency: StripeCurrency
				recurring?: {
					interval: StripeBillingInterval
					interval_count: number
				}
			}
			quantity: number
		}>
	}
	metadata?: Record<string, string>
}

/**
 * Payment method information for TenantFlow
 */
export interface PaymentMethodInfo {
	id: string
	type: StripePaymentMethodType
	card?: {
		brand: string
		last4: string
		exp_month: number
		exp_year: number
		funding: string
	}
	billing_details?: {
		name?: string | null
		email?: string | null
	}
	isDefault: boolean
}

/**
 * Invoice information for TenantFlow
 */
export interface InvoiceInfo {
	id: string
	stripeInvoiceId: string
	amountPaid: number
	amountDue: number
	currency: StripeCurrency
	status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void'
	invoiceDate: Date
	dueDate: Date | null
	paidAt: Date | null
	hostedInvoiceUrl?: string | null
	invoicePdf?: string | null
}

/**
 * Native Stripe Subscription type - uses official Stripe SDK types
 * This ensures compatibility with the official Stripe API
 */
export interface NativeStripeSubscription
	extends Omit<
		StripeSDK.Subscription,
		'canceled_at' | 'trial_start' | 'trial_end'
	> {
	// These properties exist in API responses with correct types
	current_period_start: number
	current_period_end: number
	trial_start: number | null
	trial_end: number | null
	cancel_at_period_end: boolean
	canceled_at: number | null
}

/**
 * Map Stripe price ID to our plan type
 */
function mapPriceIdToPlanType(
	priceId: string | null | undefined
): PlanType | null {
	if (!priceId) {
		return null
	}

	// Map based on price ID patterns (customize based on your Stripe setup)
	if (priceId.includes('starter') || priceId.includes('basic')) {
		return 'STARTER'
	}
	if (priceId.includes('growth') || priceId.includes('pro')) {
		return 'GROWTH'
	}
	if (priceId.includes('max') || priceId.includes('enterprise')) {
		return 'TENANTFLOW_MAX'
	}
	if (priceId.includes('trial') || priceId.includes('free')) {
		return 'FREETRIAL'
	}

	return null
}

/**
 * Determine billing period from native Stripe price object
 */
function determineBillingPeriod(
	price: StripeSDK.Price
): 'monthly' | 'annual' | null {
	if (!price.recurring) {
		return null
	}

	const interval = price.recurring.interval
	const intervalCount = price.recurring.interval_count

	if (interval === 'month' && intervalCount === 1) {
		return 'monthly'
	}
	if (interval === 'year' && intervalCount === 1) {
		return 'annual'
	}

	return null
}
=======
		metadata: (stripeSubscription.metadata as Record<string, string>) ?? {}
	}
}
>>>>>>> origin/main

// ========================
// Error Types
// ========================

/**
 * Stripe-related error types
 */
export interface StripeError extends Error {
	type: string
	code?: string
	decline_code?: string
	param?: string
}

/**
<<<<<<< HEAD
 * Type guard for Stripe errors
 */
export function isStripeError(error: unknown): error is StripeError {
	return (
		typeof error === 'object' &&
		error !== null &&
		'message' in error &&
		typeof (error as StripeError).message === 'string' &&
		'type' in error &&
		typeof (error as StripeError).type === 'string'
	)
}

// ========================
// Additional Types for Frontend Compatibility
// ========================

/**
 * Subscription state for UI representation
 */
export type SubscriptionState =
	| 'active'
	| 'trialing'
	| 'past_due'
	| 'canceled'
	| 'incomplete'

/**
=======
 * Stripe subscription data for API operations
 * Used when working directly with Stripe API responses
 */
export interface StripeSubscriptionData {
	id: string
	object: 'subscription'
	status: StripeSubscriptionStatus
	current_period_start: number
	current_period_end: number
	cancel_at_period_end: boolean
	canceled_at?: number | null
	trial_start?: number | null
	trial_end?: number | null
	created: number
	customer: string
	items: {
		object: 'list'
		data: {
			id: string
			price: {
				id: string
				product: string
				unit_amount: number
				currency: StripeCurrency
				recurring?: {
					interval: StripeBillingInterval
					interval_count: number
				}
			}
			quantity: number
		}[]
	}
	metadata?: Record<string, string>
}

/**
 * Payment method information for TenantFlow
 */
export interface PaymentMethodInfo {
	id: string
	type: StripePaymentMethodType
	card?: {
		brand: string
		last4: string
		exp_month: number
		exp_year: number
		funding: string
	}
	billing_details?: {
		name?: string | null
		email?: string | null
	}
	isDefault: boolean
}

/**
 * Invoice information for TenantFlow
 */
export interface InvoiceInfo {
	id: string
	stripeInvoiceId: string
	amountPaid: number
	amountDue: number
	currency: StripeCurrency
	status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void'
	invoiceDate: Date
	dueDate: Date | null
	paidAt: Date | null
	hostedInvoiceUrl?: string | null
	invoicePdf?: string | null
}

/**
 * Native Stripe Subscription type - uses official Stripe SDK types
 * This ensures compatibility with the official Stripe API
 */
export interface NativeStripeSubscription
	extends Omit<
		StripeSDK.Subscription,
		'canceled_at' | 'trial_start' | 'trial_end'
	> {
	// These properties exist in API responses with correct types
	current_period_start: number
	current_period_end: number
	trial_start: number | null
	trial_end: number | null
	cancel_at_period_end: boolean
	canceled_at: number | null
}

/**
 * Map Stripe price ID to our plan type
 */
function mapPriceIdToPlanType(priceId: string | undefined): PlanType | null {
	if (!priceId) return null

	// Map based on price ID patterns (customize based on your Stripe setup)
	if (priceId.includes('starter') || priceId.includes('basic'))
		return 'STARTER'
	if (priceId.includes('growth') || priceId.includes('pro')) return 'GROWTH'
	if (priceId.includes('max') || priceId.includes('enterprise'))
		return 'TENANTFLOW_MAX'
	if (priceId.includes('trial') || priceId.includes('free'))
		return 'FREETRIAL'

	return null
}

/**
 * Determine billing period from native Stripe price object
 */
function determineBillingPeriod(
	price: StripeSDK.Price
): 'monthly' | 'annual' | null {
	if (!price.recurring) return null

	const interval = price.recurring.interval
	const intervalCount = price.recurring.interval_count ?? 1

	if (interval === 'month' && intervalCount === 1) return 'monthly'
	if (interval === 'year' && intervalCount === 1) return 'annual'

	return null
}

// ========================
// Error Types
// ========================

/**
 * Stripe-related error types
 */
export interface StripeError extends Error {
	type: string
	code?: string
	decline_code?: string
	param?: string
}

/**
 * Type guard for Stripe errors
 */
export function isStripeError(error: unknown): error is StripeError {
	return (
		typeof error === 'object' &&
		error !== null &&
		'message' in error &&
		typeof (error as StripeError).message === 'string' &&
		'type' in error &&
		typeof (error as StripeError).type === 'string'
	)
}

// ========================
// Additional Types for Frontend Compatibility
// ========================

/**
 * Subscription state for UI representation
 */
export type SubscriptionState =
	| 'active'
	| 'trialing'
	| 'past_due'
	| 'canceled'
	| 'incomplete'

/**
>>>>>>> origin/main
 * Usage metrics for billing
 */
export interface BillingUsageMetrics {
	properties: number
	tenants: number
	leases: number
	maintenanceRequests: number
	limits: {
		properties: number
		tenants: number
		leases: number
		maintenanceRequests: number
	}
}

/**
 * Subscription sync result
 */
export interface SubscriptionSyncResult {
	success: boolean
	subscription?: StripeSubscriptionData
	message?: string
}

/**
 * Product tier configuration
 */
export interface ProductTierConfig {
	name: string
	priceId: string
	amount: number
	interval: BillingInterval
	features: string[]
}
