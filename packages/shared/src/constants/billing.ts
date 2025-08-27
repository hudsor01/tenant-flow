/**
 * Billing constants
 * Central source of truth for billing enums and constants
 */

import type { BillingPeriod } from '../types/stripe'

// Plan type enum
export const PLAN_TYPE = {
	FREETRIAL: 'FREETRIAL',
	STARTER: 'STARTER',
	GROWTH: 'GROWTH',
	TENANTFLOW_MAX: 'TENANTFLOW_MAX'
} as const

export type PlanType = (typeof PLAN_TYPE)[keyof typeof PLAN_TYPE]

// Subscription status enum
export const SUB_STATUS = {
	ACTIVE: 'ACTIVE',
	CANCELLED: 'CANCELLED',
	PAST_DUE: 'PAST_DUE',
	INCOMPLETE: 'INCOMPLETE',
	INCOMPLETE_EXPIRED: 'INCOMPLETE_EXPIRED',
	TRIALING: 'TRIALING',
	UNPAID: 'UNPAID'
} as const

export type SubStatus = (typeof SUB_STATUS)[keyof typeof SUB_STATUS]

// Plan configuration data
export const PLANS = [
	{
		id: 'FREETRIAL',
		name: 'Free Trial',
		description: 'Perfect for getting started',
		price: { monthly: 0, annual: 0 },
		features: ['Up to 2 properties', '5GB storage', 'Basic support'],
		propertyLimit: 2,
		storageLimit: 5000,
		apiCallLimit: 1000,
		priority: false
	},
	{
		id: 'STARTER',
		name: 'Starter',
		description: 'Great for small portfolios',
		price: { monthly: 2900, annual: 29000 },
		features: ['Up to 10 properties', '50GB storage', 'Email support'],
		propertyLimit: 10,
		storageLimit: 50000,
		apiCallLimit: 10000,
		priority: false
	},
	{
		id: 'GROWTH',
		name: 'Growth',
		description: 'Scale your property business',
		price: { monthly: 7900, annual: 79000 },
		features: ['Up to 50 properties', '200GB storage', 'Priority support'],
		propertyLimit: 50,
		storageLimit: 200000,
		apiCallLimit: 50000,
		priority: true
	},
	{
		id: 'TENANTFLOW_MAX',
		name: 'TenantFlow MAX',
		description: 'For large property portfolios',
		price: { monthly: 19900, annual: 199000 },
		features: [
			'Unlimited properties',
			'Unlimited storage',
			'24/7 support',
			'Custom integrations'
		],
		propertyLimit: -1,
		storageLimit: -1,
		apiCallLimit: -1,
		priority: true
	}
]

// Derived options arrays for frontend use
export const PLAN_TYPE_OPTIONS = Object.values(PLAN_TYPE)
export const SUB_STATUS_OPTIONS = Object.values(SUB_STATUS)

// Re-export BillingPeriod type for convenience
export type { BillingPeriod }
