"use client"

import React from 'react'
import { Elements } from '@stripe/react-stripe-js'
import { stripePromise } from '@/lib/stripe'

interface StripeProviderProps {
  children: React.ReactNode
}

// Production-ready Stripe provider with graceful fallback
export function StripeProvider({ children }: StripeProviderProps) {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  
  // If no Stripe key is configured, render without Elements wrapper
  if (!publishableKey || publishableKey.includes('placeholder')) {
    console.warn('Stripe publishable key not configured - rendering without Elements wrapper')
    return <>{children}</>
  }

  // With proper Stripe configuration, wrap in Elements
  return (
    <Elements 
      stripe={stripePromise}
      options={{
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#0070f3',
          },
        },
      }}
    >
      {children}
    </Elements>
  )
}

StripeProvider.displayName = 'StripeProvider'