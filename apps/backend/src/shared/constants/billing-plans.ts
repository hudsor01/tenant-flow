import { PLAN_TYPE } from '@tenantflow/shared'

// import type { PlanType } from '@prisma/client'


// PERFORMANCE: Use lazy getters to avoid env var access during module initialization
class BillingPlansManager {
    private _plans?: any
    
    get plans() {
        if (!this._plans) {
            this._plans = {
                [PLAN_TYPE.FREE]: {
                    id: PLAN_TYPE.FREE,
                    name: 'Free Trial',
                    price: 0,
                    propertyLimit: 2,
                    stripePriceId: null,
                    stripeMonthlyPriceId: null,
                    stripeAnnualPriceId: null
                },
                [PLAN_TYPE.STARTER]: {
                    id: PLAN_TYPE.STARTER,
                    name: 'Starter',
                    price: 19,
                    propertyLimit: 10,
                    get stripePriceId() { return process.env.STRIPE_STARTER_MONTHLY ?? null },
                    get stripeMonthlyPriceId() { return process.env.STRIPE_STARTER_MONTHLY ?? null },
                    get stripeAnnualPriceId() { return process.env.STRIPE_STARTER_ANNUAL ?? null }
                },
                [PLAN_TYPE.GROWTH]: {
                    id: PLAN_TYPE.GROWTH,
                    name: 'Growth',
                    price: 49,
                    propertyLimit: 50,
                    get stripePriceId() { return process.env.STRIPE_GROWTH_MONTHLY ?? null },
                    get stripeMonthlyPriceId() { return process.env.STRIPE_GROWTH_MONTHLY ?? null },
                    get stripeAnnualPriceId() { return process.env.STRIPE_GROWTH_ANNUAL ?? null }
                },
                [PLAN_TYPE.ENTERPRISE]: {
                    id: PLAN_TYPE.ENTERPRISE,
                    name: 'Enterprise',
                    price: 149,
                    propertyLimit: -1,
                    get stripePriceId() { return process.env.STRIPE_ENTERPRISE_MONTHLY ?? null },
                    get stripeMonthlyPriceId() { return process.env.STRIPE_ENTERPRISE_MONTHLY ?? null },
                    get stripeAnnualPriceId() { return process.env.STRIPE_ENTERPRISE_ANNUAL ?? null }
                }
            } as const
        }
        return this._plans
    }
}

const billingPlansManager = new BillingPlansManager()

// Export lazy-loaded plans
export const BILLING_PLANS = billingPlansManager.plans

// PERFORMANCE: Cached helper functions to avoid repeated lookups
const planLookupCache = new Map<string, ReturnType<typeof getPlanById>>()

// Helper functions
export function getPlanById(
	planId: string
): typeof BILLING_PLANS[keyof typeof BILLING_PLANS] | undefined {
	// Check cache first
	if (planLookupCache.has(planId)) {
		return planLookupCache.get(planId)
	}
	
	// Use switch for better performance than Object.entries iteration
	let result: typeof BILLING_PLANS[keyof typeof BILLING_PLANS] | undefined
	switch (planId) {
		case PLAN_TYPE.FREE:
			result = BILLING_PLANS[PLAN_TYPE.FREE]
			break
		case PLAN_TYPE.STARTER:
			result = BILLING_PLANS[PLAN_TYPE.STARTER]
			break
		case PLAN_TYPE.GROWTH:
			result = BILLING_PLANS[PLAN_TYPE.GROWTH]
			break
		case PLAN_TYPE.ENTERPRISE:
			result = BILLING_PLANS[PLAN_TYPE.ENTERPRISE]
			break
		default:
			result = undefined
	}
	
	// Cache the result
	planLookupCache.set(planId, result)
	return result
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

// PERFORMANCE: Pre-warm commonly used plans during idle time
if (typeof setImmediate !== 'undefined') {
	setImmediate(() => {
		// Pre-load starter and growth plans (most common)
		getPlanById(PLAN_TYPE.STARTER)
		getPlanById(PLAN_TYPE.GROWTH)
	})
}
