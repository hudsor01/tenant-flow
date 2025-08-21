/**
 * Official Stripe Types Import
 * 
 * This file imports types from the official Stripe Node.js SDK to replace
 * custom type definitions that may conflict. The Stripe SDK v18.4.0+ includes
 * comprehensive TypeScript types that are automatically updated with API changes.
 * 
 * @see https://github.com/stripe/stripe-node
 * @see https://docs.stripe.com/api
 */

// Import core Stripe types from the official SDK
import type Stripe from 'stripe'

// Re-export commonly used Stripe types with clear naming
export type StripeCustomer = Stripe.Customer
export type StripeSubscription = Stripe.Subscription & {
  // Ensure current_period properties are available (they exist in official API)
  current_period_start: number
  current_period_end: number
}
export type StripePrice = Stripe.Price
export type StripeProduct = Stripe.Product
export type StripePaymentIntent = Stripe.PaymentIntent
export type StripePaymentMethod = Stripe.PaymentMethod
export type StripeInvoice = Stripe.Invoice & {
  // Ensure subscription property is available on Invoice
  subscription?: string | StripeSubscription | null
}
export type StripeCheckoutSession = Stripe.Checkout.Session
export type StripeBillingPortalSession = Stripe.BillingPortal.Session
export type StripeWebhookEvent = Stripe.Event
export type StripeError = Stripe.StripeRawError

// Subscription specific types
export type StripeSubscriptionStatus = Stripe.Subscription.Status
export type StripeSubscriptionItem = Stripe.SubscriptionItem
// export type StripeUsageRecord = Stripe.UsageRecord // Type not available in Stripe SDK v18.4.0

// Payment types
export type StripePaymentIntentStatus = Stripe.PaymentIntent.Status
export type StripePaymentMethodType = Stripe.PaymentMethod.Type

// Billing types
export type StripeInvoiceStatus = Stripe.Invoice.Status
export type StripeTaxRate = Stripe.TaxRate
export type StripeDiscount = Stripe.Discount
export type StripeCoupon = Stripe.Coupon

// Event types for webhooks
export type StripeEventType = Stripe.Event.Type
export type StripeWebhookEndpoint = Stripe.WebhookEndpoint

// API parameter types for common operations
export type StripeCustomerCreateParams = Stripe.CustomerCreateParams
export type StripeCustomerUpdateParams = Stripe.CustomerUpdateParams
export type StripeSubscriptionCreateParams = Stripe.SubscriptionCreateParams
export type StripeSubscriptionUpdateParams = Stripe.SubscriptionUpdateParams
export type StripeCheckoutSessionCreateParams = Stripe.Checkout.SessionCreateParams
export type StripeBillingPortalSessionCreateParams = Stripe.BillingPortal.SessionCreateParams
export type StripePaymentIntentCreateParams = Stripe.PaymentIntentCreateParams
export type StripeInvoiceCreateParams = Stripe.InvoiceCreateParams

// List parameters for pagination
export type StripeCustomerListParams = Stripe.CustomerListParams
export type StripeSubscriptionListParams = Stripe.SubscriptionListParams
export type StripeInvoiceListParams = Stripe.InvoiceListParams
export type StripeEventListParams = Stripe.EventListParams

// Response types for list operations
export type StripeCustomerList = Stripe.ApiList<Stripe.Customer>
export type StripeSubscriptionList = Stripe.ApiList<Stripe.Subscription>
export type StripeInvoiceList = Stripe.ApiList<Stripe.Invoice>
export type StripeEventList = Stripe.ApiList<Stripe.Event>

// Generic API list type
export type StripeApiList<T> = Stripe.ApiList<T>

// Address types
export type StripeAddress = Stripe.Address
// export type StripeShipping = Stripe.Shipping // Type not available in Stripe SDK v18.4.0

// Error types
export type StripeRawError = Stripe.RawErrorType
export type StripeErrorType = Stripe.StripeRawError['type']

// Configuration types
export interface StripeConfig {
  publishableKey: string
  secretKey: string
  webhookSecret: string
  apiVersion?: Stripe.LatestApiVersion
}

// Common enums and constants
export const STRIPE_SUBSCRIPTION_STATUSES = [
  'active',
  'canceled',
  'incomplete',
  'incomplete_expired',
  'past_due',
  'trialing',
  'unpaid'
] as const

export const STRIPE_PAYMENT_INTENT_STATUSES = [
  'canceled',
  'processing',
  'requires_action',
  'requires_capture',
  'requires_confirmation',
  'requires_payment_method',
  'succeeded'
] as const

export const STRIPE_INVOICE_STATUSES = [
  'draft',
  'open',
  'paid',
  'uncollectible',
  'void'
] as const

// Billing intervals
export type StripeBillingInterval = 'day' | 'week' | 'month' | 'year'
export type BillingPeriod = 'monthly' | 'annual' // Application-specific billing period

// Application-specific types
export type PlanType = 'FREETRIAL' | 'STARTER' | 'GROWTH' | 'TENANTFLOW_MAX'

// Webhook event types commonly used in our application
export const WEBHOOK_EVENTS = {
  CUSTOMER_CREATED: 'customer.created',
  CUSTOMER_UPDATED: 'customer.updated',
  CUSTOMER_DELETED: 'customer.deleted',
  SUBSCRIPTION_CREATED: 'customer.subscription.created',
  SUBSCRIPTION_UPDATED: 'customer.subscription.updated',
  SUBSCRIPTION_DELETED: 'customer.subscription.deleted',
  INVOICE_CREATED: 'invoice.created',
  INVOICE_PAID: 'invoice.paid',
  INVOICE_PAYMENT_FAILED: 'invoice.payment_failed',
  PAYMENT_INTENT_SUCCEEDED: 'payment_intent.succeeded',
  PAYMENT_INTENT_PAYMENT_FAILED: 'payment_intent.payment_failed',
  CHECKOUT_SESSION_COMPLETED: 'checkout.session.completed',
  CHECKOUT_SESSION_EXPIRED: 'checkout.session.expired'
} as const

// Type guard helpers
export function isStripeError(error: unknown): error is StripeError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    typeof (error as { type: unknown }).type === 'string' &&
    (error as { type: string }).type.startsWith('Stripe')
  )
}

export function isActiveSubscription(status: StripeSubscriptionStatus): boolean {
  return status === 'active' || status === 'trialing'
}

export function isPaidInvoice(status: StripeInvoiceStatus): boolean {
  return status === 'paid'
}

// Utility types for our application-specific needs
export interface TenantFlowSubscriptionMetadata {
  tenant_id?: string
  organization_id?: string
  plan_type?: string
  created_by?: string
}

export interface TenantFlowCustomerMetadata {
  user_id?: string
  organization_id?: string
  tenant_id?: string
}

// Extended types that combine Stripe types with our metadata
export type TenantFlowCustomer = StripeCustomer & {
  metadata: TenantFlowCustomerMetadata
}

export type TenantFlowSubscription = StripeSubscription & {
  metadata: TenantFlowSubscriptionMetadata
}

// API response wrappers
export interface StripeApiResponse<T> {
  success: boolean
  data?: T
  error?: StripeError
}

export interface StripeOperationResult<T> {
  success: boolean
  data?: T
  error?: string
  stripeError?: StripeError
}