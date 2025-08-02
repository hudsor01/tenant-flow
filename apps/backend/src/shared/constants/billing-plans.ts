import { PLAN_TYPE } from '@tenantflow/shared'

// import type { PlanType } from '@prisma/client'


// 4-tier billing system
export const BILLING_PLANS = {
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
		stripePriceId: process.env.STRIPE_STARTER_MONTHLY ?? null,
		stripeMonthlyPriceId: process.env.STRIPE_STARTER_MONTHLY ?? null,
		stripeAnnualPriceId: process.env.STRIPE_STARTER_ANNUAL ?? null
	},
	[PLAN_TYPE.GROWTH]: {
		id: PLAN_TYPE.GROWTH,
		name: 'Growth',
		price: 49,
		propertyLimit: 50,
		stripePriceId: process.env.STRIPE_GROWTH_MONTHLY ?? null,
		stripeMonthlyPriceId: process.env.STRIPE_GROWTH_MONTHLY ?? null,
		stripeAnnualPriceId: process.env.STRIPE_GROWTH_ANNUAL ?? null
	},
	[PLAN_TYPE.ENTERPRISE]: {
		id: PLAN_TYPE.ENTERPRISE,
		name: 'Enterprise',
		price: 149,
		propertyLimit: -1, // unlimited
		stripePriceId: process.env.STRIPE_ENTERPRISE_MONTHLY ?? null,
		stripeMonthlyPriceId: process.env.STRIPE_ENTERPRISE_MONTHLY ?? null,
		stripeAnnualPriceId: process.env.STRIPE_ENTERPRISE_ANNUAL ?? null
	}
} as const

// Helper functions
export function getPlanById(
	planId: string
): typeof BILLING_PLANS[keyof typeof BILLING_PLANS] | undefined {
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

// Export types for use in other files
export type BillingPlan = typeof BILLING_PLANS[keyof typeof BILLING_PLANS] & {
	stripeMonthlyPriceId?: string
	stripeAnnualPriceId?: string
}
