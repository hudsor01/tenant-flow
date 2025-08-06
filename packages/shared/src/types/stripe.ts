/**
 * Unified Stripe Type System
 *
 * Comprehensive type definitions for all Stripe-related functionality across TenantFlow.
 * This file serves as the single source of truth for Stripe types, eliminating duplication
 * and ensuring type safety across frontend and backend.
 *
 * @fileoverview Consolidates types from billing.ts, stripe-unified.ts, and local definitions
 */

// Essential Stripe interfaces for type compatibility
// This allows the shared package to compile without requiring stripe as a dependency
export interface StripeError {
  type: string
  message: string
  code?: string
  decline_code?: string
  param?: string
}

export interface StripeEvent {
  id: string
  object: 'event'
  api_version: string
  created: number
  data: {
    object: Record<string, unknown>
    previous_attributes?: Record<string, unknown>
  }
  livemode: boolean
  pending_webhooks: number
  request: {
    id: string | null
    idempotency_key: string | null
  }
  type: string
}

export interface StripeCustomer {
  id: string
  object: 'customer'
  created: number
  email: string | null
  livemode: boolean
  metadata: Record<string, string>
}

export interface StripeSubscription {
  id: string
  object: 'subscription'
  created: number
  customer: string
  status: string
  livemode: boolean
  metadata: Record<string, string>
}

export interface StripePaymentMethod {
  id: string
  object: 'payment_method'
  type: string
  created: number
  customer: string | null
  livemode: boolean
  metadata: Record<string, string>
}

export interface StripeCheckoutSession {
  id: string
  object: 'checkout.session'
  created: number
  customer: string | null
  livemode: boolean
  metadata: Record<string, string>
  mode: string
  status: string | null
  url: string | null
}

export interface StripeCustomerCreateParams {
  email?: string
  name?: string
  metadata?: Record<string, string>
}

// Legacy compatibility aliases for code that uses the old Stripe namespace
// Use these instead of the global Stripe namespace for better type safety
export type LegacyStripeError = StripeError
export type LegacyStripeEvent = StripeEvent
export type LegacyStripeCustomer = StripeCustomer
export type LegacyStripeSubscription = StripeSubscription
export type LegacyStripePaymentMethod = StripePaymentMethod
export type LegacyStripeCustomerCreateParams = StripeCustomerCreateParams
export type LegacyStripeCheckoutSession = StripeCheckoutSession

// ========================
// Core Stripe Constants
// ========================

/**
 * Supported Stripe API versions
 * These should be kept in sync with Stripe's latest stable versions
 */
export const STRIPE_API_VERSIONS = {
  CURRENT: '2024-06-20',
  BETA: '2025-06-30.basil',
  LEGACY: '2023-10-16'
} as const

export type StripeApiVersion = typeof STRIPE_API_VERSIONS[keyof typeof STRIPE_API_VERSIONS]

/**
 * Comprehensive Stripe error codes mapping
 * Based on official Stripe error documentation
 */
export const STRIPE_ERROR_CODES = {
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
} as const

export type StripeErrorCode = typeof STRIPE_ERROR_CODES[keyof typeof STRIPE_ERROR_CODES]

/**
 * Stripe decline codes for detailed payment failure analysis
 */
export const STRIPE_DECLINE_CODES = {
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
} as const

export type StripeDeclineCode = typeof STRIPE_DECLINE_CODES[keyof typeof STRIPE_DECLINE_CODES]

// ========================
// Plan and Subscription Types
// ========================

/**
 * Application plan types
 * These correspond to the business tiers offered by TenantFlow
 */
export const PLAN_TYPES = {
  FREETRIAL: 'FREETRIAL',
  STARTER: 'STARTER',
  GROWTH: 'GROWTH',
  TENANTFLOW_MAX: 'TENANTFLOW_MAX'
} as const

export type PlanType = typeof PLAN_TYPES[keyof typeof PLAN_TYPES]

/**
 * Billing periods supported by the application
 */
export const BILLING_PERIODS = {
  MONTHLY: 'monthly',
  ANNUAL: 'annual'
} as const

export type BillingPeriod = typeof BILLING_PERIODS[keyof typeof BILLING_PERIODS]

/**
 * Subscription statuses aligned with Stripe's subscription status values
 */
export const SUBSCRIPTION_STATUSES = {
  INCOMPLETE: 'incomplete',
  INCOMPLETE_EXPIRED: 'incomplete_expired',
  TRIALING: 'trialing',
  ACTIVE: 'active',
  PAST_DUE: 'past_due',
  CANCELED: 'canceled',
  UNPAID: 'unpaid',
  PAUSED: 'paused'
} as const

export type SubscriptionStatus = typeof SUBSCRIPTION_STATUSES[keyof typeof SUBSCRIPTION_STATUSES]

/**
 * Plan configuration interface with comprehensive metadata
 */
export interface PlanConfig {
  readonly id: PlanType
  readonly name: string
  readonly description: string
  readonly price: {
    readonly monthly: number
    readonly annual: number
  }
  readonly features: readonly string[]
  readonly limits: {
    readonly properties: number
    readonly tenants: number
    readonly storage: number // in MB
    readonly apiCalls: number // per month
  }
  readonly priority: boolean
  readonly isPopular?: boolean
  readonly stripeIds: {
    readonly monthlyPriceId: string | null
    readonly annualPriceId: string | null
    readonly productId: string | null
  }
}

/**
 * User subscription data with full context
 */
export interface UserSubscription {
  readonly id: string
  readonly userId: string
  readonly planType: PlanType
  readonly status: SubscriptionStatus
  readonly billingPeriod: BillingPeriod
  readonly stripeCustomerId: string | null
  readonly stripeSubscriptionId: string | null
  readonly stripePriceId: string | null
  readonly currentPeriodStart: Date | null
  readonly currentPeriodEnd: Date | null
  readonly trialStart: Date | null
  readonly trialEnd: Date | null
  readonly cancelAtPeriodEnd: boolean
  readonly canceledAt: Date | null
  readonly createdAt: Date
  readonly updatedAt: Date
}

// ========================
// Webhook Event Types
// ========================

/**
 * Comprehensive webhook event types that TenantFlow handles
 */
export const WEBHOOK_EVENT_TYPES = {
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
} as const

export type WebhookEventType = typeof WEBHOOK_EVENT_TYPES[keyof typeof WEBHOOK_EVENT_TYPES]

/**
 * Standardized webhook event structure
 */
export interface StripeWebhookEvent {
  readonly id: string
  readonly object: 'event'
  readonly api_version: string
  readonly created: number
  readonly data: {
    readonly object: Record<string, unknown>
    readonly previous_attributes?: Record<string, unknown>
  }
  readonly livemode: boolean
  readonly pending_webhooks: number
  readonly request: {
    readonly id: string | null
    readonly idempotency_key: string | null
  }
  readonly type: WebhookEventType
}

/**
 * Type-safe webhook event handlers
 * Using StripeEvent for better compatibility across environments
 */
export interface WebhookEventHandlers {
  [WEBHOOK_EVENT_TYPES.CUSTOMER_CREATED]: (event: StripeEvent) => Promise<void>
  [WEBHOOK_EVENT_TYPES.CUSTOMER_UPDATED]: (event: StripeEvent) => Promise<void>
  [WEBHOOK_EVENT_TYPES.CUSTOMER_DELETED]: (event: StripeEvent) => Promise<void>
  [WEBHOOK_EVENT_TYPES.SUBSCRIPTION_CREATED]: (event: StripeEvent) => Promise<void>
  [WEBHOOK_EVENT_TYPES.SUBSCRIPTION_UPDATED]: (event: StripeEvent) => Promise<void>
  [WEBHOOK_EVENT_TYPES.SUBSCRIPTION_DELETED]: (event: StripeEvent) => Promise<void>
  [WEBHOOK_EVENT_TYPES.SUBSCRIPTION_TRIAL_WILL_END]: (event: StripeEvent) => Promise<void>
  [WEBHOOK_EVENT_TYPES.SUBSCRIPTION_PAUSED]: (event: StripeEvent) => Promise<void>
  [WEBHOOK_EVENT_TYPES.SUBSCRIPTION_RESUMED]: (event: StripeEvent) => Promise<void>
  [WEBHOOK_EVENT_TYPES.INVOICE_CREATED]: (event: StripeEvent) => Promise<void>
  [WEBHOOK_EVENT_TYPES.INVOICE_FINALIZED]: (event: StripeEvent) => Promise<void>
  [WEBHOOK_EVENT_TYPES.INVOICE_PAYMENT_SUCCEEDED]: (event: StripeEvent) => Promise<void>
  [WEBHOOK_EVENT_TYPES.INVOICE_PAYMENT_FAILED]: (event: StripeEvent) => Promise<void>
  [WEBHOOK_EVENT_TYPES.INVOICE_UPCOMING]: (event: StripeEvent) => Promise<void>
  [WEBHOOK_EVENT_TYPES.PAYMENT_INTENT_CREATED]: (event: StripeEvent) => Promise<void>
  [WEBHOOK_EVENT_TYPES.PAYMENT_INTENT_SUCCEEDED]: (event: StripeEvent) => Promise<void>
  [WEBHOOK_EVENT_TYPES.PAYMENT_INTENT_PAYMENT_FAILED]: (event: StripeEvent) => Promise<void>
  [WEBHOOK_EVENT_TYPES.CHECKOUT_SESSION_COMPLETED]: (event: StripeEvent) => Promise<void>
  [WEBHOOK_EVENT_TYPES.CHECKOUT_SESSION_EXPIRED]: (event: StripeEvent) => Promise<void>
  [WEBHOOK_EVENT_TYPES.SETUP_INTENT_SUCCEEDED]: (event: StripeEvent) => Promise<void>
  [WEBHOOK_EVENT_TYPES.SETUP_INTENT_SETUP_FAILED]: (event: StripeEvent) => Promise<void>
}

// ========================
// Configuration Types
// ========================

/**
 * Unified Stripe configuration interface
 */
export interface StripeConfig {
  readonly secretKey: string
  readonly publishableKey: string
  readonly webhookSecret: string
  readonly apiVersion: StripeApiVersion
  readonly automaticTax: boolean
  readonly defaultTrialDays: number
  readonly environment: 'test' | 'live'
}

/**
 * Environment-specific configuration
 */
export interface StripeEnvironmentConfig extends StripeConfig {
  readonly isDevelopment: boolean
  readonly isProduction: boolean
  readonly isTest: boolean
  readonly webhookEndpoint: string
}

/**
 * Plan price ID configuration for all tiers
 */
export interface StripePlanPriceIds {
  readonly starter: {
    readonly monthly: string
    readonly annual: string
  }
  readonly growth: {
    readonly monthly: string
    readonly annual: string
  }
  readonly tenantflow_max: {
    readonly monthly: string
    readonly annual: string
  }
}

// ========================
// Error Handling Types
// ========================

/**
 * Error categories for systematic error handling
 */
export const STRIPE_ERROR_CATEGORIES = {
  PAYMENT_METHOD: 'payment_method',
  INFRASTRUCTURE: 'infrastructure',
  CLIENT_ERROR: 'client_error',
  STRIPE_SERVICE: 'stripe_service',
  CONFIGURATION: 'configuration',
  UNKNOWN: 'unknown'
} as const

export type StripeErrorCategory = typeof STRIPE_ERROR_CATEGORIES[keyof typeof STRIPE_ERROR_CATEGORIES]

/**
 * Error severity levels for alerting and monitoring
 */
export const STRIPE_ERROR_SEVERITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
} as const

export type StripeErrorSeverity = typeof STRIPE_ERROR_SEVERITIES[keyof typeof STRIPE_ERROR_SEVERITIES]

/**
 * Comprehensive error context for debugging and analytics
 */
export interface StripeErrorContext {
  readonly operation: string
  readonly resource: string
  readonly userId?: string
  readonly requestId?: string
  readonly metadata?: Record<string, unknown>
  readonly timestamp: Date
}

/**
 * Standardized error structure with full context
 */
export interface StandardizedStripeError {
  readonly code: StripeErrorCode
  readonly message: string
  readonly userMessage: string
  readonly details?: string
  readonly errorId: string
  readonly category: StripeErrorCategory
  readonly severity: StripeErrorSeverity
  readonly retryable: boolean
  readonly retryAfter?: number
  readonly stripeErrorType?: string
  readonly httpStatusCode?: number
  readonly context: StripeErrorContext
}

/**
 * Retry configuration for error recovery
 */
export interface StripeRetryConfig {
  readonly maxAttempts: number
  readonly baseDelayMs: number
  readonly maxDelayMs: number
  readonly exponentialBase: number
  readonly jitterMs: number
}

/**
 * Error analytics for monitoring and alerting
 */
export interface StripeErrorAnalytics {
  readonly category: StripeErrorCategory
  readonly severity: StripeErrorSeverity
  readonly actionRequired: boolean
  readonly escalateToStripe: boolean
  readonly affectedUsers: number
  readonly errorRate: number
  readonly avgResponseTime: number
}

// ========================
// API Request/Response Types
// ========================

/**
 * Checkout session creation parameters
 */
export interface CreateCheckoutSessionParams {
  readonly userId: string
  readonly planType: PlanType
  readonly billingInterval: BillingPeriod
  readonly successUrl: string
  readonly cancelUrl: string
  readonly priceId?: string
  readonly mode?: 'payment' | 'subscription' | 'setup'
  readonly currency?: string
  readonly locale?: string
  readonly collectPaymentMethod?: boolean
  readonly uiMode?: 'embedded' | 'hosted'
  readonly metadata?: Record<string, string>
}

/**
 * Customer portal session parameters
 */
export interface CreatePortalSessionParams {
  readonly customerId: string
  readonly returnUrl: string
  readonly configuration?: string
}

/**
 * Subscription management parameters
 */
export interface UpdateSubscriptionParams {
  readonly userId: string
  readonly newPriceId: string
  readonly prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice'
  readonly prorationDate?: Date
}

/**
 * Invoice preview parameters
 */
export interface PreviewInvoiceParams {
  readonly userId: string
  readonly newPriceId: string
  readonly prorationDate?: Date
}

/**
 * Subscription creation request
 */
export interface CreateSubscriptionRequest {
  readonly planType: PlanType
  readonly billingPeriod: BillingPeriod
  readonly paymentMethodId?: string
  readonly metadata?: Record<string, string>
}

/**
 * Subscription creation response
 */
export interface CreateSubscriptionResponse {
  readonly subscription: UserSubscription
  readonly clientSecret?: string
  readonly requiresPaymentMethod: boolean
  readonly success: boolean
}

// ========================
// Payment Method Types
// ========================

/**
 * Simplified payment method interface for cross-platform usage
 */
export interface PaymentMethod {
  readonly id: string
  readonly object: 'payment_method'
  readonly type: string
  readonly created: number
  readonly customer: string | null
  readonly livemode: boolean
  readonly metadata: Record<string, string>
  readonly card?: {
    readonly brand: string
    readonly last4: string
    readonly exp_month: number
    readonly exp_year: number
    readonly funding: string
    readonly country: string | null
  }
  readonly billing_details: {
    readonly address: {
      readonly city: string | null
      readonly country: string | null
      readonly line1: string | null
      readonly line2: string | null
      readonly postal_code: string | null
      readonly state: string | null
    }
    readonly email: string | null
    readonly name: string | null
    readonly phone: string | null
  }
}

/**
 * Payment method error with detailed context
 */
export interface PaymentMethodError {
  readonly code: StripeErrorCode
  readonly declineCode?: StripeDeclineCode
  readonly userMessage: string
  readonly retryable: boolean
  readonly suggestedActions: readonly string[]
}

// ========================
// Usage and Billing Types
// ========================

/**
 * Usage metrics for plan enforcement
 */
export interface UsageMetrics {
  readonly properties: number
  readonly tenants: number
  readonly leases: number
  readonly storageUsedMB: number
  readonly apiCallsCount: number
  readonly leaseGenerationsCount: number
  readonly month: string // YYYY-MM format
}

/**
 * Plan limits for subscription enforcement
 */
export interface PlanLimits {
  readonly properties: number
  readonly tenants: number
  readonly storage: number
  readonly apiCalls: number
}

/**
 * Limit check results
 */
export interface LimitChecks {
  readonly propertiesExceeded: boolean
  readonly tenantsExceeded: boolean
  readonly storageExceeded: boolean
  readonly apiCallsExceeded: boolean
}

/**
 * Complete usage data with limits
 */
export interface UsageData extends UsageMetrics {
  readonly limits: PlanLimits | null
  readonly limitChecks: LimitChecks | null
}

/**
 * Invoice information
 */
export interface Invoice {
  readonly id: string
  readonly userId: string
  readonly subscriptionId: string | null
  readonly stripeInvoiceId: string
  readonly amountPaid: number
  readonly amountDue: number
  readonly currency: string
  readonly status: string
  readonly invoiceDate: Date
  readonly dueDate: Date | null
  readonly paidAt: Date | null
  readonly invoiceUrl: string | null
  readonly invoicePdf: string | null
  readonly description: string | null
  readonly createdAt: Date
  readonly updatedAt: Date
}

/**
 * Billing history event for audit trail
 */
export interface BillingHistoryEvent {
  readonly id: string
  readonly userId: string
  readonly type: 'subscription_created' | 'subscription_updated' | 'subscription_canceled' | 'payment_succeeded' | 'payment_failed' | 'invoice_created'
  readonly description: string
  readonly amount?: number
  readonly currency?: string
  readonly stripeEventId?: string
  readonly metadata?: Record<string, string | number | boolean>
  readonly createdAt: Date
}

// ========================
// API Response Types
// ========================

/**
 * Standardized success response wrapper
 */
export interface StripeSuccessResponse<T = unknown> {
  readonly success: true
  readonly data: T
  readonly metadata?: {
    readonly requestId?: string
    readonly timestamp: string
    readonly operation: string
    readonly resource: string
  }
}

/**
 * Standardized error response wrapper
 */
export interface StripeErrorResponse {
  readonly success: false
  readonly error: {
    readonly code: StripeErrorCode
    readonly message: string
    readonly userMessage: string
    readonly errorId: string
    readonly details?: string
    readonly retryable: boolean
    readonly retryAfter?: number
    readonly analytics?: StripeErrorAnalytics
  }
  readonly metadata?: {
    readonly requestId?: string
    readonly timestamp: string
    readonly operation: string
    readonly resource: string
  }
}

/**
 * Union type for all Stripe API responses
 */
export type StripeApiResponse<T = unknown> = StripeSuccessResponse<T> | StripeErrorResponse

/**
 * Client-safe error interface (no sensitive details)
 */
export interface ClientSafeStripeError {
  readonly code: StripeErrorCode
  readonly userMessage: string
  readonly retryable: boolean
  readonly retryAfter?: number
  readonly errorId: string
  readonly category: StripeErrorCategory
  readonly severity: StripeErrorSeverity
}

// ========================
// Frontend Integration Types
// ========================

/**
 * Stripe Element event types for React components
 */
export interface StripeElementEvent {
  readonly elementType: string
  readonly empty: boolean
  readonly complete: boolean
  readonly error?: {
    readonly type: string
    readonly code: string
    readonly message: string
  }
}

/**
 * Card Element specific event
 */
export interface StripeCardElementEvent extends StripeElementEvent {
  readonly brand?: string
  readonly country?: string
}

/**
 * Payment Element specific event
 */
export interface StripePaymentElementEvent extends StripeElementEvent {
  readonly value?: {
    readonly type: string
  }
}

/**
 * Event callback types for React components
 */
export type StripeElementEventCallback = (event: StripeElementEvent) => void
export type StripeCardElementEventCallback = (event: StripeCardElementEvent) => void
export type StripePaymentElementEventCallback = (event: StripePaymentElementEvent) => void

// ========================
// Constants Export
// ========================

/**
 * Default retry configuration
 */
export const DEFAULT_STRIPE_RETRY_CONFIG: StripeRetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  exponentialBase: 2,
  jitterMs: 100
} as const

/**
 * Error categorization mapping
 */
export const ERROR_CATEGORY_MAPPING: Record<StripeErrorCode, StripeErrorCategory> = {
  [STRIPE_ERROR_CODES.CARD_DECLINED]: STRIPE_ERROR_CATEGORIES.PAYMENT_METHOD,
  [STRIPE_ERROR_CODES.EXPIRED_CARD]: STRIPE_ERROR_CATEGORIES.PAYMENT_METHOD,
  [STRIPE_ERROR_CODES.INCORRECT_CVC]: STRIPE_ERROR_CATEGORIES.PAYMENT_METHOD,
  [STRIPE_ERROR_CODES.INCORRECT_NUMBER]: STRIPE_ERROR_CATEGORIES.PAYMENT_METHOD,
  [STRIPE_ERROR_CODES.INSUFFICIENT_FUNDS]: STRIPE_ERROR_CATEGORIES.PAYMENT_METHOD,
  [STRIPE_ERROR_CODES.INVALID_EXPIRY_MONTH]: STRIPE_ERROR_CATEGORIES.PAYMENT_METHOD,
  [STRIPE_ERROR_CODES.INVALID_EXPIRY_YEAR]: STRIPE_ERROR_CATEGORIES.PAYMENT_METHOD,
  [STRIPE_ERROR_CODES.INVALID_NUMBER]: STRIPE_ERROR_CATEGORIES.PAYMENT_METHOD,
  [STRIPE_ERROR_CODES.PROCESSING_ERROR]: STRIPE_ERROR_CATEGORIES.PAYMENT_METHOD,
  [STRIPE_ERROR_CODES.RATE_LIMIT]: STRIPE_ERROR_CATEGORIES.INFRASTRUCTURE,
  [STRIPE_ERROR_CODES.API_CONNECTION_ERROR]: STRIPE_ERROR_CATEGORIES.INFRASTRUCTURE,
  [STRIPE_ERROR_CODES.API_ERROR]: STRIPE_ERROR_CATEGORIES.STRIPE_SERVICE,
  [STRIPE_ERROR_CODES.AUTHENTICATION_ERROR]: STRIPE_ERROR_CATEGORIES.CONFIGURATION,
  [STRIPE_ERROR_CODES.PERMISSION_ERROR]: STRIPE_ERROR_CATEGORIES.CONFIGURATION,
  [STRIPE_ERROR_CODES.INVALID_REQUEST]: STRIPE_ERROR_CATEGORIES.CLIENT_ERROR,
  [STRIPE_ERROR_CODES.MISSING_PARAMETER]: STRIPE_ERROR_CATEGORIES.CLIENT_ERROR,
  [STRIPE_ERROR_CODES.INVALID_PARAMETER]: STRIPE_ERROR_CATEGORIES.CLIENT_ERROR,
  [STRIPE_ERROR_CODES.IDEMPOTENCY_ERROR]: STRIPE_ERROR_CATEGORIES.CLIENT_ERROR,
  [STRIPE_ERROR_CODES.CUSTOMER_NOT_FOUND]: STRIPE_ERROR_CATEGORIES.CLIENT_ERROR,
  [STRIPE_ERROR_CODES.SUBSCRIPTION_NOT_FOUND]: STRIPE_ERROR_CATEGORIES.CLIENT_ERROR,
  [STRIPE_ERROR_CODES.INVALID_PRICE_ID]: STRIPE_ERROR_CATEGORIES.CLIENT_ERROR,
  [STRIPE_ERROR_CODES.WEBHOOK_SIGNATURE_INVALID]: STRIPE_ERROR_CATEGORIES.CONFIGURATION,
  [STRIPE_ERROR_CODES.CONFIGURATION_ERROR]: STRIPE_ERROR_CATEGORIES.CONFIGURATION
} as const

/**
 * Error severity mapping
 */
export const ERROR_SEVERITY_MAPPING: Record<StripeErrorCode, StripeErrorSeverity> = {
  [STRIPE_ERROR_CODES.CARD_DECLINED]: STRIPE_ERROR_SEVERITIES.LOW,
  [STRIPE_ERROR_CODES.EXPIRED_CARD]: STRIPE_ERROR_SEVERITIES.LOW,
  [STRIPE_ERROR_CODES.INCORRECT_CVC]: STRIPE_ERROR_SEVERITIES.LOW,
  [STRIPE_ERROR_CODES.INCORRECT_NUMBER]: STRIPE_ERROR_SEVERITIES.LOW,
  [STRIPE_ERROR_CODES.INSUFFICIENT_FUNDS]: STRIPE_ERROR_SEVERITIES.LOW,
  [STRIPE_ERROR_CODES.INVALID_EXPIRY_MONTH]: STRIPE_ERROR_SEVERITIES.LOW,
  [STRIPE_ERROR_CODES.INVALID_EXPIRY_YEAR]: STRIPE_ERROR_SEVERITIES.LOW,
  [STRIPE_ERROR_CODES.INVALID_NUMBER]: STRIPE_ERROR_SEVERITIES.LOW,
  [STRIPE_ERROR_CODES.PROCESSING_ERROR]: STRIPE_ERROR_SEVERITIES.MEDIUM,
  [STRIPE_ERROR_CODES.RATE_LIMIT]: STRIPE_ERROR_SEVERITIES.HIGH,
  [STRIPE_ERROR_CODES.API_CONNECTION_ERROR]: STRIPE_ERROR_SEVERITIES.HIGH,
  [STRIPE_ERROR_CODES.API_ERROR]: STRIPE_ERROR_SEVERITIES.HIGH,
  [STRIPE_ERROR_CODES.AUTHENTICATION_ERROR]: STRIPE_ERROR_SEVERITIES.CRITICAL,
  [STRIPE_ERROR_CODES.PERMISSION_ERROR]: STRIPE_ERROR_SEVERITIES.CRITICAL,
  [STRIPE_ERROR_CODES.INVALID_REQUEST]: STRIPE_ERROR_SEVERITIES.MEDIUM,
  [STRIPE_ERROR_CODES.MISSING_PARAMETER]: STRIPE_ERROR_SEVERITIES.MEDIUM,
  [STRIPE_ERROR_CODES.INVALID_PARAMETER]: STRIPE_ERROR_SEVERITIES.MEDIUM,
  [STRIPE_ERROR_CODES.IDEMPOTENCY_ERROR]: STRIPE_ERROR_SEVERITIES.MEDIUM,
  [STRIPE_ERROR_CODES.CUSTOMER_NOT_FOUND]: STRIPE_ERROR_SEVERITIES.MEDIUM,
  [STRIPE_ERROR_CODES.SUBSCRIPTION_NOT_FOUND]: STRIPE_ERROR_SEVERITIES.MEDIUM,
  [STRIPE_ERROR_CODES.INVALID_PRICE_ID]: STRIPE_ERROR_SEVERITIES.HIGH,
  [STRIPE_ERROR_CODES.WEBHOOK_SIGNATURE_INVALID]: STRIPE_ERROR_SEVERITIES.CRITICAL,
  [STRIPE_ERROR_CODES.CONFIGURATION_ERROR]: STRIPE_ERROR_SEVERITIES.CRITICAL
} as const

/**
 * Retryable error codes
 */
export const RETRYABLE_ERROR_CODES: readonly StripeErrorCode[] = [
  STRIPE_ERROR_CODES.RATE_LIMIT,
  STRIPE_ERROR_CODES.API_ERROR,
  STRIPE_ERROR_CODES.API_CONNECTION_ERROR,
  STRIPE_ERROR_CODES.PROCESSING_ERROR
] as const

// ========================
// Validation Functions
// ========================

/**
 * Validate Stripe configuration
 */
export function validateStripeConfig(config: {
  secretKey?: string | null
  publishableKey?: string | null
  webhookSecret?: string | null
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!config.secretKey) {
    errors.push('STRIPE_SECRET_KEY is required')
  } else if (!config.secretKey.startsWith('sk_')) {
    errors.push('STRIPE_SECRET_KEY must start with "sk_"')
  }

  if (!config.publishableKey) {
    errors.push('STRIPE_PUBLISHABLE_KEY is required')
  } else if (!config.publishableKey.startsWith('pk_')) {
    errors.push('STRIPE_PUBLISHABLE_KEY must start with "pk_"')
  }

  // Webhook secret is optional but if provided, should be valid
  if (config.webhookSecret && !config.webhookSecret.startsWith('whsec_')) {
    errors.push('STRIPE_WEBHOOK_SECRET must start with "whsec_"')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}
