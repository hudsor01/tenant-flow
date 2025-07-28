/**
 * Extended billing types for frontend serialization and enhanced functionality
 * Frontend-specific extensions of the core billing types with date serialization
 */

import type {
  Subscription as BaseSubscription,
  Invoice as BaseInvoice,
  Plan as BasePlan,
  UsageMetricsExtended as BaseUsageMetricsExtended,
  BillingHistoryEvent as BaseBillingHistoryEvent,
  SubscriptionCreateRequest,
  SubscriptionCreateResponse
} from './billing'

// Re-export base types to avoid duplicates
export type {
  SubscriptionCreateRequest,
  SubscriptionCreateResponse
} from './billing'

// ========================
// Frontend Serialization Types
// ========================

/**
 * Frontend-specific subscription with string dates for serialization
 * Converts Date objects to strings for JSON transport and local storage
 */
export interface FrontendSubscription
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

/**
 * Frontend-specific Plan interface that extends base Plan with UI concept
 */
export interface FrontendPlan extends BasePlan {
  uiId: string // UI concept for display mapping
  ANNUALPrice?: number // Optional ANNUAL price
  stripeMonthlyPriceId: string // Monthly price ID (required for checkout)
  stripeAnnualPriceId: string // Annual price ID (required for checkout)
}

/**
 * Frontend-specific invoice with string dates for serialization
 */
export interface FrontendInvoice
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

// ========================
// Extended Usage & Metrics (Frontend Serialization)
// ========================

/**
 * Frontend-specific UsageMetricsExtended with string dates for serialization
 * Converts Date objects to strings for JSON transport
 */
export interface FrontendUsageMetricsExtended
  extends Omit<BaseUsageMetricsExtended, 'createdAt' | 'updatedAt'> {
  createdAt: string
  updatedAt: string
}

/**
 * Frontend-specific BillingHistoryEvent with string dates for serialization
 * Converts Date objects to strings for JSON transport
 */
export interface FrontendBillingHistoryEvent
  extends Omit<BaseBillingHistoryEvent, 'createdAt'> {
  createdAt: string
}

// ========================
// Extended Request/Response Types
// ========================

/**
 * Extended frontend-specific subscription create request
 */
export interface SubscriptionCreateRequestExtended
  extends SubscriptionCreateRequest {
  userId?: string | null
  userEmail: string
  userName: string
  createAccount?: boolean
}

/**
 * Extended frontend-specific subscription create response
 */
export interface SubscriptionCreateResponseExtended
  extends SubscriptionCreateResponse {
  subscriptionId: string
  customerId: string
  status: string
  url: string
}

// ========================
// Query Keys for Caching
// ========================

/**
 * Query keys for TanStack Query caching
 */
export const subscriptionKeys = {
  all: ['subscriptions'] as const,
  lists: () => [...subscriptionKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) =>
    [...subscriptionKeys.lists(), { filters }] as const,
  details: () => [...subscriptionKeys.all, 'detail'] as const,
  detail: (id: string) => [...subscriptionKeys.details(), id] as const
} as const

// ========================
// Helper Functions
// ========================

/**
 * Check if property limit is exceeded
 */
export function checkPropertyLimitExceeded(
  current: number,
  limit: number
): boolean {
  if (limit === -1) return false // Unlimited
  return current >= limit
}

/**
 * Format plan price for display
 */
export function formatPlanPrice(price: number): string {
  if (price === 0) return 'Free'
  return `$${price}/mo`
}

/**
 * Convert Date objects to string for frontend serialization
 */
export function serializeSubscription(subscription: BaseSubscription): FrontendSubscription {
  return {
    ...subscription,
    startDate: subscription.startDate.toISOString(),
    endDate: subscription.endDate?.toISOString() || null,
    cancelledAt: subscription.cancelledAt?.toISOString() || null,
    createdAt: subscription.createdAt.toISOString(),
    updatedAt: subscription.updatedAt.toISOString(),
    currentPeriodStart: subscription.currentPeriodStart?.toISOString() || null,
    currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() || null,
    trialStart: subscription.trialStart?.toISOString() || null,
    trialEnd: subscription.trialEnd?.toISOString() || null,
    canceledAt: subscription.canceledAt?.toISOString() || null,
  }
}

/**
 * Convert string dates back to Date objects for backend operations
 */
export function deserializeSubscription(subscription: FrontendSubscription): BaseSubscription {
  return {
    ...subscription,
    startDate: new Date(subscription.startDate),
    endDate: subscription.endDate ? new Date(subscription.endDate) : null,
    cancelledAt: subscription.cancelledAt ? new Date(subscription.cancelledAt) : null,
    createdAt: new Date(subscription.createdAt),
    updatedAt: new Date(subscription.updatedAt),
    currentPeriodStart: subscription.currentPeriodStart ? new Date(subscription.currentPeriodStart) : null,
    currentPeriodEnd: subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : null,
    trialStart: subscription.trialStart ? new Date(subscription.trialStart) : null,
    trialEnd: subscription.trialEnd ? new Date(subscription.trialEnd) : null,
    canceledAt: subscription.canceledAt ? new Date(subscription.canceledAt) : null,
  }
}

/**
 * Convert Invoice Date objects to string for frontend serialization
 */
export function serializeInvoice(invoice: BaseInvoice): FrontendInvoice {
  return {
    ...invoice,
    invoiceDate: invoice.invoiceDate.toISOString(),
    dueDate: invoice.dueDate?.toISOString() || null,
    paidAt: invoice.paidAt?.toISOString() || undefined,
    createdAt: invoice.createdAt.toISOString(),
    updatedAt: invoice.updatedAt.toISOString(),
  }
}

/**
 * Convert string dates back to Date objects for backend operations
 */
export function deserializeInvoice(invoice: FrontendInvoice): BaseInvoice {
  return {
    ...invoice,
    invoiceDate: new Date(invoice.invoiceDate),
    dueDate: invoice.dueDate ? new Date(invoice.dueDate) : null,
    paidAt: invoice.paidAt ? new Date(invoice.paidAt) : null,
    createdAt: new Date(invoice.createdAt),
    updatedAt: new Date(invoice.updatedAt),
  }
}

/**
 * Convert UsageMetricsExtended Date objects to string for frontend serialization
 */
export function serializeUsageMetricsExtended(metrics: BaseUsageMetricsExtended): FrontendUsageMetricsExtended {
  return {
    ...metrics,
    createdAt: metrics.createdAt.toISOString(),
    updatedAt: metrics.updatedAt.toISOString(),
  }
}

/**
 * Convert string dates back to Date objects for backend operations
 */
export function deserializeUsageMetricsExtended(metrics: FrontendUsageMetricsExtended): BaseUsageMetricsExtended {
  return {
    ...metrics,
    createdAt: new Date(metrics.createdAt),
    updatedAt: new Date(metrics.updatedAt),
  }
}

/**
 * Convert BillingHistoryEvent Date objects to string for frontend serialization
 */
export function serializeBillingHistoryEvent(event: BaseBillingHistoryEvent): FrontendBillingHistoryEvent {
  return {
    ...event,
    createdAt: event.createdAt.toISOString(),
  }
}

/**
 * Convert string dates back to Date objects for backend operations
 */
export function deserializeBillingHistoryEvent(event: FrontendBillingHistoryEvent): BaseBillingHistoryEvent {
  return {
    ...event,
    createdAt: new Date(event.createdAt),
  }
}