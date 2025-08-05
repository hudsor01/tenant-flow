import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/axios-client'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import { handleApiError } from '@/lib/utils'
import type { PlanType, CheckoutResponse, PortalResponse } from '@repo/shared'

interface CreateCheckoutSessionParams {
  planType: PlanType
  billingInterval: 'monthly' | 'annual'
  successUrl?: string
  cancelUrl?: string
  couponId?: string
  [key: string]: unknown
}

interface CreatePortalSessionParams {
  returnUrl: string
}

interface PreviewSubscriptionUpdateParams {
  newPlanType: PlanType
  newBillingInterval: 'monthly' | 'annual'
  [key: string]: unknown
}

interface UpdatePaymentMethodParams {
  paymentMethodId: string
  setAsDefault?: boolean
  [key: string]: unknown
}

/**
 * Hook for billing operations using the new billing controller
 */
export function useBilling() {
  const queryClient = useQueryClient()

  // Create checkout session mutation
  const createCheckoutSession = useMutation({
    mutationFn: async (params: CreateCheckoutSessionParams) => {
      const response = await api.billing.createCheckoutSession(params)
      return response.data as CheckoutResponse
    },
    onSuccess: (data) => {
      logger.info('Checkout session created', undefined, { sessionId: data.sessionId })
      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url
      }
    },
    onError: (error) => {
      toast.error('Failed to create checkout session', {
        description: handleApiError(error)
      })
    }
  })

  // Create billing portal session mutation
  const createPortalSession = useMutation({
    mutationFn: async (params: CreatePortalSessionParams) => {
      const response = await api.billing.createPortalSession(params)
      return response.data as PortalResponse
    },
    onSuccess: (data) => {
      logger.info('Portal session created')
      // Redirect to Stripe Billing Portal
      if (data.url) {
        window.location.href = data.url
      }
    },
    onError: (error) => {
      toast.error('Failed to open billing portal', {
        description: handleApiError(error)
      })
    }
  })

  // Preview subscription update mutation
  const previewSubscriptionUpdate = useMutation({
    mutationFn: async (params: PreviewSubscriptionUpdateParams) => {
      const response = await api.billing.previewSubscriptionUpdate(params)
      return response.data
    },
    onError: (error) => {
      toast.error('Failed to preview subscription update', {
        description: handleApiError(error)
      })
    }
  })

  // Get payment methods query
  const { data: paymentMethods, isLoading: isLoadingPaymentMethods } = useQuery({
    queryKey: ['billing', 'payment-methods'],
    queryFn: async () => {
      const response = await api.billing.getPaymentMethods()
      return response.data
    }
  })

  // Update payment method mutation
  const updatePaymentMethod = useMutation({
    mutationFn: async (params: UpdatePaymentMethodParams) => {
      const response = await api.billing.updatePaymentMethod(params)
      return response.data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['billing', 'payment-methods'] })
      toast.success('Payment method updated successfully')
    },
    onError: (error) => {
      toast.error('Failed to update payment method', {
        description: handleApiError(error)
      })
    }
  })

  // Handle checkout success
  const handleCheckoutSuccess = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await api.billing.handleCheckoutSuccess(sessionId)
      return response.data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
      toast.success('Subscription activated successfully!')
    },
    onError: (error) => {
      toast.error('Failed to complete checkout', {
        description: handleApiError(error)
      })
    }
  })

  return {
    // Mutations
    createCheckoutSession: createCheckoutSession.mutateAsync,
    createPortalSession: createPortalSession.mutateAsync,
    previewSubscriptionUpdate: previewSubscriptionUpdate.mutateAsync,
    updatePaymentMethod: updatePaymentMethod.mutateAsync,
    handleCheckoutSuccess: handleCheckoutSuccess.mutateAsync,
    
    // Loading states
    isCreatingCheckout: createCheckoutSession.isPending,
    isCreatingPortal: createPortalSession.isPending,
    isPreviewing: previewSubscriptionUpdate.isPending,
    isUpdatingPaymentMethod: updatePaymentMethod.isPending,
    
    // Data
    paymentMethods,
    isLoadingPaymentMethods,
    
    // Preview data
    previewData: previewSubscriptionUpdate.data
  }
}