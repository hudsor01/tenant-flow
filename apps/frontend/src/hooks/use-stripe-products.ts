/**
 * React hook for fetching Stripe products and prices
 * Uses TanStack Query for caching and automatic refetching
 * Fetches from backend Stripe API endpoints
 */

import type { StripeProductWithPricing } from '@repo/shared/types/stripe'
import { useQuery } from '@tanstack/react-query'


/**
 * Transform Stripe product data from backend into structured pricing data
 */
function transformStripeProducts(products: Array<{
	id: string
	name: string
	description: string | null
	active: boolean
	metadata: Record<string, string>
	prices?: Array<{
		id: string
		unit_amount: number
		currency: string
		recurring: {
			interval: 'month' | 'year'
			interval_count: number
		} | null
	}>
	default_price?: {
		id: string
		unit_amount: number
		currency: string
		recurring: {
			interval: 'month' | 'year'
			interval_count: number
		} | null
	}
}>): StripeProductWithPricing[] {
	return products.map(product => {
		// Get all prices for this product
		const allPrices = product.prices || []

		// Find monthly and annual prices
		const monthlyPrice = allPrices.find(
			p => p.recurring?.interval === 'month'
		) || null

		const annualPrice = allPrices.find(
			p => p.recurring?.interval === 'year'
		) || null

		return {
			id: product.id,
			name: product.name,
			description: product.description,
			metadata: product.metadata || {},
			prices: {
				monthly: monthlyPrice,
				annual: annualPrice
			},
			defaultPrice: product.default_price || null
		}
	})
}

/**
 * Feature definitions for each plan
 * Stored locally to avoid Stripe's 500-char metadata limit
 * Synced with backend Stripe product metadata
 */
const PLAN_FEATURES: Record<string, string[]> = {
	starter: [
		'Up to 10 units',
		'Unlimited tenants',
		'Online rent collection',
		'Lease management',
		'Maintenance tracking',
		'Tenant screening',
		'Basic financial reports',
		'Email support'
	],
	growth: [
		'Up to 50 units',
		'Everything in Starter',
		'Automated rent reminders',
		'Late fee automation',
		'Advanced reporting & analytics',
		'Document storage (10GB)',
		'Tenant portal access',
		'Mobile app access',
		'Priority support (24hr response)'
	],
	max: [
		'Unlimited units',
		'Everything in Growth',
		'Custom integrations (API access)',
		'White-label options',
		'Dedicated account manager',
		'Advanced automation rules',
		'Custom reports',
		'Unlimited document storage',
		'24/7 phone & chat support'
	]
}

/**
 * Hook to fetch Stripe products with pricing data
 * Production-only: Requires backend API connection
 * Caches for 5 minutes to minimize API calls
 */
export function useStripeProducts() {
	const query = useQuery({
		queryKey: ['stripe', 'products'],
		queryFn: async () => {
			const res = await fetch('/api/v1/stripe/products', {
				credentials: 'include'
			})
			if (!res.ok) {
				throw new Error('Failed to fetch Stripe products')
			}
			const response = await res.json()
			return transformStripeProducts(response.products)
		},
		staleTime: 1000 * 60 * 5, // 5 minutes
		refetchOnWindowFocus: false,
		refetchOnMount: true,
		retry: 2 // Retry twice on failure
	})

	return {
		products: query.data || [],
		isLoading: query.isLoading,
		error: query.error,
		refetch: query.refetch
	}
}

/**
 * Format price from Stripe (cents) to display format
 */
export function formatStripePrice(amountInCents: number | null | undefined): string {
	if (amountInCents === null || amountInCents === undefined) {
		return '$0'
	}

	const dollars = amountInCents / 100
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	}).format(dollars)
}

/**
 * Calculate savings between monthly and annual pricing
 */
export function calculateAnnualSavings(
	monthlyPrice: number | null,
	annualPrice: number | null
): { savingsAmount: number; savingsPercent: number } {
	if (!monthlyPrice || !annualPrice) {
		return { savingsAmount: 0, savingsPercent: 0 }
	}

	const monthlyTotal = monthlyPrice * 12
	const savings = monthlyTotal - annualPrice
	const savingsPercent = Math.round((savings / monthlyTotal) * 100)

	return {
		savingsAmount: savings,
		savingsPercent
	}
}

/**
 * Get features for a plan by planId
 * Features stored locally to avoid Stripe's 500-char metadata limit
 */
export function getPlanFeatures(planId: string): string[] {
	return PLAN_FEATURES[planId] || []
}
