import type {
  BillingRepositoryContract,
  CustomerQueryOptions,
  PaymentQueryOptions,
  PriceQueryOptions,
  ProductQueryOptions,
  StripeCustomer,
  StripePaymentIntent,
  StripePrice,
  StripeProduct,
  StripeSubscription,
  SubscriptionQueryOptions
} from '@repo/shared/types/billing-repository'

export type {
  StripeCustomer,
  StripeSubscription,
  StripeProduct,
  StripePrice,
  StripePaymentIntent,
  CustomerQueryOptions,
  SubscriptionQueryOptions,
  ProductQueryOptions,
  PriceQueryOptions,
  PaymentQueryOptions
}

export type IBillingRepository = BillingRepositoryContract
