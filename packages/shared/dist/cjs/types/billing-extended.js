"use strict";
/**
 * Extended billing types for frontend serialization and enhanced functionality
 * Frontend-specific extensions of the core billing types with date serialization
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscriptionKeys = void 0;
exports.checkPropertyLimitExceeded = checkPropertyLimitExceeded;
exports.formatPlanPrice = formatPlanPrice;
exports.serializeSubscription = serializeSubscription;
exports.deserializeSubscription = deserializeSubscription;
exports.serializeInvoice = serializeInvoice;
exports.deserializeInvoice = deserializeInvoice;
exports.serializeUsageMetricsExtended = serializeUsageMetricsExtended;
exports.deserializeUsageMetricsExtended = deserializeUsageMetricsExtended;
exports.serializeBillingHistoryEvent = serializeBillingHistoryEvent;
exports.deserializeBillingHistoryEvent = deserializeBillingHistoryEvent;
// ========================
// Query Keys for Caching
// ========================
/**
 * Query keys for TanStack Query caching
 */
exports.subscriptionKeys = {
    all: ['subscriptions'],
    lists: () => [...exports.subscriptionKeys.all, 'list'],
    list: (filters) => [...exports.subscriptionKeys.lists(), { filters }],
    details: () => [...exports.subscriptionKeys.all, 'detail'],
    detail: (id) => [...exports.subscriptionKeys.details(), id]
};
// ========================
// Helper Functions
// ========================
/**
 * Check if property limit is exceeded
 */
function checkPropertyLimitExceeded(current, limit) {
    if (limit === -1)
        return false; // Unlimited
    return current >= limit;
}
/**
 * Format plan price for display
 */
function formatPlanPrice(price) {
    if (price === 0)
        return 'Free';
    return `$${price}/mo`;
}
/**
 * Convert Date objects to string for frontend serialization
 */
function serializeSubscription(subscription) {
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
    };
}
/**
 * Convert string dates back to Date objects for backend operations
 */
function deserializeSubscription(subscription) {
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
    };
}
/**
 * Convert Invoice Date objects to string for frontend serialization
 */
function serializeInvoice(invoice) {
    return {
        ...invoice,
        invoiceDate: invoice.invoiceDate.toISOString(),
        dueDate: invoice.dueDate?.toISOString() || null,
        paidAt: invoice.paidAt?.toISOString() || undefined,
        createdAt: invoice.createdAt.toISOString(),
        updatedAt: invoice.updatedAt.toISOString(),
    };
}
/**
 * Convert string dates back to Date objects for backend operations
 */
function deserializeInvoice(invoice) {
    return {
        ...invoice,
        invoiceDate: new Date(invoice.invoiceDate),
        dueDate: invoice.dueDate ? new Date(invoice.dueDate) : null,
        paidAt: invoice.paidAt ? new Date(invoice.paidAt) : null,
        createdAt: new Date(invoice.createdAt),
        updatedAt: new Date(invoice.updatedAt),
    };
}
/**
 * Convert UsageMetricsExtended Date objects to string for frontend serialization
 */
function serializeUsageMetricsExtended(metrics) {
    return {
        ...metrics,
        createdAt: metrics.createdAt.toISOString(),
        updatedAt: metrics.updatedAt.toISOString(),
    };
}
/**
 * Convert string dates back to Date objects for backend operations
 */
function deserializeUsageMetricsExtended(metrics) {
    return {
        ...metrics,
        createdAt: new Date(metrics.createdAt),
        updatedAt: new Date(metrics.updatedAt),
    };
}
/**
 * Convert BillingHistoryEvent Date objects to string for frontend serialization
 */
function serializeBillingHistoryEvent(event) {
    return {
        ...event,
        createdAt: event.createdAt.toISOString(),
    };
}
/**
 * Convert string dates back to Date objects for backend operations
 */
function deserializeBillingHistoryEvent(event) {
    return {
        ...event,
        createdAt: new Date(event.createdAt),
    };
}
//# sourceMappingURL=billing-extended.js.map