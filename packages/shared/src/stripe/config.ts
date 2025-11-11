/**
 * Stripe configuration helpers
 * NATIVE: Direct Stripe integration following CLAUDE.md principles
 */

import { PLANS } from '../constants/billing.js'
import { SHARED_ERROR_MESSAGES } from '../constants/error-messages.js'
import type { BillingPeriod, PlanType } from '../types/stripe.js'

/**
 * Get Stripe price ID for a given plan and billing period
 * These would normally come from environment variables or database
 */
export function getPriceId(plan: PlanType, period: BillingPeriod): string {
	// Production price IDs from Doppler (using actual environment variable names)
	const priceMap: Record<`${PlanType}_${BillingPeriod}`, string> = {
		FREETRIAL_monthly: 'price_freetrial_monthly',
		FREETRIAL_annual: 'price_freetrial_annual',
		STARTER_monthly:
			process.env["NEXT_PUBLIC_STRIPE_STARTER_MONTHLY"] ||
			(() => {
				throw new Error(
					SHARED_ERROR_MESSAGES.STRIPE_ENV_VAR_REQUIRED(
						'NEXT_PUBLIC_STRIPE_STARTER_MONTHLY'
					)
				)
			})(),
		STARTER_annual:
			process.env["NEXT_PUBLIC_STRIPE_STARTER_ANNUAL"] ||
			(() => {
				throw new Error(
					SHARED_ERROR_MESSAGES.STRIPE_ENV_VAR_REQUIRED(
						'NEXT_PUBLIC_STRIPE_STARTER_ANNUAL'
					)
				)
			})(),
		GROWTH_monthly:
			process.env["NEXT_PUBLIC_STRIPE_GROWTH_MONTHLY"] ||
			(() => {
				throw new Error(
					SHARED_ERROR_MESSAGES.STRIPE_ENV_VAR_REQUIRED(
						'NEXT_PUBLIC_STRIPE_GROWTH_MONTHLY'
					)
				)
			})(),
		GROWTH_annual:
			process.env["NEXT_PUBLIC_STRIPE_GROWTH_ANNUAL"] ||
			(() => {
				throw new Error(
					SHARED_ERROR_MESSAGES.STRIPE_ENV_VAR_REQUIRED(
						'NEXT_PUBLIC_STRIPE_GROWTH_ANNUAL'
					)
				)
			})(),
		TENANTFLOW_MAX_monthly:
			process.env["NEXT_PUBLIC_STRIPE_ENTERPRISE_MONTHLY"] ||
			(() => {
				throw new Error(
					SHARED_ERROR_MESSAGES.STRIPE_ENV_VAR_REQUIRED(
						'NEXT_PUBLIC_STRIPE_ENTERPRISE_MONTHLY'
					)
				)
			})(),
		TENANTFLOW_MAX_annual:
			process.env["NEXT_PUBLIC_STRIPE_ENTERPRISE_ANNUAL"] ||
			(() => {
				throw new Error(
					SHARED_ERROR_MESSAGES.STRIPE_ENV_VAR_REQUIRED(
						'NEXT_PUBLIC_STRIPE_ENTERPRISE_ANNUAL'
					)
				)
			})()
	}

	const priceId = priceMap[`${plan}_${period}`]
	if (!priceId) {
		throw new Error(SHARED_ERROR_MESSAGES.STRIPE_PRICE_ID_MISSING(plan, period))
	}
	return priceId
}

/**
 * Get all available plans
 * Returns the PLANS array from billing constants
 */
export function getAllPlans() {
	return PLANS
}
