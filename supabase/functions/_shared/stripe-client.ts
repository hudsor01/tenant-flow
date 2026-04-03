// Shared Stripe client factory for Supabase Edge Functions.
// Centralizes API version so it is updated in one place.

import Stripe from 'stripe'

/** Locked API version used across all Edge Functions. */
const STRIPE_API_VERSION = '2026-02-25.clover' as Stripe.LatestApiVersion

/**
 * Create a Stripe client with the standard API version.
 */
export function getStripeClient(apiKey: string): Stripe {
  return new Stripe(apiKey, { apiVersion: STRIPE_API_VERSION })
}
