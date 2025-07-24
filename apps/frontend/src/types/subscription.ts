import type {
	PlanType,
	UsageMetrics,
	BillingHistory,
	SubscriptionCreateRequest,
	SubscriptionCreateResponse,
	CustomerPortalRequest,
	CustomerPortalResponse
} from '@tenantflow/shared'
import type {
	Subscription as BaseSubscription,
	Invoice as BaseInvoice,
	Plan as BasePlan
} from '@tenantflow/shared'
import type { UIPlanConcept } from '@/lib/utils/plan-mapping'
export { getPlanById } from '@/lib/subscription-utils'

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
	ANNUALPrice?: number // Optional ANNUAL price
	stripeMonthlyPriceId?: string // Monthly price ID (canonical)
	stripeAnnualPriceId?: string // Annual price ID (canonical)
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
export function checkPropertyLimitExceeded(
	current: number,
	limit: number
): boolean {
	if (limit === -1) return false // Unlimited
	return current >= limit
}

export function formatPlanPrice(price: number): string {
	if (price === 0) return 'Free'
	return `$${price}/mo`
}
