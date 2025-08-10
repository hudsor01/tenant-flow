/**
 * @repo/shared - Main export file
 *
 * This file exports commonly used types and utilities from the shared package.
 * More specific exports are available through the package.json exports map.
 */
// Export UserRole constants
export { USER_ROLE } from './constants/auth';
// Global type declarations (augmentations)
import './types/global';
export { getReminderTypeLabel, getReminderStatusLabel, getReminderStatusColor } from './types/reminders';
export { calculateYearlySavings, getStripeErrorMessage, validatePricingPlan } from './types/stripe-pricing';
export { 
// Constants
PLAN_TYPES, BILLING_PERIODS, SUBSCRIPTION_STATUSES, STRIPE_API_VERSIONS, STRIPE_ERROR_CODES, STRIPE_DECLINE_CODES, STRIPE_ERROR_CATEGORIES, STRIPE_ERROR_SEVERITIES, WEBHOOK_EVENT_TYPES, DEFAULT_STRIPE_RETRY_CONFIG, ERROR_CATEGORY_MAPPING, ERROR_SEVERITY_MAPPING, RETRYABLE_ERROR_CODES } from './types/stripe';
// ========================
// Stripe Type Guards
// ========================
export { StripeTypeGuards, 
// Individual guards for tree-shaking
isPlanType, isBillingPeriod, isSubscriptionStatus, isWebhookEventType, isStripeErrorCode, isStandardizedStripeError, isStripeWebhookEvent, isPaymentMethod, isUserSubscription, isPlanConfig, isStripeConfig, isRetryableError as isStripeRetryableError, isCardError, isRateLimitError, isInfrastructureError, isConfigurationError, isCriticalError, isStripeId, isStripeCustomerId, isStripeSubscriptionId, isStripePriceId } from './types/stripe-guards';
// ========================
// Stripe Utilities
// ========================
export { StripeUtils, 
// Individual utilities for tree-shaking
generateErrorId, getErrorCategory, getErrorSeverity, calculateRetryDelay, toClientSafeError, createStandardizedError, generateUserMessage, getPlanTypeFromPriceId, getBillingPeriodFromPriceId, formatPrice as formatStripePrice, calculateAnnualSavings as calculateStripeAnnualSavings, getPlanDisplayName, isActiveSubscription, isInGracePeriod, getSubscriptionStatusDisplay, getDaysUntilExpiry, getTrialDaysRemaining, sanitizeMetadata, generateIdempotencyKey } from './types/stripe-utils';
export { PLAN_TYPE, STRIPE_ERRORS, getPlanTypeLabel } from './types/billing';
// ========================
// Pricing Configuration
// ========================
export { PRODUCT_TIERS, getProductTier, getStripePriceId, hasTrial, getTrialConfig, checkPlanLimits, getRecommendedUpgrade, calculateAnnualSavings } from './config/pricing';
export { leaseFormSchema } from './types/lease-generator';
// ========================
// Constants
// ========================
export * from './constants';
export { TENANT_STATUS } from './constants/tenants';
export { REMINDER_TYPE, REMINDER_STATUS } from './constants/reminders';
// ========================
// Security Types
// ========================
export { SecurityEventType, SecurityEventSeverity as SecuritySeverity, SecurityEventSeverity } from './types/security';
// Export LogLevel const object
export { LogLevel } from './types/logger';
// ========================
// Utilities
// ========================
export { calculateProratedAmount, calculateAnnualPrice, SUBSCRIPTION_URLS } from './utils';
export { formatCurrency, formatPrice, formatCompactCurrency, formatPercentage, formatNumber, formatCurrencyChange, formatPercentageChange, getDashboardCurrency, getDashboardPercentage, getCollectionRateStatus, getIntervalSuffix, formatPriceFromCents, formatPriceWithInterval } from './utils';
export { createStandardError, createValidationError, createNetworkError, createBusinessLogicError, classifyError, isRetryableError, getErrorLogLevel, ERROR_TYPES } from './utils';
// Type adapter utilities (using utils barrel export for CI compatibility)
export { createQueryAdapter, createMutationAdapter, createResponseAdapter, validateApiParams, validateEnumValue, safeParseNumber, safeParseDate, mergeApiParams, createApiCall, isValidQueryParam, isValidMutationData, TypeAdapterError, handleAdapterError } from './utils';
export { 
// Classes and utilities
BaseValueObject, BaseEntity, BaseSpecification, Result as DomainResultClass, Money, Email, PhoneNumber, Address, createId, 
// Domain exceptions
DomainError, ValidationError, NotFoundError, ConflictError, UnauthorizedError, ForbiddenError, BusinessRuleValidationError } from './types/domain';
// ========================
// Utilities
// ========================
export * from './utils';
// ========================
// Validation
// ========================
export * from './validation';
//# sourceMappingURL=index.js.map