/**
 * Stripe Checkout Provider
 * Uses the new Stripe CheckoutProvider API for embedded components
 * Direct implementation without abstractions - following CLAUDE.md rules
 */
'use client'

import { CheckoutProvider as StripeCheckoutProvider } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import type { ReactNode } from 'react'

// Initialize Stripe directly - no wrapper
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '')

export interface CheckoutProviderProps {
  children: ReactNode
  fetchClientSecret: () => Promise<string>
  elementsOptions?: {
    appearance?: {
      theme?: 'stripe' | 'night' | 'flat'
      variables?: Record<string, string>
      rules?: Record<string, Record<string, string>>
    }
  }
}

/**
 * Stripe Checkout Provider using the new API
 * Direct passthrough to Stripe's CheckoutProvider
 * 
 * Usage:
 * ```tsx
 * <CheckoutProvider 
 *   fetchClientSecret={async () => {
 *     const response = await fetch('/api/create-checkout-session')
 *     const { clientSecret } = await response.json()
 *     return clientSecret
 *   }}
 * >
 *   <Checkout />
 * </CheckoutProvider>
 * ```
 */
export function CheckoutProvider({ 
  children, 
  fetchClientSecret,
  elementsOptions
}: CheckoutProviderProps) {
  return (
    <StripeCheckoutProvider
      stripe={stripePromise}
      options={{
        fetchClientSecret,
        elementsOptions
      }}
    >
      {children}
    </StripeCheckoutProvider>
  )
}