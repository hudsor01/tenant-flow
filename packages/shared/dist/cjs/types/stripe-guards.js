"use strict";
/**
 * Stripe Type Guards
 *
 * Runtime type validation utilities for Stripe types.
 * Provides type-safe guards for validating Stripe objects at runtime.
 *
 * @fileoverview Type guards for all Stripe-related types
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeTypeGuards = void 0;
exports.isPlanType = isPlanType;
exports.isBillingPeriod = isBillingPeriod;
exports.isSubscriptionStatus = isSubscriptionStatus;
exports.isWebhookEventType = isWebhookEventType;
exports.isStripeErrorCode = isStripeErrorCode;
exports.isStripeDeclineCode = isStripeDeclineCode;
exports.isStripeErrorCategory = isStripeErrorCategory;
exports.isStripeErrorSeverity = isStripeErrorSeverity;
exports.isStripeApiVersion = isStripeApiVersion;
exports.isStandardizedStripeError = isStandardizedStripeError;
exports.isStripeWebhookEvent = isStripeWebhookEvent;
exports.isPaymentMethod = isPaymentMethod;
exports.isUserSubscription = isUserSubscription;
exports.isPlanConfig = isPlanConfig;
exports.isUsageMetrics = isUsageMetrics;
exports.isStripeConfig = isStripeConfig;
exports.isCreateCheckoutSessionParams = isCreateCheckoutSessionParams;
exports.isCreatePortalSessionParams = isCreatePortalSessionParams;
exports.isStripeSuccessResponse = isStripeSuccessResponse;
exports.isStripeErrorResponse = isStripeErrorResponse;
exports.isRetryableError = isRetryableError;
exports.isCardError = isCardError;
exports.isRateLimitError = isRateLimitError;
exports.isInfrastructureError = isInfrastructureError;
exports.isConfigurationError = isConfigurationError;
exports.isCriticalError = isCriticalError;
exports.requiresUserAction = requiresUserAction;
exports.isStripeId = isStripeId;
exports.isStripeCustomerId = isStripeCustomerId;
exports.isStripeSubscriptionId = isStripeSubscriptionId;
exports.isStripePriceId = isStripePriceId;
exports.isStripePaymentMethodId = isStripePaymentMethodId;
exports.isStripeCheckoutSessionId = isStripeCheckoutSessionId;
exports.isStripeInvoiceId = isStripeInvoiceId;
exports.isStripeWebhookSecret = isStripeWebhookSecret;
exports.isStripeSecretKey = isStripeSecretKey;
exports.isStripePublishableKey = isStripePublishableKey;
exports.isValidEmail = isValidEmail;
exports.isValidCurrency = isValidCurrency;
exports.isValidAmount = isValidAmount;
exports.isValidUrl = isValidUrl;
exports.isValidMetadata = isValidMetadata;
const stripe_1 = require("./stripe");
// ========================
// Primitive Type Guards
// ========================
/**
 * Check if value is a valid PlanType
 */
function isPlanType(value) {
    return typeof value === 'string' && Object.values(stripe_1.PLAN_TYPES).includes(value);
}
/**
 * Check if value is a valid BillingPeriod
 */
function isBillingPeriod(value) {
    return typeof value === 'string' && Object.values(stripe_1.BILLING_PERIODS).includes(value);
}
/**
 * Check if value is a valid SubscriptionStatus
 */
function isSubscriptionStatus(value) {
    return typeof value === 'string' && Object.values(stripe_1.SUBSCRIPTION_STATUSES).includes(value);
}
/**
 * Check if value is a valid WebhookEventType
 */
function isWebhookEventType(value) {
    return typeof value === 'string' && Object.values(stripe_1.WEBHOOK_EVENT_TYPES).includes(value);
}
/**
 * Check if value is a valid StripeErrorCode
 */
function isStripeErrorCode(value) {
    return typeof value === 'string' && Object.values(stripe_1.STRIPE_ERROR_CODES).includes(value);
}
/**
 * Check if value is a valid StripeDeclineCode
 */
function isStripeDeclineCode(value) {
    return typeof value === 'string' && Object.values(stripe_1.STRIPE_DECLINE_CODES).includes(value);
}
/**
 * Check if value is a valid StripeErrorCategory
 */
function isStripeErrorCategory(value) {
    return typeof value === 'string' && Object.values(stripe_1.STRIPE_ERROR_CATEGORIES).includes(value);
}
/**
 * Check if value is a valid StripeErrorSeverity
 */
function isStripeErrorSeverity(value) {
    return typeof value === 'string' && Object.values(stripe_1.STRIPE_ERROR_SEVERITIES).includes(value);
}
/**
 * Check if value is a valid StripeApiVersion
 */
function isStripeApiVersion(value) {
    return typeof value === 'string' && Object.values(stripe_1.STRIPE_API_VERSIONS).includes(value);
}
// ========================
// Complex Type Guards
// ========================
/**
 * Check if value is a valid StandardizedStripeError
 */
function isStandardizedStripeError(value) {
    if (!value || typeof value !== 'object')
        return false;
    const error = value;
    return (isStripeErrorCode(error.code) &&
        typeof error.message === 'string' &&
        typeof error.userMessage === 'string' &&
        typeof error.errorId === 'string' &&
        isStripeErrorCategory(error.category) &&
        isStripeErrorSeverity(error.severity) &&
        typeof error.retryable === 'boolean' &&
        typeof error.context === 'object' &&
        error.context !== null);
}
/**
 * Check if value is a valid StripeWebhookEvent
 */
function isStripeWebhookEvent(value) {
    if (!value || typeof value !== 'object')
        return false;
    const event = value;
    return (typeof event.id === 'string' &&
        event.object === 'event' &&
        typeof event.api_version === 'string' &&
        typeof event.created === 'number' &&
        typeof event.data === 'object' &&
        event.data !== null &&
        typeof event.livemode === 'boolean' &&
        typeof event.pending_webhooks === 'number' &&
        typeof event.request === 'object' &&
        event.request !== null &&
        isWebhookEventType(event.type));
}
/**
 * Check if value is a valid PaymentMethod
 */
function isPaymentMethod(value) {
    if (!value || typeof value !== 'object')
        return false;
    const pm = value;
    return (typeof pm.id === 'string' &&
        pm.object === 'payment_method' &&
        typeof pm.type === 'string' &&
        typeof pm.created === 'number' &&
        typeof pm.livemode === 'boolean' &&
        typeof pm.metadata === 'object' &&
        pm.metadata !== null &&
        typeof pm.billing_details === 'object' &&
        pm.billing_details !== null);
}
/**
 * Check if value is a valid UserSubscription
 */
function isUserSubscription(value) {
    if (!value || typeof value !== 'object')
        return false;
    const sub = value;
    return (typeof sub.id === 'string' &&
        typeof sub.userId === 'string' &&
        isPlanType(sub.planType) &&
        isSubscriptionStatus(sub.status) &&
        isBillingPeriod(sub.billingPeriod) &&
        typeof sub.cancelAtPeriodEnd === 'boolean' &&
        sub.createdAt instanceof Date &&
        sub.updatedAt instanceof Date);
}
/**
 * Check if value is a valid PlanConfig
 */
function isPlanConfig(value) {
    if (!value || typeof value !== 'object')
        return false;
    const plan = value;
    return (isPlanType(plan.id) &&
        typeof plan.name === 'string' &&
        typeof plan.description === 'string' &&
        typeof plan.price === 'object' &&
        plan.price !== null &&
        Array.isArray(plan.features) &&
        typeof plan.limits === 'object' &&
        plan.limits !== null &&
        typeof plan.priority === 'boolean' &&
        typeof plan.stripeIds === 'object' &&
        plan.stripeIds !== null);
}
/**
 * Check if value is a valid UsageMetrics
 */
function isUsageMetrics(value) {
    if (!value || typeof value !== 'object')
        return false;
    const usage = value;
    return (typeof usage.properties === 'number' &&
        typeof usage.tenants === 'number' &&
        typeof usage.leases === 'number' &&
        typeof usage.storageUsedMB === 'number' &&
        typeof usage.apiCallsCount === 'number' &&
        typeof usage.leaseGenerationsCount === 'number' &&
        typeof usage.month === 'string' &&
        /^\d{4}-\d{2}$/.test(usage.month));
}
/**
 * Check if value is a valid StripeConfig
 */
function isStripeConfig(value) {
    if (!value || typeof value !== 'object')
        return false;
    const config = value;
    return (typeof config.secretKey === 'string' &&
        typeof config.publishableKey === 'string' &&
        typeof config.webhookSecret === 'string' &&
        isStripeApiVersion(config.apiVersion) &&
        typeof config.automaticTax === 'boolean' &&
        typeof config.defaultTrialDays === 'number' &&
        (config.environment === 'test' || config.environment === 'live'));
}
/**
 * Check if value is a valid CreateCheckoutSessionParams
 */
function isCreateCheckoutSessionParams(value) {
    if (!value || typeof value !== 'object')
        return false;
    const params = value;
    return (typeof params.userId === 'string' &&
        isPlanType(params.planType) &&
        isBillingPeriod(params.billingInterval) &&
        typeof params.successUrl === 'string' &&
        typeof params.cancelUrl === 'string');
}
/**
 * Check if value is a valid CreatePortalSessionParams
 */
function isCreatePortalSessionParams(value) {
    if (!value || typeof value !== 'object')
        return false;
    const params = value;
    return (typeof params.customerId === 'string' &&
        typeof params.returnUrl === 'string');
}
/**
 * Check if value is a valid StripeSuccessResponse
 */
function isStripeSuccessResponse(value) {
    if (!value || typeof value !== 'object')
        return false;
    const response = value;
    return (response.success === true &&
        'data' in response);
}
/**
 * Check if value is a valid StripeErrorResponse
 */
function isStripeErrorResponse(value) {
    if (!value || typeof value !== 'object')
        return false;
    const response = value;
    return (response.success === false &&
        typeof response.error === 'object' &&
        response.error !== null);
}
// ========================
// Error Classification Guards
// ========================
/**
 * Check if error is retryable based on error code
 */
function isRetryableError(error) {
    return stripe_1.RETRYABLE_ERROR_CODES.includes(error.code);
}
/**
 * Check if error is a card error
 */
function isCardError(error) {
    const cardErrorCodes = [
        stripe_1.STRIPE_ERROR_CODES.CARD_DECLINED,
        stripe_1.STRIPE_ERROR_CODES.EXPIRED_CARD,
        stripe_1.STRIPE_ERROR_CODES.INCORRECT_CVC,
        stripe_1.STRIPE_ERROR_CODES.INCORRECT_NUMBER,
        stripe_1.STRIPE_ERROR_CODES.INSUFFICIENT_FUNDS,
        stripe_1.STRIPE_ERROR_CODES.INVALID_EXPIRY_MONTH,
        stripe_1.STRIPE_ERROR_CODES.INVALID_EXPIRY_YEAR,
        stripe_1.STRIPE_ERROR_CODES.INVALID_NUMBER,
        stripe_1.STRIPE_ERROR_CODES.PROCESSING_ERROR
    ];
    return cardErrorCodes.includes(error.code);
}
/**
 * Check if error is a rate limit error
 */
function isRateLimitError(error) {
    return error.code === stripe_1.STRIPE_ERROR_CODES.RATE_LIMIT;
}
/**
 * Check if error is an infrastructure error
 */
function isInfrastructureError(error) {
    return error.category === stripe_1.STRIPE_ERROR_CATEGORIES.INFRASTRUCTURE;
}
/**
 * Check if error is a configuration error
 */
function isConfigurationError(error) {
    return error.category === stripe_1.STRIPE_ERROR_CATEGORIES.CONFIGURATION;
}
/**
 * Check if error is critical severity
 */
function isCriticalError(error) {
    return error.severity === stripe_1.STRIPE_ERROR_SEVERITIES.CRITICAL;
}
/**
 * Check if error requires user action
 */
function requiresUserAction(error) {
    const userActionErrorCodes = [
        stripe_1.STRIPE_ERROR_CODES.CARD_DECLINED,
        stripe_1.STRIPE_ERROR_CODES.EXPIRED_CARD,
        stripe_1.STRIPE_ERROR_CODES.INCORRECT_CVC,
        stripe_1.STRIPE_ERROR_CODES.INSUFFICIENT_FUNDS
    ];
    return userActionErrorCodes.includes(error.code);
}
// ========================
// Stripe Object Guards
// ========================
/**
 * Check if value looks like a Stripe ID
 */
function isStripeId(value, prefix) {
    if (typeof value !== 'string')
        return false;
    // All Stripe IDs start with a prefix followed by underscore
    if (!value.includes('_'))
        return false;
    if (prefix) {
        return value.startsWith(prefix + '_');
    }
    // Common Stripe ID prefixes
    const commonPrefixes = [
        'acct', 'ba', 'card', 'ch', 'cus', 'evt', 'fee', 'file', 'ic', 'in', 'inv',
        'pi', 'pm', 'po', 'prod', 'py', 'req', 'rp', 'si', 'src', 'sub', 'tok',
        'tr', 'txn', 'cs', 'price', 'whsec', 'sk', 'pk', 'rk'
    ];
    return commonPrefixes.some(prefix => value.startsWith(prefix + '_'));
}
/**
 * Check if value is a Stripe customer ID
 */
function isStripeCustomerId(value) {
    return isStripeId(value, 'cus');
}
/**
 * Check if value is a Stripe subscription ID
 */
function isStripeSubscriptionId(value) {
    return isStripeId(value, 'sub');
}
/**
 * Check if value is a Stripe price ID
 */
function isStripePriceId(value) {
    return isStripeId(value, 'price');
}
/**
 * Check if value is a Stripe payment method ID
 */
function isStripePaymentMethodId(value) {
    return isStripeId(value, 'pm');
}
/**
 * Check if value is a Stripe checkout session ID
 */
function isStripeCheckoutSessionId(value) {
    return isStripeId(value, 'cs');
}
/**
 * Check if value is a Stripe invoice ID
 */
function isStripeInvoiceId(value) {
    return isStripeId(value, 'in');
}
/**
 * Check if value is a Stripe webhook secret
 */
function isStripeWebhookSecret(value) {
    return typeof value === 'string' && value.startsWith('whsec_');
}
/**
 * Check if value is a Stripe API key (secret)
 */
function isStripeSecretKey(value) {
    return typeof value === 'string' && value.startsWith('sk_');
}
/**
 * Check if value is a Stripe publishable key
 */
function isStripePublishableKey(value) {
    return typeof value === 'string' && value.startsWith('pk_');
}
// ========================
// Validation Utilities
// ========================
/**
 * Validate email format for Stripe operations
 */
function isValidEmail(value) {
    if (typeof value !== 'string')
        return false;
    // Use bounded quantifiers to prevent ReDoS attacks
    const emailRegex = /^[^\s@]{1,64}@[^\s@]{1,63}(?:\.[^\s@]{1,63})+$/;
    return emailRegex.test(value);
}
/**
 * Validate currency code (3-letter ISO)
 */
function isValidCurrency(value) {
    if (typeof value !== 'string')
        return false;
    return /^[A-Z]{3}$/.test(value.toUpperCase()) && value.length === 3;
}
/**
 * Validate amount in cents (must be positive integer)
 */
function isValidAmount(value) {
    return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}
/**
 * Validate URL format
 */
function isValidUrl(value) {
    if (typeof value !== 'string')
        return false;
    try {
        new URL(value);
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Validate metadata object (string keys and values)
 */
function isValidMetadata(value) {
    if (!value || typeof value !== 'object')
        return false;
    const metadata = value;
    return Object.entries(metadata).every(([key, val]) => typeof key === 'string' && typeof val === 'string');
}
// ========================
// Export All Guards
// ========================
/**
 * Comprehensive type guard collection for external use
 */
exports.StripeTypeGuards = {
    // Primitive guards
    isPlanType,
    isBillingPeriod,
    isSubscriptionStatus,
    isWebhookEventType,
    isStripeErrorCode,
    isStripeDeclineCode,
    isStripeErrorCategory,
    isStripeErrorSeverity,
    isStripeApiVersion,
    // Complex type guards
    isStandardizedStripeError,
    isStripeWebhookEvent,
    isPaymentMethod,
    isUserSubscription,
    isPlanConfig,
    isUsageMetrics,
    isStripeConfig,
    isCreateCheckoutSessionParams,
    isCreatePortalSessionParams,
    isStripeSuccessResponse,
    isStripeErrorResponse,
    // Error classification
    isRetryableError,
    isCardError,
    isRateLimitError,
    isInfrastructureError,
    isConfigurationError,
    isCriticalError,
    requiresUserAction,
    // Stripe ID guards
    isStripeId,
    isStripeCustomerId,
    isStripeSubscriptionId,
    isStripePriceId,
    isStripePaymentMethodId,
    isStripeCheckoutSessionId,
    isStripeInvoiceId,
    isStripeWebhookSecret,
    isStripeSecretKey,
    isStripePublishableKey,
    // Validation utilities
    isValidEmail,
    isValidCurrency,
    isValidAmount,
    isValidUrl,
    isValidMetadata
};
//# sourceMappingURL=stripe-guards.js.map