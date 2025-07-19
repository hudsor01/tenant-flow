/**
 * STRIPE CONFIGURATION - Secure Backend Integration
 *
 * SECURITY NOTE: This configuration has been updated to support secure backend-only processing.
 * Price IDs and publishable keys are safe to expose on frontend as they're public identifiers.
 * All actual payment processing occurs through secure backend tRPC endpoints.
 *
 * This configuration includes:
 * - 14-day free trial period
 * - Feature limitations enforcement  
 * - Seamless upgrade paths to paid plans
 * - Type-safe subscription parameters
 * - Backend-only payment processing
 *
 * See usage examples at the bottom of this file.
 */

export const STRIPE_CONFIG = {
	// Note: Publishable keys are safe to expose - they're public identifiers
	publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
	// Note: Price IDs are also safe to expose - they're public product identifiers
	priceIds: {
		free: import.meta.env.VITE_STRIPE_FREE_PRICE_ID,
		starter: import.meta.env.VITE_STRIPE_STARTER_PRICE_ID,
		growth: import.meta.env.VITE_STRIPE_GROWTH_PRICE_ID,
		enterprise: import.meta.env.VITE_STRIPE_ENTERPRISE_PRICE_ID
	}
} as const

// Validation helper to ensure all required price IDs are set
export function validateStripeConfig(): {
	isValid: boolean
	missing: string[]
} {
	const missing: string[] = []

	if (!STRIPE_CONFIG.publishableKey) {
		missing.push('VITE_STRIPE_PUBLISHABLE_KEY')
	}

	if (!STRIPE_CONFIG.priceIds.free) {
		missing.push('VITE_STRIPE_FREE_PRICE_ID')
	}

	if (!STRIPE_CONFIG.priceIds.starter) {
		missing.push('VITE_STRIPE_STARTER_PRICE_ID')
	}

	if (!STRIPE_CONFIG.priceIds.growth) {
		missing.push('VITE_STRIPE_GROWTH_PRICE_ID')
	}

	if (!STRIPE_CONFIG.priceIds.enterprise) {
		missing.push('VITE_STRIPE_ENTERPRISE_PRICE_ID')
	}

	return {
		isValid: missing.length === 0,
		missing
	}
}

// Helper to get price ID for a specific plan
export function getPriceId(planId: 'free' | 'starter' | 'growth' | 'enterprise'): string {
	const priceId = STRIPE_CONFIG.priceIds[planId]

	if (!priceId) {
		throw new Error(`Price ID not found for plan: ${planId}`)
	}

	return priceId
}

// Helper to check if user is on free plan
export function isFreePlan(planId: string): boolean {
	return planId === 'FREE'
}

// Development helper to check if Stripe is properly configured
export function logStripeConfigStatus() {
	if (import.meta.env.DEV) {
		const validation = validateStripeConfig()

		if (validation.isValid) {
			// Stripe configuration is valid
		} else {
			// Log missing configuration only in development
			console.warn(
				'⚠️ Missing Stripe environment variables:',
				validation.missing
			)
		}
	}
}

/*
USAGE EXAMPLES:

// Get free trial subscription parameters (monthly/annual both use same $0 price ID)
const freeTrialParams = getSubscriptionParams('freeTrial', 'monthly')
// Returns: { priceId: 'price_1RgguDP3WCR53Sdo1lJmjlD5', trialPeriodDays: 14, productInfo: {...} }

const freeTrialAnnual = getSubscriptionParams('freeTrial', 'annual')  
// Returns same price ID since $0 × 1 month = $0 × 12 months

// Check if user is on free trial
const isFreeTrial = isFreeTrialPlan(userPlan)

// Get plan limitations for UI enforcement
const limitations = getPlanLimitations('freeTrial')
// Returns: { maxProperties: 3, maxTenants: 10, maxMaintenanceRequests: 20, ... }

// Get specific price ID for paid plans
const priceId = getPriceId('starter', 'annual')
*/
