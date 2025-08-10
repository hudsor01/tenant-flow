/**
 * Stripe Type Guards
 *
 * Runtime type validation utilities for Stripe types.
 * Provides type-safe guards for validating Stripe objects at runtime.
 *
 * @fileoverview Type guards for all Stripe-related types
 */
import { PLAN_TYPES, BILLING_PERIODS, SUBSCRIPTION_STATUSES, WEBHOOK_EVENT_TYPES, STRIPE_ERROR_CODES, STRIPE_DECLINE_CODES, STRIPE_ERROR_CATEGORIES, STRIPE_ERROR_SEVERITIES, STRIPE_API_VERSIONS, RETRYABLE_ERROR_CODES } from './stripe';
// ========================
// Primitive Type Guards
// ========================
/**
 * Check if value is a valid PlanType
 */
export function isPlanType(value) {
    return typeof value === 'string' && Object.values(PLAN_TYPES).includes(value);
}
/**
 * Check if value is a valid BillingPeriod
 */
export function isBillingPeriod(value) {
    return typeof value === 'string' && Object.values(BILLING_PERIODS).includes(value);
}
/**
 * Check if value is a valid SubscriptionStatus
 */
export function isSubscriptionStatus(value) {
    return typeof value === 'string' && Object.values(SUBSCRIPTION_STATUSES).includes(value);
}
/**
 * Check if value is a valid WebhookEventType
 */
export function isWebhookEventType(value) {
    return typeof value === 'string' && Object.values(WEBHOOK_EVENT_TYPES).includes(value);
}
/**
 * Check if value is a valid StripeErrorCode
 */
export function isStripeErrorCode(value) {
    return typeof value === 'string' && Object.values(STRIPE_ERROR_CODES).includes(value);
}
/**
 * Check if value is a valid StripeDeclineCode
 */
export function isStripeDeclineCode(value) {
    return typeof value === 'string' && Object.values(STRIPE_DECLINE_CODES).includes(value);
}
/**
 * Check if value is a valid StripeErrorCategory
 */
export function isStripeErrorCategory(value) {
    return typeof value === 'string' && Object.values(STRIPE_ERROR_CATEGORIES).includes(value);
}
/**
 * Check if value is a valid StripeErrorSeverity
 */
export function isStripeErrorSeverity(value) {
    return typeof value === 'string' && Object.values(STRIPE_ERROR_SEVERITIES).includes(value);
}
/**
 * Check if value is a valid StripeApiVersion
 */
export function isStripeApiVersion(value) {
    return typeof value === 'string' && Object.values(STRIPE_API_VERSIONS).includes(value);
}
// ========================
// Complex Type Guards
// ========================
/**
 * Check if value is a valid StandardizedStripeError
 */
export function isStandardizedStripeError(value) {
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
export function isStripeWebhookEvent(value) {
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
export function isPaymentMethod(value) {
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
export function isUserSubscription(value) {
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
export function isPlanConfig(value) {
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
export function isUsageMetrics(value) {
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
export function isStripeConfig(value) {
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
export function isCreateCheckoutSessionParams(value) {
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
export function isCreatePortalSessionParams(value) {
    if (!value || typeof value !== 'object')
        return false;
    const params = value;
    return (typeof params.customerId === 'string' &&
        typeof params.returnUrl === 'string');
}
/**
 * Check if value is a valid StripeSuccessResponse
 */
export function isStripeSuccessResponse(value) {
    if (!value || typeof value !== 'object')
        return false;
    const response = value;
    return (response.success === true &&
        'data' in response);
}
/**
 * Check if value is a valid StripeErrorResponse
 */
export function isStripeErrorResponse(value) {
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
export function isRetryableError(error) {
    return RETRYABLE_ERROR_CODES.includes(error.code);
}
/**
 * Check if error is a card error
 */
export function isCardError(error) {
    const cardErrorCodes = [
        STRIPE_ERROR_CODES.CARD_DECLINED,
        STRIPE_ERROR_CODES.EXPIRED_CARD,
        STRIPE_ERROR_CODES.INCORRECT_CVC,
        STRIPE_ERROR_CODES.INCORRECT_NUMBER,
        STRIPE_ERROR_CODES.INSUFFICIENT_FUNDS,
        STRIPE_ERROR_CODES.INVALID_EXPIRY_MONTH,
        STRIPE_ERROR_CODES.INVALID_EXPIRY_YEAR,
        STRIPE_ERROR_CODES.INVALID_NUMBER,
        STRIPE_ERROR_CODES.PROCESSING_ERROR
    ];
    return cardErrorCodes.includes(error.code);
}
/**
 * Check if error is a rate limit error
 */
export function isRateLimitError(error) {
    return error.code === STRIPE_ERROR_CODES.RATE_LIMIT;
}
/**
 * Check if error is an infrastructure error
 */
export function isInfrastructureError(error) {
    return error.category === STRIPE_ERROR_CATEGORIES.INFRASTRUCTURE;
}
/**
 * Check if error is a configuration error
 */
export function isConfigurationError(error) {
    return error.category === STRIPE_ERROR_CATEGORIES.CONFIGURATION;
}
/**
 * Check if error is critical severity
 */
export function isCriticalError(error) {
    return error.severity === STRIPE_ERROR_SEVERITIES.CRITICAL;
}
/**
 * Check if error requires user action
 */
export function requiresUserAction(error) {
    const userActionErrorCodes = [
        STRIPE_ERROR_CODES.CARD_DECLINED,
        STRIPE_ERROR_CODES.EXPIRED_CARD,
        STRIPE_ERROR_CODES.INCORRECT_CVC,
        STRIPE_ERROR_CODES.INSUFFICIENT_FUNDS
    ];
    return userActionErrorCodes.includes(error.code);
}
// ========================
// Stripe Object Guards
// ========================
/**
 * Check if value looks like a Stripe ID
 */
export function isStripeId(value, prefix) {
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
export function isStripeCustomerId(value) {
    return isStripeId(value, 'cus');
}
/**
 * Check if value is a Stripe subscription ID
 */
export function isStripeSubscriptionId(value) {
    return isStripeId(value, 'sub');
}
/**
 * Check if value is a Stripe price ID
 */
export function isStripePriceId(value) {
    return isStripeId(value, 'price');
}
/**
 * Check if value is a Stripe payment method ID
 */
export function isStripePaymentMethodId(value) {
    return isStripeId(value, 'pm');
}
/**
 * Check if value is a Stripe checkout session ID
 */
export function isStripeCheckoutSessionId(value) {
    return isStripeId(value, 'cs');
}
/**
 * Check if value is a Stripe invoice ID
 */
export function isStripeInvoiceId(value) {
    return isStripeId(value, 'in');
}
/**
 * Check if value is a Stripe webhook secret
 */
export function isStripeWebhookSecret(value) {
    return typeof value === 'string' && value.startsWith('whsec_');
}
/**
 * Check if value is a Stripe API key (secret)
 */
export function isStripeSecretKey(value) {
    return typeof value === 'string' && value.startsWith('sk_');
}
/**
 * Check if value is a Stripe publishable key
 */
export function isStripePublishableKey(value) {
    return typeof value === 'string' && value.startsWith('pk_');
}
// ========================
// Validation Utilities
// ========================
/**
 * Validate email format for Stripe operations
 */
export function isValidEmail(value) {
    if (typeof value !== 'string')
        return false;
    // Use bounded quantifiers to prevent ReDoS attacks
    const emailRegex = /^[^\s@]{1,64}@[^\s@]{1,63}(?:\.[^\s@]{1,63})+$/;
    return emailRegex.test(value);
}
/**
 * Validate currency code (3-letter ISO)
 */
export function isValidCurrency(value) {
    if (typeof value !== 'string')
        return false;
    return /^[A-Z]{3}$/.test(value.toUpperCase()) && value.length === 3;
}
/**
 * Validate amount in cents (must be positive integer)
 */
export function isValidAmount(value) {
    return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}
/**
 * Validate URL format
 */
export function isValidUrl(value) {
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
export function isValidMetadata(value) {
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
export const StripeTypeGuards = {
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