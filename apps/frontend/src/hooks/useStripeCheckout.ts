import { useState, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import type { 
  CreateCheckoutSessionRequest, 
  CreateCheckoutSessionResponse,
  CreatePortalSessionRequest,
  CreatePortalSessionResponse,
  StripeError,
  BillingInterval,
  PricingPlan 
} from '@tenantflow/shared/types/stripe-pricing'
import { getStripeErrorMessage } from '@tenantflow/shared/types/stripe-pricing'

interface UseStripeCheckoutReturn {
  loading: boolean
  error: string | null
  createCheckoutSession: (plan: PricingPlan, billingInterval: BillingInterval) => Promise<void>
  openCustomerPortal: () => Promise<void>
  clearError: () => void
}

export function useStripeCheckout(): UseStripeCheckoutReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const createCheckoutSession = useCallback(async (
    plan: PricingPlan, 
    billingInterval: BillingInterval
  ) => {
    if (!user) {
      setError('You must be logged in to subscribe')
      return
    }

    // Handle free plan differently
    if (plan.id === 'free') {
      // Navigate to signup or activate free trial
      window.location.href = '/auth/signup'
      return
    }

    // Handle enterprise plan
    if (plan.id === 'enterprise') {
      // Open contact sales
      window.open('mailto:sales@tenantflow.app?subject=Enterprise Plan Inquiry', '_blank')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const requestData: CreateCheckoutSessionRequest = {
        lookupKey: plan.lookupKeys[billingInterval],
        billingInterval,
        customerId: user.stripeCustomerId,
        customerEmail: user.email,
        successUrl: `${window.location.origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${window.location.origin}/pricing`,
        mode: 'subscription',
        allowPromotionCodes: true,
        metadata: {
          userId: user.id,
          planId: plan.id,
          billingInterval,
        },
      }

      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.accessToken}`,
        },
        body: JSON.stringify(requestData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to create checkout session')
      }

      const data: CreateCheckoutSessionResponse = await response.json()
      
      // Redirect to Stripe Checkout
      window.location.href = data.url
      
    } catch (err) {
      console.error('Checkout error:', err)
      
      if (err && typeof err === 'object' && 'type' in err) {
        const stripeError = err as StripeError
        setError(getStripeErrorMessage(stripeError))
      } else if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('An unexpected error occurred. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }, [user])

  const openCustomerPortal = useCallback(async () => {
    if (!user?.stripeCustomerId) {
      setError('No billing information found')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const requestData: CreatePortalSessionRequest = {
        customerId: user.stripeCustomerId,
        returnUrl: `${window.location.origin}/dashboard`,
      }

      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.accessToken}`,
        },
        body: JSON.stringify(requestData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to open customer portal')
      }

      const data: CreatePortalSessionResponse = await response.json()
      
      // Redirect to Stripe Customer Portal
      window.location.href = data.url
      
    } catch (err) {
      console.error('Portal error:', err)
      
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('An unexpected error occurred. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }, [user])

  return {
    loading,
    error,
    createCheckoutSession,
    openCustomerPortal,
    clearError,
  }
}