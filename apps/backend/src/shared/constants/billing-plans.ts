import type { PlanType} from '@tenantflow/types';
import { PLAN_TYPE } from '@tenantflow/types'

// 4-tier billing system
export const BILLING_PLANS = {
    [PLAN_TYPE.FREE]: {
        id: PLAN_TYPE.FREE,
        name: 'Free Trial',
        price: 0,
        propertyLimit: 2,
        stripePriceId: process.env.STRIPE_FREE_PRICE_ID
    },
    [PLAN_TYPE.STARTER]: {
        id: PLAN_TYPE.STARTER,
        name: 'Starter',
        price: 19,
        propertyLimit: 10,
        stripePriceId: process.env.STRIPE_STARTER_PRICE_ID
    },
    [PLAN_TYPE.GROWTH]: {
        id: PLAN_TYPE.GROWTH,
        name: 'Growth',
        price: 49,
        propertyLimit: 50,
        stripePriceId: process.env.STRIPE_GROWTH_PRICE_ID
    },
    [PLAN_TYPE.ENTERPRISE]: {
        id: PLAN_TYPE.ENTERPRISE,
        name: 'Enterprise',
        price: 149,
        propertyLimit: -1, // unlimited
        stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID
    }
} as const

// Helper functions
export function getPlanById(planId: string): typeof BILLING_PLANS[PlanType] | undefined {
    return BILLING_PLANS[planId as PlanType]
}

export function getPriceId(planId: string): string | undefined {
    const plan = getPlanById(planId)
    return plan?.stripePriceId
}

// Export types for use in other files
export type BillingPlan = typeof BILLING_PLANS[PlanType]