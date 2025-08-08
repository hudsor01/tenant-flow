import { PLAN_TYPE } from '@repo/shared'

// import type { PlanType } from '@repo/database'

// Export types for use in other files
export interface BillingPlan {
	id: string
	name: string
	price: number
	propertyLimit: number
	stripePriceId?: string | null
	stripePriceIds: {
		monthly: string | null
		annual: string | null
	}
}

// PERFORMANCE: Use lazy getters to avoid env var access during module initialization
class BillingPlansManager {
    private _plans?: Record<string, BillingPlan>

    get plans(): Record<string, BillingPlan> {
        if (!this._plans) {
            this._plans = {
                [PLAN_TYPE.FREETRIAL]: {
                    id: PLAN_TYPE.FREETRIAL,
                    name: 'Free Trial',
                    price: 0,
                    propertyLimit: 2,
                    stripePriceId: null,
                    stripePriceIds: {
                        monthly: null,
                        annual: null
                    }
                },
                [PLAN_TYPE.STARTER]: {
                    id: PLAN_TYPE.STARTER,
                    name: 'Starter',
                    price: 19,
                    propertyLimit: 10,
                    get stripePriceId() { return process.env.STRIPE_STARTER_MONTHLY ?? null },
                    stripePriceIds: {
                        get monthly() { return process.env.STRIPE_STARTER_MONTHLY ?? null },
                        get annual() { return process.env.STRIPE_STARTER_ANNUAL ?? null }
                    }
                },
                [PLAN_TYPE.GROWTH]: {
                    id: PLAN_TYPE.GROWTH,
                    name: 'Growth',
                    price: 49,
                    propertyLimit: 50,
                    get stripePriceId() { return process.env.STRIPE_GROWTH_MONTHLY ?? null },
                    stripePriceIds: {
                        get monthly() { return process.env.STRIPE_GROWTH_MONTHLY ?? null },
                        get annual() { return process.env.STRIPE_GROWTH_ANNUAL ?? null }
                    }
                },
                [PLAN_TYPE.TENANTFLOW_MAX]: {
                    id: PLAN_TYPE.TENANTFLOW_MAX,
                    name: 'TenantFlow MAX',
                    price: 149,
                    propertyLimit: -1,
                    get stripePriceId() { return process.env.STRIPE_TENANTFLOW_MAX_MONTHLY ?? null },
                    stripePriceIds: {
                        get monthly() { return process.env.STRIPE_TENANTFLOW_MAX_MONTHLY ?? null },
                        get annual() { return process.env.STRIPE_TENANTFLOW_MAX_ANNUAL ?? null }
                    }
                }
            } as const
        }
        return this._plans
    }
}

const billingPlansManager = new BillingPlansManager()

// Export lazy-loaded plans
export const BILLING_PLANS: Record<string, BillingPlan> = billingPlansManager.plans

// PERFORMANCE: Cached helper functions to avoid repeated lookups
const planLookupCache = new Map<string, ReturnType<typeof getPlanById>>()

// Helper functions
export function getPlanById(
	planId: string
): BillingPlan | undefined {
	// Check cache first
	if (planLookupCache.has(planId)) {
		return planLookupCache.get(planId)
	}

	// Use switch for better performance than Object.entries iteration
	let result: BillingPlan | undefined
	switch (planId) {
		case PLAN_TYPE.FREETRIAL:
			result = BILLING_PLANS[PLAN_TYPE.FREETRIAL]
			break
		case PLAN_TYPE.STARTER:
			result = BILLING_PLANS[PLAN_TYPE.STARTER]
			break
		case PLAN_TYPE.GROWTH:
			result = BILLING_PLANS[PLAN_TYPE.GROWTH]
			break
		case PLAN_TYPE.TENANTFLOW_MAX:
			result = BILLING_PLANS[PLAN_TYPE.TENANTFLOW_MAX]
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

// PERFORMANCE: Pre-warm commonly used plans during idle time
if (typeof setImmediate !== 'undefined') {
	setImmediate(() => {
		// Pre-load starter and growth plans (most common)
		getPlanById(PLAN_TYPE.STARTER)
		getPlanById(PLAN_TYPE.GROWTH)
	})
}
