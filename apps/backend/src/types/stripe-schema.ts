/**
 * Stripe Sync Engine Schema Types
 *
 * TypeScript interfaces for tables in the `stripe` schema managed by
 * @supabase/stripe-sync-engine. These tables are not included in the
 * generated Supabase types (which only cover the `public` schema).
 *
 * Reference: https://github.com/supabase/stripe-sync-engine
 */

/**
 * Stripe customer table (stripe.customers)
 * Synced from Stripe Customer objects
 */
export interface StripeCustomer {
  id: string
  stripe_id: string
  email: string
  name: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

/**
 * Stripe subscription table (stripe.subscriptions)
 * Synced from Stripe Subscription objects
 */
export interface StripeSubscription {
  id: string
  stripe_id: string
  customer: string
  status: string
  current_period_start: number | null
  current_period_end: number | null
  cancel_at_period_end: boolean | null
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

/**
 * Stripe payment intent table (stripe.payment_intents)
 * Synced from Stripe PaymentIntent objects
 */
export interface StripePaymentIntent {
  id: string
  stripe_id: string
  amount: number
  currency: string
  status: string
  customer: string | null
  metadata: Record<string, unknown> | null
  created: number
  created_at: string
  updated_at: string
}

/**
 * Stripe checkout session table (stripe.checkout_sessions)
 * Synced from Stripe Checkout Session objects
 */
export interface StripeCheckoutSession {
  id: string
  stripe_id: string
  customer: string | null
  subscription: string | null
  payment_status: string | null
  status: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

/**
 * Supabase error response
 * Standard error format from Supabase client
 */
export interface SupabaseError {
  code: string
  message: string
  details?: string
  hint?: string
}

/**
 * Generic Supabase query result for Stripe schema tables
 */
export interface StripeSchemaQueryResult<T> {
  data: T | null
  error: SupabaseError | null
}
