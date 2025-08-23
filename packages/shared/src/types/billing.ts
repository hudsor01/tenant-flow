/**
 * Billing and subscription management types
 * All types related to subscriptions, plans, invoices, and billing
 */

// Import consolidated types from stripe.ts
import type { PlanType, BillingPeriod } from './stripe'

export const PLAN_TYPE = {
	FREETRIAL: 'FREETRIAL',
	STARTER: 'STARTER',
	GROWTH: 'GROWTH',
	TENANTFLOW_MAX: 'TENANTFLOW_MAX'
} as const

export type SubStatus =
	| 'INCOMPLETE'
	| 'INCOMPLETE_EXPIRED'
	| 'TRIALING'
	| 'ACTIVE'
	| 'PAST_DUE'
	| 'CANCELED'
	| 'UNPAID'
	| 'PAUSED'

export interface Plan {
	id: PlanType
	uiId: string
	name: string
	description: string
	price: {
		monthly: number
		annual: number
	}
	features: string[]
	propertyLimit: number
	storageLimit: number
	apiCallLimit: number
	priority: boolean
	subscription?: string
	stripePriceIds: {
		monthly: string | null
		annual: string | null
	}
}

// Backend service-specific plan interface for simplified operations
export interface ServicePlan {
	id: PlanType
	name: string
	price: number
	propertyLimit: number
	stripePriceIds: {
		monthly: string | null
		annual: string | null
	}
}

// Plan configuration interface
export interface PlanConfig {
	id: string
	name: string
	description: string
	price: {
		monthly: number
		annual: number
	}
	features: string[]
	propertyLimit: number
	storageLimit: number
	apiCallLimit: number
	priority: boolean
}

// User plan type that extends plan config
export interface UserPlan extends PlanConfig {
	billingPeriod: BillingPeriod
	status: SubStatus
	currentPeriodStart?: Date
	currentPeriodEnd?: Date
}

// Plan display helpers
export const getPlanTypeLabel = (plan: PlanType): string => {
	const labels: Record<PlanType, string> = {
		FREETRIAL: 'Free Trial',
		STARTER: 'Starter',
		GROWTH: 'Growth',
		TENANTFLOW_MAX: 'TenantFlow Max'
	}
	return labels[plan] || plan
}

// Subscription entity types
export interface Subscription {
	id: string
	userId: string
	plan: string
	planType?: PlanType | null
	status: string
	startDate: Date
	endDate: Date | null
	cancelledAt: Date | null
	stripeCustomerId: string | null
	stripeSubscriptionId: string | null
	stripePriceId: string | null
	planId: string | null
	billingPeriod: BillingPeriod | null
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

// Cleaned up - removed unused TrialConfig and ProductTierConfig types

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

// Note: Plan interface is now imported as BillingPlan from types-core

// Simple usage metrics interface
export interface UsageMetrics {
	properties: number
	tenants?: number
	maintenanceRequests?: number
	limits?: {
		properties?: number | string
		tenants?: number | string
		maintenanceRequests?: number | string
	}
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
	success: boolean
	subscriptionId?: string
}

// Customer portal types
export interface CustomerPortalRequest {
	returnUrl?: string
}

export interface CustomerPortalResponse {
	url: string
}

// Direct subscription parameters (moved to api-inputs.ts)
// Note: DirectSubscriptionParams is now available in @repo/shared/types/api-inputs

// Import Stripe types from the official Stripe SDK
import type { Stripe } from 'stripe'
type StripeErrorType = string
type StripeWebhookEvent = Stripe.Event

// Note: Stripe element types (StripeElementEvent, StripeCardElementEvent, etc.)
// are now available in './stripe' and can be imported when needed

export interface StripeWebhookError {
	type: StripeErrorType
	message: string
	stack?: string
}

// Stripe-specific backend types (consolidated from apps/backend/src/stripe/types)
//
// IMPLEMENTATION NOTE: For backend services, use official Stripe types directly:
//
// ```typescript
// import Stripe from 'stripe'
//
// // Use official types for service methods:
// async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<Stripe.Checkout.Session>
// async handleWebhook(event: Stripe.Event): Promise<void>
// async createCustomer(params: Stripe.CustomerCreateParams): Promise<Stripe.Customer>
// ```
//
// The types below are for shared contracts between frontend/backend
// Note: Stripe types are conditionally imported only when available

// Checkout session parameters - aligned with Stripe's API structure
export interface CreateCheckoutSessionParams {
	userId: string
	planType: PlanType
	billingInterval: 'monthly' | 'annual'
	collectPaymentMethod?: boolean
	successUrl: string
	cancelUrl: string
	uiMode?: 'embedded' | 'hosted'
	priceId?: string
	// Additional Stripe-compatible fields
	mode?: 'payment' | 'subscription' | 'setup'
	currency?: string
	locale?: string
}

export interface CreatePortalSessionParams {
	customerId: string
	returnUrl: string
}

export interface SubscriptionData {
	userId: string
	stripeCustomerId: string
	stripeSubscriptionId: string
	planType: PlanType
	status: SubStatus
	trialEndsAt?: Date
	currentPeriodEnd: Date
	cancelAtPeriodEnd: boolean
}

export interface WebhookEventHandler {
	'customer.subscription.created': (
		event: StripeWebhookEvent
	) => Promise<void>
	'customer.subscription.updated': (
		event: StripeWebhookEvent
	) => Promise<void>
	'customer.subscription.deleted': (
		event: StripeWebhookEvent
	) => Promise<void>
	'customer.subscription.trial_will_end': (
		event: StripeWebhookEvent
	) => Promise<void>
	'customer.subscription.paused': (event: StripeWebhookEvent) => Promise<void>
	'customer.subscription.resumed': (
		event: StripeWebhookEvent
	) => Promise<void>
	'invoice.payment_succeeded': (event: StripeWebhookEvent) => Promise<void>
	'invoice.payment_failed': (event: StripeWebhookEvent) => Promise<void>
	'invoice.payment_action_required': (
		event: StripeWebhookEvent
	) => Promise<void>
	'invoice.upcoming': (event: StripeWebhookEvent) => Promise<void>
	'checkout.session.completed': (event: StripeWebhookEvent) => Promise<void>
	'payment_intent.requires_action': (
		event: StripeWebhookEvent
	) => Promise<void>
	'charge.failed': (event: StripeWebhookEvent) => Promise<void>
}

// WebhookEventType is now imported from stripe.ts

export const STRIPE_ERRORS = {
	CUSTOMER_NOT_FOUND: 'Customer not found',
	SUBSCRIPTION_NOT_FOUND: 'Subscription not found',
	INVALID_PRICE_ID: 'Invalid price ID',
	WEBHOOK_SIGNATURE_INVALID: 'Invalid webhook signature',
	CONFIGURATION_ERROR: 'Stripe configuration error',
	RATE_LIMIT_EXCEEDED: 'Rate limit exceeded',
	PAYMENT_DECLINED: 'Payment declined',
	AUTHENTICATION_FAILED: 'Authentication failed',
	INVALID_REQUEST: 'Invalid request parameters',
	API_CONNECTION_ERROR: 'API connection error',
	CARD_DECLINED: 'Card declined',
	PROCESSING_ERROR: 'Processing error'
} as const

export interface PreviewInvoiceParams {
	userId: string
	newPriceId: string
	prorationDate?: Date
}

export interface UpdateSubscriptionParams extends Record<string, unknown> {
	userId: string
	newPriceId: string
	prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice'
	prorationDate?: Date
	allowIncomplete?: boolean
	planId?: string
}

// Subscription upgrade/downgrade preview
export interface SubscriptionChangePreview {
	prorationAmount: number
	immediateCharge: number
	nextBillingAmount: number
	nextBillingDate: Date
	creditApplied: number
}

// Stripe Element event types moved to stripe.ts for consolidation
// Import these types from './stripe' if needed

// ========================
// Payment Method Types
// ========================

/**
 * Payment method type compatible with Stripe's PaymentMethod
 * Simplified version for shared usage between frontend and backend
 */
export interface PaymentMethod {
	id: string
	object: 'payment_method'
	type: string
	created: number
	customer: string | null
	livemode: boolean
	metadata: Record<string, string>
	card?: {
		brand: string
		last4: string
		exp_month: number
		exp_year: number
		funding: string
		country: string | null
	}
	billing_details: {
		address: {
			city: string | null
			country: string | null
			line1: string | null
			line2: string | null
			postal_code: string | null
			state: string | null
		}
		email: string | null
		name: string | null
		phone: string | null
	}
	isDefault?: boolean
}

// ========================
// Enhanced Usage & Metrics
// ========================

/**
 * Enhanced usage metrics with detailed tracking
 * Extends basic UsageMetrics with comprehensive usage data
 */
export interface UsageMetricsExtended extends UsageMetrics {
	id: string
	userId: string
	month: string // YYYY-MM format
	leaseGenerationsCount: number
	createdAt: Date
	updatedAt: Date
}

/**
 * Detailed usage metrics for comprehensive tracking
 * Used for dashboard analytics and billing calculations
 */
export interface DetailedUsageMetrics {
	propertiesCount: number
	tenantsCount: number
	leasesCount: number
	storageUsedMB: number
	apiCallsCount: number
	leaseGenerationsCount: number
	month: string
}

/**
 * Plan limits interface for subscription enforcement
 * Defines the maximum allowed usage for each plan tier
 */
export interface PlanLimits {
	properties: number
	tenants: number
	storage: number
	apiCalls: number
}

/**
 * Limit checks interface for real-time validation
 * Indicates which limits have been exceeded
 */
export interface LimitChecks {
	propertiesExceeded: boolean
	tenantsExceeded: boolean
	storageExceeded: boolean
	apiCallsExceeded: boolean
}

/**
 * Combined usage data with limits and checks
 * Provides complete usage context with enforcement data
 */
export interface UsageData extends DetailedUsageMetrics {
	limits: PlanLimits | null
	limitChecks: LimitChecks | null
}

/**
 * Billing history event for audit trail
 * Tracks all billing-related activities and changes
 */
export interface BillingHistoryEvent {
	id: string
	userId: string
	type:
		| 'subscription_created'
		| 'subscription_updated'
		| 'subscription_canceled'
		| 'payment_succeeded'
		| 'payment_failed'
		| 'invoice_created'
	description: string
	amount?: number
	currency?: string
	stripeEventId?: string
	metadata?: Record<string, string | number | boolean>
	createdAt: Date
}

// Local subscription data interface (renamed from useSubscription.ts to avoid conflicts)
export interface LocalSubscriptionData {
	id: string
	userId: string
	status: string
	planId: string | null
	stripeSubscriptionId: string | null
	stripeCustomerId: string | null
	currentPeriodStart: Date | null
	currentPeriodEnd: Date | null
	cancelAtPeriodEnd: boolean | null
	trialStart: Date | null
	trialEnd: Date | null
	createdAt: Date
	updatedAt: Date
}

// Enhanced user plan interface (renamed from frontend to avoid conflicts)
export interface EnhancedUserPlan extends Omit<Plan, 'subscription'> {
	id: keyof typeof PLAN_TYPE
	billingPeriod: 'monthly' | 'annual'
	status: string
	subscription: LocalSubscriptionData | null
	isActive: boolean
	trialDaysRemaining: number
	accessExpiresAt: Date | null
	statusReason: string
}
