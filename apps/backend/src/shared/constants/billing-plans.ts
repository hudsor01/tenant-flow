import type { BillingPlan } from '@repo/shared/constants/billing'
import { PLAN_TYPE } from '@repo/shared/constants/billing'

// Simple constant object - no class abstraction needed
export const BILLING_PLANS: Record<string, BillingPlan> = {
	[PLAN_TYPE.FREETRIAL]: {
		id: PLAN_TYPE.FREETRIAL,
		name: 'Free Trial',
		description: '14-day free trial with 2 properties',
		price: {
			monthly: 0,
			annual: 0
		},
		features: ['2 properties', 'Basic features', '14-day trial'],
		propertyLimit: 2,
		storageLimit: 1,
		apiCallLimit: 1000,
		priority: false
	},
	[PLAN_TYPE.STARTER]: {
		id: PLAN_TYPE.STARTER,
		name: 'Starter',
		description: 'Perfect for small landlords',
		price: {
			monthly: 19,
			annual: 190
		},
		features: ['10 properties', 'Standard features', 'Email support'],
		propertyLimit: 10,
		storageLimit: 5,
		apiCallLimit: 10000,
		priority: false
	},
	[PLAN_TYPE.GROWTH]: {
		id: PLAN_TYPE.GROWTH,
		name: 'Growth',
		description: 'For growing property managers',
		price: {
			monthly: 49,
			annual: 490
		},
		features: ['50 properties', 'Advanced features', 'Priority support'],
		propertyLimit: 50,
		storageLimit: 25,
		apiCallLimit: 50000,
		priority: true
	},
	[PLAN_TYPE.TENANTFLOW_MAX]: {
		id: PLAN_TYPE.TENANTFLOW_MAX,
		name: 'TenantFlow Max',
		description: 'For large property portfolios',
		price: {
			monthly: 99,
			annual: 990
		},
		features: ['200 properties', 'Enterprise features', '24/7 support'],
		propertyLimit: 200,
		storageLimit: 100,
		apiCallLimit: 200000,
		priority: true
	}
}

// Simple utility functions - no abstractions
export const getBillingPlans = () => BILLING_PLANS

export const getPlanById = (planId: string): BillingPlan | undefined => {
	return BILLING_PLANS[planId]
}

export const getDefaultPlan = (): BillingPlan => {
	const plan = BILLING_PLANS[PLAN_TYPE.FREETRIAL]
	if (!plan) {
		throw new Error('Default plan not found')
	}
	return plan
}
