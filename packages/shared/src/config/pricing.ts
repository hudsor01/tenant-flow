/**
 * Enhanced type-safe pricing configuration for 4-tier subscription system
 * Defines products, trials, limits, and features for each tier with branded types
 */

import type { PlanType } from '../types/stripe'
import type { ProductTierConfig, TrialConfig } from '../types/billing'

// Branded types for type safety
export type StripePriceId = `price_${string}`
export type PlanId = 'trial' | 'starter' | 'growth' | 'max'
export type BillingInterval = 'monthly' | 'annual'
export type SupportTier = 'email' | 'priority' | 'dedicated'

// Usage metrics type
export interface UsageMetrics {
	readonly properties: number
	readonly units: number
	readonly users: number
	readonly storage: number // GB
	readonly apiCalls: number
}

// Plan limits with branded types
export interface PlanLimits {
	readonly properties: number // -1 for unlimited
	readonly units: number // -1 for unlimited
	readonly users: number // -1 for unlimited
	readonly storage: number // GB, -1 for unlimited
	readonly apiCalls: number // -1 for unlimited
}

// Enhanced pricing configuration
export interface EnhancedPricingConfig {
	readonly id: PlanType
	readonly planId: PlanId
	readonly name: string
	readonly description: string
	readonly price: {
		readonly monthly: number
		readonly annual: number
	}
	readonly stripePriceIds: {
		readonly monthly: StripePriceId | null
		readonly annual: StripePriceId | null
	}
	readonly limits: PlanLimits
	readonly features: readonly string[]
	readonly support: SupportTier
	readonly trial: TrialConfig
	readonly recommended?: boolean
	readonly popular?: boolean
}

/**
 * Production-ready enhanced pricing configuration for TenantFlow
 * 4 Products: Free Trial, Starter, Growth, TenantFlow Max
 * Immutable configuration with branded types for type safety
 */
export const ENHANCED_PRODUCT_TIERS = {
	FREETRIAL: {
		id: 'FREETRIAL' as const,
		planId: 'trial' as const,
		name: 'Free Trial',
		description: 'Perfect for trying out TenantFlow',
		price: {
			monthly: 0,
			annual: 0
		} as const,
		stripePriceIds: {
			monthly: 'price_1RtWFcP3WCR53Sdo5Li5xHiC' as StripePriceId,
			annual: null
		} as const,
		limits: {
			properties: 1,
			units: 5,
			users: 1,
			storage: 1,
			apiCalls: 1000
		} as const,
		features: [
			'Up to 1 property',
			'Up to 5 units',
			'Basic tenant management',
			'Email support',
			'Mobile app access'
		] as const,
		support: 'email' as const,
		trial: {
			trialPeriodDays: 14,
			trialEndBehavior: 'cancel' as const,
			collectPaymentMethod: false,
			reminderDaysBeforeEnd: 3
		} as const
	},
	STARTER: {
		id: 'STARTER' as const,
		planId: 'starter' as const,
		name: 'Starter',
		description: 'Great for small property managers',
		price: {
			monthly: 29,
			annual: 290
		} as const,
		stripePriceIds: {
			monthly: 'price_1RtWFcP3WCR53SdoCxiVldhb' as StripePriceId,
			annual: 'price_1RtWFdP3WCR53SdoArRRXYrL' as StripePriceId
		} as const,
		limits: {
			properties: 5,
			units: 50,
			users: 3,
			storage: 10,
			apiCalls: 10000
		} as const,
		features: [
			'Up to 5 properties',
			'Up to 50 units',
			'Advanced tenant management',
			'Lease management',
			'Maintenance tracking',
			'Financial reporting',
			'Priority email support',
			'API access'
		] as const,
		support: 'email' as const,
		trial: {
			trialPeriodDays: 14,
			trialEndBehavior: 'pause' as const,
			collectPaymentMethod: false,
			reminderDaysBeforeEnd: 3
		} as const,
		popular: true
	},
	GROWTH: {
		id: 'GROWTH' as const,
		planId: 'growth' as const,
		name: 'Growth',
		description: 'Ideal for growing property management companies',
		price: {
			monthly: 79,
			annual: 790
		} as const,
		stripePriceIds: {
			monthly: 'price_1RtWFdP3WCR53Sdoz98FFpSu' as StripePriceId,
			annual: 'price_1RtWFdP3WCR53SdoHDRR9kAJ' as StripePriceId
		} as const,
		limits: {
			properties: 20,
			units: 200,
			users: 10,
			storage: 50,
			apiCalls: 50000
		} as const,
		features: [
			'Up to 20 properties',
			'Up to 200 units',
			'Everything in Starter',
			'Advanced analytics',
			'Custom reports',
			'Bulk operations',
			'Team collaboration',
			'Priority support',
			'Advanced API access',
			'Integrations'
		] as const,
		support: 'priority' as const,
		trial: {
			trialPeriodDays: 14,
			trialEndBehavior: 'pause' as const,
			collectPaymentMethod: false,
			reminderDaysBeforeEnd: 3
		} as const,
		recommended: true
	},
	TENANTFLOW_MAX: {
		id: 'TENANTFLOW_MAX' as const,
		planId: 'max' as const,
		name: 'TenantFlow Max',
		description: 'For large property management operations',
		price: {
			monthly: 199,
			annual: 1990
		} as const,
		stripePriceIds: {
			monthly: 'price_1RtWFeP3WCR53Sdo9AsL7oGv' as StripePriceId,
			annual: 'price_1RtWFeP3WCR53Sdoxm2iY4mt' as StripePriceId
		} as const,
		limits: {
			properties: -1,
			units: -1,
			users: -1,
			storage: -1,
			apiCalls: -1
		} as const,
		features: [
			'Unlimited properties',
			'Unlimited units',
			'Everything in Growth',
			'White-label options',
			'Custom integrations',
			'Dedicated account manager',
			'SLA guarantee',
			'24/7 phone support',
			'Custom training',
			'API rate limit bypass'
		] as const,
		support: 'dedicated' as const,
		trial: {
			trialPeriodDays: 30,
			trialEndBehavior: 'pause' as const,
			collectPaymentMethod: true,
			reminderDaysBeforeEnd: 7
		} as const
	}
} as const

// Legacy support - maps to enhanced config
export const PRODUCT_TIERS: Record<PlanType, ProductTierConfig> = {
	FREETRIAL: ENHANCED_PRODUCT_TIERS.FREETRIAL,

	STARTER: ENHANCED_PRODUCT_TIERS.STARTER,

	GROWTH: ENHANCED_PRODUCT_TIERS.GROWTH,

	TENANTFLOW_MAX: ENHANCED_PRODUCT_TIERS.TENANTFLOW_MAX
}

/**
 * Get product tier configuration by plan type with validation
 */
export function getProductTier(planType: PlanType): ProductTierConfig {
	// Input validation
	if (!planType || typeof planType !== 'string') {
		throw new Error('Plan type must be a non-empty string')
	}

	// Validate plan type is a known enum value
	const validPlanTypes: PlanType[] = [
		'FREETRIAL',
		'STARTER',
		'GROWTH',
		'TENANTFLOW_MAX'
	]
	if (!validPlanTypes.includes(planType)) {
		throw new Error(
			`Invalid plan type: ${planType}. Must be one of: ${validPlanTypes.join(', ')}`
		)
	}

	const tier = PRODUCT_TIERS[planType]
	if (!tier) {
		throw new Error(`Product tier not found for plan type: ${planType}`)
	}

	// Validate tier configuration integrity
	if (!tier.id || !tier.name || !tier.description) {
		throw new Error(`Invalid tier configuration for plan type: ${planType}`)
	}

	return tier
}

/**
 * Enhanced type-safe functions for pricing operations
 */

/**
 * Get Stripe price ID for a plan and billing interval with validation
 */
export function getStripePriceId(
	planType: PlanType,
	interval: BillingInterval
): StripePriceId | null {
	// Input validation
	if (!planType || typeof planType !== 'string') {
		throw new Error('Plan type must be a non-empty string')
	}

	if (!interval || typeof interval !== 'string') {
		throw new Error('Billing interval must be a non-empty string')
	}

	// Validate billing interval
	const validIntervals: BillingInterval[] = ['monthly', 'annual']
	if (!validIntervals.includes(interval)) {
		throw new Error(
			`Invalid billing interval: ${interval}. Must be one of: ${validIntervals.join(', ')}`
		)
	}

	// Validate plan type
	const validPlanTypes: PlanType[] = [
		'FREETRIAL',
		'STARTER',
		'GROWTH',
		'TENANTFLOW_MAX'
	]
	if (!validPlanTypes.includes(planType)) {
		throw new Error(
			`Invalid plan type: ${planType}. Must be one of: ${validPlanTypes.join(', ')}`
		)
	}

	const tier = ENHANCED_PRODUCT_TIERS[planType]
	if (!tier) {
		throw new Error(`Product tier not found for plan type: ${planType}`)
	}

	const priceId = tier.stripePriceIds[interval]

	// Validate price ID format if it exists
	if (priceId && !priceId.startsWith('price_')) {
		throw new Error(
			`Invalid Stripe price ID format: ${priceId}. Must start with 'price_'`
		)
	}

	return priceId
}

/**
 * Get enhanced product tier configuration by plan type with validation
 */
export function getEnhancedProductTier(
	planType: PlanType
): (typeof ENHANCED_PRODUCT_TIERS)[PlanType] {
	// Input validation
	if (!planType || typeof planType !== 'string') {
		throw new Error('Plan type must be a non-empty string')
	}

	// Validate plan type is a known enum value
	const validPlanTypes: PlanType[] = [
		'FREETRIAL',
		'STARTER',
		'GROWTH',
		'TENANTFLOW_MAX'
	]
	if (!validPlanTypes.includes(planType)) {
		throw new Error(
			`Invalid plan type: ${planType}. Must be one of: ${validPlanTypes.join(', ')}`
		)
	}

	const tier = ENHANCED_PRODUCT_TIERS[planType]
	if (!tier) {
		throw new Error(
			`Enhanced product tier not found for plan type: ${planType}`
		)
	}

	// Validate tier configuration integrity
	if (!tier.id || !tier.name || !tier.description) {
		throw new Error(
			`Invalid enhanced tier configuration for plan type: ${planType}`
		)
	}

	if (
		typeof tier.price.monthly !== 'number' ||
		typeof tier.price.annual !== 'number'
	) {
		throw new Error(
			`Invalid pricing configuration for plan type: ${planType}`
		)
	}

	if (tier.price.monthly < 0 || tier.price.annual < 0) {
		throw new Error(`Pricing cannot be negative for plan type: ${planType}`)
	}

	return tier
}

/**
 * Check if a plan has a free trial with validation
 */
export function hasTrial(planType: PlanType): boolean {
	// Input validation
	if (!planType || typeof planType !== 'string') {
		throw new Error('Plan type must be a non-empty string')
	}

	// Validate plan type is a known enum value
	const validPlanTypes: PlanType[] = [
		'FREETRIAL',
		'STARTER',
		'GROWTH',
		'TENANTFLOW_MAX'
	]
	if (!validPlanTypes.includes(planType)) {
		throw new Error(
			`Invalid plan type: ${planType}. Must be one of: ${validPlanTypes.join(', ')}`
		)
	}

	const tier = PRODUCT_TIERS[planType]
	if (!tier) {
		throw new Error(`Product tier not found for plan type: ${planType}`)
	}

	// Validate trial configuration
	if (!tier.trial || typeof tier.trial.trialPeriodDays !== 'number') {
		throw new Error(
			`Invalid trial configuration for plan type: ${planType}`
		)
	}

	if (tier.trial.trialPeriodDays < 0) {
		throw new Error(
			`Trial period cannot be negative for plan type: ${planType}`
		)
	}

	return tier.trial.trialPeriodDays > 0
}

/**
 * Get trial configuration for a plan with validation
 */
export function getTrialConfig(planType: PlanType): TrialConfig | undefined {
	// Input validation
	if (!planType || typeof planType !== 'string') {
		throw new Error('Plan type must be a non-empty string')
	}

	// Validate plan type is a known enum value
	const validPlanTypes: PlanType[] = [
		'FREETRIAL',
		'STARTER',
		'GROWTH',
		'TENANTFLOW_MAX'
	]
	if (!validPlanTypes.includes(planType)) {
		throw new Error(
			`Invalid plan type: ${planType}. Must be one of: ${validPlanTypes.join(', ')}`
		)
	}

	const tier = PRODUCT_TIERS[planType]
	if (!tier) {
		throw new Error(`Product tier not found for plan type: ${planType}`)
	}

	const trialConfig = tier.trial

	// Validate trial configuration if it exists
	if (trialConfig) {
		if (
			typeof trialConfig.trialPeriodDays !== 'number' ||
			trialConfig.trialPeriodDays < 0
		) {
			throw new Error(`Invalid trial period for plan type: ${planType}`)
		}

		const validTrialEndBehaviors = ['cancel', 'pause'] as const
		if (
			!validTrialEndBehaviors.includes(
				trialConfig.trialEndBehavior as (typeof validTrialEndBehaviors)[number]
			)
		) {
			throw new Error(
				`Invalid trial end behavior for plan type: ${planType}`
			)
		}

		if (typeof trialConfig.collectPaymentMethod !== 'boolean') {
			throw new Error(
				`Invalid collectPaymentMethod setting for plan type: ${planType}`
			)
		}

		if (
			typeof trialConfig.reminderDaysBeforeEnd !== 'number' ||
			trialConfig.reminderDaysBeforeEnd < 0
		) {
			throw new Error(
				`Invalid reminderDaysBeforeEnd for plan type: ${planType}`
			)
		}
	}

	return trialConfig
}

/**
 * Enhanced plan limit checking with comprehensive validation
 */
export function checkPlanLimits(
	planType: PlanType,
	usage: Partial<UsageMetrics>
): {
	readonly exceeded: boolean
	readonly limits: readonly {
		readonly type: keyof UsageMetrics
		readonly current: number
		readonly limit: number
		readonly utilizationPercent: number
	}[]
	readonly warningLimits: readonly {
		readonly type: keyof UsageMetrics
		readonly current: number
		readonly limit: number
		readonly utilizationPercent: number
	}[]
} {
	// Input validation
	if (!planType || typeof planType !== 'string') {
		throw new Error('Plan type must be a non-empty string')
	}

	if (!usage || typeof usage !== 'object') {
		throw new Error('Usage must be a valid object')
	}

	// Validate plan type is a known enum value
	const validPlanTypes: PlanType[] = [
		'FREETRIAL',
		'STARTER',
		'GROWTH',
		'TENANTFLOW_MAX'
	]
	if (!validPlanTypes.includes(planType)) {
		throw new Error(
			`Invalid plan type: ${planType}. Must be one of: ${validPlanTypes.join(', ')}`
		)
	}

	// Validate usage metrics
	const validUsageKeys: (keyof UsageMetrics)[] = [
		'properties',
		'units',
		'users',
		'storage',
		'apiCalls'
	]
	for (const key in usage) {
		if (!validUsageKeys.includes(key as keyof UsageMetrics)) {
			throw new Error(
				`Invalid usage metric: ${key}. Must be one of: ${validUsageKeys.join(', ')}`
			)
		}

		const value = usage[key as keyof UsageMetrics]
		if (value !== undefined && (typeof value !== 'number' || value < 0)) {
			throw new Error(
				`Usage metric ${key} must be a non-negative number, got: ${value}`
			)
		}
	}

	const tier = PRODUCT_TIERS[planType]
	if (!tier) {
		throw new Error(`Product tier not found for plan type: ${planType}`)
	}

	const exceededLimits: {
		readonly type: keyof UsageMetrics
		readonly current: number
		readonly limit: number
		readonly utilizationPercent: number
	}[] = []

	const warningLimits: {
		readonly type: keyof UsageMetrics
		readonly current: number
		readonly limit: number
		readonly utilizationPercent: number
	}[] = []

	// Helper function to calculate utilization and check limits
	const checkLimit = (
		type: keyof UsageMetrics,
		current: number | undefined,
		limit: number | undefined
	): void => {
		if (!current || !limit || limit === -1) return

		const utilizationPercent = Math.round((current / limit) * 100)

		if (current > limit) {
			exceededLimits.push({
				type,
				current,
				limit,
				utilizationPercent
			})
		} else if (utilizationPercent >= 80) {
			// Warning when usage is 80% or higher
			warningLimits.push({
				type,
				current,
				limit,
				utilizationPercent
			})
		}
	}

	// Check all limits
	checkLimit('properties', usage.properties, tier.limits.properties)
	checkLimit('units', usage.units, tier.limits.units)
	checkLimit('users', usage.users, tier.limits.users)
	checkLimit('storage', usage.storage, tier.limits.storage)
	checkLimit('apiCalls', usage.apiCalls, tier.limits.apiCalls)

	return {
		exceeded: exceededLimits.length > 0,
		limits: exceededLimits,
		warningLimits
	}
}

/**
 * Get recommended upgrade plan based on usage
 */
export function getRecommendedUpgrade(
	currentPlan: PlanType,
	usage: {
		properties?: number
		units?: number
		users?: number
	}
): PlanType | null {
	const planOrder: PlanType[] = [
		'FREETRIAL',
		'STARTER',
		'GROWTH',
		'TENANTFLOW_MAX'
	]
	const currentIndex = planOrder.indexOf(currentPlan)

	// Check each plan in order to find the first one that fits usage
	for (let i = currentIndex + 1; i < planOrder.length; i++) {
		const plan = planOrder[i]
		if (!plan) continue // Skip if plan is undefined

		const tier = PRODUCT_TIERS[plan]
		if (!tier) continue // Skip if tier is undefined

		const fitsUsage =
			(tier.limits.properties === -1 ||
				tier.limits.properties === undefined ||
				!usage.properties ||
				usage.properties <= tier.limits.properties) &&
			(tier.limits.units === -1 ||
				tier.limits.units === undefined ||
				!usage.units ||
				usage.units <= tier.limits.units) &&
			(tier.limits.users === -1 ||
				tier.limits.users === undefined ||
				!usage.users ||
				usage.users <= tier.limits.users)

		if (fitsUsage) {
			return plan
		}
	}

	return null
}

/**
 * Calculate annual savings for a plan with validation
 */
export function calculateAnnualSavings(planType: PlanType): number {
	// Input validation
	if (!planType || typeof planType !== 'string') {
		throw new Error('Plan type must be a non-empty string')
	}

	// Validate plan type is a known enum value
	const validPlanTypes: PlanType[] = [
		'FREETRIAL',
		'STARTER',
		'GROWTH',
		'TENANTFLOW_MAX'
	]
	if (!validPlanTypes.includes(planType)) {
		throw new Error(
			`Invalid plan type: ${planType}. Must be one of: ${validPlanTypes.join(', ')}`
		)
	}

	const tier = PRODUCT_TIERS[planType]
	if (!tier) {
		throw new Error(`Product tier not found for plan type: ${planType}`)
	}

	// Validate pricing data
	if (
		typeof tier.price.monthly !== 'number' ||
		typeof tier.price.annual !== 'number'
	) {
		throw new Error(`Invalid pricing data for plan type: ${planType}`)
	}

	if (tier.price.monthly < 0 || tier.price.annual < 0) {
		throw new Error(`Pricing cannot be negative for plan type: ${planType}`)
	}

	const monthlyCost = tier.price.monthly * 12
	const annualCost = tier.price.annual
	const savings = monthlyCost - annualCost

	// Validate calculated values
	if (!Number.isFinite(savings)) {
		throw new Error(
			`Invalid savings calculation for plan type: ${planType}`
		)
	}

	return Math.max(0, savings) // Ensure non-negative savings
}
