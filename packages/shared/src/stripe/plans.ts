/**
 * TenantFlow Stripe Plans Configuration
 * Uses actual Stripe product/price IDs from live account
 * Replaces duplicate pricing configurations with single source of truth
 */

import type { BillingPeriod, PlanType } from '../types/stripe.js'

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
		monthly: 'price_1SPGCNP3WCR53SdorjDpiSy5', // $79.00/month
		annual: 'price_1SPGCRP3WCR53SdonqLUTJgK' // $790.00/year (17% savings)
	},
	TENANTFLOW_MAX: {
		monthly: 'price_1SPGCjP3WCR53SdoIpidDn0T', // $199.00/month
		annual: 'price_1SPGCoP3WCR53SdoID50geIC' // $1989.00/year (17% savings)
	}
} as const

/**
 * Stripe product IDs from live account
 */
export const STRIPE_PRODUCT_IDS: Record<PlanType, string> = {
	FREETRIAL: 'prod_SbujfadeHK2q0w',
	STARTER: 'tenantflow_starter',
	GROWTH: 'prod_TLy8IZ0jV68wF6',
	TENANTFLOW_MAX: 'prod_TLy85YNN2Unmyj'
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
