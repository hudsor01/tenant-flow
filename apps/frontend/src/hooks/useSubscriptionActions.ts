/**
 * Consolidated Subscription Actions Hook - Management Operations
 * 
 * Combines all subscription management operations into one hook.
 * Replaces: use-subscription-management.ts, use-subscription-sync.ts, 
 * useDirectSubscription.ts, and mutation parts of use-billing.ts
 */

import { useCallback, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from './use-auth'
import { logger } from '@/lib/logger'
import { toast } from 'sonner'
import type { 
  PlanType,
  SubscriptionSyncResult,
  Subscription,
  CreateCheckoutSessionRequest,
  CreateCheckoutSessionResponse,
  SubscriptionUpdateParams,
  PaymentMethod,
  CreatePortalInput
} from '@repo/shared'

// Unified result interface
export interface SubscriptionActionResult {
  success: boolean
  subscription?: Subscription
  checkoutUrl?: string
  error?: string
  changes: string[]
  metadata: {
    operation: string
    fromPlan?: PlanType
    toPlan?: PlanType
    correlationId: string
    timestamp: string
  }
}

// Request interfaces
export interface UpgradeRequest {
  targetPlan: PlanType
  billingCycle: 'monthly' | 'annual'
  prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice'
}

export interface DowngradeRequest {
  targetPlan: PlanType
  billingCycle: 'monthly' | 'annual'
  effectiveDate?: 'immediate' | 'end_of_period'
  reason?: string
}

export interface CancelRequest {
  cancelAt: 'immediate' | 'end_of_period'
  reason?: string
  feedback?: string
}

export interface CheckoutRequest {
  planType: PlanType
  billingCycle: 'monthly' | 'annual'
  successUrl: string
  cancelUrl: string
}

// Hook interface
interface SubscriptionActionsHook {
  // Plan management
  upgradePlan: (request: UpgradeRequest) => Promise<SubscriptionActionResult>
  downgradePlan: (request: DowngradeRequest) => Promise<SubscriptionActionResult>
  cancelSubscription: (request: CancelRequest) => Promise<SubscriptionActionResult>
  reactivateSubscription: () => Promise<SubscriptionActionResult>
  
  // Checkout operations
  createCheckout: (request: CheckoutRequest) => Promise<SubscriptionActionResult>
  createCheckoutSession: (request: CreateCheckoutSessionRequest) => Promise<CreateCheckoutSessionResponse>
  
  // Direct subscription processing (from useDirectSubscription)
  processPlan: (planType: string, paymentMethodId: string) => Promise<{ success: boolean }>
  
  // Billing portal
  createPortalSession: (data?: { returnUrl?: string; prefillEmail?: string }) => Promise<{ url: string }>
  
  // Subscription updates
  updateSubscription: (params: SubscriptionUpdateParams) => Promise<Subscription>
  
  // Payment methods
  addPaymentMethod: (paymentMethodId: string, setAsDefault?: boolean) => Promise<PaymentMethod>
  updatePaymentMethod: (paymentMethodId: string) => Promise<{ message: string }>
  
  // Sync operations
  syncNow: () => Promise<SubscriptionSyncResult>
  forceFullSync: () => Promise<SubscriptionSyncResult>
  
  // State
  isUpgrading: boolean
  isDowngrading: boolean
  isCanceling: boolean
  isReactivating: boolean
  isCreatingCheckout: boolean
  isCreatingCheckoutSession: boolean
  isProcessingPlan: boolean
  isCreatingPortal: boolean
  isUpdatingSubscription: boolean
  isAddingPaymentMethod: boolean
  isUpdatingPaymentMethod: boolean
  isSyncing: boolean
  
  // Errors
  upgradeError: Error | null
  downgradeError: Error | null
  cancelError: Error | null
  reactivateError: Error | null
  checkoutError: Error | null
  checkoutSessionError: Error | null
  processPlanError: Error | null
  portalError: Error | null
  updateSubscriptionError: Error | null
  addPaymentMethodError: Error | null
  updatePaymentMethodError: Error | null
  syncError: Error | null
  
  // Last operation result
  lastResult: SubscriptionActionResult | null
}

/**
 * Comprehensive subscription actions hook
 * 
 * Features:
 * - All subscription management operations
 * - Automatic cache invalidation
 * - Error handling with detailed feedback
 * - Optimistic updates where appropriate
 * - Correlation IDs for tracing
 */
export function useSubscriptionActions(): SubscriptionActionsHook {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [lastResult, setLastResult] = useState<SubscriptionActionResult | null>(null)

  const userId = user?.id || ''

  // Query keys for cache invalidation
  const queryKeys = {
    subscription: ['subscription', userId],
    usage: ['subscription-usage', userId],
    syncState: ['subscription-sync-state', userId]
  }

  // Invalidate subscription caches after operations
  const invalidateCaches = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.subscription })
    queryClient.invalidateQueries({ queryKey: queryKeys.usage })
    queryClient.invalidateQueries({ queryKey: queryKeys.syncState })
  }, [queryClient, queryKeys])

  // Upgrade plan mutation
  const upgradeMutation = useMutation({
    mutationFn: async (request: UpgradeRequest): Promise<SubscriptionActionResult> => {
      const { apiClient } = await import('@/lib/api-client')
      return apiClient.post(`/api/v1/subscriptions/upgrade`, { userId, ...request })
    },
    onSuccess: (result) => {
      setLastResult(result)
      if (result.success) {
        invalidateCaches()
        logger.info('Subscription upgraded successfully', {
          component: 'useSubscriptionActions',
          userId,
          targetPlan: result.metadata.toPlan
        })
      }
    },
    onError: (error) => {
      logger.error('Subscription upgrade failed:', error as Error, {
        component: 'useSubscriptionActions',
        userId
      })
    }
  })

  // Downgrade plan mutation
  const downgradeMutation = useMutation({
    mutationFn: async (request: DowngradeRequest): Promise<SubscriptionActionResult> => {
      const { apiClient } = await import('@/lib/api-client')
      return apiClient.post(`/api/v1/subscriptions/downgrade`, { userId, ...request })
    },
    onSuccess: (result) => {
      setLastResult(result)
      if (result.success) {
        invalidateCaches()
        logger.info('Subscription downgraded successfully', {
          component: 'useSubscriptionActions',
          userId,
          targetPlan: result.metadata.toPlan
        })
      }
    },
    onError: (error) => {
      logger.error('Subscription downgrade failed:', error as Error, {
        component: 'useSubscriptionActions',
        userId
      })
    }
  })

  // Cancel subscription mutation
  const cancelMutation = useMutation({
    mutationFn: async (request: CancelRequest): Promise<SubscriptionActionResult> => {
      const { apiClient } = await import('@/lib/api-client')
      return apiClient.post(`/api/v1/subscriptions/cancel`, { userId, ...request })
    },
    onSuccess: (result) => {
      setLastResult(result)
      if (result.success) {
        invalidateCaches()
        logger.info('Subscription canceled successfully', {
          component: 'useSubscriptionActions',
          userId,
          cancelAt: result.metadata.operation
        })
      }
    },
    onError: (error) => {
      logger.error('Subscription cancellation failed:', error as Error, {
        component: 'useSubscriptionActions',
        userId
      })
    }
  })

  // Reactivate subscription mutation
  const reactivateMutation = useMutation({
    mutationFn: async (): Promise<SubscriptionActionResult> => {
      const { apiClient } = await import('@/lib/api-client')
      return apiClient.post(`/api/v1/subscriptions/reactivate`, { userId })
    },
    onSuccess: (result) => {
      setLastResult(result)
      if (result.success) {
        invalidateCaches()
        logger.info('Subscription reactivated successfully', {
          component: 'useSubscriptionActions',
          userId
        })
      }
    },
    onError: (error) => {
      logger.error('Subscription reactivation failed:', error as Error, {
        component: 'useSubscriptionActions',
        userId
      })
    }
  })

  // Create checkout session mutation
  const checkoutMutation = useMutation({
    mutationFn: async (request: CheckoutRequest): Promise<SubscriptionActionResult> => {
      const { apiClient } = await import('@/lib/api-client')
      return apiClient.post(`/api/v1/subscriptions/checkout`, { userId, ...request })
    },
    onSuccess: (result) => {
      setLastResult(result)
      if (result.success && result.checkoutUrl) {
        logger.info('Checkout session created successfully', {
          component: 'useSubscriptionActions',
          userId,
          planType: result.metadata.toPlan
        })
        // Redirect to checkout
        window.location.href = result.checkoutUrl
      }
    },
    onError: (error) => {
      logger.error('Checkout session creation failed:', error as Error, {
        component: 'useSubscriptionActions',
        userId
      })
    }
  })

  // Sync subscription mutation
  const syncMutation = useMutation({
    mutationFn: async (force = false): Promise<SubscriptionSyncResult> => {
      const { apiClient } = await import('@/lib/api-client')
      return apiClient.post(`/api/v1/subscriptions/sync`, { userId, force })
    },
    onSuccess: (result) => {
      if (result.success) {
        invalidateCaches()
        logger.info('Subscription synced successfully', {
          component: 'useSubscriptionActions',
          userId,
          changes: result.changes?.length || 0
        })
      }
    },
    onError: (error) => {
      logger.error('Subscription sync failed:', error as Error, {
        component: 'useSubscriptionActions',
        userId
      })
    }
  })

  // Create checkout session mutation (from use-billing.ts)
  const checkoutSessionMutation = useMutation({
    mutationFn: async (data: CreateCheckoutSessionRequest): Promise<CreateCheckoutSessionResponse> => {
      // Enhanced validation
      if (!data.priceId && !data.planId) {
        throw new Error('Either priceId or planId is required')
      }
      
      const { apiClient } = await import('@/lib/api-client')
      const response = await apiClient.createCheckoutSession(data)
      
      // Validate response
      if (!response.url || !response.sessionId) {
        throw new Error('Invalid checkout session response')
      }
      
      return {
        sessionId: response.sessionId,
        url: response.url
      } as CreateCheckoutSessionResponse
    },
    onSuccess: (data) => {
      invalidateCaches()
      
      // Enhanced redirect with error handling
      if (data.url) {
        try {
          window.location.href = data.url
        } catch (error) {
          logger.error('Failed to redirect to checkout:', error as Error, {
            component: 'useSubscriptionActions',
            userId
          })
          // Fallback: open in new tab
          window.open(data.url, '_blank')
        }
      }
    },
    onError: (error) => {
      toast.error('Failed to create checkout session. Please try again.')
      logger.error('Checkout session creation failed:', error as Error, {
        component: 'useSubscriptionActions',
        userId
      })
    }
  })

  // Direct plan processing mutation (from useDirectSubscription.ts)
  const processPlanMutation = useMutation({
    mutationFn: async ({ planType, paymentMethodId }: { planType: string, paymentMethodId: string }): Promise<{ success: boolean }> => {
      const { apiClient } = await import('@/lib/api-client')
      await apiClient.post('/billing/subscribe', { planType, paymentMethodId })
      return { success: true }
    },
    onSuccess: () => {
      invalidateCaches()
      logger.info('Plan processed successfully', {
        component: 'useSubscriptionActions',
        userId
      })
    },
    onError: (error) => {
      logger.error('Plan processing failed:', error as Error, {
        component: 'useSubscriptionActions',
        userId
      })
    }
  })

  // Portal session mutation (from use-billing.ts)
  const portalSessionMutation = useMutation({
    mutationFn: async (data?: { returnUrl?: string; prefillEmail?: string }): Promise<{ url: string }> => {
      const { returnUrl, prefillEmail } = data || {}
      
      // Construct portal session data
      const portalData: CreatePortalInput = {
        returnUrl: returnUrl || window.location.origin,
        ...(prefillEmail && { prefillEmail })
      }
      
      const { apiClient } = await import('@/lib/api-client')
      const result = await apiClient.createPortalSession(portalData)
      
      if (!result.url) {
        throw new Error('Invalid portal session response')
      }
      
      return result
    },
    onSuccess: (data) => {
      // Enhanced redirect with error handling
      if (data.url) {
        try {
          window.location.href = data.url
        } catch (error) {
          logger.error('Failed to redirect to portal:', error as Error, {
            component: 'useSubscriptionActions',
            userId
          })
          // Fallback: open in new tab
          window.open(data.url, '_blank')
        }
      }
    },
    onError: (error) => {
      toast.error('Failed to open billing portal. Please try again.')
      logger.error('Portal session creation failed:', error as Error, {
        component: 'useSubscriptionActions',
        userId
      })
    }
  })

  // Update subscription mutation (from use-billing.ts)
  const updateSubscriptionMutation = useMutation({
    mutationFn: async (data: SubscriptionUpdateParams): Promise<Subscription> => {
      // Enhanced validation
      if (!data.priceId && !data.planId) {
        throw new Error('Either priceId or planId is required for subscription update')
      }
      
      const { apiClient } = await import('@/lib/api-client')
      return await apiClient.updateSubscription(data)
    },
    onSuccess: () => {
      invalidateCaches()
      toast.success('Subscription updated successfully')
      logger.info('Subscription updated successfully', {
        component: 'useSubscriptionActions',
        userId
      })
    },
    onError: (error) => {
      toast.error('Failed to update subscription. Please try again.')
      logger.error('Subscription update failed:', error as Error, {
        component: 'useSubscriptionActions',
        userId
      })
    }
  })

  // Add payment method mutation (from use-billing.ts)
  const addPaymentMethodMutation = useMutation({
    mutationFn: async ({ paymentMethodId, setAsDefault = false }: { paymentMethodId: string; setAsDefault?: boolean }): Promise<PaymentMethod> => {
      if (!paymentMethodId || paymentMethodId.length < 3) {
        throw new Error('Valid payment method ID is required')
      }
      
      const { apiClient } = await import('@/lib/api-client')
      const result = await apiClient.addPaymentMethod(paymentMethodId)
      
      // Set as default if requested
      if (setAsDefault && result.id) {
        await apiClient.setDefaultPaymentMethod(result.id)
      }
      
      return result
    },
    onSuccess: () => {
      invalidateCaches()
      toast.success('Payment method added successfully')
      logger.info('Payment method added successfully', {
        component: 'useSubscriptionActions',
        userId
      })
    },
    onError: (error) => {
      toast.error('Failed to add payment method')
      logger.error('Add payment method failed:', error as Error, {
        component: 'useSubscriptionActions',
        userId
      })
    }
  })

  // Update payment method mutation (from use-billing.ts)
  const updatePaymentMethodMutation = useMutation({
    mutationFn: async ({ paymentMethodId }: { paymentMethodId: string }): Promise<{ message: string }> => {
      if (!paymentMethodId) {
        throw new Error('Payment method ID is required')
      }
      
      const { apiClient } = await import('@/lib/api-client')
      return await apiClient.setDefaultPaymentMethod(paymentMethodId)
    },
    onSuccess: () => {
      invalidateCaches()
      toast.success('Default payment method updated successfully')
      logger.info('Payment method updated successfully', {
        component: 'useSubscriptionActions',
        userId
      })
    },
    onError: (error) => {
      toast.error('Failed to update payment method')
      logger.error('Update payment method failed:', error as Error, {
        component: 'useSubscriptionActions',
        userId
      })
    }
  })

  // Action callbacks
  const upgradePlan = useCallback(
    async (request: UpgradeRequest): Promise<SubscriptionActionResult> => {
      return upgradeMutation.mutateAsync(request)
    },
    [upgradeMutation]
  )

  const downgradePlan = useCallback(
    async (request: DowngradeRequest): Promise<SubscriptionActionResult> => {
      return downgradeMutation.mutateAsync(request)
    },
    [downgradeMutation]
  )

  const cancelSubscription = useCallback(
    async (request: CancelRequest): Promise<SubscriptionActionResult> => {
      return cancelMutation.mutateAsync(request)
    },
    [cancelMutation]
  )

  const reactivateSubscription = useCallback(
    async (): Promise<SubscriptionActionResult> => {
      return reactivateMutation.mutateAsync()
    },
    [reactivateMutation]
  )

  const createCheckout = useCallback(
    async (request: CheckoutRequest): Promise<SubscriptionActionResult> => {
      return checkoutMutation.mutateAsync(request)
    },
    [checkoutMutation]
  )

  const syncNow = useCallback(async (): Promise<SubscriptionSyncResult> => {
    return syncMutation.mutateAsync(false)
  }, [syncMutation])

  const forceFullSync = useCallback(async (): Promise<SubscriptionSyncResult> => {
    return syncMutation.mutateAsync(true)
  }, [syncMutation])

  // New action callbacks
  const createCheckoutSession = useCallback(
    async (request: CreateCheckoutSessionRequest): Promise<CreateCheckoutSessionResponse> => {
      return checkoutSessionMutation.mutateAsync(request)
    },
    [checkoutSessionMutation]
  )

  const processPlan = useCallback(
    async (planType: string, paymentMethodId: string): Promise<{ success: boolean }> => {
      return processPlanMutation.mutateAsync({ planType, paymentMethodId })
    },
    [processPlanMutation]
  )

  const createPortalSession = useCallback(
    async (data?: { returnUrl?: string; prefillEmail?: string }): Promise<{ url: string }> => {
      return portalSessionMutation.mutateAsync(data)
    },
    [portalSessionMutation]
  )

  const updateSubscription = useCallback(
    async (params: SubscriptionUpdateParams): Promise<Subscription> => {
      return updateSubscriptionMutation.mutateAsync(params)
    },
    [updateSubscriptionMutation]
  )

  const addPaymentMethod = useCallback(
    async (paymentMethodId: string, setAsDefault = false): Promise<PaymentMethod> => {
      return addPaymentMethodMutation.mutateAsync({ paymentMethodId, setAsDefault })
    },
    [addPaymentMethodMutation]
  )

  const updatePaymentMethod = useCallback(
    async (paymentMethodId: string): Promise<{ message: string }> => {
      return updatePaymentMethodMutation.mutateAsync({ paymentMethodId })
    },
    [updatePaymentMethodMutation]
  )

  return {
    // Actions
    upgradePlan,
    downgradePlan,
    cancelSubscription,
    reactivateSubscription,
    createCheckout,
    createCheckoutSession,
    processPlan,
    createPortalSession,
    updateSubscription,
    addPaymentMethod,
    updatePaymentMethod,
    syncNow,
    forceFullSync,

    // State
    isUpgrading: upgradeMutation.isPending,
    isDowngrading: downgradeMutation.isPending,
    isCanceling: cancelMutation.isPending,
    isReactivating: reactivateMutation.isPending,
    isCreatingCheckout: checkoutMutation.isPending,
    isCreatingCheckoutSession: checkoutSessionMutation.isPending,
    isProcessingPlan: processPlanMutation.isPending,
    isCreatingPortal: portalSessionMutation.isPending,
    isUpdatingSubscription: updateSubscriptionMutation.isPending,
    isAddingPaymentMethod: addPaymentMethodMutation.isPending,
    isUpdatingPaymentMethod: updatePaymentMethodMutation.isPending,
    isSyncing: syncMutation.isPending,

    // Errors
    upgradeError: upgradeMutation.error as Error | null,
    downgradeError: downgradeMutation.error as Error | null,
    cancelError: cancelMutation.error as Error | null,
    reactivateError: reactivateMutation.error as Error | null,
    checkoutError: checkoutMutation.error as Error | null,
    checkoutSessionError: checkoutSessionMutation.error as Error | null,
    processPlanError: processPlanMutation.error as Error | null,
    portalError: portalSessionMutation.error as Error | null,
    updateSubscriptionError: updateSubscriptionMutation.error as Error | null,
    addPaymentMethodError: addPaymentMethodMutation.error as Error | null,
    updatePaymentMethodError: updatePaymentMethodMutation.error as Error | null,
    syncError: syncMutation.error as Error | null,

    // Last result
    lastResult
  }
}

// Convenience hooks for common operations

/**
 * Hook for quick plan upgrades
 */
export function useQuickUpgrade() {
  const { upgradePlan, isUpgrading, upgradeError } = useSubscriptionActions()

  const upgradeToStarter = useCallback(
    async (billingCycle: 'monthly' | 'annual' = 'monthly') => {
      return upgradePlan({
        targetPlan: 'STARTER',
        billingCycle,
        prorationBehavior: 'create_prorations'
      })
    },
    [upgradePlan]
  )

  const upgradeToGrowth = useCallback(
    async (billingCycle: 'monthly' | 'annual' = 'monthly') => {
      return upgradePlan({
        targetPlan: 'GROWTH',
        billingCycle,
        prorationBehavior: 'create_prorations'
      })
    },
    [upgradePlan]
  )

  const upgradeToMax = useCallback(
    async (billingCycle: 'monthly' | 'annual' = 'monthly') => {
      return upgradePlan({
        targetPlan: 'TENANTFLOW_MAX',
        billingCycle,
        prorationBehavior: 'create_prorations'
      })
    },
    [upgradePlan]
  )

  return {
    upgradeToStarter,
    upgradeToGrowth,
    upgradeToMax,
    isUpgrading,
    upgradeError
  }
}

/**
 * Hook for subscription cancellation
 */
export function useSubscriptionCancellation() {
  const { cancelSubscription, isCanceling, cancelError } = useSubscriptionActions()

  const cancelImmediately = useCallback(
    async (reason?: string, feedback?: string) => {
      return cancelSubscription({
        cancelAt: 'immediate',
        reason,
        feedback
      })
    },
    [cancelSubscription]
  )

  const cancelAtPeriodEnd = useCallback(
    async (reason?: string, feedback?: string) => {
      return cancelSubscription({
        cancelAt: 'end_of_period',
        reason,
        feedback
      })
    },
    [cancelSubscription]
  )

  return {
    cancelImmediately,
    cancelAtPeriodEnd,
    isCanceling,
    cancelError
  }
}

/**
 * Legacy compatibility hooks for smooth migration
 */

/**
 * Legacy useDirectSubscription compatibility
 */
export function useDirectSubscription() {
  const { processPlan, isProcessingPlan, processPlanError } = useSubscriptionActions()
  
  return {
    processPlan,
    isProcessing: isProcessingPlan,
    error: processPlanError?.message || null,
    result: null // Legacy field - not used in the consolidated version
  }
}

/**
 * Legacy useCreateCheckout compatibility (from use-billing.ts)
 */
export function useCreateCheckout() {
  return useMutation({
    mutationFn: async ({ planType, billingPeriod = 'monthly' }: { planType: string; billingPeriod?: string }) => {
      // Convert legacy parameters to new format
      const { apiClient } = await import('@/lib/api-client')
      const result = await apiClient.post<{ url: string }>('/stripe/checkout', { 
        planType, 
        billingPeriod 
      })
      
      if (result?.url) {
        window.location.href = result.url
      }
    },
    onError: () => {
      toast.error('Checkout failed')
    }
  })
}

/**
 * Legacy useOpenPortal compatibility (from use-billing.ts)
 */
export function useOpenPortal() {
  return useMutation({
    mutationFn: async () => {
      const { apiClient } = await import('@/lib/api-client')
      const result = await apiClient.post<{ url: string }>('/stripe/portal')
      
      if (result?.url) {
        window.location.href = result.url
      }
    },
    onError: () => {
      toast.error('Portal access failed')
    }
  })
}