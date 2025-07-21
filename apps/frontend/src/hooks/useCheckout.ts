import { useState } from 'react'
import { trpc } from '@/lib/api'
import { PLAN_TYPE } from '@tenantflow/shared/types'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'

interface CheckoutParams {
  planType: keyof typeof PLAN_TYPE
  billingInterval: 'monthly' | 'annual'
  successUrl?: string
  cancelUrl?: string
  uiMode?: 'embedded' | 'hosted'
}

interface TrialParams {
  onSuccess?: () => void
}

/**
 * Unified checkout hook for all subscription operations
 * Consolidates checkout, trial, and portal functionality
 */
export function useCheckout() {
  const [isLoading, setIsLoading] = useState(false)

  // Mutations
  const createCheckoutSession = trpc.subscriptions.createCheckoutSession.useMutation()
  const startFreeTrial = trpc.subscriptions.startFreeTrial.useMutation()
  const createPortalSession = trpc.subscriptions.createPortalSession.useMutation()

  // Create checkout session for paid plans
  const createCheckout = async ({
    planType,
    billingInterval,
    successUrl = `${window.location.origin}/dashboard?subscription=success`,
    cancelUrl = `${window.location.origin}/pricing`,
    uiMode = 'hosted'
  }: CheckoutParams) => {
    setIsLoading(true)
    try {
      const result = await createCheckoutSession.mutateAsync({
        planType,
        billingInterval,
        collectPaymentMethod: true,
        successUrl,
        cancelUrl,
        uiMode
      })

      // For hosted checkout, redirect to Stripe
      if (uiMode === 'hosted' && result.url) {
        window.location.href = result.url
      } else if (uiMode === 'embedded' && result.clientSecret) {
        // For embedded checkout, return the client secret
        logger.info('Embedded checkout session created', { planType, billingInterval })
        return result
      } else {
        throw new Error('Invalid checkout response')
      }

      logger.info('Checkout session created', { planType, billingInterval, uiMode })
      return result
    } catch (error) {
      logger.error('Failed to create checkout session', error as Error)
      toast.error('Failed to start checkout process')
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  // Start free trial
  const startTrial = async ({ onSuccess }: TrialParams = {}) => {
    setIsLoading(true)
    try {
      const result = await startFreeTrial.mutateAsync()
      
      // Redirect to Stripe Checkout for trial setup
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl
      } else {
        throw new Error('No checkout URL received')
      }
      
      logger.info('Redirecting to checkout for trial setup')
      // Note: onSuccess will be called when user returns from checkout
      return result
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
    createCheckout,
    startTrial,
    openPortal,
    isLoading,
    // Individual loading states
    isCreatingCheckout: createCheckoutSession.isPending,
    isStartingTrial: startFreeTrial.isPending,
    isOpeningPortal: createPortalSession.isPending,
    // Errors
    checkoutError: createCheckoutSession.error,
    trialError: startFreeTrial.error,
    portalError: createPortalSession.error
  }
}