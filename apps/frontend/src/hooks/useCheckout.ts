import { useState } from 'react'
import { toast } from 'sonner'
import type { BillingInterval, PlanType } from '@repo/shared'

export function useCheckout() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createCheckoutSession = async (
    planType: PlanType,
    billingInterval: BillingInterval
  ) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/stripe/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: getPriceId(planType, billingInterval),
          billingInterval,
          mode: 'subscription',
          successUrl: `${window.location.origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.origin}/pricing`,
          metadata: {
            planType,
          },
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      const data = await response.json()
      
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('No checkout URL received')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create checkout session'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const startFreeTrial = async () => {
    return createCheckoutSession('FREETRIAL' as PlanType, 'monthly')
  }

  const openPortal = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/stripe/create-portal-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          returnUrl: window.location.href,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create portal session')
      }

      const data = await response.json()
      
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('No portal URL received')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to open customer portal'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return {
    createCheckoutSession,
    startFreeTrial,
    openPortal,
    isLoading,
    error,
    // Aliases for specific loading states
    isOpeningPortal: isLoading,
    portalError: error,
  }
}

// Helper function to get price ID based on tier and interval
function getPriceId(planType: PlanType, billingInterval: BillingInterval): string {
  // These would normally come from environment variables or configuration
  const priceMap: Record<string, string> = {
    'FREETRIAL_monthly': process.env.NEXT_PUBLIC_STRIPE_PRICE_FREE_TRIAL || '',
    'STARTER_monthly': process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_MONTHLY || '',
    'STARTER_yearly': process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_ANNUAL || '',
    'GROWTH_monthly': process.env.NEXT_PUBLIC_STRIPE_PRICE_GROWTH_MONTHLY || '',
    'GROWTH_yearly': process.env.NEXT_PUBLIC_STRIPE_PRICE_GROWTH_ANNUAL || '',
    'TENANTFLOW_MAX_monthly': process.env.NEXT_PUBLIC_STRIPE_PRICE_MAX_MONTHLY || '',
    'TENANTFLOW_MAX_yearly': process.env.NEXT_PUBLIC_STRIPE_PRICE_MAX_ANNUAL || '',
  }

  return priceMap[`${planType}_${billingInterval}`] || ''
}