/**
 * STRIPE CONFIGURATION - Free Trial Integration
 *
 * This configuration now includes comprehensive free trial support with:
 * - 14-day free trial period
 * - Feature limitations enforcement
 * - Seamless upgrade paths to paid plans
 * - Type-safe subscription parameters
 *
 * ENVIRONMENT VARIABLES REQUIRED:
 * - VITE_STRIPE_FREE_TRIAL (single price ID for $0 plan)
 * - VITE_STRIPE_STARTER_MONTHLY
 * - VITE_STRIPE_STARTER_ANNUAL
 * - VITE_STRIPE_GROWTH_MONTHLY
 * - VITE_STRIPE_GROWTH_ANNUAL
 * - VITE_STRIPE_ENTERPRISE_MONTHLY
 * - VITE_STRIPE_ENTERPRISE_ANNUAL
 *
 * See usage examples at the bottom of this file.
 */

export const STRIPE_CONFIG = {
	publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
	priceIds: {
		freeTrial: {
			// Single price ID for free trial (same for monthly/annual since $0 × 1 = $0 × 12)
			monthly: import.meta.env.VITE_STRIPE_FREE_TRIAL,
			annual: import.meta.env.VITE_STRIPE_FREE_TRIAL
		},
		starter: {
			monthly: import.meta.env.VITE_STRIPE_STARTER_MONTHLY,
			annual: import.meta.env.VITE_STRIPE_STARTER_ANNUAL
		},
		growth: {
			monthly: import.meta.env.VITE_STRIPE_GROWTH_MONTHLY,
			annual: import.meta.env.VITE_STRIPE_GROWTH_ANNUAL
		},
		enterprise: {
			monthly: import.meta.env.VITE_STRIPE_ENTERPRISE_MONTHLY,
			annual: import.meta.env.VITE_STRIPE_ENTERPRISE_ANNUAL
		}
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

	Object.entries(STRIPE_CONFIG.priceIds).forEach(([plan, periods]) => {
		Object.entries(periods).forEach(([period, priceId]) => {
			if (!priceId) {
				missing.push(
					`VITE_STRIPE_${plan.toUpperCase()}_${period.toUpperCase()}`
				)
			}
		})
	})

	return {
		isValid: missing.length === 0,
		missing
	}
}

// Helper to get price ID for a specific plan and billing period
export function getPriceId(
	planId: 'freeTrial' | 'starter' | 'growth' | 'enterprise',
	billingPeriod: 'monthly' | 'annual'
): string {
	const priceId = STRIPE_CONFIG.priceIds[planId]?.[billingPeriod]

	if (!priceId) {
		throw new Error(
			`Price ID not found for plan: ${planId}, period: ${billingPeriod}`
		)
	}

	return priceId
}

// Free trial configuration
export const FREE_TRIAL_CONFIG = {
	trialPeriodDays: 14, // 14-day free trial
	allowedFeatures: [
		'properties', // Up to 3 properties
		'tenants', // Up to 10 tenants
		'leases', // Basic lease management
		'payments', // Payment tracking
		'maintenance' // Basic maintenance requests
	],
	limitations: {
		maxProperties: 3,
		maxTenants: 10,
		maxMaintenanceRequests: 20,
		advancedReports: false,
		automatedReminders: false,
		apiAccess: false
	}
} as const

// Product information for each plan
export const PRODUCT_INFO = {
	freeTrial: {
		name: 'Free Trial',
		description: '14-day free trial with limited features',
		features: ['Up to 3 properties', 'Up to 10 tenants', 'Basic reporting'],
		trialDays: FREE_TRIAL_CONFIG.trialPeriodDays
	},
	starter: {
		name: 'Starter',
		description: 'Perfect for individual landlords',
		features: [
			'Up to 10 properties',
			'Unlimited tenants',
			'Payment tracking'
		]
	},
	growth: {
		name: 'Growth',
		description: 'For growing property portfolios',
		features: [
			'Up to 50 properties',
			'Advanced reporting',
			'Automated reminders'
		]
	},
	enterprise: {
		name: 'Enterprise',
		description: 'For large property management companies',
		features: ['Unlimited properties', 'API access', 'Priority support']
	}
} as const

// Helper to check if user is on free trial
export function isFreeTrialPlan(planId: string): boolean {
	return planId === 'freeTrial'
}

// Helper to get trial period for a plan
export function getTrialPeriodDays(planId: string): number {
	return planId === 'freeTrial' ? FREE_TRIAL_CONFIG.trialPeriodDays : 0
}

// Helper to get subscription parameters for checkout
export function getSubscriptionParams(
	planId: 'freeTrial' | 'starter' | 'growth' | 'enterprise',
	billingPeriod: 'monthly' | 'annual'
) {
	const priceId = getPriceId(planId, billingPeriod)
	const trialDays = getTrialPeriodDays(planId)

	return {
		priceId,
		trialPeriodDays: trialDays > 0 ? trialDays : undefined,
		productInfo: PRODUCT_INFO[planId]
	}
}

// Helper to check if plan has limitations
export function getPlanLimitations(planId: string) {
	if (planId === 'freeTrial') {
		return FREE_TRIAL_CONFIG.limitations
	}

	// Return null for paid plans (no limitations)
	return null
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
