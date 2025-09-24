/**
 * Dynamic pricing configuration for TenantFlow subscription system
 * Fetches pricing data directly from Stripe API instead of hardcoding
 */

import type { PlanId, PricingConfig, StripePriceId } from './pricing.js'

// Frontend API client for dynamic pricing
export interface DynamicPricingService {
	fetchPricingConfig(): Promise<DynamicPricingConfig>
	getCachedConfig(): DynamicPricingConfig | null
	refreshConfig(): Promise<void>
}

// Dynamic pricing configuration from Stripe API
export interface DynamicPricingConfig {
	success: boolean
	config: DynamicPlan[]
	lastUpdated: string
}

export interface DynamicPlan {
	id: string // Stripe product ID
	name: string
	description: string
	metadata: Record<string, string>
	prices: {
		monthly: {
			id: string // Stripe price ID
			amount: number // in cents
			currency: string
		} | null
		annual: {
			id: string // Stripe price ID
			amount: number // in cents
			currency: string
		} | null
	}
	features: string[]
	limits: {
		properties: number
		units: number
		storage: number
	}
	support: string
	order: number
}

// Convert dynamic plan to legacy PricingConfig format
export function dynamicPlanToPricingConfig(plan: DynamicPlan): PricingConfig {
	// Map product ID to plan ID
	const planIdMap: Record<string, PlanId> = {
		tenantflow_free_trial: 'trial',
		tenantflow_starter: 'starter',
		tenantflow_growth: 'growth',
		tenantflow_max: 'max'
	}

	const planId = planIdMap[plan.id] || 'starter'

	return {
		id: plan.id.toUpperCase().replace('TENANTFLOW_', ''),
		planId,
		name: plan.name,
		description: plan.description,
		price: {
			monthly: plan.prices.monthly
				? Math.round(plan.prices.monthly.amount / 100)
				: 0,
			annual: plan.prices.annual
				? Math.round(plan.prices.annual.amount / 100)
				: 0
		},
		stripePriceIds: {
			monthly: (plan.prices.monthly?.id as StripePriceId) || null,
			annual: (plan.prices.annual?.id as StripePriceId) || null
		},
		limits: {
			properties: plan.limits.properties || -1,
			units: plan.limits.units || -1,
			users: 1, // Default, can be added to metadata
			storage: plan.limits.storage || -1,
			apiCalls: -1 // Default, can be added to metadata
		},
		features: plan.features,
		support: plan.support,
		trial:
			plan.id === 'tenantflow_free_trial'
				? {
						trialPeriodDays: 14,
						collectPaymentMethod: false,
						trialEndBehavior: 'cancel'
					}
				: false
	}
}

// Frontend API client implementation
export class FrontendPricingService implements DynamicPricingService {
	private cachedConfig: DynamicPricingConfig | null = null
	private readonly cacheExpiryMs = 5 * 60 * 1000 // 5 minutes
	private lastFetch = 0

	constructor(private readonly apiBaseUrl: string) {}

	async fetchPricingConfig(): Promise<DynamicPricingConfig> {
		const now = Date.now()

		// Return cached config if still fresh
		if (this.cachedConfig && now - this.lastFetch < this.cacheExpiryMs) {
			return this.cachedConfig
		}

		try {
			const response = await fetch(
				`${this.apiBaseUrl}/api/v1/stripe/pricing-config`,
				{
					headers: {
						'Content-Type': 'application/json'
					}
				}
			)

			if (!response.ok) {
				throw new Error(`Failed to fetch pricing config: ${response.status}`)
			}

			const config = (await response.json()) as DynamicPricingConfig

			// Cache the result
			this.cachedConfig = config
			this.lastFetch = now

			return config
		} catch (error) {
			// Return cached config if available, otherwise throw
			if (this.cachedConfig) {
				return this.cachedConfig
			}

			throw error
		}
	}

	getCachedConfig(): DynamicPricingConfig | null {
		return this.cachedConfig
	}

	async refreshConfig(): Promise<void> {
		this.lastFetch = 0 // Force refresh
		await this.fetchPricingConfig()
	}
}

// React hook for using dynamic pricing
export interface UseDynamicPricingReturn {
	config: DynamicPricingConfig | null
	plans: PricingConfig[]
	loading: boolean
	error: string | null
	refresh: () => Promise<void>
}

// Utility functions for working with dynamic pricing
export function findPlanByPriceId(
	config: DynamicPricingConfig,
	priceId: string
): DynamicPlan | null {
	return (
		config.config.find(
			plan =>
				plan.prices.monthly?.id === priceId ||
				plan.prices.annual?.id === priceId
		) || null
	)
}

export function getPriceIdForPlan(
	config: DynamicPricingConfig,
	planId: string,
	period: 'monthly' | 'annual'
): string | null {
	const plan = config.config.find(p => p.id === planId)
	return plan?.prices[period]?.id || null
}

export function formatPrice(amountInCents: number, currency = 'USD'): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: currency.toUpperCase(),
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	}).format(amountInCents / 100)
}

export function calculateAnnualSavings(
	monthlyAmount: number,
	annualAmount: number
): number {
	const monthlyTotal = monthlyAmount * 12
	return Math.round(((monthlyTotal - annualAmount) / monthlyTotal) * 100)
}
