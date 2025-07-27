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
import { honoClient } from '@/lib/clients/hono-client'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import { handleApiError } from '@/lib/utils'
import { useAuth } from './useAuth'
import type { PLAN_TYPE } from '@tenantflow/shared'

// Stripe Payment Intent types based on official Stripe documentation
interface SubscriptionCreateResponse {
  subscriptionId: string
  clientSecret?: string // When payment is required
  status: 'active' | 'trialing' | 'incomplete' | 'incomplete_expired'
  trialEnd?: string
}

interface DirectSubscriptionParams {
  priceId: string
  planType: keyof typeof PLAN_TYPE
  paymentMethodId?: string // Optional for immediate payment
  defaultPaymentMethod?: boolean // Set as default for future payments
}

interface SubscriptionUpdateParams {
  subscriptionId: string
  newPriceId: string
  prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice'
}

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
      paymentMethodId,
      defaultPaymentMethod = true
    }: DirectSubscriptionParams): Promise<SubscriptionCreateResponse> => {
      if (!user?.id) {
        throw new Error('User authentication required')
      }

      setIsProcessing(true)
      setError(null)

      try {
        // Step 1: Create subscription with payment_behavior=default_incomplete
        // This creates subscription in incomplete status if payment is required
        const response = await honoClient.api.v1.subscriptions.direct.$post({
          json: {
            priceId,
            planType,
            paymentMethodId,
            defaultPaymentMethod,
            paymentBehavior: 'default_incomplete' // Stripe recommended for subscriptions
          }
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.message || 'Failed to create subscription')
        }

        const data = await response.json() as SubscriptionCreateResponse

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
    onSuccess: (data: SubscriptionCreateResponse) => {
      // Invalidate subscription queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
      
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
      subscriptionId,
      newPriceId,
      prorationBehavior = 'create_prorations'
    }: SubscriptionUpdateParams) => {
      const response = await honoClient.api.v1.subscriptions[':id'].$put({
        param: { id: subscriptionId },
        json: {
          priceId: newPriceId,
          prorationBehavior
        }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update subscription')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
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
      const response = await honoClient.api.v1.subscriptions[':id'].cancel.$post({
        param: { id: params.subscriptionId },
        json: {
          cancelAtPeriodEnd: params.cancelAtPeriodEnd ?? true,
          cancellationReason: params.cancellationReason
        }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to cancel subscription')
      }

      return response.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
      
      const message = variables.cancelAtPeriodEnd 
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
    mutationFn: async (params: SubscriptionUpdateParams) => {
      const response = await honoClient.api.v1.subscriptions[':id'].preview.$post({
        param: { id: params.subscriptionId },
        json: {
          priceId: params.newPriceId,
          prorationBehavior: params.prorationBehavior || 'create_prorations'
        }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to preview subscription update')
      }

      return response.json()
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

/**
 * Legacy export for backward compatibility
 * @deprecated Use useDirectSubscription instead
 */
export const useCreateDirectSubscription = () => {
  const { createDirectSubscription, isCreating, createMutation } = useDirectSubscription()
  
  return {
    mutateAsync: createDirectSubscription,
    mutate: createMutation.mutate,
    isPending: isCreating,
    error: createMutation.error
  }
}

/**
 * Legacy export for backward compatibility  
 * @deprecated Use useDirectSubscription instead
 */
export const useCancelSubscription = () => {
  const { cancelDirectSubscription, isCanceling, cancelMutation } = useDirectSubscription()
  
  return {
    mutateAsync: cancelDirectSubscription,
    mutate: cancelMutation.mutate,
    isPending: isCanceling,
    error: cancelMutation.error
  }
}