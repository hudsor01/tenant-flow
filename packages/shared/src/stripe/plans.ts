/**
 * TenantFlow Stripe Plans Configuration
 * Uses actual Stripe product/price IDs from live account
 * Replaces duplicate pricing configurations with single source of truth
 */

import type { PlanType, BillingPeriod } from '../types/stripe'

/**
 * Stripe price IDs from live account (verified via MCP)
 * These match the actual Stripe dashboard products
 */
export const STRIPE_PRICE_IDS: Record<
	PlanType,
	{ monthly: string; annual: string }
> = {
	FREETRIAL: {
		monthly: 'price_1RtWFcP3WCR53Sdo5Li5xHiC', // Free trial - 14 days
		annual: 'price_1RtWFcP3WCR53Sdo5Li5xHiC' // Same for annual
	},
	STARTER: {
		monthly: 'price_1RtWFcP3WCR53SdoCxiVldhb', // $29.00/month
		annual: 'price_1RtWFdP3WCR53SdoArRRXYrL' // $290.00/year (17% savings)
	},
	GROWTH: {
		monthly: 'price_1RtWFdP3WCR53Sdoz98FFpSu', // $79.00/month
		annual: 'price_1RtWFdP3WCR53SdoHDRR9kAJ' // $790.00/year (17% savings)
	},
	TENANTFLOW_MAX: {
		monthly: 'price_1RtWFeP3WCR53Sdo9AsL7oGv', // $199.00/month
		annual: 'price_1RtWFeP3WCR53Sdoxm2iY4mt' // $1990.00/year (17% savings)
	}
} as const

/**
 * Stripe product IDs from live account
 */
export const STRIPE_PRODUCT_IDS: Record<PlanType, string> = {
	FREETRIAL: 'tenantflow_free_trial',
	STARTER: 'tenantflow_starter',
	GROWTH: 'tenantflow_growth',
	TENANTFLOW_MAX: 'tenantflow_max'
} as const

/**
 * Helper function to get Stripe price ID for a plan and billing period
 */
export function getStripePriceId(
	planType: PlanType,
	period: BillingPeriod
): string {
	const prices = STRIPE_PRICE_IDS[planType]
	return period === 'monthly' ? prices.monthly : prices.annual
}

/**
 * Helper function to get Stripe product ID for a plan
 */
export function getStripeProductId(planType: PlanType): string {
	return STRIPE_PRODUCT_IDS[planType]
}
