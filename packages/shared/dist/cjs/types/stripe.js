"use strict";
/**
 * Unified Stripe Type System
 *
 * Comprehensive type definitions for all Stripe-related functionality across TenantFlow.
 * This file serves as the single source of truth for Stripe types, eliminating duplication
 * and ensuring type safety across frontend and backend.
 *
 * @fileoverview Consolidates types from billing.ts, stripe-unified.ts, and local definitions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RETRYABLE_ERROR_CODES = exports.ERROR_SEVERITY_MAPPING = exports.ERROR_CATEGORY_MAPPING = exports.DEFAULT_STRIPE_RETRY_CONFIG = exports.STRIPE_ERROR_SEVERITIES = exports.STRIPE_ERROR_CATEGORIES = exports.WEBHOOK_EVENT_TYPES = exports.SUBSCRIPTION_STATUSES = exports.BILLING_PERIODS = exports.PLAN_TYPES = exports.STRIPE_DECLINE_CODES = exports.STRIPE_ERROR_CODES = exports.STRIPE_API_VERSIONS = void 0;
exports.validateStripeConfig = validateStripeConfig;
// Direct exports - no legacy aliases needed
// All consuming code should use the standard types directly
// ========================
// Core Stripe Constants
// ========================
/**
 * Supported Stripe API versions
 * These should be kept in sync with Stripe's latest stable versions
 */
exports.STRIPE_API_VERSIONS = {
    CURRENT: '2024-06-20',
    BETA: '2025-06-30.basil',
    LEGACY: '2023-10-16'
};
/**
 * Comprehensive Stripe error codes mapping
 * Based on official Stripe error documentation
 */
exports.STRIPE_ERROR_CODES = {
    // Card Errors
    CARD_DECLINED: 'card_declined',
    EXPIRED_CARD: 'expired_card',
    INCORRECT_CVC: 'incorrect_cvc',
    INCORRECT_NUMBER: 'incorrect_number',
    INSUFFICIENT_FUNDS: 'insufficient_funds',
    INVALID_EXPIRY_MONTH: 'invalid_expiry_month',
    INVALID_EXPIRY_YEAR: 'invalid_expiry_year',
    INVALID_NUMBER: 'invalid_number',
    PROCESSING_ERROR: 'processing_error',
    // Rate Limit Errors
    RATE_LIMIT: 'rate_limit',
    // Invalid Request Errors
    INVALID_REQUEST: 'invalid_request_error',
    MISSING_PARAMETER: 'missing',
    INVALID_PARAMETER: 'invalid',
    // API Errors
    API_CONNECTION_ERROR: 'api_connection_error',
    API_ERROR: 'api_error',
    AUTHENTICATION_ERROR: 'authentication_error',
    PERMISSION_ERROR: 'permission_error',
    IDEMPOTENCY_ERROR: 'idempotency_error',
    // Application Errors
    CUSTOMER_NOT_FOUND: 'customer_not_found',
    SUBSCRIPTION_NOT_FOUND: 'subscription_not_found',
    INVALID_PRICE_ID: 'invalid_price_id',
    WEBHOOK_SIGNATURE_INVALID: 'webhook_signature_invalid',
    CONFIGURATION_ERROR: 'configuration_error'
};
/**
 * Stripe decline codes for detailed payment failure analysis
 */
exports.STRIPE_DECLINE_CODES = {
    GENERIC_DECLINE: 'generic_decline',
    INSUFFICIENT_FUNDS: 'insufficient_funds',
    LOST_CARD: 'lost_card',
    STOLEN_CARD: 'stolen_card',
    EXPIRED_CARD: 'expired_card',
    INCORRECT_CVC: 'incorrect_cvc',
    PROCESSING_ERROR: 'processing_error',
    CARD_NOT_SUPPORTED: 'card_not_supported',
    CURRENCY_NOT_SUPPORTED: 'currency_not_supported',
    FRAUDULENT: 'fraudulent',
    MERCHANT_BLACKLIST: 'merchant_blacklist',
    PICKUP_CARD: 'pickup_card',
    RESTRICTED_CARD: 'restricted_card',
    SECURITY_VIOLATION: 'security_violation',
    SERVICE_NOT_ALLOWED: 'service_not_allowed',
    STOP_PAYMENT_ORDER: 'stop_payment_order',
    TESTMODE_DECLINE: 'testmode_decline',
    TRANSACTION_NOT_ALLOWED: 'transaction_not_allowed',
    TRY_AGAIN_LATER: 'try_again_later',
    WITHDRAWAL_COUNT_LIMIT_EXCEEDED: 'withdrawal_count_limit_exceeded'
};
// ========================
// Plan and Subscription Types
// ========================
/**
 * Application plan types
 * These correspond to the business tiers offered by TenantFlow
 */
exports.PLAN_TYPES = {
    FREETRIAL: 'FREETRIAL',
    STARTER: 'STARTER',
    GROWTH: 'GROWTH',
    TENANTFLOW_MAX: 'TENANTFLOW_MAX'
};
/**
 * Billing periods supported by the application
 */
exports.BILLING_PERIODS = {
    MONTHLY: 'monthly',
    ANNUAL: 'annual',
    // Backward compatibility alias - prefer ANNUAL
    YEARLY: 'yearly'
};
/**
 * Subscription statuses aligned with Stripe's subscription status values
 */
exports.SUBSCRIPTION_STATUSES = {
    INCOMPLETE: 'incomplete',
    INCOMPLETE_EXPIRED: 'incomplete_expired',
    TRIALING: 'trialing',
    ACTIVE: 'active',
    PAST_DUE: 'past_due',
    CANCELED: 'canceled',
    UNPAID: 'unpaid',
    PAUSED: 'paused',
    UPDATING: 'updating'
};
// ========================
// Webhook Event Types
// ========================
/**
 * Comprehensive webhook event types that TenantFlow handles
 */
exports.WEBHOOK_EVENT_TYPES = {
    // Customer events
    CUSTOMER_CREATED: 'customer.created',
    CUSTOMER_UPDATED: 'customer.updated',
    CUSTOMER_DELETED: 'customer.deleted',
    // Subscription events
    SUBSCRIPTION_CREATED: 'customer.subscription.created',
    SUBSCRIPTION_UPDATED: 'customer.subscription.updated',
    SUBSCRIPTION_DELETED: 'customer.subscription.deleted',
    SUBSCRIPTION_TRIAL_WILL_END: 'customer.subscription.trial_will_end',
    SUBSCRIPTION_PAUSED: 'customer.subscription.paused',
    SUBSCRIPTION_RESUMED: 'customer.subscription.resumed',
    // Invoice events
    INVOICE_CREATED: 'invoice.created',
    INVOICE_FINALIZED: 'invoice.finalized',
    INVOICE_PAYMENT_SUCCEEDED: 'invoice.payment_succeeded',
    INVOICE_PAYMENT_FAILED: 'invoice.payment_failed',
    INVOICE_PAYMENT_ACTION_REQUIRED: 'invoice.payment_action_required',
    INVOICE_UPCOMING: 'invoice.upcoming',
    // Payment events
    PAYMENT_INTENT_CREATED: 'payment_intent.created',
    PAYMENT_INTENT_SUCCEEDED: 'payment_intent.succeeded',
    PAYMENT_INTENT_PAYMENT_FAILED: 'payment_intent.payment_failed',
    PAYMENT_INTENT_REQUIRES_ACTION: 'payment_intent.requires_action',
    // Charge events
    CHARGE_FAILED: 'charge.failed',
    // Checkout events
    CHECKOUT_SESSION_COMPLETED: 'checkout.session.completed',
    CHECKOUT_SESSION_EXPIRED: 'checkout.session.expired',
    // Setup intent events
    SETUP_INTENT_SUCCEEDED: 'setup_intent.succeeded',
    SETUP_INTENT_SETUP_FAILED: 'setup_intent.setup_failed'
};
// ========================
// Error Handling Types
// ========================
/**
 * Error categories for systematic error handling
 */
exports.STRIPE_ERROR_CATEGORIES = {
    PAYMENT_METHOD: 'payment_method',
    INFRASTRUCTURE: 'infrastructure',
    CLIENT_ERROR: 'client_error',
    STRIPE_SERVICE: 'stripe_service',
    CONFIGURATION: 'configuration',
    UNKNOWN: 'unknown'
};
/**
 * Error severity levels for alerting and monitoring
 */
exports.STRIPE_ERROR_SEVERITIES = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
};
// ========================
// Constants Export
// ========================
/**
 * Default retry configuration
 */
exports.DEFAULT_STRIPE_RETRY_CONFIG = {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    exponentialBase: 2,
    jitterMs: 100
};
/**
 * Error categorization mapping
 */
exports.ERROR_CATEGORY_MAPPING = {
    [exports.STRIPE_ERROR_CODES.CARD_DECLINED]: exports.STRIPE_ERROR_CATEGORIES.PAYMENT_METHOD,
    [exports.STRIPE_ERROR_CODES.EXPIRED_CARD]: exports.STRIPE_ERROR_CATEGORIES.PAYMENT_METHOD,
    [exports.STRIPE_ERROR_CODES.INCORRECT_CVC]: exports.STRIPE_ERROR_CATEGORIES.PAYMENT_METHOD,
    [exports.STRIPE_ERROR_CODES.INCORRECT_NUMBER]: exports.STRIPE_ERROR_CATEGORIES.PAYMENT_METHOD,
    [exports.STRIPE_ERROR_CODES.INSUFFICIENT_FUNDS]: exports.STRIPE_ERROR_CATEGORIES.PAYMENT_METHOD,
    [exports.STRIPE_ERROR_CODES.INVALID_EXPIRY_MONTH]: exports.STRIPE_ERROR_CATEGORIES.PAYMENT_METHOD,
    [exports.STRIPE_ERROR_CODES.INVALID_EXPIRY_YEAR]: exports.STRIPE_ERROR_CATEGORIES.PAYMENT_METHOD,
    [exports.STRIPE_ERROR_CODES.INVALID_NUMBER]: exports.STRIPE_ERROR_CATEGORIES.PAYMENT_METHOD,
    [exports.STRIPE_ERROR_CODES.PROCESSING_ERROR]: exports.STRIPE_ERROR_CATEGORIES.PAYMENT_METHOD,
    [exports.STRIPE_ERROR_CODES.RATE_LIMIT]: exports.STRIPE_ERROR_CATEGORIES.INFRASTRUCTURE,
    [exports.STRIPE_ERROR_CODES.API_CONNECTION_ERROR]: exports.STRIPE_ERROR_CATEGORIES.INFRASTRUCTURE,
    [exports.STRIPE_ERROR_CODES.API_ERROR]: exports.STRIPE_ERROR_CATEGORIES.STRIPE_SERVICE,
    [exports.STRIPE_ERROR_CODES.AUTHENTICATION_ERROR]: exports.STRIPE_ERROR_CATEGORIES.CONFIGURATION,
    [exports.STRIPE_ERROR_CODES.PERMISSION_ERROR]: exports.STRIPE_ERROR_CATEGORIES.CONFIGURATION,
    [exports.STRIPE_ERROR_CODES.INVALID_REQUEST]: exports.STRIPE_ERROR_CATEGORIES.CLIENT_ERROR,
    [exports.STRIPE_ERROR_CODES.MISSING_PARAMETER]: exports.STRIPE_ERROR_CATEGORIES.CLIENT_ERROR,
    [exports.STRIPE_ERROR_CODES.INVALID_PARAMETER]: exports.STRIPE_ERROR_CATEGORIES.CLIENT_ERROR,
    [exports.STRIPE_ERROR_CODES.IDEMPOTENCY_ERROR]: exports.STRIPE_ERROR_CATEGORIES.CLIENT_ERROR,
    [exports.STRIPE_ERROR_CODES.CUSTOMER_NOT_FOUND]: exports.STRIPE_ERROR_CATEGORIES.CLIENT_ERROR,
    [exports.STRIPE_ERROR_CODES.SUBSCRIPTION_NOT_FOUND]: exports.STRIPE_ERROR_CATEGORIES.CLIENT_ERROR,
    [exports.STRIPE_ERROR_CODES.INVALID_PRICE_ID]: exports.STRIPE_ERROR_CATEGORIES.CLIENT_ERROR,
    [exports.STRIPE_ERROR_CODES.WEBHOOK_SIGNATURE_INVALID]: exports.STRIPE_ERROR_CATEGORIES.CONFIGURATION,
    [exports.STRIPE_ERROR_CODES.CONFIGURATION_ERROR]: exports.STRIPE_ERROR_CATEGORIES.CONFIGURATION
};
/**
 * Error severity mapping
 */
exports.ERROR_SEVERITY_MAPPING = {
    [exports.STRIPE_ERROR_CODES.CARD_DECLINED]: exports.STRIPE_ERROR_SEVERITIES.LOW,
    [exports.STRIPE_ERROR_CODES.EXPIRED_CARD]: exports.STRIPE_ERROR_SEVERITIES.LOW,
    [exports.STRIPE_ERROR_CODES.INCORRECT_CVC]: exports.STRIPE_ERROR_SEVERITIES.LOW,
    [exports.STRIPE_ERROR_CODES.INCORRECT_NUMBER]: exports.STRIPE_ERROR_SEVERITIES.LOW,
    [exports.STRIPE_ERROR_CODES.INSUFFICIENT_FUNDS]: exports.STRIPE_ERROR_SEVERITIES.LOW,
    [exports.STRIPE_ERROR_CODES.INVALID_EXPIRY_MONTH]: exports.STRIPE_ERROR_SEVERITIES.LOW,
    [exports.STRIPE_ERROR_CODES.INVALID_EXPIRY_YEAR]: exports.STRIPE_ERROR_SEVERITIES.LOW,
    [exports.STRIPE_ERROR_CODES.INVALID_NUMBER]: exports.STRIPE_ERROR_SEVERITIES.LOW,
    [exports.STRIPE_ERROR_CODES.PROCESSING_ERROR]: exports.STRIPE_ERROR_SEVERITIES.MEDIUM,
    [exports.STRIPE_ERROR_CODES.RATE_LIMIT]: exports.STRIPE_ERROR_SEVERITIES.HIGH,
    [exports.STRIPE_ERROR_CODES.API_CONNECTION_ERROR]: exports.STRIPE_ERROR_SEVERITIES.HIGH,
    [exports.STRIPE_ERROR_CODES.API_ERROR]: exports.STRIPE_ERROR_SEVERITIES.HIGH,
    [exports.STRIPE_ERROR_CODES.AUTHENTICATION_ERROR]: exports.STRIPE_ERROR_SEVERITIES.CRITICAL,
    [exports.STRIPE_ERROR_CODES.PERMISSION_ERROR]: exports.STRIPE_ERROR_SEVERITIES.CRITICAL,
    [exports.STRIPE_ERROR_CODES.INVALID_REQUEST]: exports.STRIPE_ERROR_SEVERITIES.MEDIUM,
    [exports.STRIPE_ERROR_CODES.MISSING_PARAMETER]: exports.STRIPE_ERROR_SEVERITIES.MEDIUM,
    [exports.STRIPE_ERROR_CODES.INVALID_PARAMETER]: exports.STRIPE_ERROR_SEVERITIES.MEDIUM,
    [exports.STRIPE_ERROR_CODES.IDEMPOTENCY_ERROR]: exports.STRIPE_ERROR_SEVERITIES.MEDIUM,
    [exports.STRIPE_ERROR_CODES.CUSTOMER_NOT_FOUND]: exports.STRIPE_ERROR_SEVERITIES.MEDIUM,
    [exports.STRIPE_ERROR_CODES.SUBSCRIPTION_NOT_FOUND]: exports.STRIPE_ERROR_SEVERITIES.MEDIUM,
    [exports.STRIPE_ERROR_CODES.INVALID_PRICE_ID]: exports.STRIPE_ERROR_SEVERITIES.HIGH,
    [exports.STRIPE_ERROR_CODES.WEBHOOK_SIGNATURE_INVALID]: exports.STRIPE_ERROR_SEVERITIES.CRITICAL,
    [exports.STRIPE_ERROR_CODES.CONFIGURATION_ERROR]: exports.STRIPE_ERROR_SEVERITIES.CRITICAL
};
/**
 * Retryable error codes
 */
exports.RETRYABLE_ERROR_CODES = [
    exports.STRIPE_ERROR_CODES.RATE_LIMIT,
    exports.STRIPE_ERROR_CODES.API_ERROR,
    exports.STRIPE_ERROR_CODES.API_CONNECTION_ERROR,
    exports.STRIPE_ERROR_CODES.PROCESSING_ERROR
];
// ========================
// Validation Functions
// ========================
/**
 * Validate Stripe configuration
 */
function validateStripeConfig(config) {
    const errors = [];
    if (!config.secretKey) {
        errors.push('STRIPE_SECRET_KEY is required');
    }
    else if (!config.secretKey.startsWith('sk_')) {
        errors.push('STRIPE_SECRET_KEY must start with "sk_"');
    }
    if (!config.publishableKey) {
        errors.push('STRIPE_PUBLISHABLE_KEY is required');
    }
    else if (!config.publishableKey.startsWith('pk_')) {
        errors.push('STRIPE_PUBLISHABLE_KEY must start with "pk_"');
    }
    // Webhook secret is optional but if provided, should be valid
    if (config.webhookSecret && !config.webhookSecret.startsWith('whsec_')) {
        errors.push('STRIPE_WEBHOOK_SECRET must start with "whsec_"');
    }
    return {
        isValid: errors.length === 0,
        errors
    };
}
//# sourceMappingURL=stripe.js.map