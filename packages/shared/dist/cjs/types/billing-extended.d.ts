/**
 * Extended billing types for frontend serialization and enhanced functionality
 * Frontend-specific extensions of the core billing types with date serialization
 */
import type { Subscription as BaseSubscription, Invoice as BaseInvoice, Plan as BasePlan, UsageMetricsExtended as BaseUsageMetricsExtended, BillingHistoryEvent as BaseBillingHistoryEvent, SubscriptionCreateRequest, SubscriptionCreateResponse } from './billing';
export type { SubscriptionCreateRequest, SubscriptionCreateResponse } from './billing';
/**
 * Frontend-specific subscription with string dates for serialization
 * Converts Date objects to strings for JSON transport and local storage
 */
export interface FrontendSubscription extends Omit<BaseSubscription, 'startDate' | 'endDate' | 'cancelledAt' | 'createdAt' | 'updatedAt' | 'currentPeriodStart' | 'currentPeriodEnd' | 'trialStart' | 'trialEnd' | 'canceledAt'> {
    startDate: string;
    endDate?: string | null;
    cancelledAt?: string | null;
    createdAt: string;
    updatedAt: string;
    currentPeriodStart?: string | null;
    currentPeriodEnd?: string | null;
    trialStart?: string | null;
    trialEnd?: string | null;
    canceledAt?: string | null;
}
/**
 * Frontend-specific Plan interface that extends base Plan with UI concept
 */
export interface FrontendPlan extends BasePlan {
    uiId: string;
    ANNUALPrice?: number;
    stripePriceIds: {
        monthly: string;
        annual: string;
    };
}
/**
 * Frontend-specific invoice with string dates for serialization
 */
export interface FrontendInvoice extends Omit<BaseInvoice, 'invoiceDate' | 'dueDate' | 'paidAt' | 'createdAt' | 'updatedAt'> {
    invoiceDate: string;
    dueDate: string | null;
    paidAt?: string | null;
    createdAt: string;
    updatedAt: string;
}
/**
 * Frontend-specific UsageMetricsExtended with string dates for serialization
 * Converts Date objects to strings for JSON transport
 */
export interface FrontendUsageMetricsExtended extends Omit<BaseUsageMetricsExtended, 'createdAt' | 'updatedAt'> {
    createdAt: string;
    updatedAt: string;
}
/**
 * Frontend-specific BillingHistoryEvent with string dates for serialization
 * Converts Date objects to strings for JSON transport
 */
export interface FrontendBillingHistoryEvent extends Omit<BaseBillingHistoryEvent, 'createdAt'> {
    createdAt: string;
}
/**
 * Extended frontend-specific subscription create request
 */
export interface SubscriptionCreateRequestExtended extends SubscriptionCreateRequest {
    userId?: string | null;
    userEmail: string;
    userName: string;
    createAccount?: boolean;
}
/**
 * Extended frontend-specific subscription create response
 */
export interface SubscriptionCreateResponseExtended extends SubscriptionCreateResponse {
    subscriptionId: string;
    customerId: string;
    status: string;
    url: string;
}
/**
 * Query keys for TanStack Query caching
 */
export declare const subscriptionKeys: {
    readonly all: readonly ["subscriptions"];
    readonly lists: () => readonly ["subscriptions", "list"];
    readonly list: (filters: Record<string, unknown>) => readonly ["subscriptions", "list", {
        readonly filters: Record<string, unknown>;
    }];
    readonly details: () => readonly ["subscriptions", "detail"];
    readonly detail: (id: string) => readonly ["subscriptions", "detail", string];
};
/**
 * Check if property limit is exceeded
 */
export declare function checkPropertyLimitExceeded(current: number, limit: number): boolean;
/**
 * Format plan price for display
 */
export declare function formatPlanPrice(price: number): string;
/**
 * Convert Date objects to string for frontend serialization
 */
export declare function serializeSubscription(subscription: BaseSubscription): FrontendSubscription;
/**
 * Convert string dates back to Date objects for backend operations
 */
export declare function deserializeSubscription(subscription: FrontendSubscription): BaseSubscription;
/**
 * Convert Invoice Date objects to string for frontend serialization
 */
export declare function serializeInvoice(invoice: BaseInvoice): FrontendInvoice;
/**
 * Convert string dates back to Date objects for backend operations
 */
export declare function deserializeInvoice(invoice: FrontendInvoice): BaseInvoice;
/**
 * Convert UsageMetricsExtended Date objects to string for frontend serialization
 */
export declare function serializeUsageMetricsExtended(metrics: BaseUsageMetricsExtended): FrontendUsageMetricsExtended;
/**
 * Convert string dates back to Date objects for backend operations
 */
export declare function deserializeUsageMetricsExtended(metrics: FrontendUsageMetricsExtended): BaseUsageMetricsExtended;
/**
 * Convert BillingHistoryEvent Date objects to string for frontend serialization
 */
export declare function serializeBillingHistoryEvent(event: BaseBillingHistoryEvent): FrontendBillingHistoryEvent;
/**
 * Convert string dates back to Date objects for backend operations
 */
export declare function deserializeBillingHistoryEvent(event: FrontendBillingHistoryEvent): BaseBillingHistoryEvent;
//# sourceMappingURL=billing-extended.d.ts.map