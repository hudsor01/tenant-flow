/**
 * Simple pricing configuration for TenantFlow subscription system
 */

// Simple types
export type StripePriceId = `price_${string}`
export type PlanId = 'trial' | 'starter' | 'growth' | 'max'

// Trial configuration interface
export interface TrialConfig {
	readonly trialPeriodDays?: number
	readonly collectPaymentMethod?: boolean
	readonly trialEndBehavior?: 'cancel' | 'pause' | 'require_payment'
}

// Main pricing configuration interface
export interface PricingConfig {
	readonly id: string
	readonly planId: PlanId
	readonly name: string
	readonly description: string
	readonly price: {
		readonly monthly: number
		readonly annual: number
	}
	readonly stripePriceIds: {
		readonly monthly: StripePriceId | null
		readonly annual: StripePriceId | null
	}
	readonly limits: {
		readonly properties: number
		readonly units: number
		readonly users: number
		readonly storage: number
		readonly apiCalls: number
	}
	readonly features: readonly string[]
	readonly support: string
	readonly trial: boolean | TrialConfig
}

// Simple pricing plans configuration - Updated with correct Stripe data
export const PRICING_PLANS: Record<string, PricingConfig> = {
	FREETRIAL: {
		id: 'FREETRIAL',
		planId: 'trial',
		name: 'Free Trial',
		description: 'Perfect for getting started with property management',
		price: {
			monthly: 0,
			annual: 0
		},
		stripePriceIds: {
			monthly: 'price_1RtWFcP3WCR53Sdo5Li5xHiC' as StripePriceId,
			annual: null
		},
		limits: {
			properties: 1,
			units: 5,
			users: 1,
			storage: 1,
			apiCalls: 1000
		},
		features: [
			'1 property',
			'Up to 5 units',
			'Basic maintenance tracking',
			'Tenant management',
			'1GB document storage',
			'Email support',
			'14-day trial period'
		],
		support: 'Email',
		trial: {
			trialPeriodDays: 14,
			collectPaymentMethod: false,
			trialEndBehavior: 'cancel'
		}
	},
	STARTER: {
		id: 'STARTER',
		planId: 'starter',
		name: 'Starter',
		description: 'Ideal for small landlords managing a few properties',
		price: {
			monthly: 29,
			annual: 290
		},
		stripePriceIds: {
			monthly: 'price_1RtWFcP3WCR53SdoCxiVldhb' as StripePriceId,
			annual: 'price_1RtWFdP3WCR53SdoArRRXYrL' as StripePriceId
		},
		limits: {
			properties: 5,
			units: 25,
			users: 1,
			storage: 10,
			apiCalls: 10000
		},
		features: [
			'Up to 5 properties',
			'Up to 25 units',
			'Full maintenance tracking',
			'Tenant portal access',
			'Lease management',
			'Financial reporting',
			'10GB document storage',
			'Priority email support',
			'Mobile app access'
		],
		support: 'Priority Email',
		trial: false
	},
	GROWTH: {
		id: 'GROWTH',
		planId: 'growth',
		name: 'Growth',
		description: 'For growing portfolios that need advanced features',
		price: {
			monthly: 79,
			annual: 790
		},
		stripePriceIds: {
			monthly: 'price_1SPGCNP3WCR53SdorjDpiSy5' as StripePriceId,
			annual: 'price_1SPGCRP3WCR53SdonqLUTJgK' as StripePriceId
		},
		limits: {
			properties: 20,
			units: 100,
			users: 3,
			storage: 50,
			apiCalls: 50000
		},
		features: [
			'Up to 20 properties',
			'Up to 100 units',
			'Advanced analytics',
			'Automated rent collection',
			'Vendor network',
			'Custom templates',
			'50GB storage',
			'Phone support',
			'API access',
			'Team (3 users)'
		],
		support: 'Phone & Email',
		trial: false
	},
	TENANTFLOW_MAX: {
		id: 'TENANTFLOW_MAX',
		planId: 'max',
		name: 'TenantFlow Max',
		description: 'Enterprise solution for property management professionals',
		price: {
			monthly: 199,
			annual: 1989
		},
		stripePriceIds: {
			monthly: 'price_1SPGCjP3WCR53SdoIpidDn0T' as StripePriceId,
			annual: 'price_1SPGCoP3WCR53SdoID50geIC' as StripePriceId
		},
		limits: {
			properties: -1,
			units: -1,
			users: -1,
			storage: -1,
			apiCalls: -1
		},
		features: [
			'Unlimited properties',
			'Unlimited units',
			'White-label portal',
			'Full automation',
			'Custom integrations',
			'Account manager',
			'Unlimited storage',
			'24/7 support',
			'Full API access',
			'Unlimited team'
		],
		support: '24/7 Dedicated',
		trial: false
	}
}

// Helper functions
export function getPricingPlan(planId: PlanId): PricingConfig | undefined {
	return Object.values(PRICING_PLANS).find(plan => plan.planId === planId)
}

export function getAllPricingPlans(): PricingConfig[] {
	return Object.values(PRICING_PLANS)
}

// Usage metrics interface for plan checking
export interface UsageMetrics {
	properties: number
	units: number
	users: number
	storage: number
	apiCalls: number
}

// Check if current usage exceeds plan limits
export function checkPlanLimits(
	usage: UsageMetrics,
	planId: PlanId
): { exceeded: boolean; limits: string[] } {
	const plan = getPricingPlan(planId)
	if (!plan) {
		return { exceeded: false, limits: [] }
	}

	const limits: string[] = []
	let exceeded = false

	if (
		plan.limits.properties > 0 &&
		usage.properties > plan.limits.properties
	) {
		limits.push(`Properties: ${usage.properties}/${plan.limits.properties}`)
		exceeded = true
	}
	if (plan.limits.units > 0 && usage.units > plan.limits.units) {
		limits.push(`Units: ${usage.units}/${plan.limits.units}`)
		exceeded = true
	}
	if (plan.limits.users > 0 && usage.users > plan.limits.users) {
		limits.push(`Users: ${usage.users}/${plan.limits.users}`)
		exceeded = true
	}
	if (plan.limits.storage > 0 && usage.storage > plan.limits.storage) {
		limits.push(`Storage: ${usage.storage}GB/${plan.limits.storage}GB`)
		exceeded = true
	}
	if (plan.limits.apiCalls > 0 && usage.apiCalls > plan.limits.apiCalls) {
		limits.push(`API Calls: ${usage.apiCalls}/${plan.limits.apiCalls}`)
		exceeded = true
	}

	return { exceeded, limits }
}

// Get recommended upgrade based on current usage
export function getRecommendedUpgrade(
	usage: UsageMetrics,
	currentPlanId: PlanId
): PlanId | null {
	const plans: PlanId[] = ['trial', 'starter', 'growth', 'max']
	const currentIndex = plans.indexOf(currentPlanId)

	// Check each higher plan to see if it fits
	for (let i = currentIndex + 1; i < plans.length; i++) {
		const planId = plans[i]
		if (!planId) {continue}

		const plan = getPricingPlan(planId)
		if (!plan) {continue}

		const { exceeded } = checkPlanLimits(usage, planId)
		if (!exceeded) {
			return planId
		}
	}

	return 'max' // Recommend max if nothing else fits
}

// Calculate annual savings
export function calculateAnnualSavings(monthlyPrice: number): number {
	const yearlyPrice = monthlyPrice * 10 // 2 months free
	const monthlyCost = monthlyPrice * 12
	return monthlyCost - yearlyPrice
}

// Get product tier configuration by ID (supports both PlanId and legacy PlanType)
export function getProductTier(
	planId: PlanId
): PricingConfig | undefined {
	// Handle legacy PlanType constants
	if (typeof planId === 'string' && planId in PRICING_PLANS) {
		return PRICING_PLANS[planId]
	}

	// Handle new PlanId format
	return getPricingPlan(planId)
}

// Convert legacy PlanType to new PlanId
export function planTypeToId(planType: string): PlanId | undefined {
	const config = PRICING_PLANS[planType]
	return config?.planId
}

// Get trial configuration from a pricing config
export function getTrialConfig(config: PricingConfig): TrialConfig | null {
	if (typeof config.trial === 'boolean') {
		return config.trial
			? {
					trialPeriodDays: 14,
					collectPaymentMethod: false,
					trialEndBehavior: 'cancel'
				}
			: null
	}
	return config.trial
}

// Check if a plan has trial
export function hasTrial(config: PricingConfig): boolean {
	return typeof config.trial === 'boolean' ? config.trial : true
}

// Get Stripe price ID for a plan and billing period
export function getStripePriceId(
	planId: PlanId,
	period: 'monthly' | 'annual'
): StripePriceId | null {
	const plan = getPricingPlan(planId)
	if (!plan) {return null}

	return period === 'monthly'
		? plan.stripePriceIds.monthly
		: plan.stripePriceIds.annual
}

// Backward compatibility - alias the new name to the old one
export const ENHANCED_PRODUCT_TIERS = PRICING_PLANS
