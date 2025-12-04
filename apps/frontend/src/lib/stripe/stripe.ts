"use client"

import { loadStripe, type Stripe } from '@stripe/stripe-js'
import { createLogger } from '@repo/shared/lib/frontend-logger'

const logger = createLogger({ component: 'StripeClient' })

// Initialize Stripe with publishable key - handle missing env var gracefully
// Uses process.env directly for client-side access (NEXT_PUBLIC_ prefix).
// T3 Env cannot be imported in client components as it contains server-side vars.
const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

let stripePromise: Promise<Stripe | null>

if (publishableKey && !publishableKey.includes('placeholder')) {
  stripePromise = loadStripe(publishableKey)
} else {
  logger.warn('Stripe publishable key not configured - Stripe features will be disabled', {
    action: 'stripe_configuration_missing',
    metadata: {
      hasKey: !!publishableKey,
      isPlaceholder: publishableKey?.includes('placeholder')
    }
  })
  stripePromise = Promise.resolve(null)
}

export { stripePromise }