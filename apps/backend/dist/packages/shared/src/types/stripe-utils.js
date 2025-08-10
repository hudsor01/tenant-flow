"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeUtils = void 0;
exports.generateErrorId = generateErrorId;
exports.getErrorCategory = getErrorCategory;
exports.getErrorSeverity = getErrorSeverity;
exports.isRetryableErrorCode = isRetryableErrorCode;
exports.calculateRetryDelay = calculateRetryDelay;
exports.toClientSafeError = toClientSafeError;
exports.generateErrorAnalytics = generateErrorAnalytics;
exports.createStandardizedError = createStandardizedError;
exports.generateUserMessage = generateUserMessage;
exports.getPlanTypeFromPriceId = getPlanTypeFromPriceId;
exports.getBillingPeriodFromPriceId = getBillingPeriodFromPriceId;
exports.formatPrice = formatPrice;
exports.calculateAnnualSavings = calculateAnnualSavings;
exports.getPlanDisplayName = getPlanDisplayName;
exports.isActiveSubscription = isActiveSubscription;
exports.isInGracePeriod = isInGracePeriod;
exports.needsAttention = needsAttention;
exports.getSubscriptionStatusDisplay = getSubscriptionStatusDisplay;
exports.getDaysUntilExpiry = getDaysUntilExpiry;
exports.getTrialDaysRemaining = getTrialDaysRemaining;
exports.extractWebhookData = extractWebhookData;
exports.shouldProcessWebhookEvent = shouldProcessWebhookEvent;
exports.getWebhookEventPriority = getWebhookEventPriority;
exports.validateStripeConfig = validateStripeConfig;
exports.sanitizeMetadata = sanitizeMetadata;
exports.generateIdempotencyKey = generateIdempotencyKey;
const stripe_1 = require("./stripe");
const stripe_guards_1 = require("./stripe-guards");
function generateErrorId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `stripe_error_${timestamp}_${random}`;
}
function getErrorCategory(code) {
    return stripe_1.ERROR_CATEGORY_MAPPING[code] || stripe_1.STRIPE_ERROR_CATEGORIES.UNKNOWN;
}
function getErrorSeverity(code) {
    return stripe_1.ERROR_SEVERITY_MAPPING[code] || stripe_1.STRIPE_ERROR_SEVERITIES.MEDIUM;
}
function isRetryableErrorCode(code) {
    return stripe_1.RETRYABLE_ERROR_CODES.includes(code);
}
function calculateRetryDelay(attemptCount, config = {}) {
    const finalConfig = { ...stripe_1.DEFAULT_STRIPE_RETRY_CONFIG, ...config };
    const exponentialDelay = finalConfig.baseDelayMs * Math.pow(finalConfig.exponentialBase, attemptCount - 1);
    const delayWithJitter = exponentialDelay + (Math.random() * finalConfig.jitterMs);
    return Math.min(delayWithJitter, finalConfig.maxDelayMs);
}
function toClientSafeError(error) {
    if (!(0, stripe_guards_1.isStandardizedStripeError)(error)) {
        throw new Error('Invalid StandardizedStripeError provided');
    }
    return {
        code: error.code,
        userMessage: error.userMessage,
        retryable: error.retryable,
        retryAfter: error.retryAfter,
        errorId: error.errorId,
        category: error.category,
        severity: error.severity
    };
}
function generateErrorAnalytics(error) {
    const category = getErrorCategory(error.code);
    const severity = getErrorSeverity(error.code);
    const actionRequired = severity === stripe_1.STRIPE_ERROR_SEVERITIES.CRITICAL ||
        category === stripe_1.STRIPE_ERROR_CATEGORIES.CONFIGURATION;
    const escalateToStripe = category === stripe_1.STRIPE_ERROR_CATEGORIES.STRIPE_SERVICE ||
        (category === stripe_1.STRIPE_ERROR_CATEGORIES.INFRASTRUCTURE && severity === stripe_1.STRIPE_ERROR_SEVERITIES.HIGH);
    return {
        category,
        severity,
        actionRequired,
        escalateToStripe,
        affectedUsers: 1,
        errorRate: 0,
        avgResponseTime: 0
    };
}
function createStandardizedError(code, message, context, options = {}) {
    const errorId = generateErrorId();
    const category = getErrorCategory(code);
    const severity = getErrorSeverity(code);
    const retryable = isRetryableErrorCode(code);
    return {
        code,
        message,
        userMessage: options.userMessage || generateUserMessage(code),
        details: options.details,
        errorId,
        category,
        severity,
        retryable,
        retryAfter: options.retryAfter,
        context: {
            ...context,
            timestamp: new Date()
        }
    };
}
function generateUserMessage(code) {
    const userMessages = {
        card_declined: 'Your card was declined. Please try a different payment method.',
        expired_card: 'Your card has expired. Please update your payment information.',
        incorrect_cvc: 'The security code is incorrect. Please check and try again.',
        incorrect_number: 'The card number is incorrect. Please check and try again.',
        insufficient_funds: 'Your card has insufficient funds. Please try a different card.',
        invalid_expiry_month: 'The expiration month is invalid. Please check and try again.',
        invalid_expiry_year: 'The expiration year is invalid. Please check and try again.',
        invalid_number: 'The card number is invalid. Please check and try again.',
        processing_error: 'There was an error processing your payment. Please try again.',
        rate_limit: 'Too many requests. Please wait a moment and try again.',
        invalid_request_error: 'There was an error with your request. Please try again.',
        missing: 'Required information is missing. Please check your details.',
        invalid: 'Some information is invalid. Please check your details.',
        api_connection_error: 'Unable to connect to payment processor. Please try again.',
        api_error: 'Payment processing is temporarily unavailable. Please try again.',
        authentication_error: 'Authentication failed. Please contact support.',
        permission_error: 'Access denied. Please contact support.',
        idempotency_error: 'Duplicate request detected. Please try again.',
        customer_not_found: 'Customer account not found. Please contact support.',
        subscription_not_found: 'Subscription not found. Please contact support.',
        invalid_price_id: 'Invalid pricing information. Please contact support.',
        webhook_signature_invalid: 'Security validation failed. Please contact support.',
        configuration_error: 'Payment system configuration error. Please contact support.'
    };
    return userMessages[code] || 'An unexpected error occurred. Please try again or contact support.';
}
function getPlanTypeFromPriceId(priceId) {
    const lowerPriceId = priceId.toLowerCase();
    if (lowerPriceId.includes('starter'))
        return stripe_1.PLAN_TYPES.STARTER;
    if (lowerPriceId.includes('growth'))
        return stripe_1.PLAN_TYPES.GROWTH;
    if (lowerPriceId.includes('tenantflow_max') || lowerPriceId.includes('tenantflow'))
        return stripe_1.PLAN_TYPES.TENANTFLOW_MAX;
    if (lowerPriceId.includes('free') || lowerPriceId.includes('trial'))
        return stripe_1.PLAN_TYPES.FREETRIAL;
    return null;
}
function getBillingPeriodFromPriceId(priceId) {
    const lowerPriceId = priceId.toLowerCase();
    if (lowerPriceId.includes('monthly') || lowerPriceId.includes('month')) {
        return stripe_1.BILLING_PERIODS.MONTHLY;
    }
    if (lowerPriceId.includes('annual') || lowerPriceId.includes('year')) {
        return stripe_1.BILLING_PERIODS.ANNUAL;
    }
    return null;
}
function formatPrice(amount, currency = 'USD', interval) {
    const { formatPrice: sharedFormatPrice } = require('../utils/currency');
    const intervalMapping = {
        [stripe_1.BILLING_PERIODS.MONTHLY]: 'monthly',
        [stripe_1.BILLING_PERIODS.ANNUAL]: 'annual'
    };
    return sharedFormatPrice(amount, {
        currency: currency.toUpperCase(),
        interval: interval ? intervalMapping[interval] : undefined,
        fromCents: true,
        showInterval: !!interval
    });
}
function calculateAnnualSavings(monthlyPrice, annualPrice) {
    const monthlyTotal = monthlyPrice * 12;
    const savings = monthlyTotal - annualPrice;
    return Math.round((savings / monthlyTotal) * 100);
}
function getPlanDisplayName(planType) {
    const displayNames = {
        [stripe_1.PLAN_TYPES.FREETRIAL]: 'Free Trial',
        [stripe_1.PLAN_TYPES.STARTER]: 'Starter',
        [stripe_1.PLAN_TYPES.GROWTH]: 'Growth',
        [stripe_1.PLAN_TYPES.TENANTFLOW_MAX]: 'TenantFlow Max'
    };
    return displayNames[planType] || planType;
}
function isActiveSubscription(status) {
    return status === 'active' || status === 'trialing';
}
function isInGracePeriod(status) {
    return status === 'past_due';
}
function needsAttention(status) {
    return ['past_due', 'unpaid', 'incomplete'].includes(status);
}
function getSubscriptionStatusDisplay(status) {
    const statusDisplay = {
        incomplete: 'Setup Required',
        incomplete_expired: 'Setup Expired',
        trialing: 'Trial',
        active: 'Active',
        past_due: 'Past Due',
        canceled: 'Canceled',
        unpaid: 'Unpaid',
        paused: 'Paused',
        updating: 'Updating'
    };
    return statusDisplay[status] || status;
}
function getDaysUntilExpiry(currentPeriodEnd) {
    if (!currentPeriodEnd)
        return null;
    const now = new Date();
    const diffTime = currentPeriodEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
}
function getTrialDaysRemaining(trialEnd) {
    if (!trialEnd)
        return null;
    const now = new Date();
    const diffTime = trialEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
}
function extractWebhookData(_eventType, eventData) {
    return eventData;
}
function shouldProcessWebhookEvent(eventType, supportedEvents) {
    return supportedEvents.includes(eventType);
}
function getWebhookEventPriority(eventType) {
    const highPriorityEvents = [
        'invoice.payment_failed',
        'customer.subscription.deleted',
        'invoice.payment_succeeded'
    ];
    const mediumPriorityEvents = [
        'customer.subscription.created',
        'customer.subscription.updated',
        'checkout.session.completed'
    ];
    if (highPriorityEvents.includes(eventType))
        return 'high';
    if (mediumPriorityEvents.includes(eventType))
        return 'medium';
    return 'low';
}
function validateStripeConfig(config) {
    const errors = [];
    if (!config.secretKey) {
        errors.push('Secret key is required');
    }
    else if (!config.secretKey.startsWith('sk_')) {
        errors.push('Invalid secret key format');
    }
    if (!config.publishableKey) {
        errors.push('Publishable key is required');
    }
    else if (!config.publishableKey.startsWith('pk_')) {
        errors.push('Invalid publishable key format');
    }
    if (config.secretKey && config.publishableKey) {
        const secretEnv = config.secretKey.includes('_test_') ? 'test' : 'live';
        const pubEnv = config.publishableKey.includes('_test_') ? 'test' : 'live';
        if (secretEnv !== pubEnv) {
            errors.push('Secret key and publishable key environment mismatch');
        }
    }
    if (config.webhookSecret && !config.webhookSecret.startsWith('whsec_')) {
        errors.push('Invalid webhook secret format');
    }
    return {
        isValid: errors.length === 0,
        errors
    };
}
function sanitizeMetadata(metadata) {
    const sanitized = {};
    Object.entries(metadata).forEach(([key, value]) => {
        const stringValue = String(value).substring(0, 500);
        const sanitizedKey = key.substring(0, 40).replace(/\W/g, '_');
        if (sanitizedKey && stringValue) {
            sanitized[sanitizedKey] = stringValue;
        }
    });
    return sanitized;
}
function generateIdempotencyKey(operation, params) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const hash = params ? btoa(JSON.stringify(params)).substring(0, 8) : 'no_params';
    return `${operation}_${timestamp}_${random}_${hash}`;
}
exports.StripeUtils = {
    generateErrorId,
    getErrorCategory,
    getErrorSeverity,
    isRetryableErrorCode,
    calculateRetryDelay,
    toClientSafeError,
    generateErrorAnalytics,
    createStandardizedError,
    generateUserMessage,
    getPlanTypeFromPriceId,
    getBillingPeriodFromPriceId,
    formatPrice,
    calculateAnnualSavings,
    getPlanDisplayName,
    isActiveSubscription,
    isInGracePeriod,
    needsAttention,
    getSubscriptionStatusDisplay,
    getDaysUntilExpiry,
    getTrialDaysRemaining,
    extractWebhookData,
    shouldProcessWebhookEvent,
    getWebhookEventPriority,
    validateStripeConfig,
    sanitizeMetadata,
    generateIdempotencyKey
};
