"use strict";
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
function isPlanType(value) {
    return typeof value === 'string' && Object.values(stripe_1.PLAN_TYPES).includes(value);
}
function isBillingPeriod(value) {
    return typeof value === 'string' && Object.values(stripe_1.BILLING_PERIODS).includes(value);
}
function isSubscriptionStatus(value) {
    return typeof value === 'string' && Object.values(stripe_1.SUBSCRIPTION_STATUSES).includes(value);
}
function isWebhookEventType(value) {
    return typeof value === 'string' && Object.values(stripe_1.WEBHOOK_EVENT_TYPES).includes(value);
}
function isStripeErrorCode(value) {
    return typeof value === 'string' && Object.values(stripe_1.STRIPE_ERROR_CODES).includes(value);
}
function isStripeDeclineCode(value) {
    return typeof value === 'string' && Object.values(stripe_1.STRIPE_DECLINE_CODES).includes(value);
}
function isStripeErrorCategory(value) {
    return typeof value === 'string' && Object.values(stripe_1.STRIPE_ERROR_CATEGORIES).includes(value);
}
function isStripeErrorSeverity(value) {
    return typeof value === 'string' && Object.values(stripe_1.STRIPE_ERROR_SEVERITIES).includes(value);
}
function isStripeApiVersion(value) {
    return typeof value === 'string' && Object.values(stripe_1.STRIPE_API_VERSIONS).includes(value);
}
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
function isCreatePortalSessionParams(value) {
    if (!value || typeof value !== 'object')
        return false;
    const params = value;
    return (typeof params.customerId === 'string' &&
        typeof params.returnUrl === 'string');
}
function isStripeSuccessResponse(value) {
    if (!value || typeof value !== 'object')
        return false;
    const response = value;
    return (response.success === true &&
        'data' in response);
}
function isStripeErrorResponse(value) {
    if (!value || typeof value !== 'object')
        return false;
    const response = value;
    return (response.success === false &&
        typeof response.error === 'object' &&
        response.error !== null);
}
function isRetryableError(error) {
    return stripe_1.RETRYABLE_ERROR_CODES.includes(error.code);
}
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
function isRateLimitError(error) {
    return error.code === stripe_1.STRIPE_ERROR_CODES.RATE_LIMIT;
}
function isInfrastructureError(error) {
    return error.category === stripe_1.STRIPE_ERROR_CATEGORIES.INFRASTRUCTURE;
}
function isConfigurationError(error) {
    return error.category === stripe_1.STRIPE_ERROR_CATEGORIES.CONFIGURATION;
}
function isCriticalError(error) {
    return error.severity === stripe_1.STRIPE_ERROR_SEVERITIES.CRITICAL;
}
function requiresUserAction(error) {
    const userActionErrorCodes = [
        stripe_1.STRIPE_ERROR_CODES.CARD_DECLINED,
        stripe_1.STRIPE_ERROR_CODES.EXPIRED_CARD,
        stripe_1.STRIPE_ERROR_CODES.INCORRECT_CVC,
        stripe_1.STRIPE_ERROR_CODES.INSUFFICIENT_FUNDS
    ];
    return userActionErrorCodes.includes(error.code);
}
function isStripeId(value, prefix) {
    if (typeof value !== 'string')
        return false;
    if (!value.includes('_'))
        return false;
    if (prefix) {
        return value.startsWith(prefix + '_');
    }
    const commonPrefixes = [
        'acct', 'ba', 'card', 'ch', 'cus', 'evt', 'fee', 'file', 'ic', 'in', 'inv',
        'pi', 'pm', 'po', 'prod', 'py', 'req', 'rp', 'si', 'src', 'sub', 'tok',
        'tr', 'txn', 'cs', 'price', 'whsec', 'sk', 'pk', 'rk'
    ];
    return commonPrefixes.some(prefix => value.startsWith(prefix + '_'));
}
function isStripeCustomerId(value) {
    return isStripeId(value, 'cus');
}
function isStripeSubscriptionId(value) {
    return isStripeId(value, 'sub');
}
function isStripePriceId(value) {
    return isStripeId(value, 'price');
}
function isStripePaymentMethodId(value) {
    return isStripeId(value, 'pm');
}
function isStripeCheckoutSessionId(value) {
    return isStripeId(value, 'cs');
}
function isStripeInvoiceId(value) {
    return isStripeId(value, 'in');
}
function isStripeWebhookSecret(value) {
    return typeof value === 'string' && value.startsWith('whsec_');
}
function isStripeSecretKey(value) {
    return typeof value === 'string' && value.startsWith('sk_');
}
function isStripePublishableKey(value) {
    return typeof value === 'string' && value.startsWith('pk_');
}
function isValidEmail(value) {
    if (typeof value !== 'string')
        return false;
    const emailRegex = /^[^\s@]{1,64}@[^\s@]{1,63}(?:\.[^\s@]{1,63})+$/;
    return emailRegex.test(value);
}
function isValidCurrency(value) {
    if (typeof value !== 'string')
        return false;
    return /^[A-Z]{3}$/.test(value.toUpperCase()) && value.length === 3;
}
function isValidAmount(value) {
    return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}
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
function isValidMetadata(value) {
    if (!value || typeof value !== 'object')
        return false;
    const metadata = value;
    return Object.entries(metadata).every(([key, val]) => typeof key === 'string' && typeof val === 'string');
}
exports.StripeTypeGuards = {
    isPlanType,
    isBillingPeriod,
    isSubscriptionStatus,
    isWebhookEventType,
    isStripeErrorCode,
    isStripeDeclineCode,
    isStripeErrorCategory,
    isStripeErrorSeverity,
    isStripeApiVersion,
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
    isRetryableError,
    isCardError,
    isRateLimitError,
    isInfrastructureError,
    isConfigurationError,
    isCriticalError,
    requiresUserAction,
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
    isValidEmail,
    isValidCurrency,
    isValidAmount,
    isValidUrl,
    isValidMetadata
};
