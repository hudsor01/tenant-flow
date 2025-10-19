/**
 * Stripe Client-Side Integration
 * Loads Stripe.js and provides singleton instance
 *
 * Note: This file provides the base Stripe instance.
 * For embedded checkout, use StripeProvider from providers/stripe-provider.tsx
 */

import { loadStripe, type Stripe } from '@stripe/stripe-js'

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

if (!publishableKey) {
	throw new Error(
		'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is required to initialize Stripe.'
	)
}

// Singleton Stripe instance
const stripePromise = loadStripe(publishableKey)

/**
 * Get Stripe instance (singleton)
 * Used for Customer Portal and other non-embedded Stripe features
 *
 * @returns Promise that resolves to Stripe instance
 */
export const getStripe = (): Promise<Stripe | null> => stripePromise
