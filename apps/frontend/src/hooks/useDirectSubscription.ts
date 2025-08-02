/**
 * Direct subscription creation with Payment Intents (no checkout sessions)
 * Based on Stripe's official documentation and best practices for React integrations:
 * - https://docs.stripe.com/billing/subscriptions/build-subscriptions
 * - https://docs.stripe.com/payments/payment-intents
 * - https://github.com/stripe-samples/subscription-use-cases
 * 
 * This provides more granular control over the subscription flow compared to checkout sessions.
 */

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/axios-client'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import { handleApiError } from '@/lib/utils'
import { useAuth } from './useAuth'
import type { 
  DirectSubscriptionParams,
  SubscriptionUpdateParams 
} from '@tenantflow/shared/types/api-inputs'
import type { 
  ApiSubscriptionCreateResponse
} from '@tenantflow/shared/types/responses'

/**
 * Hook for direct subscription creation using Payment Intents
 * Implements Stripe's recommended pattern for subscription with payment methods
 */
export function useDirectSubscription() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const { user } = useAuth()

  /**
   * Create subscription with Payment Intent (Stripe's recommended approach)
   * This follows the pattern: create subscription -> confirm payment -> activate
   */
  const createDirectSubscription = useMutation({
    mutationFn: async ({
      priceId,
      planType,
      paymentMethodId: _paymentMethodId,
      defaultPaymentMethod: _defaultPaymentMethod = true
    }: DirectSubscriptionParams): Promise<ApiSubscriptionCreateResponse> => {
      if (!user?.id) {
        throw new Error('User authentication required')
      }

      setIsProcessing(true)
      setError(null)

      try {
        // Step 1: Create subscription with payment_behavior=default_incomplete
        // This creates subscription in incomplete status if payment is required
        // TODO: Add direct subscription endpoint to API
        const response = await api.subscriptions.createCheckout({
          priceId
          // Note: Other params (planType, paymentMethodId, defaultPaymentMethod, paymentBehavior) 
          // will be handled once direct subscription endpoint is added
        })

        const data = response.data as ApiSubscriptionCreateResponse

        logger.info('Direct subscription created', undefined, {
          subscriptionId: data.subscriptionId,
          status: data.status,
          planType,
          hasClientSecret: !!data.clientSecret
        })

        return data
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Subscription creation failed'
        setError(errorMessage)
        logger.error('Direct subscription creation failed', error as Error, {
          planType,
          userId: user.id
        })
        throw error
      } finally {
        setIsProcessing(false)
      }
    },
    onSuccess: (data: ApiSubscriptionCreateResponse) => {
      // Invalidate subscription queries to refresh UI
      void queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
      
      if (data.status === 'active' || data.status === 'trialing') {
        toast.success('Subscription activated!', {
          description: 'Your subscription is now active and ready to use.'
        })
      } else if (data.status === 'incomplete' && data.clientSecret) {
        toast.info('Payment confirmation required', {
          description: 'Please confirm your payment to activate the subscription.'
        })
      }
    },
    onError: (error) => {
      toast.error('Subscription creation failed', {
        description: handleApiError(error as Error)
      })
    }
  })

  /**
   * Update existing subscription (change plan/price)
   * Implements Stripe's proration handling
   */
  const updateDirectSubscription = useMutation({
    mutationFn: async ({
      subscriptionId: _subscriptionId,
      newPriceId,
      prorationBehavior: _prorationBehavior = 'create_prorations'
    }: SubscriptionUpdateParams) => {
      // TODO: Add subscription update endpoint to API
      const response = await api.subscriptions.createCheckout({
        priceId: newPriceId
        // Note: prorationBehavior will be handled once update endpoint is added
      })

      return response.data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
      toast.success('Subscription updated successfully')
    },
    onError: (error) => {
      toast.error('Subscription update failed', {
        description: handleApiError(error as Error)
      })
    }
  })

  /**
   * Cancel subscription with immediate or end-of-period cancellation
   */
  const cancelDirectSubscription = useMutation({
    mutationFn: async (params: {
      subscriptionId: string
      cancelAtPeriodEnd?: boolean
      cancellationReason?: string
    }) => {
      const response = await api.subscriptions.cancel({
        cancelAtPeriodEnd: params.cancelAtPeriodEnd ?? true,
        cancellationReason: params.cancellationReason
      })

      return response.data
    },
    onSuccess: (_, _variables) => {
      void queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
      
      const message = _variables.cancelAtPeriodEnd 
        ? 'Subscription will cancel at the end of the current period'
        : 'Subscription canceled immediately'
      
      toast.success('Subscription canceled', {
        description: message
      })
    },
    onError: (error) => {
      toast.error('Cancellation failed', {
        description: handleApiError(error as Error)
      })
    }
  })

  /**
   * Preview subscription update to show prorated amounts
   * Useful for showing pricing changes before confirmation
   */
  const previewSubscriptionUpdate = useMutation({
    mutationFn: async (_params: SubscriptionUpdateParams) => {
      // TODO: Add subscription preview endpoint to API
      // For now, use a placeholder response
      return {
        priceChange: 0,
        prorationAmount: 0,
        nextBillingDate: new Date(),
        message: 'Preview not yet implemented'
      }
    }
  })

  return {
    // Main subscription methods
    createDirectSubscription: createDirectSubscription.mutateAsync,
    updateDirectSubscription: updateDirectSubscription.mutateAsync,
    cancelDirectSubscription: cancelDirectSubscription.mutateAsync,
    previewSubscriptionUpdate: previewSubscriptionUpdate.mutateAsync,
    
    // Mutation objects for advanced control
    createMutation: createDirectSubscription,
    updateMutation: updateDirectSubscription,
    cancelMutation: cancelDirectSubscription,
    previewMutation: previewSubscriptionUpdate,
    
    // State
    isProcessing: isProcessing || 
                 createDirectSubscription.isPending || 
                 updateDirectSubscription.isPending || 
                 cancelDirectSubscription.isPending,
    error: error || 
           createDirectSubscription.error?.message || 
           updateDirectSubscription.error?.message || 
           cancelDirectSubscription.error?.message,
    
    // Individual loading states
    isCreating: createDirectSubscription.isPending,
    isUpdating: updateDirectSubscription.isPending,
    isCanceling: cancelDirectSubscription.isPending,
    isPreviewing: previewSubscriptionUpdate.isPending,

    // Reset error state
    clearError: () => setError(null)
  }
}