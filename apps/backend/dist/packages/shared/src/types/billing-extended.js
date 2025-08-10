"use strict";
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
exports.subscriptionKeys = {
    all: ['subscriptions'],
    lists: () => [...exports.subscriptionKeys.all, 'list'],
    list: (filters) => [...exports.subscriptionKeys.lists(), { filters }],
    details: () => [...exports.subscriptionKeys.all, 'detail'],
    detail: (id) => [...exports.subscriptionKeys.details(), id]
};
function checkPropertyLimitExceeded(current, limit) {
    if (limit === -1)
        return false;
    return current >= limit;
}
function formatPlanPrice(price) {
    if (price === 0)
        return 'Free';
    return `$${price}/mo`;
}
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
function serializeUsageMetricsExtended(metrics) {
    return {
        ...metrics,
        createdAt: metrics.createdAt.toISOString(),
        updatedAt: metrics.updatedAt.toISOString(),
    };
}
function deserializeUsageMetricsExtended(metrics) {
    return {
        ...metrics,
        createdAt: new Date(metrics.createdAt),
        updatedAt: new Date(metrics.updatedAt),
    };
}
function serializeBillingHistoryEvent(event) {
    return {
        ...event,
        createdAt: event.createdAt.toISOString(),
    };
}
function deserializeBillingHistoryEvent(event) {
    return {
        ...event,
        createdAt: new Date(event.createdAt),
    };
}
