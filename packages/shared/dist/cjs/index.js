"use strict";
/**
 * @repo/shared - Main export file
 *
 * This file exports commonly used types and utilities from the shared package.
 * More specific exports are available through the package.json exports map.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateUserMessage = exports.createStandardizedError = exports.toClientSafeError = exports.calculateRetryDelay = exports.getErrorSeverity = exports.getErrorCategory = exports.generateErrorId = exports.StripeUtils = exports.isStripePriceId = exports.isStripeSubscriptionId = exports.isStripeCustomerId = exports.isStripeId = exports.isCriticalError = exports.isConfigurationError = exports.isInfrastructureError = exports.isRateLimitError = exports.isCardError = exports.isStripeRetryableError = exports.isStripeConfig = exports.isPlanConfig = exports.isUserSubscription = exports.isPaymentMethod = exports.isStripeWebhookEvent = exports.isStandardizedStripeError = exports.isStripeErrorCode = exports.isWebhookEventType = exports.isSubscriptionStatus = exports.isBillingPeriod = exports.isPlanType = exports.StripeTypeGuards = exports.RETRYABLE_ERROR_CODES = exports.ERROR_SEVERITY_MAPPING = exports.ERROR_CATEGORY_MAPPING = exports.DEFAULT_STRIPE_RETRY_CONFIG = exports.WEBHOOK_EVENT_TYPES = exports.STRIPE_ERROR_SEVERITIES = exports.STRIPE_ERROR_CATEGORIES = exports.STRIPE_DECLINE_CODES = exports.STRIPE_ERROR_CODES = exports.STRIPE_API_VERSIONS = exports.SUBSCRIPTION_STATUSES = exports.BILLING_PERIODS = exports.PLAN_TYPES = exports.validatePricingPlan = exports.getStripeErrorMessage = exports.calculateYearlySavings = exports.getReminderStatusColor = exports.getReminderStatusLabel = exports.getReminderTypeLabel = exports.USER_ROLE = void 0;
exports.createNetworkError = exports.createValidationError = exports.createStandardError = exports.formatPriceWithInterval = exports.formatPriceFromCents = exports.getIntervalSuffix = exports.getCollectionRateStatus = exports.getDashboardPercentage = exports.getDashboardCurrency = exports.formatPercentageChange = exports.formatCurrencyChange = exports.formatNumber = exports.formatPercentage = exports.formatCompactCurrency = exports.formatPrice = exports.formatCurrency = exports.SUBSCRIPTION_URLS = exports.calculateAnnualPrice = exports.calculateProratedAmount = exports.LogLevel = exports.SecurityEventSeverity = exports.SecuritySeverity = exports.SecurityEventType = exports.REMINDER_STATUS = exports.REMINDER_TYPE = exports.TENANT_STATUS = exports.leaseFormSchema = exports.calculateAnnualSavings = exports.getRecommendedUpgrade = exports.checkPlanLimits = exports.getTrialConfig = exports.hasTrial = exports.getStripePriceId = exports.getProductTier = exports.PRODUCT_TIERS = exports.getPlanTypeLabel = exports.STRIPE_ERRORS = exports.PLAN_TYPE = exports.generateIdempotencyKey = exports.sanitizeMetadata = exports.getTrialDaysRemaining = exports.getDaysUntilExpiry = exports.getSubscriptionStatusDisplay = exports.isInGracePeriod = exports.isActiveSubscription = exports.getPlanDisplayName = exports.calculateStripeAnnualSavings = exports.formatStripePrice = exports.getBillingPeriodFromPriceId = exports.getPlanTypeFromPriceId = void 0;
exports.BusinessRuleValidationError = exports.ForbiddenError = exports.UnauthorizedError = exports.ConflictError = exports.NotFoundError = exports.ValidationError = exports.DomainError = exports.createId = exports.Address = exports.PhoneNumber = exports.Email = exports.Money = exports.DomainResultClass = exports.BaseSpecification = exports.BaseEntity = exports.BaseValueObject = exports.handleAdapterError = exports.TypeAdapterError = exports.isValidMutationData = exports.isValidQueryParam = exports.createApiCall = exports.mergeApiParams = exports.safeParseDate = exports.safeParseNumber = exports.validateEnumValue = exports.validateApiParams = exports.createResponseAdapter = exports.createMutationAdapter = exports.createQueryAdapter = exports.ERROR_TYPES = exports.getErrorLogLevel = exports.isRetryableError = exports.classifyError = exports.createBusinessLogicError = void 0;
// Export UserRole constants
var auth_1 = require("./constants/auth");
Object.defineProperty(exports, "USER_ROLE", { enumerable: true, get: function () { return auth_1.USER_ROLE; } });
// Global type declarations (augmentations)
require("./types/global");
var reminders_1 = require("./types/reminders");
Object.defineProperty(exports, "getReminderTypeLabel", { enumerable: true, get: function () { return reminders_1.getReminderTypeLabel; } });
Object.defineProperty(exports, "getReminderStatusLabel", { enumerable: true, get: function () { return reminders_1.getReminderStatusLabel; } });
Object.defineProperty(exports, "getReminderStatusColor", { enumerable: true, get: function () { return reminders_1.getReminderStatusColor; } });
var stripe_pricing_1 = require("./types/stripe-pricing");
Object.defineProperty(exports, "calculateYearlySavings", { enumerable: true, get: function () { return stripe_pricing_1.calculateYearlySavings; } });
Object.defineProperty(exports, "getStripeErrorMessage", { enumerable: true, get: function () { return stripe_pricing_1.getStripeErrorMessage; } });
Object.defineProperty(exports, "validatePricingPlan", { enumerable: true, get: function () { return stripe_pricing_1.validatePricingPlan; } });
var stripe_1 = require("./types/stripe");
// Constants
Object.defineProperty(exports, "PLAN_TYPES", { enumerable: true, get: function () { return stripe_1.PLAN_TYPES; } });
Object.defineProperty(exports, "BILLING_PERIODS", { enumerable: true, get: function () { return stripe_1.BILLING_PERIODS; } });
Object.defineProperty(exports, "SUBSCRIPTION_STATUSES", { enumerable: true, get: function () { return stripe_1.SUBSCRIPTION_STATUSES; } });
Object.defineProperty(exports, "STRIPE_API_VERSIONS", { enumerable: true, get: function () { return stripe_1.STRIPE_API_VERSIONS; } });
Object.defineProperty(exports, "STRIPE_ERROR_CODES", { enumerable: true, get: function () { return stripe_1.STRIPE_ERROR_CODES; } });
Object.defineProperty(exports, "STRIPE_DECLINE_CODES", { enumerable: true, get: function () { return stripe_1.STRIPE_DECLINE_CODES; } });
Object.defineProperty(exports, "STRIPE_ERROR_CATEGORIES", { enumerable: true, get: function () { return stripe_1.STRIPE_ERROR_CATEGORIES; } });
Object.defineProperty(exports, "STRIPE_ERROR_SEVERITIES", { enumerable: true, get: function () { return stripe_1.STRIPE_ERROR_SEVERITIES; } });
Object.defineProperty(exports, "WEBHOOK_EVENT_TYPES", { enumerable: true, get: function () { return stripe_1.WEBHOOK_EVENT_TYPES; } });
Object.defineProperty(exports, "DEFAULT_STRIPE_RETRY_CONFIG", { enumerable: true, get: function () { return stripe_1.DEFAULT_STRIPE_RETRY_CONFIG; } });
Object.defineProperty(exports, "ERROR_CATEGORY_MAPPING", { enumerable: true, get: function () { return stripe_1.ERROR_CATEGORY_MAPPING; } });
Object.defineProperty(exports, "ERROR_SEVERITY_MAPPING", { enumerable: true, get: function () { return stripe_1.ERROR_SEVERITY_MAPPING; } });
Object.defineProperty(exports, "RETRYABLE_ERROR_CODES", { enumerable: true, get: function () { return stripe_1.RETRYABLE_ERROR_CODES; } });
// ========================
// Stripe Type Guards
// ========================
var stripe_guards_1 = require("./types/stripe-guards");
Object.defineProperty(exports, "StripeTypeGuards", { enumerable: true, get: function () { return stripe_guards_1.StripeTypeGuards; } });
// Individual guards for tree-shaking
Object.defineProperty(exports, "isPlanType", { enumerable: true, get: function () { return stripe_guards_1.isPlanType; } });
Object.defineProperty(exports, "isBillingPeriod", { enumerable: true, get: function () { return stripe_guards_1.isBillingPeriod; } });
Object.defineProperty(exports, "isSubscriptionStatus", { enumerable: true, get: function () { return stripe_guards_1.isSubscriptionStatus; } });
Object.defineProperty(exports, "isWebhookEventType", { enumerable: true, get: function () { return stripe_guards_1.isWebhookEventType; } });
Object.defineProperty(exports, "isStripeErrorCode", { enumerable: true, get: function () { return stripe_guards_1.isStripeErrorCode; } });
Object.defineProperty(exports, "isStandardizedStripeError", { enumerable: true, get: function () { return stripe_guards_1.isStandardizedStripeError; } });
Object.defineProperty(exports, "isStripeWebhookEvent", { enumerable: true, get: function () { return stripe_guards_1.isStripeWebhookEvent; } });
Object.defineProperty(exports, "isPaymentMethod", { enumerable: true, get: function () { return stripe_guards_1.isPaymentMethod; } });
Object.defineProperty(exports, "isUserSubscription", { enumerable: true, get: function () { return stripe_guards_1.isUserSubscription; } });
Object.defineProperty(exports, "isPlanConfig", { enumerable: true, get: function () { return stripe_guards_1.isPlanConfig; } });
Object.defineProperty(exports, "isStripeConfig", { enumerable: true, get: function () { return stripe_guards_1.isStripeConfig; } });
Object.defineProperty(exports, "isStripeRetryableError", { enumerable: true, get: function () { return stripe_guards_1.isRetryableError; } });
Object.defineProperty(exports, "isCardError", { enumerable: true, get: function () { return stripe_guards_1.isCardError; } });
Object.defineProperty(exports, "isRateLimitError", { enumerable: true, get: function () { return stripe_guards_1.isRateLimitError; } });
Object.defineProperty(exports, "isInfrastructureError", { enumerable: true, get: function () { return stripe_guards_1.isInfrastructureError; } });
Object.defineProperty(exports, "isConfigurationError", { enumerable: true, get: function () { return stripe_guards_1.isConfigurationError; } });
Object.defineProperty(exports, "isCriticalError", { enumerable: true, get: function () { return stripe_guards_1.isCriticalError; } });
Object.defineProperty(exports, "isStripeId", { enumerable: true, get: function () { return stripe_guards_1.isStripeId; } });
Object.defineProperty(exports, "isStripeCustomerId", { enumerable: true, get: function () { return stripe_guards_1.isStripeCustomerId; } });
Object.defineProperty(exports, "isStripeSubscriptionId", { enumerable: true, get: function () { return stripe_guards_1.isStripeSubscriptionId; } });
Object.defineProperty(exports, "isStripePriceId", { enumerable: true, get: function () { return stripe_guards_1.isStripePriceId; } });
// ========================
// Stripe Utilities
// ========================
var stripe_utils_1 = require("./types/stripe-utils");
Object.defineProperty(exports, "StripeUtils", { enumerable: true, get: function () { return stripe_utils_1.StripeUtils; } });
// Individual utilities for tree-shaking
Object.defineProperty(exports, "generateErrorId", { enumerable: true, get: function () { return stripe_utils_1.generateErrorId; } });
Object.defineProperty(exports, "getErrorCategory", { enumerable: true, get: function () { return stripe_utils_1.getErrorCategory; } });
Object.defineProperty(exports, "getErrorSeverity", { enumerable: true, get: function () { return stripe_utils_1.getErrorSeverity; } });
Object.defineProperty(exports, "calculateRetryDelay", { enumerable: true, get: function () { return stripe_utils_1.calculateRetryDelay; } });
Object.defineProperty(exports, "toClientSafeError", { enumerable: true, get: function () { return stripe_utils_1.toClientSafeError; } });
Object.defineProperty(exports, "createStandardizedError", { enumerable: true, get: function () { return stripe_utils_1.createStandardizedError; } });
Object.defineProperty(exports, "generateUserMessage", { enumerable: true, get: function () { return stripe_utils_1.generateUserMessage; } });
Object.defineProperty(exports, "getPlanTypeFromPriceId", { enumerable: true, get: function () { return stripe_utils_1.getPlanTypeFromPriceId; } });
Object.defineProperty(exports, "getBillingPeriodFromPriceId", { enumerable: true, get: function () { return stripe_utils_1.getBillingPeriodFromPriceId; } });
Object.defineProperty(exports, "formatStripePrice", { enumerable: true, get: function () { return stripe_utils_1.formatPrice; } });
Object.defineProperty(exports, "calculateStripeAnnualSavings", { enumerable: true, get: function () { return stripe_utils_1.calculateAnnualSavings; } });
Object.defineProperty(exports, "getPlanDisplayName", { enumerable: true, get: function () { return stripe_utils_1.getPlanDisplayName; } });
Object.defineProperty(exports, "isActiveSubscription", { enumerable: true, get: function () { return stripe_utils_1.isActiveSubscription; } });
Object.defineProperty(exports, "isInGracePeriod", { enumerable: true, get: function () { return stripe_utils_1.isInGracePeriod; } });
Object.defineProperty(exports, "getSubscriptionStatusDisplay", { enumerable: true, get: function () { return stripe_utils_1.getSubscriptionStatusDisplay; } });
Object.defineProperty(exports, "getDaysUntilExpiry", { enumerable: true, get: function () { return stripe_utils_1.getDaysUntilExpiry; } });
Object.defineProperty(exports, "getTrialDaysRemaining", { enumerable: true, get: function () { return stripe_utils_1.getTrialDaysRemaining; } });
Object.defineProperty(exports, "sanitizeMetadata", { enumerable: true, get: function () { return stripe_utils_1.sanitizeMetadata; } });
Object.defineProperty(exports, "generateIdempotencyKey", { enumerable: true, get: function () { return stripe_utils_1.generateIdempotencyKey; } });
var billing_1 = require("./types/billing");
Object.defineProperty(exports, "PLAN_TYPE", { enumerable: true, get: function () { return billing_1.PLAN_TYPE; } });
Object.defineProperty(exports, "STRIPE_ERRORS", { enumerable: true, get: function () { return billing_1.STRIPE_ERRORS; } });
Object.defineProperty(exports, "getPlanTypeLabel", { enumerable: true, get: function () { return billing_1.getPlanTypeLabel; } });
// ========================
// Pricing Configuration
// ========================
var pricing_1 = require("./config/pricing");
Object.defineProperty(exports, "PRODUCT_TIERS", { enumerable: true, get: function () { return pricing_1.PRODUCT_TIERS; } });
Object.defineProperty(exports, "getProductTier", { enumerable: true, get: function () { return pricing_1.getProductTier; } });
Object.defineProperty(exports, "getStripePriceId", { enumerable: true, get: function () { return pricing_1.getStripePriceId; } });
Object.defineProperty(exports, "hasTrial", { enumerable: true, get: function () { return pricing_1.hasTrial; } });
Object.defineProperty(exports, "getTrialConfig", { enumerable: true, get: function () { return pricing_1.getTrialConfig; } });
Object.defineProperty(exports, "checkPlanLimits", { enumerable: true, get: function () { return pricing_1.checkPlanLimits; } });
Object.defineProperty(exports, "getRecommendedUpgrade", { enumerable: true, get: function () { return pricing_1.getRecommendedUpgrade; } });
Object.defineProperty(exports, "calculateAnnualSavings", { enumerable: true, get: function () { return pricing_1.calculateAnnualSavings; } });
var lease_generator_1 = require("./types/lease-generator");
Object.defineProperty(exports, "leaseFormSchema", { enumerable: true, get: function () { return lease_generator_1.leaseFormSchema; } });
// ========================
// Constants
// ========================
__exportStar(require("./constants"), exports);
var tenants_1 = require("./constants/tenants");
Object.defineProperty(exports, "TENANT_STATUS", { enumerable: true, get: function () { return tenants_1.TENANT_STATUS; } });
var reminders_2 = require("./constants/reminders");
Object.defineProperty(exports, "REMINDER_TYPE", { enumerable: true, get: function () { return reminders_2.REMINDER_TYPE; } });
Object.defineProperty(exports, "REMINDER_STATUS", { enumerable: true, get: function () { return reminders_2.REMINDER_STATUS; } });
// ========================
// Security Types
// ========================
var security_1 = require("./types/security");
Object.defineProperty(exports, "SecurityEventType", { enumerable: true, get: function () { return security_1.SecurityEventType; } });
Object.defineProperty(exports, "SecuritySeverity", { enumerable: true, get: function () { return security_1.SecurityEventSeverity; } });
Object.defineProperty(exports, "SecurityEventSeverity", { enumerable: true, get: function () { return security_1.SecurityEventSeverity; } });
// Logger Constants
var logger_1 = require("./types/logger");
Object.defineProperty(exports, "LogLevel", { enumerable: true, get: function () { return logger_1.LogLevel; } });
// ========================
// Utilities
// ========================
var utils_1 = require("./utils");
Object.defineProperty(exports, "calculateProratedAmount", { enumerable: true, get: function () { return utils_1.calculateProratedAmount; } });
Object.defineProperty(exports, "calculateAnnualPrice", { enumerable: true, get: function () { return utils_1.calculateAnnualPrice; } });
Object.defineProperty(exports, "SUBSCRIPTION_URLS", { enumerable: true, get: function () { return utils_1.SUBSCRIPTION_URLS; } });
var utils_2 = require("./utils");
Object.defineProperty(exports, "formatCurrency", { enumerable: true, get: function () { return utils_2.formatCurrency; } });
Object.defineProperty(exports, "formatPrice", { enumerable: true, get: function () { return utils_2.formatPrice; } });
Object.defineProperty(exports, "formatCompactCurrency", { enumerable: true, get: function () { return utils_2.formatCompactCurrency; } });
Object.defineProperty(exports, "formatPercentage", { enumerable: true, get: function () { return utils_2.formatPercentage; } });
Object.defineProperty(exports, "formatNumber", { enumerable: true, get: function () { return utils_2.formatNumber; } });
Object.defineProperty(exports, "formatCurrencyChange", { enumerable: true, get: function () { return utils_2.formatCurrencyChange; } });
Object.defineProperty(exports, "formatPercentageChange", { enumerable: true, get: function () { return utils_2.formatPercentageChange; } });
Object.defineProperty(exports, "getDashboardCurrency", { enumerable: true, get: function () { return utils_2.getDashboardCurrency; } });
Object.defineProperty(exports, "getDashboardPercentage", { enumerable: true, get: function () { return utils_2.getDashboardPercentage; } });
Object.defineProperty(exports, "getCollectionRateStatus", { enumerable: true, get: function () { return utils_2.getCollectionRateStatus; } });
Object.defineProperty(exports, "getIntervalSuffix", { enumerable: true, get: function () { return utils_2.getIntervalSuffix; } });
Object.defineProperty(exports, "formatPriceFromCents", { enumerable: true, get: function () { return utils_2.formatPriceFromCents; } });
Object.defineProperty(exports, "formatPriceWithInterval", { enumerable: true, get: function () { return utils_2.formatPriceWithInterval; } });
var utils_3 = require("./utils");
Object.defineProperty(exports, "createStandardError", { enumerable: true, get: function () { return utils_3.createStandardError; } });
Object.defineProperty(exports, "createValidationError", { enumerable: true, get: function () { return utils_3.createValidationError; } });
Object.defineProperty(exports, "createNetworkError", { enumerable: true, get: function () { return utils_3.createNetworkError; } });
Object.defineProperty(exports, "createBusinessLogicError", { enumerable: true, get: function () { return utils_3.createBusinessLogicError; } });
Object.defineProperty(exports, "classifyError", { enumerable: true, get: function () { return utils_3.classifyError; } });
Object.defineProperty(exports, "isRetryableError", { enumerable: true, get: function () { return utils_3.isRetryableError; } });
Object.defineProperty(exports, "getErrorLogLevel", { enumerable: true, get: function () { return utils_3.getErrorLogLevel; } });
Object.defineProperty(exports, "ERROR_TYPES", { enumerable: true, get: function () { return utils_3.ERROR_TYPES; } });
// Type adapter utilities (using utils barrel export for CI compatibility)
var utils_4 = require("./utils");
Object.defineProperty(exports, "createQueryAdapter", { enumerable: true, get: function () { return utils_4.createQueryAdapter; } });
Object.defineProperty(exports, "createMutationAdapter", { enumerable: true, get: function () { return utils_4.createMutationAdapter; } });
Object.defineProperty(exports, "createResponseAdapter", { enumerable: true, get: function () { return utils_4.createResponseAdapter; } });
Object.defineProperty(exports, "validateApiParams", { enumerable: true, get: function () { return utils_4.validateApiParams; } });
Object.defineProperty(exports, "validateEnumValue", { enumerable: true, get: function () { return utils_4.validateEnumValue; } });
Object.defineProperty(exports, "safeParseNumber", { enumerable: true, get: function () { return utils_4.safeParseNumber; } });
Object.defineProperty(exports, "safeParseDate", { enumerable: true, get: function () { return utils_4.safeParseDate; } });
Object.defineProperty(exports, "mergeApiParams", { enumerable: true, get: function () { return utils_4.mergeApiParams; } });
Object.defineProperty(exports, "createApiCall", { enumerable: true, get: function () { return utils_4.createApiCall; } });
Object.defineProperty(exports, "isValidQueryParam", { enumerable: true, get: function () { return utils_4.isValidQueryParam; } });
Object.defineProperty(exports, "isValidMutationData", { enumerable: true, get: function () { return utils_4.isValidMutationData; } });
Object.defineProperty(exports, "TypeAdapterError", { enumerable: true, get: function () { return utils_4.TypeAdapterError; } });
Object.defineProperty(exports, "handleAdapterError", { enumerable: true, get: function () { return utils_4.handleAdapterError; } });
var domain_1 = require("./types/domain");
// Classes and utilities
Object.defineProperty(exports, "BaseValueObject", { enumerable: true, get: function () { return domain_1.BaseValueObject; } });
Object.defineProperty(exports, "BaseEntity", { enumerable: true, get: function () { return domain_1.BaseEntity; } });
Object.defineProperty(exports, "BaseSpecification", { enumerable: true, get: function () { return domain_1.BaseSpecification; } });
Object.defineProperty(exports, "DomainResultClass", { enumerable: true, get: function () { return domain_1.Result; } });
Object.defineProperty(exports, "Money", { enumerable: true, get: function () { return domain_1.Money; } });
Object.defineProperty(exports, "Email", { enumerable: true, get: function () { return domain_1.Email; } });
Object.defineProperty(exports, "PhoneNumber", { enumerable: true, get: function () { return domain_1.PhoneNumber; } });
Object.defineProperty(exports, "Address", { enumerable: true, get: function () { return domain_1.Address; } });
Object.defineProperty(exports, "createId", { enumerable: true, get: function () { return domain_1.createId; } });
// Domain exceptions
Object.defineProperty(exports, "DomainError", { enumerable: true, get: function () { return domain_1.DomainError; } });
Object.defineProperty(exports, "ValidationError", { enumerable: true, get: function () { return domain_1.ValidationError; } });
Object.defineProperty(exports, "NotFoundError", { enumerable: true, get: function () { return domain_1.NotFoundError; } });
Object.defineProperty(exports, "ConflictError", { enumerable: true, get: function () { return domain_1.ConflictError; } });
Object.defineProperty(exports, "UnauthorizedError", { enumerable: true, get: function () { return domain_1.UnauthorizedError; } });
Object.defineProperty(exports, "ForbiddenError", { enumerable: true, get: function () { return domain_1.ForbiddenError; } });
Object.defineProperty(exports, "BusinessRuleValidationError", { enumerable: true, get: function () { return domain_1.BusinessRuleValidationError; } });
// ========================
// Utilities
// ========================
__exportStar(require("./utils"), exports);
// ========================
// Validation
// ========================
__exportStar(require("./validation"), exports);
//# sourceMappingURL=index.js.map