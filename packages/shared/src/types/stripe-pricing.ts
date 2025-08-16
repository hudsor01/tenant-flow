/**
 * Stripe Pricing Component Types
 * Based on official Stripe documentation and best practices
 */

// Import types from consolidated stripe.ts
import type { StripeError, BillingPeriod } from './stripe'

// Import ProductTierConfig for modern pricing types
import type { ProductTierConfig } from '../types/billing'

export type BillingInterval = BillingPeriod

// Checkout Session Request
export interface CreateCheckoutSessionRequest extends Record<string, unknown> {
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
	| 'updating'

// Pricing Component Props
export interface PricingComponentProps {
	currentPlan?: string
	customerId?: string
	customerEmail?: string
	onPlanSelect?: (
		tier: ProductTierConfig,
		billingInterval: BillingInterval
	) => void
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

// Calculate yearly savings with validation
export const calculateYearlySavings = (
	monthlyPrice: number,
	yearlyPrice: number
): number => {
	// Input validation
	if (typeof monthlyPrice !== 'number' || typeof yearlyPrice !== 'number') {
		throw new Error('Monthly and yearly prices must be numbers')
	}

	if (monthlyPrice < 0 || yearlyPrice < 0) {
		throw new Error('Prices cannot be negative')
	}

	if (!Number.isFinite(monthlyPrice) || !Number.isFinite(yearlyPrice)) {
		throw new Error('Prices must be finite numbers')
	}

	const yearlyMonthlyEquivalent = monthlyPrice * 12

	// Avoid division by zero
	if (yearlyMonthlyEquivalent === 0) {
		return 0
	}

	const savings = yearlyMonthlyEquivalent - yearlyPrice
	const savingsPercentage = (savings / yearlyMonthlyEquivalent) * 100

	// Validate calculation result
	if (!Number.isFinite(savingsPercentage)) {
		throw new Error('Invalid savings calculation result')
	}

	return Math.max(0, Math.round(savingsPercentage)) // Ensure non-negative percentage
}

// Stripe error handling utility with validation
export const getStripeErrorMessage = (error: StripeError): string => {
	// Input validation
	if (!error || typeof error !== 'object') {
		return 'An unexpected error occurred. Please try again.'
	}

	// Validate error structure
	if (!error.code && !error.message) {
		return 'An unexpected error occurred. Please try again.'
	}

	// Sanitize error code to prevent injection attacks
	const sanitizedCode =
		typeof error.code === 'string' ? error.code.toLowerCase().trim() : ''

	switch (sanitizedCode) {
		case 'card_declined':
			return 'Your card was declined. Please try a different payment method.'
		case 'expired_card':
			return 'Your card has expired. Please use a different card.'
		case 'insufficient_funds':
			return 'Your card has insufficient funds. Please use a different card.'
		case 'incorrect_cvc':
			return "Your card's security code is incorrect. Please try again."
		case 'processing_error':
			return 'An error occurred while processing your card. Please try again.'
		case 'rate_limit_error':
			return 'Too many requests made too quickly. Please wait a moment and try again.'
		case 'authentication_required':
			return 'Additional authentication is required for this payment method.'
		case 'amount_too_large':
			return 'The payment amount is too large. Please contact support.'
		case 'amount_too_small':
			return 'The payment amount is too small. Please increase the amount.'
		case 'api_key_expired':
			return 'Service temporarily unavailable. Please try again later.'
		case 'balance_insufficient':
			return 'Insufficient balance. Please add funds to your account.'
		case 'card_not_supported':
			return 'This card type is not supported. Please use a different card.'
		case 'currency_not_supported':
			return 'This currency is not supported for your account.'
		case 'customer_declined':
			return 'Payment was declined by your bank. Please contact your bank.'
		case 'email_invalid':
			return 'The email address is invalid. Please provide a valid email.'
		case 'invalid_request_error':
			return 'Invalid payment request. Please check your information.'
		case 'payment_intent_authentication_failure':
			return 'Payment authentication failed. Please try again.'
		case 'payment_method_unactivated':
			return 'Payment method needs to be activated. Please contact support.'
		default: {
			// Sanitize error message to prevent XSS
			const sanitizedMessage =
				typeof error.message === 'string'
					? error.message.replace(/<[^>]*>/g, '').substring(0, 200)
					: 'An unexpected error occurred. Please try again.'

			return (
				sanitizedMessage ||
				'An unexpected error occurred. Please try again.'
			)
		}
	}
}

// Enhanced tier data validation with comprehensive checks
export const validatePricingPlan = (tier: ProductTierConfig): boolean => {
	try {
		// Input validation
		if (!tier || typeof tier !== 'object') {
			return false
		}

		// Required fields validation
		if (!tier.id || typeof tier.id !== 'string') {
			return false
		}

		if (
			!tier.name ||
			typeof tier.name !== 'string' ||
			tier.name.trim().length === 0
		) {
			return false
		}

		if (
			!tier.description ||
			typeof tier.description !== 'string' ||
			tier.description.trim().length === 0
		) {
			return false
		}

		// Pricing validation
		if (!tier.price || typeof tier.price !== 'object') {
			return false
		}

		if (
			typeof tier.price.monthly !== 'number' ||
			tier.price.monthly < 0 ||
			!Number.isFinite(tier.price.monthly)
		) {
			return false
		}

		if (
			typeof tier.price.annual !== 'number' ||
			tier.price.annual < 0 ||
			!Number.isFinite(tier.price.annual)
		) {
			return false
		}

		// Features validation
		if (!Array.isArray(tier.features) || tier.features.length === 0) {
			return false
		}

		// Validate each feature is a non-empty string
		if (
			!tier.features.every(
				feature =>
					typeof feature === 'string' && feature.trim().length > 0
			)
		) {
			return false
		}

		// Stripe price IDs validation
		if (!tier.stripePriceIds || typeof tier.stripePriceIds !== 'object') {
			return false
		}

		// At least one price ID must be provided
		const hasMonthlyPrice =
			tier.stripePriceIds.monthly &&
			typeof tier.stripePriceIds.monthly === 'string' &&
			tier.stripePriceIds.monthly.startsWith('price_')

		const hasAnnualPrice =
			tier.stripePriceIds.annual &&
			typeof tier.stripePriceIds.annual === 'string' &&
			tier.stripePriceIds.annual.startsWith('price_')

		if (!hasMonthlyPrice && !hasAnnualPrice) {
			return false
		}

		// Validate plan type if present
		const validPlanTypes = [
			'FREETRIAL',
			'STARTER',
			'GROWTH',
			'TENANTFLOW_MAX'
		]
		if (tier.id && !validPlanTypes.includes(tier.id)) {
			return false
		}

		// Validate limits if present
		if (tier.limits) {
			const limitFields = [
				'properties',
				'units',
				'users',
				'storage',
				'apiCalls'
			]
			for (const field of limitFields) {
				const limit = tier.limits[field as keyof typeof tier.limits]
				if (
					typeof limit !== 'number' ||
					(!Number.isFinite(limit) && limit !== -1)
				) {
					return false
				}
				if (limit !== -1 && limit < 0) {
					return false
				}
			}
		}

		return true
	} catch {
		// If any validation throws an error, the tier is invalid
		return false
	}
}
