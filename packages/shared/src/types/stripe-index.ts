/**
 * Comprehensive Stripe Type Definitions Index for TenantFlow
 * 
 * This file exports all Stripe-related type definitions created for TenantFlow.
 * Import from here to get access to all official Stripe object types, error types,
 * and utility functions.
 * 
 * Usage:
 * import { StripeCustomer, StripeInvoice, StripeError } from '@repo/shared/types/stripe-index'
 */

// ========================
// Core Stripe Types
// ========================

// Base types and enums - Primary source of truth
export * from './stripe'

// Import types needed for interfaces below
import type {
  StripeSubscription,
  StripeCustomer,
  StripeInvoice,
  StripePaymentMethod,
  StripeCheckoutSession,
  StripePaymentIntent,
  StripeSetupIntent,
  StripeAddress,
  StripeEvent,
  StripeWebhookEndpoint,
  StripeCustomerSession,
  StripeInvoiceLineItem,
  StripeCustomerPortalConfiguration as StripeCustomerPortalSession
} from './stripe'

import type {
  StripePrice,
  StripeProduct
} from './stripe-core-objects'

import type {
  StripeApiError,
  StripeCardError,
  StripeIdempotencyError,
  StripeInvalidRequestError,
  UserFriendlyError,
  StripeError
} from './stripe-errors'

// Subscription helper functions - now exported from stripe.ts
export {
  // Utility functions
  getSubscriptionStatus,
  getSubscriptionPriceId,
  getSubscriptionQuantity,
  getSubscriptionInterval,
  getSubscriptionCurrentPeriod,
  getSubscriptionTrialEnd,
  getSubscriptionCancelAt,
  isSubscriptionActive,
  isSubscriptionTrialing,
  isSubscriptionCanceled,
  isSubscriptionPastDue,
  isSubscriptionPaused,
  calculateSubscriptionMRR,
  calculateProrationAmount,
  formatSubscriptionPeriod,
  getDaysUntilRenewal,
  getDaysUntilTrialEnd,
  getSubscriptionStartDate,
  getSubscriptionEndDate,
  shouldRetryPayment,
  getRetryDelayHours,
  needsDunning,
  canReactivate,
  canChangeItems,
  canPauseCollection,
  isStripeSubscription
} from './stripe'

// Core objects - Skip duplicate exports
export {
  // Only export functions that exist
  getPriceInDollars,
  isPriceRecurring,
  getBillingPeriod,
  getCustomerEmail,
  getCustomerDisplayName,
  isInvoicePaid,
  isInvoiceOverdue
} from './stripe-core-objects'

// Payment processing objects - Skip duplicate exports
export {
  // Utility functions that exist
  getPaymentIntentAmount,
  getPaymentIntentCurrency,
  getPaymentIntentStatus,
  getPaymentIntentCustomerId,
  isPaymentIntentProcessing,
  getSetupIntentCustomerId,
  getSetupIntentPaymentMethodId,
  isSetupIntentSucceeded,
  isCheckoutSessionCompleted
} from './stripe-payment-objects'

// Invoice line items with tax and discount calculations (selective export to avoid conflicts)
export {
  type InvoiceLineItemPeriod,
  type InvoiceLineItemDiscountAmount,
  type InvoiceLineItemTaxAmount,
  type InvoiceLineItemTaxRate,
  getLineItemTotal,
  getLineItemTaxAmount,
  getLineItemDiscountAmount,
  isLineItemProrated,
  getLineItemDescription
} from './stripe-invoice-line-items'

// Comprehensive error types and handling patterns (avoid duplicate exports)
export {
  STRIPE_ERROR_TYPES,
  type StripeErrorType,
  CARD_DECLINE_CODES, 
  type CardDeclineCode,
  HTTP_STATUS_CODES,
  type HttpStatusCode,
  type StripeErrorBase,
  type StripeRateLimitError,
  type StripeAuthenticationError,
  CARD_ERROR_MESSAGES,
  isStripeError,
  isCardError,
  isRateLimitError,
  isRetryableError,
  getUserFriendlyError,
  calculateRetryDelay,
  createErrorContext,
  formatErrorForLogging
} from './stripe-errors'

// Re-export imported types for external use
export type {
  StripePrice,
  StripeProduct
} from './stripe-core-objects'

export type {
  StripeApiError,
  StripeCardError,
  StripeIdempotencyError,
  StripeInvalidRequestError,
  UserFriendlyError,
  StripeError
} from './stripe-errors'

// Webhook endpoint configuration (excluding StripeWebhookEndpoint which is already exported from ./stripe)
export {
  WEBHOOK_ENDPOINT_STATUSES,
  type WebhookEndpointStatus,
  type WebhookEndpointCreateParams,
  type WebhookEndpointUpdateParams,
  isStripeWebhookEndpoint,
  isWebhookEndpointEnabled,
  handlesEventType,
  getEventCount,
  handlesAllEvents,
  getWebhookEnvironment,
  extractTenantFlowWebhookMetadata
} from './stripe-webhook-endpoints'

// ========================
// Type Collections for Common Use Cases
// ========================

// Use namespace imports to avoid conflicts with exports


// All subscription-related types
export interface SubscriptionTypes {
  Subscription: StripeSubscription
  SubscriptionItem: unknown // Type from items.data in StripeSubscription
  SubscriptionSchedule: string // Simplified for now  
}

// All customer-related types
export interface CustomerTypes {
  Customer: StripeCustomer
  CustomerSession: StripeCustomerSession
  Address: StripeAddress
  TaxId: string // Simplified for now
}

// All payment-related types
export interface PaymentTypes {
  PaymentMethod: StripePaymentMethod
  PaymentIntent: StripePaymentIntent
  SetupIntent: StripeSetupIntent
  CheckoutSession: StripeCheckoutSession
  CustomerPortalSession: StripeCustomerPortalSession
}

// All billing-related types
export interface BillingTypes {
  Invoice: StripeInvoice
  InvoiceLineItem: StripeInvoiceLineItem
  Price: StripePrice
  Product: StripeProduct
}

// All error-related types
export interface ErrorTypes {
  StripeError: StripeError
  StripeCardError: StripeCardError
  StripeApiError: StripeApiError
  StripeInvalidRequestError: StripeInvalidRequestError
  StripeIdempotencyError: StripeIdempotencyError
  UserFriendlyError: UserFriendlyError
}

// All webhook-related types
export interface WebhookTypes {
  Event: StripeEvent
  WebhookEndpoint: StripeWebhookEndpoint
  // Note: EventHandlers type removed to avoid import() pattern
  // Import directly: import type { WebhookEventHandlers } from './stripe-payment-objects'
}

// ========================
// Utility Type Collections  
// ========================

// NOTE: TypeGuards and UtilityFunctions interfaces removed to eliminate import() patterns
// Import the functions directly from their respective modules when needed:
// 
// Type Guards:
// - import { isStripeCustomer, isStripePrice, isStripeProduct } from './stripe-core-objects'
// - import { isStripeSubscription, isStripeSubscriptionItem } from './stripe-subscription-enhanced'  
// - import { isStripePaymentMethod, isStripeEvent } from './stripe-payment-objects'
// - import { isStripeError, isCardError } from './stripe-errors'
//
// Utility Functions:
// - import { getSubscriptionStatus, isSubscriptionActive } from './stripe-subscription-enhanced'
// - import { getCustomerEmail, getPriceInDollars } from './stripe-core-objects'
// - import { getPaymentMethodDisplayName } from './stripe-payment-objects'

// ========================
// TenantFlow-Specific Types
// ========================

/**
 * TenantFlow's subscription plan hierarchy
 */
export type TenantFlowPlanType = 'FREETRIAL' | 'STARTER' | 'GROWTH' | 'TENANTFLOW_MAX'

/**
 * TenantFlow billing intervals
 */
export type TenantFlowBillingInterval = 'monthly' | 'annual'

/**
 * TenantFlow subscription status mapping
 */
export type TenantFlowSubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete'

/**
 * TenantFlow metadata standard for all Stripe objects
 */
export interface TenantFlowStripeMetadata {
  readonly tenantflow_organization_id?: string
  readonly tenantflow_user_id?: string
  readonly tenantflow_plan_type?: string
  readonly tenantflow_billing_interval?: string
  readonly tenantflow_source?: string
  readonly tenantflow_environment?: string
  readonly tenantflow_version?: string
  readonly [key: string]: string | undefined
}

/**
 * Stripe-compatible metadata (all values must be strings)
 */
export type TenantFlowStripeCompatibleMetadata = Record<string, string>

/**
 * Enhanced subscription with TenantFlow-specific properties
 */
import type { StripeSubscription as BaseStripeSubscription, StripeCustomer as BaseStripeCustomer } from './stripe'

export interface TenantFlowSubscription extends Omit<BaseStripeSubscription, 'metadata'> {
  readonly metadata: TenantFlowStripeCompatibleMetadata
}

/**
 * Enhanced customer with TenantFlow-specific properties
 */
export interface TenantFlowCustomer extends Omit<BaseStripeCustomer, 'metadata'> {
  readonly metadata: TenantFlowStripeCompatibleMetadata
}

// Constants and enums are already exported from their respective modules above as const

/**
 * Quick access to commonly used types
 */
export interface CommonStripeTypes {
  Subscription: StripeSubscription
  Customer: StripeCustomer
  Invoice: StripeInvoice
  PaymentMethod: StripePaymentMethod
  CheckoutSession: StripeCheckoutSession
  PaymentIntent: StripePaymentIntent
  Event: StripeEvent
  Error: StripeError
}

