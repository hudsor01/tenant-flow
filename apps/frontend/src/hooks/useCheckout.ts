import { useState } from 'react'
import { useStripe, useElements } from '@stripe/react-stripe-js'
import { getPlanWithUIMapping } from '@/lib/subscription-utils'
import { toast } from 'sonner'
import { 
  useStartFreeTrial, 
  useCreatePortalSession
} from '@/hooks/useSubscription'
import { useDirectSubscription } from '@/hooks/useDirectSubscription'
import type { CheckoutParams, TrialParams } from '@tenantflow/shared/types/api-inputs'
import type { TrialResponse } from '@tenantflow/shared/types/responses'

// Re-export the TrialResponse type to ensure it's properly available
export type { TrialResponse }

/**
 * Direct subscription checkout hook - replaces checkout sessions
 * Based on Stripe sample: https://github.com/stripe-samples/subscription-use-cases
 */
export function useCheckout() {
  const stripe = useStripe()
  const elements = useElements()
  const [isLoading, setIsLoading] = useState(false)

  // Mutations
  const { createDirectSubscription, cancelDirectSubscription } = useDirectSubscription()
  const startFreeTrial = useStartFreeTrial()
  const createPortalSession = useCreatePortalSession()

  // Create subscription directly with Elements integration
  const createSubscription = async ({
    planType,
    billingInterval,
    billingName
  }: CheckoutParams) => {
    if (!stripe || !elements) {
      toast.error('Stripe has not loaded yet. Please try again.')
      return { success: false, error: 'Stripe not loaded' }
    }

    setIsLoading(true)
    try {
      // Get price ID for the plan
      const plan = getPlanWithUIMapping(planType)
      if (!plan) {
        throw new Error('Invalid plan type')
      }

      const priceId = billingInterval === 'annual' 
        ? plan.stripeAnnualPriceId 
        : plan.stripeMonthlyPriceId

      if (!priceId) {
        throw new Error('Price ID not configured for this plan')
      }

      // Create subscription with default_incomplete behavior
      const result = await createDirectSubscription({
        priceId,
        planType
      })


      // If payment is required, use Elements to confirm with official Stripe types
      if (result.clientSecret && result.status === 'incomplete') {
        const confirmPaymentOptions = {
          return_url: `${window.location.origin}/subscription/success`,
          ...(billingName && {
            payment_method_data: {
              billing_details: {
                name: billingName
              }
            }
          })
        }

        const confirmResult = await stripe.confirmPayment({
          elements,
          clientSecret: result.clientSecret,
          confirmParams: confirmPaymentOptions,
          redirect: 'if_required'
        })

        if (confirmResult.error) {
          throw new Error(confirmResult.error.message || 'Payment confirmation failed')
        }

        toast.success('Subscription activated successfully!')
        
        return { 
          success: true, 
          subscriptionId: result.subscriptionId,
          status: 'active'
        }
      }

      // Subscription is active immediately (e.g., trial)
      if (result.status === 'trialing' || result.status === 'active') {
        toast.success('Subscription activated!')
        return { 
          success: true, 
          subscriptionId: result.subscriptionId,
          status: result.status
        }
      }

      return {
        success: false,
        error: `Unexpected subscription status: ${result.status}`
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create subscription'
      toast.error(message)
      return { success: false, error: message }
    } finally {
      setIsLoading(false)
    }
  }

  // Start free trial
  const startTrial = async ({ onSuccess }: TrialParams = {}): Promise<TrialResponse> => {
    setIsLoading(true)
    try {
      const result = await startFreeTrial.mutateAsync()
      
      if (result.success && result.subscriptionId) {
        toast.success('Free trial activated! Your trial ends on ' + 
          new Date(result.trialEnd!).toLocaleDateString())
        
        // Call onSuccess callback if provided
        onSuccess?.(result.subscriptionId)
        
        return result
      } else {
        throw new Error('Failed to start free trial')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start trial'
      toast.error(message)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  // Open customer portal
  const openPortal = async (returnUrl?: string) => {
    setIsLoading(true)
    try {
      const result = await createPortalSession.mutateAsync({
        returnUrl: returnUrl || `${window.location.origin}/dashboard?portal=return`
      })

      if (result.url) {
        window.location.href = result.url
      } else {
        throw new Error('No portal URL received')
      }

      return result
    } catch (error) {
      toast.error('Failed to open billing portal')
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  return {
    createSubscription,
    createCheckout: createSubscription, // Alias for backward compatibility
    startTrial,
    openPortal,
    cancelSubscription: (variables: { id: string }) => cancelDirectSubscription({ subscriptionId: variables.id }),
    isLoading,
    // Individual loading states
    isCreatingSubscription: false, // Using async function directly
    isStartingTrial: startFreeTrial.isPending,
    isOpeningPortal: createPortalSession.isPending,
    isCanceling: false, // Using async function directly
    // Errors
    subscriptionError: null, // Using async function directly
    trialError: startFreeTrial.error,
    portalError: createPortalSession.error,
    cancelError: null // Using async function directly
  }
}