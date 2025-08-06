import { useState, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api/axios-client'
import type { 
  CreateCheckoutSessionResponse,
  CreatePortalSessionResponse,
  StripeError,
  BillingInterval,
  ProductTierConfig,
  PlanType 
} from '@repo/shared'
import { getStripeErrorMessage } from '@repo/shared'

interface UseStripeCheckoutReturn {
  loading: boolean
  error: string | null
  createCheckoutSession: (tierConfig: ProductTierConfig, billingInterval: BillingInterval, planType?: PlanType) => Promise<void>
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
    _tierConfig: ProductTierConfig,
    billingInterval: BillingInterval,
    planType?: PlanType
  ) => {
    // For FREETRIAL tier, redirect to signup
    if (planType === 'FREETRIAL') {
      window.location.href = '/auth/signup?plan=free'
      return
    }

    // For TENANTFLOW_MAX tier, open contact sales  
    if (planType === 'TENANTFLOW_MAX') {
      window.open('mailto:sales@tenantflow.app?subject=TenantFlow Max Plan Inquiry', '_blank')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Use the new backend API that expects planType and billingInterval
      const requestData = {
        planType: planType || 'STARTER',
        billingInterval,
        customerId: user?.stripeCustomerId || undefined,
        customerEmail: user?.email || undefined,
        successUrl: `${window.location.origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${window.location.origin}/pricing`,
      }

      const response = await api.subscriptions.createCheckout(requestData)
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