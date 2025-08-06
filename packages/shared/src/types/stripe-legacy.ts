/**
 * Stripe Legacy Types
 * 
 * Backward compatibility layer for existing Stripe type definitions.
 * This file re-exports types from the old billing.ts and stripe-unified.ts files
 * using the new unified Stripe type system.
 * 
 * @deprecated Use imports from './stripe' instead
 * @fileoverview Legacy compatibility for Stripe types
 */

import {
  type PlanType as NewPlanType,
  PLAN_TYPES as NEW_PLAN_TYPES,
  type BillingPeriod as NewBillingPeriod,
  BILLING_PERIODS as NEW_BILLING_PERIODS,
  type SubscriptionStatus as NewSubscriptionStatus,
  SUBSCRIPTION_STATUSES as NEW_SUBSCRIPTION_STATUSES,
  type UserSubscription as NewUserSubscription,
  type PlanConfig as NewPlanConfig,
  type UsageMetrics as NewUsageMetrics,
  type PaymentMethod as NewPaymentMethod,
  type Invoice as NewInvoice,
  type StripeConfig as NewStripeConfig,
  type CreateCheckoutSessionParams as NewCreateCheckoutSessionParams,
  type CreatePortalSessionParams as NewCreatePortalSessionParams,
  type StandardizedStripeError as NewStandardizedStripeError,
  type StripeWebhookEvent as NewStripeWebhookEvent,
  type WebhookEventHandlers as NewWebhookEventHandlers,
  type WebhookEventType as NewWebhookEventType,
  type StripeErrorCode as NewStripeErrorCode,
  STRIPE_ERROR_CODES as NEW_STRIPE_ERROR_CODES,
  type StripeApiResponse as NewStripeApiResponse,
  type StripeSuccessResponse as NewStripeSuccessResponse,
  type StripeErrorResponse as NewStripeErrorResponse,
  type BillingHistoryEvent as NewBillingHistoryEvent
} from './stripe'

// ========================
// Plan Types (Legacy)
// ========================

/**
 * @deprecated Use PLAN_TYPES from './stripe' instead
 */
export const PLAN_TYPE = NEW_PLAN_TYPES

/**
 * @deprecated Use PlanType from './stripe' instead
 */
export type PlanType = NewPlanType

/**
 * @deprecated Use BillingPeriod from './stripe' instead
 */
export type BillingPeriod = NewBillingPeriod

/**
 * @deprecated Use SubscriptionStatus from './stripe' instead
 */
export type SubStatus = NewSubscriptionStatus

/**
 * @deprecated Use PlanConfig from './stripe' instead
 */
export interface Plan extends Omit<NewPlanConfig, 'id' | 'limits' | 'stripeIds'> {
  id: NewPlanType
  uiId: string
  propertyLimit: number
  storageLimit: number
  apiCallLimit: number
  subscription?: string
  stripeMonthlyPriceId?: string | null
  stripeAnnualPriceId?: string | null
  ANNUALPrice?: number
}

/**
 * @deprecated Use PlanConfig from './stripe' instead
 */
export interface ServicePlan {
  id: NewPlanType
  name: string
  price: number
  propertyLimit: number
  stripeMonthlyPriceId: string | null
  stripeAnnualPriceId: string | null
}

/**
 * @deprecated Use UserSubscription from './stripe' instead
 */
export type Subscription = NewUserSubscription

/**
 * @deprecated Use Invoice from './stripe' instead
 */
export type Invoice = NewInvoice

/**
 * @deprecated Use UsageMetrics from './stripe' instead
 */
export interface UsageMetrics extends Omit<NewUsageMetrics, 'tenants'> {
  tenants?: number
}

/**
 * @deprecated Use PaymentMethod from './stripe' instead
 */
export type PaymentMethod = NewPaymentMethod

// ========================
// Legacy Plan Utilities
// ========================

/**
 * @deprecated Use getPlanDisplayName from './stripe-utils' instead
 */
export const getPlanTypeLabel = (plan: NewPlanType): string => {
  const labels: Record<NewPlanType, string> = {
    FREETRIAL: 'Free Trial',
    STARTER: 'Starter',
    GROWTH: 'Growth',
    TENANTFLOW_MAX: 'TenantFlow Max'
  }
  return labels[plan] || plan
}

// ========================
// Configuration Types (Legacy)
// ========================

/**
 * @deprecated Use StripeConfig from './stripe' instead
 */
export type UnifiedStripeConfig = NewStripeConfig

/**
 * @deprecated Use StripePlanPriceIds from './stripe' instead
 */
export interface StripePricing {
  id: string
  priceFree: string
  priceStarter: string
  priceGrowth: string
  priceEnterprise: string
  productFree: string
  productStarter: string
  productGrowth: string
  productEnterprise: string
  pricingTableId: string
  customerPortalUrl: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// ========================
// Error Types (Legacy)
// ========================

/**
 * @deprecated Use StripeErrorCode from './stripe' instead
 */
export type StripeErrorType = 
  | 'card_error'
  | 'rate_limit_error' 
  | 'invalid_request_error'
  | 'api_error'
  | 'api_connection_error'
  | 'authentication_error'
  | 'idempotency_error'

/**
 * @deprecated Use StandardizedStripeError from './stripe' instead
 */
export interface StripeWebhookError {
  type: StripeErrorType
  message: string
  stack?: string
}

/**
 * @deprecated Use NEW_STRIPE_ERROR_CODES from './stripe' instead
 */
export const STRIPE_ERRORS = {
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
} as const

// ========================
// API Types (Legacy)
// ========================

/**
 * @deprecated Use CreateCheckoutSessionParams from './stripe' instead
 */
export interface CreateCheckoutSessionParams extends NewCreateCheckoutSessionParams {
  billingInterval: NewBillingPeriod
}

/**
 * @deprecated Use CreatePortalSessionParams from './stripe' instead
 */
export type CreatePortalSessionParams = NewCreatePortalSessionParams

/**
 * @deprecated Use UpdateSubscriptionParams from './stripe' instead
 */
export interface UpdateSubscriptionParams {
  userId: string
  newPriceId: string
  prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice'
  prorationDate?: Date
}

/**
 * @deprecated Use PreviewInvoiceParams from './stripe' instead
 */
export interface PreviewInvoiceParams {
  userId: string
  newPriceId: string
  prorationDate?: Date
}

// ========================
// Response Types (Legacy)
// ========================

/**
 * @deprecated Use CreateSubscriptionResponse from './stripe' instead
 */
export interface SubscriptionCreateResponse {
  subscription: NewUserSubscription
  clientSecret?: string
  requiresPaymentMethod: boolean
  success: boolean
  subscriptionId?: string
}

/**
 * @deprecated Use CreateSubscriptionRequest from './stripe' instead
 */
export interface SubscriptionCreateRequest {
  planId: NewPlanType
  paymentMethodId?: string
}

/**
 * @deprecated Use StripeApiResponse from './stripe' instead
 */
export interface CustomerPortalResponse {
  url: string
}

/**
 * @deprecated Use StripeApiResponse from './stripe' instead
 */
export interface CustomerPortalRequest {
  returnUrl?: string
}

// ========================
// Webhook Types (Legacy)
// ========================

/**
 * @deprecated Use StripeWebhookEvent from './stripe' instead
 */
export type StripeWebhookEvent = NewStripeWebhookEvent

/**
 * @deprecated Use WebhookEventHandlers from './stripe' instead
 */
export type WebhookEventHandler = NewWebhookEventHandlers

/**
 * @deprecated Use WebhookEventType from './stripe' instead
 */
export type WebhookEventType = NewWebhookEventType

/**
 * @deprecated Use database model instead
 */
export interface WebhookEvent {
  id: string
  stripeEventId: string
  eventType: string
  processed: boolean
  processingTime: number | null
  errorMessage: string | null
  retryCount: number
  createdAt: Date
  updatedAt: Date
}

// ========================
// Extended Types (Legacy)
// ========================

/**
 * @deprecated Use detailed types from './stripe' instead
 */
export interface UsageMetricsExtended extends NewUsageMetrics {
  id: string
  userId: string
  leaseGenerationsCount: number
  createdAt: Date
  updatedAt: Date
}

/**
 * @deprecated Use UsageMetrics from './stripe' instead
 */
export interface DetailedUsageMetrics {
  propertiesCount: number
  tenantsCount: number
  leasesCount: number
  storageUsedMB: number
  apiCallsCount: number
  leaseGenerationsCount: number
  month: string
}

/**
 * @deprecated Use PlanLimits from './stripe' instead
 */
export interface PlanLimits {
  properties: number
  tenants: number
  storage: number
  apiCalls: number
}

/**
 * @deprecated Use LimitChecks from './stripe' instead
 */
export interface LimitChecks {
  propertiesExceeded: boolean
  tenantsExceeded: boolean
  storageExceeded: boolean
  apiCallsExceeded: boolean
}

/**
 * @deprecated Use UsageData from './stripe' instead
 */
export interface UsageData extends DetailedUsageMetrics {
  limits: PlanLimits | null
  limitChecks: LimitChecks | null
}

/**
 * @deprecated Use BillingHistoryEvent from './stripe' instead
 */
export type BillingHistoryEvent = NewBillingHistoryEvent

/**
 * @deprecated Use invoice list response type instead
 */
export interface BillingHistory {
  invoices: NewInvoice[]
  totalSpent: number
  currentBalance: number
}

/**
 * @deprecated Use UserSubscription from './stripe' instead
 */
export interface LocalSubscriptionData {
  id: string
  userId: string
  status: string
  planId: string | null
  stripeSubscriptionId: string | null
  stripeCustomerId: string | null
  currentPeriodStart: Date | null
  currentPeriodEnd: Date | null
  cancelAtPeriodEnd: boolean | null
  trialStart: Date | null
  trialEnd: Date | null
  createdAt: Date
  updatedAt: Date
}

/**
 * @deprecated Use plan configuration with subscription details instead
 */
export interface EnhancedUserPlan extends Omit<NewPlanConfig, 'id'> {
  id: keyof typeof NEW_PLAN_TYPES
  billingPeriod: 'monthly' | 'annual'
  status: string
  subscription: LocalSubscriptionData | null
  isActive: boolean
  trialDaysRemaining: number
  accessExpiresAt: Date | null
  statusReason: string
}

// ========================
// Element Types (Legacy)
// ========================

/**
 * @deprecated Use StripeElementEvent from './stripe' instead
 */
export interface StripeElementEvent {
  elementType: string
  empty: boolean
  complete: boolean
  error?: {
    type: string
    code: string
    message: string
  }
}

/**
 * @deprecated Use StripeCardElementEvent from './stripe' instead
 */
export interface StripeCardElementEvent extends StripeElementEvent {
  brand?: string
  country?: string
}

/**
 * @deprecated Use StripePaymentElementEvent from './stripe' instead
 */
export interface StripePaymentElementEvent extends StripeElementEvent {
  value?: {
    type: string
  }
}

/**
 * @deprecated Use callback types from './stripe' instead
 */
export type StripeElementEventCallback = (event: StripeElementEvent) => void
export type StripeCardElementEventCallback = (event: StripeCardElementEvent) => void  
export type StripePaymentElementEventCallback = (event: StripePaymentElementEvent) => void

// ========================
// Re-exports for Compatibility
// ========================

/**
 * @deprecated Import these directly from './stripe' instead
 */
export type {
  // Core types
  NewPlanType as UnifiedPlanType,
  NewBillingPeriod as UnifiedBillingPeriod,
  NewSubscriptionStatus as UnifiedSubscriptionStatus,
  NewUserSubscription as UnifiedSubscription,
  NewStripeConfig as CoreStripeConfig,
  
  // Error types
  NewStandardizedStripeError as UnifiedStripeError,
  NewStripeErrorCode as UnifiedErrorCode,
  
  // API types
  NewStripeApiResponse as UnifiedApiResponse,
  NewStripeSuccessResponse as UnifiedSuccessResponse,
  NewStripeErrorResponse as UnifiedErrorResponse
}

// Export constants with deprecation warnings
export {
  NEW_PLAN_TYPES as UNIFIED_PLAN_TYPES,
  NEW_BILLING_PERIODS as UNIFIED_BILLING_PERIODS,
  NEW_SUBSCRIPTION_STATUSES as UNIFIED_SUBSCRIPTION_STATUSES,
  NEW_STRIPE_ERROR_CODES as UNIFIED_ERROR_CODES
}