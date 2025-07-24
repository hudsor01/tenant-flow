import { useState } from 'react'
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js'
import { trpc } from '@/lib/clients'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import type { PLAN_TYPE } from '@tenantflow/shared'

interface DirectSubscriptionParams {
  priceId: string
  planType: keyof typeof PLAN_TYPE
  billingName: string
}

interface SubscriptionUpdateParams {
  subscriptionId: string
  newPriceId: string
}

/**
 * Hook for direct subscription creation (without checkout session)
 * Based on Stripe's recommended pattern: https://github.com/stripe-samples/subscription-use-cases
 * 
 * This provides more control over the subscription flow compared to checkout sessions.
 */
export function useDirectSubscription() {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Mutations
  const createSubscription = trpc.subscriptions.createDirect.useMutation()
  const updateSubscription = trpc.subscriptions.updateDirect.useMutation()
  const previewUpdate = trpc.subscriptions.previewUpdate.useMutation()
  const cancelSubscription = trpc.subscriptions.cancel.useMutation()

  /**
   * Create a new subscription with direct payment
   */
  const createDirectSubscription = async ({
    priceId,
    planType,
    billingName
  }: DirectSubscriptionParams) => {
    if (!stripe || !elements) {
      setError('Stripe has not loaded yet. Please try again.')
      return { success: false }
    }

    setIsProcessing(true)
    setError(null)

    try {
      // Get card element
      const cardElement = elements.getElement(CardElement)
      if (!cardElement) {
        throw new Error('Card element not found')
      }

      // Create subscription on backend
      const { subscriptionId, clientSecret, status } = await createSubscription.mutateAsync({
        priceId,
        planType
      })

      logger.info('Direct subscription created', undefined, { subscriptionId, status })

      // If payment is required, confirm it
      if (clientSecret && status === 'incomplete') {
        const { error: confirmError } = await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: billingName
            }
          }
        })

        if (confirmError) {
          throw confirmError
        }

        logger.info('Payment confirmed for subscription', undefined, { subscriptionId })
        toast.success('Subscription activated successfully!')
        
        return { 
          success: true, 
          subscriptionId,
          requiresAction: false
        }
      }

      // Subscription might be active immediately (e.g., trial)
      if (status === 'trialing' || status === 'active') {
        toast.success('Subscription activated!')
        return { 
          success: true, 
          subscriptionId,
          requiresAction: false
        }
      }

      // Handle other statuses
      return {
        success: false,
        error: `Unexpected subscription status: ${status}`
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create subscription'
      logger.error('Direct subscription creation failed', err as Error)
      setError(errorMessage)
      toast.error(errorMessage)
      
      return { 
        success: false, 
        error: errorMessage 
      }
    } finally {
      setIsProcessing(false)
    }
  }

  /**
   * Update existing subscription (change plan)
   */
  const updateDirectSubscription = async ({
    subscriptionId,
    newPriceId
  }: SubscriptionUpdateParams) => {
    if (!stripe) {
      setError('Stripe has not loaded yet. Please try again.')
      return { success: false }
    }

    setIsProcessing(true)
    setError(null)

    try {
      const result = await updateSubscription.mutateAsync({
        subscriptionId,
        newPriceId
      })

      // If payment is required for proration
      if (result.clientSecret) {
        const { error: confirmError } = await stripe.confirmCardPayment(result.clientSecret)
        
        if (confirmError) {
          throw confirmError
        }
      }

      logger.info('Subscription updated', undefined, { subscriptionId, newPriceId })
      toast.success('Subscription plan updated successfully!')
      
      return { success: true }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update subscription'
      logger.error('Subscription update failed', err as Error)
      setError(errorMessage)
      toast.error(errorMessage)
      
      return { 
        success: false, 
        error: errorMessage 
      }
    } finally {
      setIsProcessing(false)
    }
  }

  /**
   * Preview subscription update to show prorated amounts
   */
  const previewSubscriptionUpdate = async ({
    subscriptionId,
    newPriceId
  }: SubscriptionUpdateParams) => {
    try {
      const preview = await previewUpdate.mutateAsync({
        subscriptionId,
        newPriceId
      })

      return {
        success: true,
        preview
      }
    } catch (err) {
      logger.error('Failed to preview subscription update', err as Error)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to preview update'
      }
    }
  }

  /**
   * Cancel subscription
   */
  const cancelDirectSubscription = async (
    subscriptionId: string,
    cancelAtPeriodEnd = true
  ) => {
    setIsProcessing(true)
    setError(null)

    try {
      const result = await cancelSubscription.mutateAsync({
        subscriptionId,
        cancelAtPeriodEnd
      })

      const message = cancelAtPeriodEnd 
        ? 'Subscription will be canceled at the end of the billing period'
        : 'Subscription canceled immediately'
      
      logger.info(message, undefined, { subscriptionId })
      toast.success(message)
      
      return { 
        success: true,
        ...result
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel subscription'
      logger.error('Subscription cancellation failed', err as Error)
      setError(errorMessage)
      toast.error(errorMessage)
      
      return { 
        success: false, 
        error: errorMessage 
      }
    } finally {
      setIsProcessing(false)
    }
  }

  return {
    // Methods
    createDirectSubscription,
    updateDirectSubscription,
    previewSubscriptionUpdate,
    cancelDirectSubscription,
    
    // State
    isProcessing,
    error,
    
    // Individual loading states
    isCreating: createSubscription.isPending,
    isUpdating: updateSubscription.isPending,
    isPreviewing: previewUpdate.isPending,
    isCanceling: cancelSubscription.isPending
  }
}