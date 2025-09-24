/**
 * Stripe configuration helpers
 * NATIVE: Direct Stripe integration following CLAUDE.md principles
 */

import { PLANS } from '../constants/billing.js'
import type { BillingPeriod, PlanType } from '../types/stripe.js'

/**
 * Get Stripe price ID for a given plan and billing period
 * These would normally come from environment variables or database
 */
export function getPriceId(plan: PlanType, period: BillingPeriod): string {
	// Production price IDs should come from environment variables
	const priceMap: Record<`${PlanType}_${BillingPeriod}`, string> = {
		FREETRIAL_monthly: 'price_freetrial_monthly',
		FREETRIAL_annual: 'price_freetrial_annual',
		STARTER_monthly:
			process.env.STRIPE_STARTER_MONTHLY_PRICE_ID || 'price_starter_monthly',
		STARTER_annual:
			process.env.STRIPE_STARTER_ANNUAL_PRICE_ID || 'price_starter_annual',
		GROWTH_monthly:
			process.env.STRIPE_GROWTH_MONTHLY_PRICE_ID || 'price_growth_monthly',
		GROWTH_annual:
			process.env.STRIPE_GROWTH_ANNUAL_PRICE_ID || 'price_growth_annual',
		TENANTFLOW_MAX_monthly:
			process.env.STRIPE_MAX_MONTHLY_PRICE_ID || 'price_max_monthly',
		TENANTFLOW_MAX_annual:
			process.env.STRIPE_MAX_ANNUAL_PRICE_ID || 'price_max_annual'
	}

	return priceMap[`${plan}_${period}`] || 'price_default'
}

/**
 * Get all available plans
 * Returns the PLANS array from billing constants
 */
export function getAllPlans() {
	return PLANS
}

/**
 * Format price in cents to dollar string
 * @param priceInCents - Price in cents (e.g., 2900 = $29.00)
 * @param period - Billing period for display
 */
export function formatPrice(
	priceInCents: number,
	period: BillingPeriod
): string {
	if (priceInCents === 0) {
		return 'Free'
	}

	const dollars = priceInCents / 100
	const periodDisplay = period === 'monthly' ? '/month' : '/year'

	return `$${dollars.toFixed(0)}${periodDisplay}`
}

/**
 * Calculate annual savings percentage
 * @param monthlyPrice - Monthly price in cents
 * @param annualPrice - Annual price in cents
 */
export function getAnnualSavings(
	monthlyPrice: number,
	annualPrice: number
): number {
	if (monthlyPrice === 0 || annualPrice === 0) {
		return 0
	}

	const yearlyEquivalent = monthlyPrice * 12
	const savings = (yearlyEquivalent - annualPrice) / yearlyEquivalent
	return Math.round(savings * 100)
}
