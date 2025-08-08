import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import type { BillingInterval, PlanType, ProductTierConfig } from '@repo/shared'

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

export function useStripeCheckout() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const createCheckoutSession = useCallback(async (
    tier: ProductTierConfig,
    billingInterval: BillingInterval,
    planType: PlanType
  ) => {
    setLoading(true)
    setError(null)

    try {
      // Get the correct price ID based on billing interval
      const priceId = billingInterval === 'yearly' 
        ? tier.stripePriceIds.annual 
        : tier.stripePriceIds.monthly

      if (!priceId) {
        throw new Error(`No price ID found for ${tier.name} ${billingInterval} plan`)
      }

      // Call the backend API to create checkout session
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/stripe/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          priceId,
          billingInterval, // Backend requires this field
          mode: 'subscription',
          successUrl: `${window.location.origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.origin}/pricing`,
          allowPromotionCodes: true,
          metadata: {
            planType,
            billingInterval,
            tier: tier.name
          }
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        
        // If it's a 404, the endpoint doesn't exist yet
        if (response.status === 404) {
          // For now, redirect to signup for free trial
          if ((planType as string) === 'free_trial') {
            router.push('/auth/signup')
            return
          }
          
          // Use dynamic checkout session for paid plans
          console.warn('Implement dynamic Stripe Checkout Session creation for priceId:', priceId)
          setError('Stripe checkout not yet implemented for paid plans. Please contact support.')

          throw new Error('Checkout endpoint not available. Please contact support.')
        }

        throw new Error(
          errorData?.message || 
          errorData?.error || 
          `Failed to create checkout session (${response.status})`
        )
      }

      const data = await response.json()

      // According to Stripe docs, prefer using the URL for redirect
      if (data.url) {
        // Direct redirect using the checkout URL (recommended approach)
        window.location.href = data.url
      } else if (data.sessionId) {
        const stripe = await stripePromise
        if (!stripe) {
          throw new Error('Stripe failed to load')
        }

        const { error: stripeError } = await stripe.redirectToCheckout({
          sessionId: data.sessionId,
        })

        if (stripeError) {
          throw new Error(stripeError.message)
        }
      } else {
        throw new Error('No checkout URL or session ID returned from server')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create checkout session'
      console.error('Checkout error:', err)
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [router])

  const openCustomerPortal = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Call backend to create portal session
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/stripe/create-portal-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          returnUrl: window.location.href,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        
        // If endpoint doesn't exist, show a helpful message
        if (response.status === 404) {
          throw new Error('Billing portal not available. Please contact support to manage your subscription.')
        }

        throw new Error(
          errorData?.message || 
          errorData?.error || 
          `Failed to open billing portal (${response.status})`
        )
      }

      const data = await response.json()

      if (!data.url) {
        throw new Error('No portal URL returned from server')
      }

      // Redirect to Stripe Customer Portal
      window.location.href = data.url
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to open billing portal'
      console.error('Portal error:', err)
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    createCheckoutSession,
    openCustomerPortal,
    clearError,
  }
}