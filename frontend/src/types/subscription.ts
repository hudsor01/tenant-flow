import { STRIPE_CONFIG } from '@/lib/stripe-config'

export interface Subscription {
	id: string
	userId: string
	stripeCustomerId: string
	stripeSubscriptionId: string
	stripePriceId: string
	status:
		| 'active'
		| 'canceled'
		| 'incomplete'
		| 'incomplete_expired'
		| 'past_due'
		| 'trialing'
		| 'unpaid'
	planId: 'freeTrial' | 'starter' | 'growth' | 'enterprise'
	billingPeriod: 'monthly' | 'annual'
	currentPeriodStart: string
	currentPeriodEnd: string
	trialStart?: string
	trialEnd?: string
	canceledAt?: string
	cancelAtPeriodEnd: boolean
	createdAt: string
	updatedAt: string
}

export interface PlanLimits {
	properties: number | 'unlimited'
	tenants: number | 'unlimited'
	storage: number // in MB
	apiCalls: number | 'unlimited'
	teamMembers: number | 'unlimited'
}

export interface Plan {
	id: 'freeTrial' | 'starter' | 'growth' | 'enterprise'
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
		id: 'freeTrial',
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
		id: 'starter',
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
		id: 'growth',
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
		id: 'enterprise',
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
	planId: string
	billingPeriod: 'monthly' | 'annual'
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
	planId: string,
	billingPeriod: 'monthly' | 'annual'
): boolean {
	if (billingPeriod !== 'annual') return false

	// Annual-only features by plan
	const annualFeatures = {
		starter: ['Priority email support'],
		growth: ['Advanced reporting dashboard', 'Custom lease templates'],
		enterprise: ['Dedicated account manager', 'Custom onboarding']
	}

	return planId in annualFeatures
}

export function getAnnualOnlyFeatures(planId: string): string[] {
	const annualFeatures = {
		starter: ['Priority email support', '1-on-1 onboarding call'],
		growth: [
			'Advanced reporting dashboard',
			'Custom lease templates',
			'Bulk import tools'
		],
		enterprise: [
			'Dedicated account manager',
			'Custom onboarding',
			'Priority phone support'
		]
	}

	return annualFeatures[planId as keyof typeof annualFeatures] || []
}
