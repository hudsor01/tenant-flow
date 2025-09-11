"use client"

import { loadStripe, type Stripe } from '@stripe/stripe-js'

// Initialize Stripe with publishable key - handle missing env var gracefully
const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

let stripePromise: Promise<Stripe | null>

if (publishableKey && !publishableKey.includes('placeholder')) {
  stripePromise = loadStripe(publishableKey)
} else {
  console.warn('Stripe publishable key not configured - Stripe features will be disabled')
  stripePromise = Promise.resolve(null)
}

export { stripePromise }