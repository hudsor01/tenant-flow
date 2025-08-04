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
} from '@repo/shared'
import { getStripeErrorMessage } from '@repo/shared'

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
    // Remove user check - users should be able to subscribe without logging in first
    // Stripe checkout will handle email collection and account creation

    // Handle free plan differently
    if (plan.id === 'free') {
      // For free trial, redirect to signup page
      // The signup flow will handle the free trial creation
      window.location.href = '/auth/Signup?plan=free'
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
        // Only pass customer info if user is logged in
        customerId: user?.stripeCustomerId || undefined,
        customerEmail: user?.email || undefined,
        successUrl: `${window.location.origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${window.location.origin}/pricing`,
        mode: 'subscription',
        allowPromotionCodes: true,
        metadata: {
          // Pass userId only if available
          userId: user?.id || '',
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