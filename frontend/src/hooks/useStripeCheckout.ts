import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from './useAuth'

interface CreateCheckoutSessionParams {
  planId: string
  billingPeriod: 'monthly' | 'annual'
  successUrl?: string
  cancelUrl?: string
}

interface CheckoutSessionResponse {
  sessionId: string
  url: string
}

export function useStripeCheckout() {
  const { user, getToken } = useAuth()
  const queryClient = useQueryClient()
  const [isLoading, setIsLoading] = useState(false)

  const createCheckoutSession = useMutation({
    mutationFn: async (params: CreateCheckoutSessionParams): Promise<CheckoutSessionResponse> => {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken() || ''}`
        },
        body: JSON.stringify({
          planId: params.planId,
          billingPeriod: params.billingPeriod,
          userId: user?.id,
          successUrl: params.successUrl || `${window.location.origin}/billing/success`,
          cancelUrl: params.cancelUrl || `${window.location.origin}/billing/cancel`,
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create checkout session')
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidate subscription queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['subscription'] })
    },
  })

  const redirectToCheckout = async (params: CreateCheckoutSessionParams) => {
    setIsLoading(true)
    try {
      const session = await createCheckoutSession.mutateAsync(params)
      window.location.href = session.url
    } catch (error) {
      console.error('Checkout failed:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  return {
    createCheckoutSession: createCheckoutSession.mutate,
    redirectToCheckout,
    isLoading: isLoading || createCheckoutSession.isPending,
    error: createCheckoutSession.error,
    isSuccess: createCheckoutSession.isSuccess,
    data: createCheckoutSession.data,
  }
}