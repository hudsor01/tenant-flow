import { useState } from 'react'
import { trpc } from '@/lib/clients'
import { useStripe, useElements } from '@stripe/react-stripe-js'
import type { PLAN_TYPE } from '@tenantflow/shared'
import { getPlanById } from '@/lib/utils/subscription-utils'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'

interface CheckoutParams {
  planType: keyof typeof PLAN_TYPE
  billingInterval: 'monthly' | 'annual'
  billingName?: string
}

interface TrialParams {
  onSuccess?: (subscriptionId: string) => void
}

/**
 * Direct subscription checkout hook - replaces checkout sessions
 * Based on Stripe sample: https://github.com/stripe-samples/subscription-use-cases
 */
export function useCheckout() {
  const stripe = useStripe()
  const elements = useElements()
  const [isLoading, setIsLoading] = useState(false)

  // Mutations
  const createDirectSubscription = trpc.subscriptions.createDirect.useMutation()
  const startFreeTrial = trpc.subscriptions.startFreeTrial.useMutation()
  const createPortalSession = trpc.subscriptions.createPortalSession.useMutation()
  const cancelSubscription = trpc.subscriptions.cancel.useMutation()

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
      const plan = getPlanById(planType)
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
      const result = await createDirectSubscription.mutateAsync({
        priceId,
        planType
      })

      logger.info('Direct subscription created', undefined, { 
        subscriptionId: result.subscriptionId, 
        status: result.status 
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

        logger.info('Payment confirmed for subscription', undefined, { subscriptionId: result.subscriptionId })
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
      logger.error('Failed to create subscription', error as Error)
      const message = error instanceof Error ? error.message : 'Failed to create subscription'
      toast.error(message)
      return { success: false, error: message }
    } finally {
      setIsLoading(false)
    }
  }

  // Start free trial
  const startTrial = async ({ onSuccess }: TrialParams = {}) => {
    setIsLoading(true)
    try {
      const result = await startFreeTrial.mutateAsync()
      
      if (result.success && result.subscriptionId) {
        logger.info('Free trial started', undefined, {
          subscriptionId: result.subscriptionId,
          status: result.status,
          trialEnd: result.trialEnd
        })
        
        toast.success('Free trial activated! Your trial ends on ' + 
          new Date(result.trialEnd).toLocaleDateString())
        
        // Call onSuccess callback if provided
        onSuccess?.(result.subscriptionId)
        
        return result
      } else {
        throw new Error('Failed to start free trial')
      }
    } catch (error) {
      logger.error('Failed to start trial', error as Error)
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

      logger.info('Portal session created')
      return result
    } catch (error) {
      logger.error('Failed to create portal session', error as Error)
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
    cancelSubscription: cancelSubscription.mutate,
    isLoading,
    // Individual loading states
    isCreatingSubscription: createDirectSubscription.isPending,
    isStartingTrial: startFreeTrial.isPending,
    isOpeningPortal: createPortalSession.isPending,
    isCanceling: cancelSubscription.isPending,
    // Errors
    subscriptionError: createDirectSubscription.error,
    trialError: startFreeTrial.error,
    portalError: createPortalSession.error,
    cancelError: cancelSubscription.error
  }
}