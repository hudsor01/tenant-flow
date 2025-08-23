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
 */
export type StripeSubscription = StripeSDK.Subscription

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
 */
export type StripePaymentMethod = StripeSDK.PaymentMethod

/**
 * Official Stripe Price type (when available)
 */
export type StripePrice = StripeSDK.Price

/**
 * Official Stripe Product type (when available)
 */
export type StripeProduct = StripeSDK.Product

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
export type StripeCurrency =
	| 'usd'
	| 'eur'
	| 'gbp'
	| 'cad'
	| 'aud'
	| 'jpy'

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
	return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
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

	return typeof value === 'string' && validStatuses.includes(value as StripeSubscriptionStatus)
}

/**
 * Type guard to check if a value is a valid Stripe currency
 */
export function isStripeCurrency(value: unknown): value is StripeCurrency {
	const validCurrencies: StripeCurrency[] = [
		'usd', 'eur', 'gbp', 'cad', 'aud', 'jpy'
	]

	return typeof value === 'string' && validCurrencies.includes(value as StripeCurrency)
}

/**
 * Type guard to check if a value is a valid billing interval
 */
export function isStripeBillingInterval(value: unknown): value is StripeBillingInterval {
	const validIntervals: StripeBillingInterval[] = [
		'day', 'week', 'month', 'year'
	]

	return typeof value === 'string' && validIntervals.includes(value as StripeBillingInterval)
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
	ANNUAL: 'annual'
} as const

/**
 * Plan types for TenantFlow (moved from stripe-official.ts)
 */
export type PlanType = 'FREETRIAL' | 'STARTER' | 'GROWTH' | 'TENANTFLOW_MAX'

/**
 * Billing periods (moved from stripe-official.ts)
 */
export type BillingPeriod = 'monthly' | 'annual'

/**
 * Native Stripe Subscription type - uses official Stripe SDK types
 * This ensures compatibility with the official Stripe API
 */
export interface NativeStripeSubscription extends Omit<StripeSDK.Subscription, 'canceled_at' | 'trial_start' | 'trial_end'> {
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
	const subscriptionItem = stripeSubscription.items?.data?.[0]
	const price = subscriptionItem?.price
	const priceId = price?.id ?? null

	// Map Stripe plan to our plan types
	const planType = mapPriceIdToPlanType(priceId ?? undefined) ?? 'STARTER'

	// Extract customer ID (Stripe customer can be expanded or just ID)
	const customerId = typeof stripeSubscription.customer === 'string'
		? stripeSubscription.customer
		: stripeSubscription.customer?.id ?? null

	// Determine billing period from price recurring information
	const billingPeriod = price?.recurring ? determineBillingPeriod(price) : 'monthly'

	return {
		id: stripeSubscription.id,
		userId,
		planType,
		planId: String(stripeSubscription.metadata?.planId ?? ''),
		billingPeriod: billingPeriod as BillingPeriod,
		stripeCustomerId: String(customerId ?? ''),
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
		metadata: (stripeSubscription.metadata as Record<string, string>) ?? {}
	}
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
export interface NativeStripeSubscription extends Omit<StripeSDK.Subscription, 'canceled_at' | 'trial_start' | 'trial_end'> {
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
	if (priceId.includes('starter') || priceId.includes('basic')) return 'STARTER'
	if (priceId.includes('growth') || priceId.includes('pro')) return 'GROWTH'
	if (priceId.includes('max') || priceId.includes('enterprise')) return 'TENANTFLOW_MAX'
	if (priceId.includes('trial') || priceId.includes('free')) return 'FREETRIAL'

	return null
}

/**
 * Determine billing period from native Stripe price object
 */
function determineBillingPeriod(price: StripeSDK.Price): 'monthly' | 'annual' | null {
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
export type SubscriptionState = 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete'

/**
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
