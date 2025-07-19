import { STRIPE_CONFIG } from '@/lib/stripe-config'
import type {
	PlanType,
	UsageMetrics,
	BillingHistory,
	SubscriptionCreateRequest,
	SubscriptionCreateResponse,
	CustomerPortalRequest,
	CustomerPortalResponse,
	Subscription as BaseSubscription,
	Invoice as BaseInvoice,
	Plan as BasePlan
} from '@tenantflow/types'
import type { UIPlanConcept } from '@/lib/plan-mapping'

// Re-export all billing types from centralized package
export type {
	PlanType,
	UsageMetrics,
	BillingHistory,
	SubscriptionCreateRequest,
	SubscriptionCreateResponse,
	CustomerPortalRequest,
	CustomerPortalResponse
}

// Frontend-specific subscription with string dates for serialization
export interface Subscription
	extends Omit<
		BaseSubscription,
		| 'startDate'
		| 'endDate'
		| 'cancelledAt'
		| 'createdAt'
		| 'updatedAt'
		| 'currentPeriodStart'
		| 'currentPeriodEnd'
		| 'trialStart'
		| 'trialEnd'
		| 'canceledAt'
	> {
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

// Frontend-specific Plan interface that extends base Plan with UI concept
export interface Plan extends BasePlan {
	uiId: UIPlanConcept // UI concept for display
}

// Frontend-specific invoice with string dates for serialization
export interface Invoice
	extends Omit<
		BaseInvoice,
		'invoiceDate' | 'dueDate' | 'paidAt' | 'createdAt' | 'updatedAt'
	> {
	// Convert Date objects to strings for frontend serialization
	invoiceDate: string
	dueDate: string | null
	paidAt?: string | null
	createdAt: string
	updatedAt: string
}

// Extended frontend-specific UsageMetrics with additional fields
export interface UsageMetricsExtended extends UsageMetrics {
	id: string
	userId: string
	month: string // YYYY-MM format
	leaseGenerationsCount: number
	createdAt: string
	updatedAt: string
}

// Extended frontend-specific BillingHistory
export interface BillingHistoryEvent {
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

// 4-tier plan definitions
export const PLANS: Plan[] = [
	{
		id: 'FREE' as PlanType,
		name: 'Free Trial',
		description: 'Perfect for getting started with property management',
		price: 0,
		propertyLimit: 2,
		tenantLimit: 5,
		stripePriceId: STRIPE_CONFIG.priceIds?.free,
		uiId: 'FREE',
		features: [
			'Up to 2 properties',
			'Up to 5 tenants',
			'Basic maintenance tracking',
			'Email notifications',
			'14-day trial period'
		]
	},
	{
		id: 'STARTER' as PlanType,
		name: 'Starter',
		description: 'Great for small landlords and property managers',
		price: 19,
		propertyLimit: 10,
		tenantLimit: 30,
		stripePriceId: STRIPE_CONFIG.priceIds?.starter,
		uiId: 'STARTER',
		features: [
			'Up to 10 properties',
			'Up to 30 tenants',
			'Maintenance tracking',
			'Email notifications',
			'Basic reporting',
			'Document storage (1GB)'
		]
	},
	{
		id: 'GROWTH' as PlanType,
		name: 'Growth',
		description: 'Ideal for growing property management businesses',
		price: 49,
		propertyLimit: 50,
		tenantLimit: 200,
		stripePriceId: STRIPE_CONFIG.priceIds?.growth,
		uiId: 'GROWTH',
		features: [
			'Up to 50 properties',
			'Up to 200 tenants',
			'Advanced maintenance tracking',
			'Email & SMS notifications',
			'Financial reporting',
			'Document storage (10GB)',
			'Priority support'
		]
	},
	{
		id: 'ENTERPRISE' as PlanType,
		name: 'Enterprise',
		description: 'Unlimited growth potential with custom solutions',
		price: 149,
		propertyLimit: -1, // unlimited
		tenantLimit: -1, // unlimited
		stripePriceId: STRIPE_CONFIG.priceIds?.enterprise,
		uiId: 'ENTERPRISE',
		features: [
			'Unlimited properties',
			'Unlimited tenants',
			'Advanced maintenance tracking',
			'Email & SMS notifications',
			'Advanced financial reporting',
			'Unlimited document storage',
			'Dedicated support',
			'Custom integrations',
			'API access'
		]
	}
]

// Extended frontend-specific subscription create request
export interface SubscriptionCreateRequestExtended
	extends SubscriptionCreateRequest {
	userId?: string | null
	userEmail: string
	userName: string
	createAccount?: boolean
}

// Extended frontend-specific subscription create response
export interface SubscriptionCreateResponseExtended
	extends SubscriptionCreateResponse {
	subscriptionId: string
	customerId: string
	status: string
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

export function getPropertyLimit(planId: string): number | undefined {
	const plan = getPlanById(planId)
	return plan?.propertyLimit
}

export function checkPropertyLimitExceeded(
	current: number,
	planId: string
): boolean {
	const limit = getPropertyLimit(planId)
	if (!limit) return false
	return current >= limit
}

export function formatPlanPrice(price: number): string {
	if (price === 0) return 'Free'
	return `$${price}/mo`
}
