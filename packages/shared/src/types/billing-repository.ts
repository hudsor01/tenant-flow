import type { Json } from './supabase-generated.js'
import type { BaseFilterOptions } from './repository-base.js'

export interface StripeCustomer {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  balance: number | null
  createdAt: string | null
  currency: string | null
  delinquent: boolean | null
  description: string | null
  livemode: boolean | null
  metadata: Json
  updatedAt?: string | null
}

export interface StripeSubscription {
  id: string
  customer_id: string | null
  status: string
  current_period_start: string | null
  current_period_end: string | null
  createdAt: string | null
  cancel_at_period_end: boolean | null
  canceled_at: string | null
  metadata: Json
  trial_start: string | null
  trial_end: string | null
  updatedAt: string | null
}

export interface StripeProduct {
  id: string
  name: string
  description: string | null
  active: boolean | null
  createdAt: string | null
  updatedAt: string | null
  metadata: Json
  images: string[] | null
  unit_label: string | null
}

// Renamed from StripePrice to avoid conflict with stripe.ts API type
export interface StripePriceRecord {
  id: string
  product_id: string | null
  active: boolean | null
  currency: string | null
  unit_amount: number | null
  recurring_interval: string | null
  recurring_interval_count: number | null
  type: string | null
  createdAt: string | null
  metadata: Json
  updatedAt: string | null
}

export interface StripePaymentIntent {
  id: string
  customer_id: string | null
  amount: number
  currency: string | null
  status: string
  description: string | null
  createdAt: string | null
  metadata: Json
  receipt_email: string | null
  updatedAt: string | null
}

export interface CustomerQueryOptions extends BaseFilterOptions {
  active?: boolean
}

export interface SubscriptionQueryOptions extends BaseFilterOptions {
  customerId?: string
  status?: string
}

export interface ProductQueryOptions extends BaseFilterOptions {
  active?: boolean
}

export interface PriceQueryOptions extends BaseFilterOptions {
  active?: boolean
  productId?: string
}

export interface PaymentQueryOptions extends BaseFilterOptions {
  customerId?: string
  status?: string
  dateRange?: {
    start: Date
    end: Date
  }
}

export interface BillingRepositoryContract {
  getCustomer(customerId: string): Promise<StripeCustomer | null>
  getCustomers(options?: CustomerQueryOptions): Promise<StripeCustomer[]>
  getSubscription(subscriptionId: string): Promise<StripeSubscription | null>
  getCustomerSubscriptions(customerId: string): Promise<StripeSubscription[]>
  getSubscriptions(options?: SubscriptionQueryOptions): Promise<StripeSubscription[]>
  getProduct(productId: string): Promise<StripeProduct | null>
  getProducts(options?: ProductQueryOptions): Promise<StripeProduct[]>
  getPrice(priceId: string): Promise<StripePriceRecord | null>
  getPrices(options?: PriceQueryOptions): Promise<StripePriceRecord[]>
  getProductPrices(productId: string): Promise<StripePriceRecord[]>
  getPaymentIntent(paymentIntentId: string): Promise<StripePaymentIntent | null>
  getPaymentIntents(options?: PaymentQueryOptions): Promise<StripePaymentIntent[]>
  getCustomerPayments(customerId: string): Promise<StripePaymentIntent[]>
  isHealthy(): Promise<boolean>
  countCustomers(options?: CustomerQueryOptions): Promise<number>
  countSubscriptions(options?: SubscriptionQueryOptions): Promise<number>
  countPayments(options?: PaymentQueryOptions): Promise<number>
}
