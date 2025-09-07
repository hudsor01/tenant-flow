"use client"

import React from 'react'

interface StripeProviderProps {
  children: React.ReactNode
}

// Simplified Stripe provider that gracefully handles missing Stripe configuration
export function StripeProvider({ children }: StripeProviderProps) {
  // For now, just render children without Stripe Elements wrapper
  // This allows the app to work without Stripe configuration
  // TODO: Re-enable Stripe Elements when environment is properly configured
  console.warn('Stripe provider temporarily disabled - rendering without Elements wrapper')
  return <>{children}</>
}

StripeProvider.displayName = 'StripeProvider'