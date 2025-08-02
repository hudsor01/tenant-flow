"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STRIPE_ERRORS = exports.getPlanTypeLabel = exports.PLAN_TYPE = void 0;
exports.PLAN_TYPE = {
    FREE: 'FREE',
    STARTER: 'STARTER',
    GROWTH: 'GROWTH',
    ENTERPRISE: 'ENTERPRISE'
};
const getPlanTypeLabel = (plan) => {
    const labels = {
        FREE: 'Free Trial',
        STARTER: 'Starter',
        GROWTH: 'Growth',
        ENTERPRISE: 'Enterprise'
    };
    return labels[plan] || plan;
};
exports.getPlanTypeLabel = getPlanTypeLabel;
exports.STRIPE_ERRORS = {
    CUSTOMER_NOT_FOUND: 'Customer not found',
    SUBSCRIPTION_NOT_FOUND: 'Subscription not found',
    INVALID_PRICE_ID: 'Invalid price ID',
    WEBHOOK_SIGNATURE_INVALID: 'Invalid webhook signature',
    CONFIGURATION_ERROR: 'Stripe configuration error',
    RATE_LIMIT_EXCEEDED: 'Rate limit exceeded',
    PAYMENT_DECLINED: 'Payment declined',
    AUTHENTICATION_FAILED: 'Authentication failed',
    INVALID_REQUEST: 'Invalid request parameters',
    API_CONNECTION_ERROR: 'API connection error',
    CARD_DECLINED: 'Card declined',
    PROCESSING_ERROR: 'Processing error'
};
