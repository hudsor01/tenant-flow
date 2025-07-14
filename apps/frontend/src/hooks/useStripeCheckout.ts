import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from './useAuth'
import { trpc } from '@/lib/trpcClient'
import { PlanType, BillingPeriod } from '@/types/prisma-types'

interface CreateCheckoutSessionParams {
  planId: PlanType
  billingPeriod: BillingPeriod
  successUrl?: string
  cancelUrl?: string
}

interface CheckoutSessionResponse {
  subscriptionId: string
  url?: string
  clientSecret?: string
}

export function useStripeCheckout() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [isLoading, setIsLoading] = useState(false)

  const createCheckoutSession = trpc.subscriptions.create.useMutation({
    onSuccess: () => {
      // Invalidate subscription queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['subscription'] })
    },
    onError: (error) => {
      console.error('Checkout creation failed:', error)
    },
  })

  const redirectToCheckout = async (params: CreateCheckoutSessionParams) => {
    setIsLoading(true)
    try {
      const result = await createCheckoutSession.mutateAsync({
        planId: params.planId,
        billingPeriod: params.billingPeriod,
      })

      // For subscriptions that require payment (will have clientSecret)
      if (result.clientSecret) {
        // This should redirect to a payment confirmation page
        // that handles the client secret with Stripe
        const confirmUrl = `${params.successUrl || '/billing/confirm'}?subscription_id=${result.subscriptionId}&client_secret=${result.clientSecret}`
        window.location.href = confirmUrl
      } else {
        // Free trial or successful subscription - redirect to success
        window.location.href = params.successUrl || '/billing/success'
      }
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