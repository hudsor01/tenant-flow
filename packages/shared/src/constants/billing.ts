/**
 * Billing Plans Constants
 *
 * Defines the available billing plans and related utility functions.
 * This file is a single source of truth for both frontend and backend.
 */

import { SHARED_ERROR_MESSAGES } from './error-messages.js'

export const PLAN_TYPE = {
	FREETRIAL: 'FREETRIAL',
	STARTER: 'STARTER',
	GROWTH: 'GROWTH',
	TENANTFLOW_MAX: 'TENANTFLOW_MAX'
} as const

export type PlanType = (typeof PLAN_TYPE)[keyof typeof PLAN_TYPE]

export interface BillingPlan {
	id: PlanType
	name: string
	description: string
	price: {
		monthly: number
		annual: number
	}
	features: string[]
	propertyLimit: number
	storageLimit: number // in GB
	apiCallLimit: number
	priority: boolean
}

export const BILLING_PLANS: Record<PlanType, BillingPlan> = {
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
		description: 'Perfect for small property owners',
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

export const getBillingPlans = () => BILLING_PLANS

// Backward compatibility alias
export const PLANS = BILLING_PLANS

export const getPlanById = (planId: PlanType): BillingPlan | undefined => {
	return BILLING_PLANS[planId]
}

export const getDefaultPlan = (): BillingPlan => {
	const plan = BILLING_PLANS[PLAN_TYPE.FREETRIAL]
	if (!plan) {
		throw new Error(SHARED_ERROR_MESSAGES.DEFAULT_PLAN_NOT_FOUND)
	}
	return plan
}