/**
 * Centralized Stripe Configuration
 * Single source of truth for all pricing and Stripe price IDs
 * Uses existing shared types for consistency
 */

import type { BillingPeriod, PlanType } from '../types/stripe'

export interface PlanPrice {
	readonly priceId: string
	readonly amount: number // in cents
}

export interface Plan {
	readonly id: PlanType
	readonly name: string
	readonly description: string
	readonly monthly: PlanPrice
	readonly annual: PlanPrice
	readonly features: readonly string[]
	readonly limits: {
		readonly properties: number
		readonly units: number
		readonly users: number
	}
	readonly popular?: boolean
	readonly recommended?: boolean
}

// Simplified plans (excluding FREETRIAL for clean pricing page)
export const STRIPE_PLANS = {
	STARTER: {
		id: 'STARTER' as PlanType,
		name: 'Starter',
		description: 'Perfect for small property managers',
		monthly: {
			priceId: 'price_1RtWGhP3WCR53Sdo5Li5xHiD',
			amount: 2900 // $29.00
		},
		annual: {
			priceId: 'price_1RtWGhP3WCR53Sdo5Li5xHiE',
			amount: 29000 // $290.00 (2 months free)
		},
		features: [
			'Up to 10 properties',
			'Up to 50 units',
			'Tenant management',
			'Basic reporting',
			'Email support',
			'Mobile app access'
		],
		limits: {
			properties: 10,
			units: 50,
			users: 3
		},
		recommended: true
	},
	GROWTH: {
		id: 'GROWTH' as PlanType,
		name: 'Growth',
		description: 'Ideal for growing property portfolios',
		monthly: {
			priceId: 'price_1RtWHiP3WCR53Sdo5Li5xHiF',
			amount: 8900 // $89.00
		},
		annual: {
			priceId: 'price_1RtWHiP3WCR53Sdo5Li5xHiG',
			amount: 89000 // $890.00 (2 months free)
		},
		features: [
			'Up to 50 properties',
			'Up to 250 units',
			'Advanced tenant management',
			'Advanced reporting & analytics',
			'Priority support',
			'API access',
			'Bulk operations',
			'Custom integrations'
		],
		limits: {
			properties: 50,
			units: 250,
			users: 10
		},
		popular: true
	},
	TENANTFLOW_MAX: {
		id: 'TENANTFLOW_MAX' as PlanType,
		name: 'TenantFlow Max',
		description: 'Enterprise-grade property management',
		monthly: {
			priceId: 'price_1RtWIjP3WCR53Sdo5Li5xHiH',
			amount: 19900 // $199.00
		},
		annual: {
			priceId: 'price_1RtWIjP3WCR53Sdo5Li5xHiI',
			amount: 199000 // $1990.00 (2 months free)
		},
		features: [
			'Unlimited properties',
			'Unlimited units',
			'Unlimited users',
			'White-label options',
			'Dedicated account manager',
			'Custom integrations',
			'Advanced analytics',
			'SLA guarantee',
			'24/7 phone support'
		],
		limits: {
			properties: -1, // unlimited
			units: -1,
			users: -1
		}
	}
} as const

// Helper functions
export function getPlan(planId: PlanType): Plan | undefined {
	return STRIPE_PLANS[planId as keyof typeof STRIPE_PLANS]
}

export function getPriceId(planId: PlanType, interval: BillingPeriod): string {
	const plan = getPlan(planId)
	if (!plan) {
		return ''
	}
	return interval === 'monthly' ? plan.monthly.priceId : plan.annual.priceId
}

export function getAmount(planId: PlanType, interval: BillingPeriod): number {
	const plan = getPlan(planId)
	if (!plan) {
		return 0
	}
	return interval === 'monthly' ? plan.monthly.amount : plan.annual.amount
}

export function formatPrice(amount: number): string {
	return `$${(amount / 100).toFixed(0)}`
}

export function getAllPlans(): Plan[] {
	return Object.values(STRIPE_PLANS)
}

export function getAnnualSavings(planId: PlanType): number {
	const plan = getPlan(planId)
	if (!plan) {
		return 0
	}
	const monthlyTotal = plan.monthly.amount * 12
	const annualPrice = plan.annual.amount
	return monthlyTotal - annualPrice
}
