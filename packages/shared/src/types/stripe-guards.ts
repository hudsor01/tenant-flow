/**
 * Stripe Type Guards
 * 
 * Runtime type validation utilities for Stripe types.
 * Provides type-safe guards for validating Stripe objects at runtime.
 * 
 * @fileoverview Type guards for all Stripe-related types
 */

import {
  PlanType,
  PLAN_TYPES,
  BillingPeriod,
  BILLING_PERIODS,
  SubscriptionStatus,
  SUBSCRIPTION_STATUSES,
  WebhookEventType,
  WEBHOOK_EVENT_TYPES,
  StripeErrorCode,
  STRIPE_ERROR_CODES,
  StripeDeclineCode,
  STRIPE_DECLINE_CODES,
  StripeErrorCategory,
  STRIPE_ERROR_CATEGORIES,
  StripeErrorSeverity,
  STRIPE_ERROR_SEVERITIES,
  StripeApiVersion,
  STRIPE_API_VERSIONS,
  StandardizedStripeError,
  StripeWebhookEvent,
  PaymentMethod,
  UserSubscription,
  PlanConfig,
  UsageMetrics,
  StripeConfig,
  CreateCheckoutSessionParams,
  CreatePortalSessionParams,
  StripeSuccessResponse,
  StripeErrorResponse,
  RETRYABLE_ERROR_CODES
} from './stripe'

// ========================
// Primitive Type Guards
// ========================

/**
 * Check if value is a valid PlanType
 */
export function isPlanType(value: unknown): value is PlanType {
  return typeof value === 'string' && Object.values(PLAN_TYPES).includes(value as PlanType)
}

/**
 * Check if value is a valid BillingPeriod
 */
export function isBillingPeriod(value: unknown): value is BillingPeriod {
  return typeof value === 'string' && Object.values(BILLING_PERIODS).includes(value as BillingPeriod)
}

/**
 * Check if value is a valid SubscriptionStatus
 */
export function isSubscriptionStatus(value: unknown): value is SubscriptionStatus {
  return typeof value === 'string' && Object.values(SUBSCRIPTION_STATUSES).includes(value as SubscriptionStatus)
}

/**
 * Check if value is a valid WebhookEventType
 */
export function isWebhookEventType(value: unknown): value is WebhookEventType {
  return typeof value === 'string' && Object.values(WEBHOOK_EVENT_TYPES).includes(value as WebhookEventType)
}

/**
 * Check if value is a valid StripeErrorCode
 */
export function isStripeErrorCode(value: unknown): value is StripeErrorCode {
  return typeof value === 'string' && Object.values(STRIPE_ERROR_CODES).includes(value as StripeErrorCode)
}

/**
 * Check if value is a valid StripeDeclineCode
 */
export function isStripeDeclineCode(value: unknown): value is StripeDeclineCode {
  return typeof value === 'string' && Object.values(STRIPE_DECLINE_CODES).includes(value as StripeDeclineCode)
}

/**
 * Check if value is a valid StripeErrorCategory
 */
export function isStripeErrorCategory(value: unknown): value is StripeErrorCategory {
  return typeof value === 'string' && Object.values(STRIPE_ERROR_CATEGORIES).includes(value as StripeErrorCategory)
}

/**
 * Check if value is a valid StripeErrorSeverity
 */
export function isStripeErrorSeverity(value: unknown): value is StripeErrorSeverity {
  return typeof value === 'string' && Object.values(STRIPE_ERROR_SEVERITIES).includes(value as StripeErrorSeverity)
}

/**
 * Check if value is a valid StripeApiVersion
 */
export function isStripeApiVersion(value: unknown): value is StripeApiVersion {
  return typeof value === 'string' && Object.values(STRIPE_API_VERSIONS).includes(value as StripeApiVersion)
}

// ========================
// Complex Type Guards
// ========================

/**
 * Check if value is a valid StandardizedStripeError
 */
export function isStandardizedStripeError(value: unknown): value is StandardizedStripeError {
  if (!value || typeof value !== 'object') return false
  
  const error = value as Record<string, unknown>
  
  return (
    isStripeErrorCode(error.code) &&
    typeof error.message === 'string' &&
    typeof error.userMessage === 'string' &&
    typeof error.errorId === 'string' &&
    isStripeErrorCategory(error.category) &&
    isStripeErrorSeverity(error.severity) &&
    typeof error.retryable === 'boolean' &&
    typeof error.context === 'object' &&
    error.context !== null
  )
}

/**
 * Check if value is a valid StripeWebhookEvent
 */
export function isStripeWebhookEvent(value: unknown): value is StripeWebhookEvent {
  if (!value || typeof value !== 'object') return false
  
  const event = value as Record<string, unknown>
  
  return (
    typeof event.id === 'string' &&
    event.object === 'event' &&
    typeof event.api_version === 'string' &&
    typeof event.created === 'number' &&
    typeof event.data === 'object' &&
    event.data !== null &&
    typeof event.livemode === 'boolean' &&
    typeof event.pending_webhooks === 'number' &&
    typeof event.request === 'object' &&
    event.request !== null &&
    isWebhookEventType(event.type)
  )
}

/**
 * Check if value is a valid PaymentMethod
 */
export function isPaymentMethod(value: unknown): value is PaymentMethod {
  if (!value || typeof value !== 'object') return false
  
  const pm = value as Record<string, unknown>
  
  return (
    typeof pm.id === 'string' &&
    pm.object === 'payment_method' &&
    typeof pm.type === 'string' &&
    typeof pm.created === 'number' &&
    typeof pm.livemode === 'boolean' &&
    typeof pm.metadata === 'object' &&
    pm.metadata !== null &&
    typeof pm.billing_details === 'object' &&
    pm.billing_details !== null
  )
}

/**
 * Check if value is a valid UserSubscription
 */
export function isUserSubscription(value: unknown): value is UserSubscription {
  if (!value || typeof value !== 'object') return false
  
  const sub = value as Record<string, unknown>
  
  return (
    typeof sub.id === 'string' &&
    typeof sub.userId === 'string' &&
    isPlanType(sub.planType) &&
    isSubscriptionStatus(sub.status) &&
    isBillingPeriod(sub.billingPeriod) &&
    typeof sub.cancelAtPeriodEnd === 'boolean' &&
    sub.createdAt instanceof Date &&
    sub.updatedAt instanceof Date
  )
}

/**
 * Check if value is a valid PlanConfig
 */
export function isPlanConfig(value: unknown): value is PlanConfig {
  if (!value || typeof value !== 'object') return false
  
  const plan = value as Record<string, unknown>
  
  return (
    isPlanType(plan.id) &&
    typeof plan.name === 'string' &&
    typeof plan.description === 'string' &&
    typeof plan.price === 'object' &&
    plan.price !== null &&
    Array.isArray(plan.features) &&
    typeof plan.limits === 'object' &&
    plan.limits !== null &&
    typeof plan.priority === 'boolean' &&
    typeof plan.stripeIds === 'object' &&
    plan.stripeIds !== null
  )
}

/**
 * Check if value is a valid UsageMetrics
 */
export function isUsageMetrics(value: unknown): value is UsageMetrics {
  if (!value || typeof value !== 'object') return false
  
  const usage = value as Record<string, unknown>
  
  return (
    typeof usage.properties === 'number' &&
    typeof usage.tenants === 'number' &&
    typeof usage.leases === 'number' &&
    typeof usage.storageUsedMB === 'number' &&
    typeof usage.apiCallsCount === 'number' &&
    typeof usage.leaseGenerationsCount === 'number' &&
    typeof usage.month === 'string' &&
    /^\d{4}-\d{2}$/.test(usage.month as string)
  )
}

/**
 * Check if value is a valid StripeConfig
 */
export function isStripeConfig(value: unknown): value is StripeConfig {
  if (!value || typeof value !== 'object') return false
  
  const config = value as Record<string, unknown>
  
  return (
    typeof config.secretKey === 'string' &&
    typeof config.publishableKey === 'string' &&
    typeof config.webhookSecret === 'string' &&
    isStripeApiVersion(config.apiVersion) &&
    typeof config.automaticTax === 'boolean' &&
    typeof config.defaultTrialDays === 'number' &&
    (config.environment === 'test' || config.environment === 'live')
  )
}

/**
 * Check if value is a valid CreateCheckoutSessionParams
 */
export function isCreateCheckoutSessionParams(value: unknown): value is CreateCheckoutSessionParams {
  if (!value || typeof value !== 'object') return false
  
  const params = value as Record<string, unknown>
  
  return (
    typeof params.userId === 'string' &&
    isPlanType(params.planType) &&
    isBillingPeriod(params.billingInterval) &&
    typeof params.successUrl === 'string' &&
    typeof params.cancelUrl === 'string'
  )
}

/**
 * Check if value is a valid CreatePortalSessionParams
 */
export function isCreatePortalSessionParams(value: unknown): value is CreatePortalSessionParams {
  if (!value || typeof value !== 'object') return false
  
  const params = value as Record<string, unknown>
  
  return (
    typeof params.customerId === 'string' &&
    typeof params.returnUrl === 'string'
  )
}

/**
 * Check if value is a valid StripeSuccessResponse
 */
export function isStripeSuccessResponse<T>(value: unknown): value is StripeSuccessResponse<T> {
  if (!value || typeof value !== 'object') return false
  
  const response = value as Record<string, unknown>
  
  return (
    response.success === true &&
    'data' in response
  )
}

/**
 * Check if value is a valid StripeErrorResponse
 */
export function isStripeErrorResponse(value: unknown): value is StripeErrorResponse {
  if (!value || typeof value !== 'object') return false
  
  const response = value as Record<string, unknown>
  
  return (
    response.success === false &&
    typeof response.error === 'object' &&
    response.error !== null
  )
}

// ========================
// Error Classification Guards
// ========================

/**
 * Check if error is retryable based on error code
 */
export function isRetryableError(error: StandardizedStripeError): boolean {
  return RETRYABLE_ERROR_CODES.includes(error.code)
}

/**
 * Check if error is a card error
 */
export function isCardError(error: StandardizedStripeError): boolean {
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
  ] as const
  
  return cardErrorCodes.includes(error.code as typeof cardErrorCodes[number])
}

/**
 * Check if error is a rate limit error
 */
export function isRateLimitError(error: StandardizedStripeError): boolean {
  return error.code === STRIPE_ERROR_CODES.RATE_LIMIT
}

/**
 * Check if error is an infrastructure error
 */
export function isInfrastructureError(error: StandardizedStripeError): boolean {
  return error.category === STRIPE_ERROR_CATEGORIES.INFRASTRUCTURE
}

/**
 * Check if error is a configuration error
 */
export function isConfigurationError(error: StandardizedStripeError): boolean {
  return error.category === STRIPE_ERROR_CATEGORIES.CONFIGURATION
}

/**
 * Check if error is critical severity
 */
export function isCriticalError(error: StandardizedStripeError): boolean {
  return error.severity === STRIPE_ERROR_SEVERITIES.CRITICAL
}

/**
 * Check if error requires user action
 */
export function requiresUserAction(error: StandardizedStripeError): boolean {
  const userActionErrorCodes = [
    STRIPE_ERROR_CODES.CARD_DECLINED,
    STRIPE_ERROR_CODES.EXPIRED_CARD,
    STRIPE_ERROR_CODES.INCORRECT_CVC,
    STRIPE_ERROR_CODES.INSUFFICIENT_FUNDS
  ] as const
  
  return userActionErrorCodes.includes(error.code as typeof userActionErrorCodes[number])
}

// ========================
// Stripe Object Guards
// ========================

/**
 * Check if value looks like a Stripe ID
 */
export function isStripeId(value: unknown, prefix?: string): value is string {
  if (typeof value !== 'string') return false
  
  // All Stripe IDs start with a prefix followed by underscore
  if (!value.includes('_')) return false
  
  if (prefix) {
    return value.startsWith(prefix + '_')
  }
  
  // Common Stripe ID prefixes
  const commonPrefixes = [
    'acct', 'ba', 'card', 'ch', 'cus', 'evt', 'fee', 'file', 'ic', 'in', 'inv',
    'pi', 'pm', 'po', 'prod', 'py', 'req', 'rp', 'si', 'src', 'sub', 'tok',
    'tr', 'txn', 'cs', 'price', 'whsec', 'sk', 'pk', 'rk'
  ]
  
  return commonPrefixes.some(prefix => value.startsWith(prefix + '_'))
}

/**
 * Check if value is a Stripe customer ID
 */
export function isStripeCustomerId(value: unknown): value is string {
  return isStripeId(value, 'cus')
}

/**
 * Check if value is a Stripe subscription ID
 */
export function isStripeSubscriptionId(value: unknown): value is string {
  return isStripeId(value, 'sub')
}

/**
 * Check if value is a Stripe price ID
 */
export function isStripePriceId(value: unknown): value is string {
  return isStripeId(value, 'price')
}

/**
 * Check if value is a Stripe payment method ID
 */
export function isStripePaymentMethodId(value: unknown): value is string {
  return isStripeId(value, 'pm')
}

/**
 * Check if value is a Stripe checkout session ID
 */
export function isStripeCheckoutSessionId(value: unknown): value is string {
  return isStripeId(value, 'cs')
}

/**
 * Check if value is a Stripe invoice ID
 */
export function isStripeInvoiceId(value: unknown): value is string {
  return isStripeId(value, 'in')
}

/**
 * Check if value is a Stripe webhook secret
 */
export function isStripeWebhookSecret(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('whsec_')
}

/**
 * Check if value is a Stripe API key (secret)
 */
export function isStripeSecretKey(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('sk_')
}

/**
 * Check if value is a Stripe publishable key
 */
export function isStripePublishableKey(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('pk_')
}

// ========================
// Validation Utilities
// ========================

/**
 * Validate email format for Stripe operations
 */
export function isValidEmail(value: unknown): value is string {
  if (typeof value !== 'string') return false
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(value)
}

/**
 * Validate currency code (3-letter ISO)
 */
export function isValidCurrency(value: unknown): value is string {
  if (typeof value !== 'string') return false
  
  return /^[A-Z]{3}$/.test(value.toUpperCase()) && value.length === 3
}

/**
 * Validate amount in cents (must be positive integer)
 */
export function isValidAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

/**
 * Validate URL format
 */
export function isValidUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

/**
 * Validate metadata object (string keys and values)
 */
export function isValidMetadata(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== 'object') return false
  
  const metadata = value as Record<string, unknown>
  
  return Object.entries(metadata).every(
    ([key, val]) => typeof key === 'string' && typeof val === 'string'
  )
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
} as const