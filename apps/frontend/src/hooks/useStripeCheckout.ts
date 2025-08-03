import { useState, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api/axios-client'
import type { 
  CreateCheckoutSessionRequest, 
  CreateCheckoutSessionResponse,
  CreatePortalSessionResponse,
  StripeError,
  BillingInterval,
  PricingPlan 
} from '@tenantflow/shared'
import { getStripeErrorMessage } from '@tenantflow/shared'

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

    // Handle free plan differently - create free trial subscription
    if (plan.id === 'free') {
      try {
        setLoading(true)
        await api.billing.createFreeTrial()
        
        // Show success message and redirect to dashboard
        // Free trial created successfully
        window.location.href = '/dashboard?trial=started'
        return
      } catch (err) {
        // Free trial creation failed - handle error appropriately
        if (err instanceof Error) {
          setError(err.message)
        } else {
          setError('Failed to start free trial. Please try again.')
        }
        setLoading(false)
        return
      }
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
        customerId: user.stripeCustomerId || undefined,
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

      const response = await api.billing.createCheckoutSession({
        ...requestData,
        customerId: requestData.customerId || undefined
      } as Record<string, unknown>)

      const data: CreateCheckoutSessionResponse = response.data
      
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
      const requestData = {
        returnUrl: `${window.location.origin}/dashboard`,
      }

      const response = await api.billing.createPortalSession(requestData)

      const data: CreatePortalSessionResponse = response.data
      
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