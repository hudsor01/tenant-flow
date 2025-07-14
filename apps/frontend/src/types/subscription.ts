import { STRIPE_CONFIG } from '@/lib/stripe-config'
import { SubscriptionStatus, PlanType, BillingPeriod, type PrismaSubscription } from './prisma-types'
import type { UIPlanConcept } from '@/lib/plan-mapping'

// Use Prisma subscription as base
export interface Subscription extends Omit<PrismaSubscription, 'startDate' | 'endDate' | 'cancelledAt' | 'createdAt' | 'updatedAt' | 'currentPeriodStart' | 'currentPeriodEnd' | 'trialStart' | 'trialEnd' | 'canceledAt'> {
	// Convert Date objects to strings for frontend serialization
	startDate: string
	endDate?: string | null
	cancelledAt?: string | null
	createdAt: string
	updatedAt: string
	currentPeriodStart?: string | null
	currentPeriodEnd?: string | null
	trialStart?: string | null
	trialEnd?: string | null
	canceledAt?: string | null
}

export interface PlanLimits {
	properties: number | 'unlimited'
	tenants: number | 'unlimited'
	storage: number // in MB
	apiCalls: number | 'unlimited'
	teamMembers: number | 'unlimited'
}

export interface Plan {
	id: PlanType // Database enum value 
	uiId: UIPlanConcept // UI concept for display
	name: string
	description: string
	monthlyPrice: number
	annualPrice: number
	stripePriceIdMonthly?: string
	stripePriceIdAnnual?: string
	limits: PlanLimits
	features: string[]
	active: boolean
}

export interface Invoice {
	id: string
	userId: string
	subscriptionId: string
	stripeInvoiceId: string
	amountPaid: number
	amountDue: number
	currency: string
	status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void'
	invoiceDate: string
	dueDate: string
	paidAt?: string
	invoiceUrl?: string
	invoicePdf?: string
	description?: string
	createdAt: string
	updatedAt: string
}

export interface UsageMetrics {
	id: string
	userId: string
	month: string // YYYY-MM format
	propertiesCount: number
	tenantsCount: number
	storageUsed: number // in MB
	apiCallsCount: number
	teamMembersCount: number
	leaseGenerationsCount: number
	createdAt: string
	updatedAt: string
}

export interface BillingHistory {
	id: string
	userId: string
	type:
		| 'subscription_created'
		| 'subscription_updated'
		| 'subscription_canceled'
		| 'payment_succeeded'
		| 'payment_failed'
		| 'invoice_created'
	description: string
	amount?: number
	currency?: string
	stripeEventId?: string
	metadata?: Record<string, string | number | boolean>
	createdAt: string
}

// Plan definitions
export const PLANS: Plan[] = [
	{
		id: PlanType.FREE, // Database enum value
		uiId: 'FREE_TRIAL', // UI concept
		name: 'Free Trial',
		description: '14-day free trial with limited features',
		monthlyPrice: 0,
		annualPrice: 0,
		stripePriceIdMonthly: STRIPE_CONFIG.priceIds.freeTrial.monthly,
		stripePriceIdAnnual: STRIPE_CONFIG.priceIds.freeTrial.annual,
		limits: {
			properties: 3,
			tenants: 10,
			storage: 100, // 100MB
			apiCalls: 100,
			teamMembers: 1
		},
		features: [
			'14-day free trial',
			'Up to 3 properties',
			'Up to 10 tenants',
			'Basic payment tracking',
			'Maintenance requests',
			'Email notifications',
			'Mobile responsive design'
		],
		active: true
	},
	{
		id: PlanType.BASIC, // Database enum value
		uiId: 'STARTER', // UI concept
		name: 'Starter',
		description: 'Ideal for small property owners and landlords',
		monthlyPrice: 29,
		annualPrice: 290,
		stripePriceIdMonthly: STRIPE_CONFIG.priceIds.starter.monthly,
		stripePriceIdAnnual: STRIPE_CONFIG.priceIds.starter.annual,
		limits: {
			properties: 10,
			tenants: 50,
			storage: 1024, // 1GB
			apiCalls: 1000,
			teamMembers: 2
		},
		features: [
			'Everything in Free',
			'Up to 10 properties',
			'Up to 50 tenants',
			'Advanced payment tracking',
			'Lease management',
			'Property analytics',
			'Tenant portal access',
			'Email support',
			'Custom lease templates',
			'Rent collection tools'
		],
		active: true
	},
	{
		id: PlanType.PROFESSIONAL, // Database enum value
		uiId: 'GROWTH', // UI concept
		name: 'Growth',
		description: 'Best for growing property management businesses',
		monthlyPrice: 79,
		annualPrice: 790,
		stripePriceIdMonthly: STRIPE_CONFIG.priceIds.growth.monthly,
		stripePriceIdAnnual: STRIPE_CONFIG.priceIds.growth.annual,
		limits: {
			properties: 50,
			tenants: 500,
			storage: 10240, // 10GB
			apiCalls: 10000,
			teamMembers: 5
		},
		features: [
			'Everything in Starter',
			'Up to 50 properties',
			'Up to 500 tenants',
			'Advanced reporting & analytics',
			'Bulk operations',
			'API access',
			'Multi-user accounts',
			'Priority support',
			'Custom branding',
			'Integration support',
			'Late fee automation',
			'Financial reporting'
		],
		active: true
	},
	{
		id: PlanType.ENTERPRISE, // Database enum value
		uiId: 'ENTERPRISE', // UI concept
		name: 'Enterprise',
		description: 'For large property management companies',
		monthlyPrice: 199,
		annualPrice: 1990,
		stripePriceIdMonthly: STRIPE_CONFIG.priceIds.enterprise.monthly,
		stripePriceIdAnnual: STRIPE_CONFIG.priceIds.enterprise.annual,
		limits: {
			properties: -1,
			tenants: -1,
			storage: -1,
			apiCalls: -1,
			teamMembers: -1
		},
		features: [
			'Everything in Growth',
			'Unlimited properties',
			'Unlimited tenants',
			'Custom integrations',
			'Dedicated account manager',
			'Phone support',
			'Custom onboarding',
			'SLA guarantees',
			'Advanced security',
			'Custom reporting',
			'White-label options',
			'Training & consulting'
		],
		active: true
	}
]

// API Types for Stripe operations
export interface SubscriptionCreateRequest {
	planId: PlanType
	billingPeriod: BillingPeriod
	userId?: string | null
	userEmail: string
	userName: string
	createAccount?: boolean
}

export interface SubscriptionCreateResponse {
	subscriptionId: string
	clientSecret: string
	customerId: string
	status: string
	url: string
}

export interface CustomerPortalRequest {
	customerId: string
	returnUrl?: string
}

export interface CustomerPortalResponse {
	url: string
}

// Query keys for caching
export const subscriptionKeys = {
	all: ['subscriptions'] as const,
	lists: () => [...subscriptionKeys.all, 'list'] as const,
	list: (filters: Record<string, unknown>) =>
		[...subscriptionKeys.lists(), { filters }] as const,
	details: () => [...subscriptionKeys.all, 'detail'] as const,
	detail: (id: string) => [...subscriptionKeys.details(), id] as const
} as const

// Helper functions
export function getPlanById(planId: string): Plan | undefined {
	return PLANS.find(plan => plan.id === planId)
}

export function getPlanLimits(planId: string): PlanLimits | undefined {
	const plan = getPlanById(planId)
	return plan?.limits
}

export function checkLimitExceeded(
	current: number,
	limit: number | 'unlimited'
): boolean {
	if (limit === 'unlimited') return false
	return current >= limit
}

export function calculateUsagePercentage(
	current: number,
	limit: number | 'unlimited'
): number {
	if (limit === 'unlimited') return 0
	return Math.min((current / limit) * 100, 100)
}

// Annual plan savings calculations
export function calculateAnnualSavings(plan: Plan): {
	monthsSaved: number
	percentSaved: number
	dollarsSaved: number
} {
	const monthlyTotal = plan.monthlyPrice * 12
	const annualPrice = plan.annualPrice
	const dollarsSaved = monthlyTotal - annualPrice
	const percentSaved = Math.round((dollarsSaved / monthlyTotal) * 100)
	const monthsSaved = Math.round((dollarsSaved / plan.monthlyPrice) * 10) / 10 // Round to 1 decimal

	return {
		monthsSaved,
		percentSaved,
		dollarsSaved
	}
}

export function getAnnualSavingsMessage(plan: Plan): string {
	const savings = calculateAnnualSavings(plan)
	if (savings.monthsSaved >= 2) {
		return `Save ${Math.floor(savings.monthsSaved)} months free!`
	}
	return `Save ${savings.percentSaved}% annually`
}

export function formatPlanPrice(
	price: number,
	period: 'monthly' | 'annual'
): string {
	if (price === 0) return 'Free'
	if (period === 'annual') {
		return `$${Math.round(price / 12)}/mo`
	}
	return `$${price}/mo`
}

// Check if user is eligible for annual-only features
export function hasAnnualOnlyFeatures(
	planId: PlanType,
	billingPeriod: BillingPeriod
): boolean {
	if (billingPeriod !== 'ANNUAL') return false

	// Annual-only features by plan
	const annualFeatures: Record<PlanType, string[]> = {
		[PlanType.FREE]: [], // Free plan has no annual features
		[PlanType.BASIC]: ['Priority email support'],
		[PlanType.PROFESSIONAL]: ['Advanced reporting dashboard', 'Custom lease templates'],
		[PlanType.ENTERPRISE]: ['Dedicated account manager', 'Custom onboarding']
	}

	return planId in annualFeatures
}

export function getAnnualOnlyFeatures(planId: PlanType): string[] {
	const annualFeatures: Record<PlanType, string[]> = {
		[PlanType.FREE]: [], // Free plan has no annual features
		[PlanType.BASIC]: ['Priority email support', '1-on-1 onboarding call'],
		[PlanType.PROFESSIONAL]: [
			'Advanced reporting dashboard',
			'Custom lease templates',
			'Bulk import tools'
		],
		[PlanType.ENTERPRISE]: [
			'Dedicated account manager',
			'Custom onboarding',
			'Priority phone support'
		]
	}

	return annualFeatures[planId] || []
}

// Helper functions for working with UI concepts
export function getPlanByUIId(uiId: UIPlanConcept): Plan | undefined {
	return PLANS.find(plan => plan.uiId === uiId)
}

export function getPlanByDBId(dbId: PlanType): Plan | undefined {
	return PLANS.find(plan => plan.id === dbId)
}
