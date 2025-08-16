/**
 * Stripe Utility Functions
 *
 * Helper functions for common Stripe operations, error handling, and data transformations.
 * Provides consistent behavior across frontend and backend implementations.
 *
 * @fileoverview Utility functions for Stripe integration
 */

import {
	type StripeErrorCode,
	type StripeErrorCategory,
	type StripeErrorSeverity,
	type StandardizedStripeError,
	type StripeRetryConfig,
	DEFAULT_STRIPE_RETRY_CONFIG,
	ERROR_CATEGORY_MAPPING,
	ERROR_SEVERITY_MAPPING,
	RETRYABLE_ERROR_CODES,
	type PlanType,
	PLAN_TYPES,
	type BillingPeriod,
	BILLING_PERIODS,
	type SubscriptionStatus,
	type WebhookEventType,
	type ClientSafeStripeError,
	type StripeErrorAnalytics,
	STRIPE_ERROR_CATEGORIES,
	STRIPE_ERROR_SEVERITIES
} from './stripe'
import { isStandardizedStripeError } from './stripe-guards'

// Import removed - functions are not used in this file

// ========================
// Error Handling Utilities
// ========================

/**
 * Generate a unique error ID for tracking and debugging
 */
export function generateErrorId(): string {
	const timestamp = Date.now().toString(36)
	const random = Math.random().toString(36).substring(2, 8)
	return `stripe_error_${timestamp}_${random}`
}

/**
 * Get error category from error code
 */
export function getErrorCategory(code: StripeErrorCode): StripeErrorCategory {
	return ERROR_CATEGORY_MAPPING[code] || STRIPE_ERROR_CATEGORIES.UNKNOWN
}

/**
 * Get error severity from error code
 */
export function getErrorSeverity(code: StripeErrorCode): StripeErrorSeverity {
	return ERROR_SEVERITY_MAPPING[code] || STRIPE_ERROR_SEVERITIES.MEDIUM
}

/**
 * Check if error code is retryable
 */
export function isRetryableErrorCode(code: StripeErrorCode): boolean {
	return RETRYABLE_ERROR_CODES.includes(code)
}

/**
 * Calculate retry delay with exponential backoff and jitter
 */
export function calculateRetryDelay(
	attemptCount: number,
	config: Partial<StripeRetryConfig> = {}
): number {
	const finalConfig = { ...DEFAULT_STRIPE_RETRY_CONFIG, ...config }

	const exponentialDelay =
		finalConfig.baseDelayMs *
		Math.pow(finalConfig.exponentialBase, attemptCount - 1)
	const delayWithJitter =
		exponentialDelay + Math.random() * finalConfig.jitterMs

	return Math.min(delayWithJitter, finalConfig.maxDelayMs)
}

/**
 * Convert StandardizedStripeError to client-safe version
 */
export function toClientSafeError(
	error: StandardizedStripeError
): ClientSafeStripeError {
	if (!isStandardizedStripeError(error)) {
		throw new Error('Invalid StandardizedStripeError provided')
	}

	return {
		code: error.code,
		userMessage: error.userMessage,
		retryable: error.retryable,
		retryAfter: error.retryAfter,
		errorId: error.errorId,
		category: error.category,
		severity: error.severity
	}
}

/**
 * Generate analytics data from error
 */
export function generateErrorAnalytics(
	error: StandardizedStripeError
): StripeErrorAnalytics {
	const category = getErrorCategory(error.code)
	const severity = getErrorSeverity(error.code)

	// Determine if action is required based on error type
	const actionRequired =
		severity === STRIPE_ERROR_SEVERITIES.CRITICAL ||
		category === STRIPE_ERROR_CATEGORIES.CONFIGURATION

	// Determine if should escalate to Stripe support
	const escalateToStripe =
		category === STRIPE_ERROR_CATEGORIES.STRIPE_SERVICE ||
		(category === STRIPE_ERROR_CATEGORIES.INFRASTRUCTURE &&
			severity === STRIPE_ERROR_SEVERITIES.HIGH)

	return {
		category,
		severity,
		actionRequired,
		escalateToStripe,
		affectedUsers: 1, // Default to 1, can be updated based on context
		errorRate: 0, // To be calculated by monitoring system
		avgResponseTime: 0 // To be calculated by monitoring system
	}
}

/**
 * Create a standardized error from partial information
 */
export function createStandardizedError(
	code: StripeErrorCode,
	message: string,
	context: {
		operation: string
		resource: string
		userId?: string
		requestId?: string
		metadata?: Record<string, unknown>
	},
	options: {
		userMessage?: string
		details?: string
		retryAfter?: number
	} = {}
): StandardizedStripeError {
	const errorId = generateErrorId()
	const category = getErrorCategory(code)
	const severity = getErrorSeverity(code)
	const retryable = isRetryableErrorCode(code)

	return {
		code,
		message,
		userMessage: options.userMessage || generateUserMessage(code),
		details: options.details,
		errorId,
		category,
		severity,
		retryable,
		retryAfter: options.retryAfter,
		context: {
			...context,
			timestamp: new Date()
		}
	}
}

/**
 * Generate user-friendly error messages
 */
export function generateUserMessage(code: StripeErrorCode): string {
	const userMessages: Record<StripeErrorCode, string> = {
		card_declined:
			'Your card was declined. Please try a different payment method.',
		expired_card:
			'Your card has expired. Please update your payment information.',
		incorrect_cvc:
			'The security code is incorrect. Please check and try again.',
		incorrect_number:
			'The card number is incorrect. Please check and try again.',
		insufficient_funds:
			'Your card has insufficient funds. Please try a different card.',
		invalid_expiry_month:
			'The expiration month is invalid. Please check and try again.',
		invalid_expiry_year:
			'The expiration year is invalid. Please check and try again.',
		invalid_number:
			'The card number is invalid. Please check and try again.',
		processing_error:
			'There was an error processing your payment. Please try again.',
		rate_limit: 'Too many requests. Please wait a moment and try again.',
		invalid_request_error:
			'There was an error with your request. Please try again.',
		missing: 'Required information is missing. Please check your details.',
		invalid: 'Some information is invalid. Please check your details.',
		api_connection_error:
			'Unable to connect to payment processor. Please try again.',
		api_error:
			'Payment processing is temporarily unavailable. Please try again.',
		authentication_error: 'Authentication failed. Please contact support.',
		permission_error: 'Access denied. Please contact support.',
		idempotency_error: 'Duplicate request detected. Please try again.',
		customer_not_found:
			'Customer account not found. Please contact support.',
		subscription_not_found:
			'Subscription not found. Please contact support.',
		invalid_price_id:
			'Invalid pricing information. Please contact support.',
		webhook_signature_invalid:
			'Security validation failed. Please contact support.',
		configuration_error:
			'Payment system configuration error. Please contact support.',
		invalid_cvc: '',
		card_not_supported: '',
		currency_not_supported: '',
		duplicate_transaction: '',
		fraudulent: '',
		generic_decline: '',
		invalid_account: '',
		lost_card: '',
		merchant_blacklist: '',
		new_account_information_available: '',
		no_action_taken: '',
		not_permitted: '',
		pickup_card: '',
		reenter_transaction: '',
		restricted_card: '',
		revocation_of_all_authorizations: '',
		revocation_of_authorization: '',
		security_violation: '',
		service_not_allowed: '',
		stolen_card: '',
		stop_payment_order: '',
		testmode_decline: '',
		transaction_not_allowed: '',
		try_again_later: '',
		withdrawal_count_limit_exceeded: '',
		parameter_invalid_empty: '',
		parameter_invalid_integer: '',
		parameter_invalid_string_blank: '',
		parameter_invalid_string_empty: '',
		parameter_missing: '',
		parameter_unknown: '',
		parameters_exclusive: '',
		url_invalid: '',
		subscription_canceled: '',
		subscription_past_due: '',
		subscription_schedule_conflicting_change: '',
		subscription_schedule_not_found: '',
		customer_tax_location_invalid: '',
		price_not_found: '',
		product_not_found: '',
		payment_intent_authentication_failure: '',
		payment_intent_incompatible_payment_method: '',
		payment_intent_invalid_parameter: '',
		payment_intent_payment_attempt_expired: '',
		payment_intent_payment_attempt_failed: '',
		payment_intent_unexpected_state: '',
		setup_attempt_failed: '',
		setup_intent_authentication_failure: '',
		setup_intent_invalid_parameter: '',
		setup_intent_setup_attempt_expired: '',
		setup_intent_unexpected_state: '',
		webhook_timestamp_too_old: '',
		webhook_timestamp_too_new: '',
		tax_id_invalid: '',
		tax_id_verification_failed: '',
		feature_not_available: '',
		platform_api_key_expired: '',
		postal_code_invalid: '',
		resource_already_exists: '',
		resource_missing: '',
		routing_number_invalid: '',
		secret_key_required: '',
		sepa_unsupported_account: '',
		shipping_calculation_failed: '',
		sku_inactive: '',
		state_unsupported: '',
		taxes_calculation_failed: '',
		testmode_charges_only: '',
		tls_version_unsupported: '',
		token_already_used: '',
		token_in_use: '',
		transfers_not_allowed: '',
		upstream_order_creation_failed: ''
	}

	return (
		userMessages[code] ||
		'An unexpected error occurred. Please try again or contact support.'
	)
}

// ========================
// Plan and Pricing Utilities
// ========================

/**
 * Get plan type from Stripe price ID
 */
export function getPlanTypeFromPriceId(priceId: string): PlanType | null {
	// This would typically map to your actual Stripe price IDs
	// For now, we'll use pattern matching
	const lowerPriceId = priceId.toLowerCase()

	if (lowerPriceId.includes('starter')) return PLAN_TYPES.STARTER
	if (lowerPriceId.includes('growth')) return PLAN_TYPES.GROWTH
	if (
		lowerPriceId.includes('tenantflow_max') ||
		lowerPriceId.includes('tenantflow')
	)
		return PLAN_TYPES.TENANTFLOW_MAX
	if (lowerPriceId.includes('free') || lowerPriceId.includes('trial'))
		return PLAN_TYPES.FREETRIAL

	return null
}

/**
 * Get billing period from Stripe price ID
 */
export function getBillingPeriodFromPriceId(
	priceId: string
): BillingPeriod | null {
	const lowerPriceId = priceId.toLowerCase()

	if (lowerPriceId.includes('monthly') || lowerPriceId.includes('month')) {
		return BILLING_PERIODS.MONTHLY
	}
	if (lowerPriceId.includes('annual') || lowerPriceId.includes('year')) {
		return BILLING_PERIODS.ANNUAL
	}

	return null
}

/**
 * Format price for display
 * Inline implementation to avoid circular dependency with currency utils
 */
export function formatPrice(
	amount: number,
	currency = 'USD',
	interval?: BillingPeriod
): string {
	// Format the price inline to avoid circular dependency
	const formatter = new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: currency.toUpperCase(),
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	})

	const formattedAmount = formatter.format(amount / 100) // Convert from cents

	if (interval) {
		const intervalText =
			interval === BILLING_PERIODS.MONTHLY ? '/month' : '/year'
		return `${formattedAmount}${intervalText}`
	}

	return formattedAmount
}

/**
 * Calculate annual savings percentage
 */
export function calculateAnnualSavings(
	monthlyPrice: number,
	annualPrice: number
): number {
	const monthlyTotal = monthlyPrice * 12
	const savings = monthlyTotal - annualPrice
	return Math.round((savings / monthlyTotal) * 100)
}

/**
 * Get plan display name
 */
export function getPlanDisplayName(planType: PlanType): string {
	const displayNames: Record<PlanType, string> = {
		[PLAN_TYPES.FREETRIAL]: 'Free Trial',
		[PLAN_TYPES.STARTER]: 'Starter',
		[PLAN_TYPES.GROWTH]: 'Growth',
		[PLAN_TYPES.TENANTFLOW_MAX]: 'TenantFlow Max'
	}

	return displayNames[planType] || planType
}

// ========================
// Subscription Utilities
// ========================

/**
 * Check if subscription is active
 */
export function isActiveSubscription(status: SubscriptionStatus): boolean {
	return status === 'active' || status === 'trialing'
}

/**
 * Check if subscription is in grace period
 */
export function isInGracePeriod(status: SubscriptionStatus): boolean {
	return status === 'past_due'
}

/**
 * Check if subscription needs attention
 */
export function needsAttention(status: SubscriptionStatus): boolean {
	return ['past_due', 'unpaid', 'incomplete'].includes(status)
}

/**
 * Get subscription status display text
 */
export function getSubscriptionStatusDisplay(
	status: SubscriptionStatus
): string {
	const statusDisplay: Record<SubscriptionStatus, string> = {
		incomplete: 'Setup Required',
		incomplete_expired: 'Setup Expired',
		trialing: 'Trial',
		active: 'Active',
		past_due: 'Past Due',
		canceled: 'Canceled',
		unpaid: 'Unpaid',
		paused: 'Paused'
	}

	return statusDisplay[status] || status
}

/**
 * Calculate days until subscription expires
 */
export function getDaysUntilExpiry(
	currentPeriodEnd: Date | null
): number | null {
	if (!currentPeriodEnd) return null

	const now = new Date()
	const diffTime = currentPeriodEnd.getTime() - now.getTime()
	const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

	return Math.max(0, diffDays)
}

/**
 * Calculate trial days remaining
 */
export function getTrialDaysRemaining(trialEnd: Date | null): number | null {
	if (!trialEnd) return null

	const now = new Date()
	const diffTime = trialEnd.getTime() - now.getTime()
	const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

	return Math.max(0, diffDays)
}

// ========================
// Webhook Utilities
// ========================

/**
 * Extract relevant data from webhook event
 */
export function extractWebhookData<T = Record<string, unknown>>(
	_eventType: WebhookEventType,
	eventData: Record<string, unknown>
): T {
	// Cast to expected type - in practice, you'd want more specific typing
	return eventData as T
}

/**
 * Check if webhook event should be processed
 */
export function shouldProcessWebhookEvent(
	eventType: WebhookEventType,
	supportedEvents: readonly WebhookEventType[]
): boolean {
	return supportedEvents.includes(eventType)
}

/**
 * Get webhook event priority for queue processing
 */
export function getWebhookEventPriority(
	eventType: WebhookEventType
): 'high' | 'medium' | 'low' {
	const highPriorityEvents: WebhookEventType[] = [
		'invoice.payment_failed',
		'customer.subscription.deleted',
		'invoice.payment_succeeded'
	]

	const mediumPriorityEvents: WebhookEventType[] = [
		'customer.subscription.created',
		'customer.subscription.updated',
		'checkout.session.completed'
	]

	if (highPriorityEvents.includes(eventType)) return 'high'
	if (mediumPriorityEvents.includes(eventType)) return 'medium'
	return 'low'
}

// ========================
// Validation Utilities
// ========================

/**
 * Validate Stripe configuration completeness
 */
export function validateStripeConfig(config: {
	secretKey?: string
	publishableKey?: string
	webhookSecret?: string
}): { isValid: boolean; errors: string[] } {
	const errors: string[] = []

	if (!config.secretKey) {
		errors.push('Secret key is required')
	} else if (!config.secretKey.startsWith('sk_')) {
		errors.push('Invalid secret key format')
	}

	if (!config.publishableKey) {
		errors.push('Publishable key is required')
	} else if (!config.publishableKey.startsWith('pk_')) {
		errors.push('Invalid publishable key format')
	}

	if (config.secretKey && config.publishableKey) {
		const secretEnv = config.secretKey.includes('_test_') ? 'test' : 'live'
		const pubEnv = config.publishableKey.includes('_test_')
			? 'test'
			: 'live'

		if (secretEnv !== pubEnv) {
			errors.push('Secret key and publishable key environment mismatch')
		}
	}

	if (config.webhookSecret && !config.webhookSecret.startsWith('whsec_')) {
		errors.push('Invalid webhook secret format')
	}

	return {
		isValid: errors.length === 0,
		errors
	}
}

/**
 * Sanitize metadata for Stripe (remove invalid characters, limit length)
 */
export function sanitizeMetadata(
	metadata: Record<string, unknown>
): Record<string, string> {
	const sanitized: Record<string, string> = {}

	Object.entries(metadata).forEach(([key, value]) => {
		// Convert to string and limit length (Stripe has limits)
		const stringValue = String(value).substring(0, 500)
		const sanitizedKey = key.substring(0, 40).replace(/\W/g, '_')

		if (sanitizedKey && stringValue) {
			sanitized[sanitizedKey] = stringValue
		}
	})

	return sanitized
}

/**
 * Generate idempotency key for Stripe requests
 */
export function generateIdempotencyKey(
	operation: string,
	params?: Record<string, unknown>
): string {
	const timestamp = Date.now()
	const random = Math.random().toString(36).substring(2, 8)
	const hash = params
		? btoa(JSON.stringify(params)).substring(0, 8)
		: 'no_params'

	return `${operation}_${timestamp}_${random}_${hash}`
}

// ========================
// Export All Utilities
// ========================

export const StripeUtils = {
	// Error handling
	generateErrorId,
	getErrorCategory,
	getErrorSeverity,
	isRetryableErrorCode,
	calculateRetryDelay,
	toClientSafeError,
	generateErrorAnalytics,
	createStandardizedError,
	generateUserMessage,

	// Plan and pricing
	getPlanTypeFromPriceId,
	getBillingPeriodFromPriceId,
	formatPrice,
	calculateAnnualSavings,
	getPlanDisplayName,

	// Subscription
	isActiveSubscription,
	isInGracePeriod,
	needsAttention,
	getSubscriptionStatusDisplay,
	getDaysUntilExpiry,
	getTrialDaysRemaining,

	// Webhook
	extractWebhookData,
	shouldProcessWebhookEvent,
	getWebhookEventPriority,

	// Validation
	validateStripeConfig,
	sanitizeMetadata,
	generateIdempotencyKey
} as const
