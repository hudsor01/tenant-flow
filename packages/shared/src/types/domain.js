"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeWebhookEventType = exports.WebVitalNavigationType = exports.WebVitalLabel = exports.WebVitalRating = exports.WebVitalMetricName = exports.NotificationType = exports.ContactFormType = void 0;
exports.ContactFormType = {
    GENERAL_INQUIRY: 'general',
    SALES: 'sales',
    SUPPORT: 'support',
    PARTNERSHIP: 'partnership',
    DEMO_REQUEST: 'demo'
};
exports.NotificationType = {
    PAYMENT: 'payment',
    BILLING: 'billing',
    SYSTEM: 'system'
};
exports.WebVitalMetricName = {
    CLS: 'CLS',
    FCP: 'FCP',
    FID: 'FID',
    INP: 'INP',
    LCP: 'LCP',
    TTFB: 'TTFB'
};
exports.WebVitalRating = {
    GOOD: 'good',
    NEEDS_IMPROVEMENT: 'needs-improvement',
    POOR: 'poor'
};
exports.WebVitalLabel = {
    WEB_VITAL: 'web-vital',
    CUSTOM: 'custom'
};
exports.WebVitalNavigationType = {
    NAVIGATE: 'navigate',
    RELOAD: 'reload',
    BACK_FORWARD: 'back-forward',
    PRERENDER: 'prerender'
};
exports.StripeWebhookEventType = {
    CUSTOMER_SUBSCRIPTION_CREATED: 'customer.subscription.created',
    CUSTOMER_SUBSCRIPTION_UPDATED: 'customer.subscription.updated',
    CUSTOMER_SUBSCRIPTION_DELETED: 'customer.subscription.deleted',
    CUSTOMER_CREATED: 'customer.created',
    CUSTOMER_UPDATED: 'customer.updated',
    INVOICE_PAYMENT_SUCCEEDED: 'invoice.payment_succeeded',
    INVOICE_PAYMENT_FAILED: 'invoice.payment_failed',
    CHECKOUT_SESSION_COMPLETED: 'checkout.session.completed'
};
//# sourceMappingURL=domain.js.map