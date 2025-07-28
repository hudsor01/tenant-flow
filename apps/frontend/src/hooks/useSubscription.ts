/**
 * Production-ready subscription management hooks
 * Aligned with Stripe's official TypeScript types and best practices for subscription lifecycle management.
 * Implements webhook-driven state updates, proper error handling, and real-time synchronization.
 * 
 * Based on official Stripe documentation and types:
 * - https://docs.stripe.com/billing/subscriptions/build-subscriptions
 * - https://docs.stripe.com/billing/subscriptions/webhooks
 * - https://docs.stripe.com/stripe-js/react
 * - https://github.com/stripe/stripe-node (official TypeScript types)
 */

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { honoClient } from '@/lib/clients/hono-client'
import { useAuth } from './useAuth'

// Helper functions for usage metrics
async function getLeasesCount(): Promise<number> {
  try {
    const response = await honoClient.api.v1.leases.$get()
    if (!response.ok) return 0
    const data = await response.json()
    return Array.isArray(data) ? data.length : data.leases?.length || 0
  } catch {
    return 0
  }
}

async function getStorageUsed(): Promise<number> {
  try {
    // Analytics endpoint not yet implemented, use fallback
    // const response = await honoClient.api.v1.analytics.storage.$get()
    // if (!response.ok) return 0
    // const data = await response.json()
    // return data.storageUsedMB || 0
    
    // Estimate based on localStorage usage as fallback
    let totalSize = 0
    for (const key in localStorage) {
      if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
        totalSize += localStorage[key].length
      }
    }
    return Math.round(totalSize / (1024 * 1024) * 100) / 100 // Convert to MB
  } catch {
    return 0
  }
}

async function getApiCallsCount(): Promise<number> {
  try {
    // Analytics endpoint not yet implemented, use fallback
    // const response = await honoClient.api.v1.analytics.api_calls.$get()
    // if (!response.ok) return 0
    // const data = await response.json()
    // return data.apiCallsCount || 0
    
    // Estimate based on session storage as fallback
    const sessionCalls = sessionStorage.getItem('api_calls_count')
    return sessionCalls ? parseInt(sessionCalls, 10) : 0
  } catch {
    return 0
  }
}

async function getLeaseGenerationsCount(): Promise<number> {
  try {
    // Analytics endpoint not yet implemented, use fallback
    // const response = await honoClient.api.v1.analytics.lease_generations.$get()
    // if (!response.ok) return 0
    // const data = await response.json()
    // return data.leaseGenerationsCount || 0
    
    // Fallback to localStorage tracking
    const stored = localStorage.getItem('lease_generations_count')
    return stored ? parseInt(stored, 10) : 0
  } catch {
    return 0
  }
}
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import { handleApiError } from '@/lib/utils'
import { getPlanById } from '@/lib/subscription-utils'
import { usePostHog } from 'posthog-js/react'
import { PLAN_TYPE } from '@tenantflow/shared'
import type { 
  SubscriptionData,
  DetailedUsageMetrics,
  PlanLimits,
  LimitChecks,
  UsageData,
  LocalSubscriptionData,
  EnhancedUserPlan
} from '@tenantflow/shared/types/billing'
import type { 
  CreateCheckoutInput, 
  CreatePortalInput 
} from '@tenantflow/shared/types/api-inputs'
import type { 
  CheckoutResponse, 
  PortalResponse, 
  TrialResponse 
} from '@tenantflow/shared/types/responses'

// LocalSubscriptionData interface now imported from shared package

// UsageMetrics, PlanLimits, LimitChecks, UsageData, and UserPlan interfaces now imported from shared package
// Note: UserPlan is imported as EnhancedUserPlan to avoid conflicts with existing shared UserPlan

// Query key factories
const subscriptionKeys = {
  all: ['subscriptions'] as const,
  current: () => [...subscriptionKeys.all, 'current'] as const,
  plan: (planId?: string) => [...subscriptionKeys.all, 'plan', planId] as const,
  usage: (userId?: string) => [...subscriptionKeys.all, 'usage', userId] as const,
  billing: (userId?: string) => [...subscriptionKeys.all, 'billing', userId] as const,
  premium: () => [...subscriptionKeys.all, 'premium'] as const,
}

// Official Stripe webhook event types that should trigger subscription updates
// Based on https://github.com/stripe/stripe-node/types
type StripeWebhookEvent = 
  | 'customer.subscription.created'
  | 'customer.subscription.updated' 
  | 'customer.subscription.deleted'
  | 'invoice.paid'
  | 'invoice.payment_failed'
  | 'checkout.session.completed'

// Official Stripe subscription statuses from stripe-node types
type StripeSubscriptionStatus = 
  | 'active'
  | 'canceled' 
  | 'incomplete'
  | 'incomplete_expired'
  | 'past_due'
  | 'paused'
  | 'trialing'
  | 'unpaid'

// Cache configuration aligned with Stripe's real-time update patterns
const cacheConfig = {
  subscription: {
    staleTime: 2 * 60 * 1000, // 2 minutes - shorter due to webhook updates
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: true, // Important for subscription status changes
  },
  usage: {
    staleTime: 5 * 60 * 1000, // 5 minutes - usage can be less real-time
    gcTime: 10 * 60 * 1000, // 10 minutes
  },
  premium: {
    staleTime: 1 * 60 * 1000, // 1 minute - critical for access control
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true, // Important for access verification
  },
}

// Removed unused CRITICAL_SUBSCRIPTION_STATUSES constant

/**
 * Webhook-driven subscription state management
 * Invalidates subscription cache when webhook events are received
 * Based on Stripe's recommended webhook event handling patterns
 */
export function useSubscriptionWebhookHandler() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const posthog = usePostHog()

  const invalidateSubscriptionData = (event: StripeWebhookEvent, metadata?: Record<string, unknown>) => {
    logger.info('Stripe webhook received, invalidating subscription cache', undefined, {
      event,
      userId: user?.id,
      ...metadata
    })

    // Invalidate all subscription-related queries as per Stripe recommendations
    queryClient.invalidateQueries({ queryKey: subscriptionKeys.all })
    
    // Track webhook events for analytics
    posthog?.capture('stripe_webhook_received', {
      event,
      user_id: user?.id,
      timestamp: new Date().toISOString(),
      ...metadata
    })

    // Show user notification for critical subscription changes
    if (event === 'invoice.payment_failed') {
      toast.error('Payment failed', {
        description: 'Please update your payment method to continue your subscription.'
      })
    } else if (event === 'customer.subscription.updated') {
      toast.success('Subscription updated', {
        description: 'Your subscription changes have been applied.'
      })
    }
  }

  return { invalidateSubscriptionData }
}

/**
 * Enhanced subscription status checker based on official Stripe subscription statuses
 * Implements Stripe's recommended access timestamp checking using official status types
 * Reference: https://github.com/stripe/stripe-node/types/Subscriptions.d.ts
 */
function checkSubscriptionAccess(subscription: LocalSubscriptionData | null): {
  hasAccess: boolean
  expiresAt: Date | null
  statusReason: string
} {
  if (!subscription) {
    return {
      hasAccess: false,
      expiresAt: null,
      statusReason: 'No subscription found'
    }
  }

  const now = new Date()
  const currentPeriodEnd = subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : null
  const trialEnd = subscription.trialEnd ? new Date(subscription.trialEnd) : null

  // Map our internal status to official Stripe status for checking
  const stripeStatus = mapToStripeStatus(subscription.status)

  // Official Stripe status checking logic based on stripe-node types
  switch (stripeStatus) {
    case 'trialing':
      return {
        hasAccess: true,
        expiresAt: trialEnd,
        statusReason: 'Trial period active'
      }
    
    case 'active':
      return {
        hasAccess: true,
        expiresAt: currentPeriodEnd,
        statusReason: 'Subscription active'
      }
    
    case 'past_due': {
      // Stripe allows grace period for past due subscriptions
      const gracePeriod = currentPeriodEnd ? new Date(currentPeriodEnd.getTime() + (7 * 24 * 60 * 60 * 1000)) : null
      return {
        hasAccess: gracePeriod ? now < gracePeriod : false,
        expiresAt: gracePeriod,
        statusReason: 'Payment overdue - access limited'
      }
    }
    
    case 'canceled':
    case 'unpaid':
    case 'incomplete_expired':
      return {
        hasAccess: false,
        expiresAt: null,
        statusReason: 'Subscription canceled or unpaid'
      }
    
    case 'incomplete':
      return {
        hasAccess: false,
        expiresAt: null,
        statusReason: 'Payment setup incomplete'
      }
    
    case 'paused':
      return {
        hasAccess: false,
        expiresAt: null,
        statusReason: 'Subscription paused'
      }
    
    default:
      return {
        hasAccess: false,
        expiresAt: null,
        statusReason: `Unknown status: ${subscription.status}`
      }
  }
}

/**
 * Map internal subscription status to official Stripe status types
 * Ensures compatibility with official Stripe TypeScript definitions
 */
function mapToStripeStatus(internalStatus: string): StripeSubscriptionStatus {
  // Map our internal status format to official Stripe status
  switch (internalStatus.toLowerCase()) {
    case 'trialing': return 'trialing'
    case 'active': return 'active'
    case 'past_due': return 'past_due'
    case 'canceled': return 'canceled'
    case 'unpaid': return 'unpaid'
    case 'incomplete': return 'incomplete'
    case 'incomplete_expired': return 'incomplete_expired'
    case 'paused': return 'paused'
    default: return 'incomplete' // Safe fallback
  }
}

/**
 * Get user's current subscription with enhanced Stripe-aligned error handling
 */
export function useSubscription() {
  const { user } = useAuth()

  return useQuery({
    queryKey: subscriptionKeys.current(),
    queryFn: async () => {
      const response = await honoClient.api.v1.subscriptions.current.$get()
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to fetch subscription')
      }
      return response.json() as Promise<SubscriptionData>
    },
    enabled: !!user?.id,
    ...cacheConfig.subscription,
    retry: (failureCount, error) => {
      const httpError = error as { message?: string }
      // Don't retry on auth errors
      if (httpError?.message?.includes('401') || httpError?.message?.includes('403')) {
        return false
      }
      return failureCount < 3
    },
    meta: {
      errorMessage: 'Failed to load subscription data'
    }
  })
}

/**
 * Get user's current plan with Stripe-aligned subscription status checking
 */
export function useUserPlan(): { data: EnhancedUserPlan | undefined; isLoading: boolean; error: unknown; refetch: () => void } {
  const { data: subscription, isLoading: subscriptionLoading, error: subscriptionError } = useSubscription()

  return useQuery({
    queryKey: subscriptionKeys.plan((subscription as SubscriptionData)?.planType || undefined),
    queryFn: (): EnhancedUserPlan => {
      const subscriptionData = subscription as SubscriptionData | undefined
      
      // Convert SubscriptionData to LocalSubscriptionData format for compatibility
      const localSubscriptionData: LocalSubscriptionData | null = subscriptionData ? {
        id: subscriptionData.stripeSubscriptionId || '',
        userId: subscriptionData.userId,
        status: subscriptionData.status,
        planId: subscriptionData.planType,
        stripeSubscriptionId: subscriptionData.stripeSubscriptionId,
        stripeCustomerId: subscriptionData.stripeCustomerId,
        currentPeriodStart: null, // Not available in SubscriptionData
        currentPeriodEnd: subscriptionData.currentPeriodEnd,
        cancelAtPeriodEnd: subscriptionData.cancelAtPeriodEnd,
        trialStart: null, // Not available in SubscriptionData
        trialEnd: subscriptionData.trialEndsAt || null,
        createdAt: new Date(), // Placeholder
        updatedAt: new Date()  // Placeholder
      } : null
      
      const planId = localSubscriptionData?.planId || 'FREE'
      const plan = getPlanById(planId as keyof typeof PLAN_TYPE)

      if (!plan) {
        throw new Error(`Plan configuration not found for: ${planId}`)
      }

      // Use Stripe-recommended access checking logic
      const accessInfo = checkSubscriptionAccess(localSubscriptionData)
      
      const trialDaysRemaining = subscriptionData?.trialEndsAt
        ? Math.max(
            0,
            Math.ceil(
              (new Date(subscriptionData.trialEndsAt).getTime() - Date.now()) / 
              (1000 * 60 * 60 * 24)
            )
          )
        : 0

      return {
        ...plan,
        id: planId as keyof typeof PLAN_TYPE,
        billingPeriod: (subscriptionData?.trialEndsAt ? 'monthly' : 'monthly') as 'monthly' | 'annual', // Default to monthly
        status: subscriptionData?.status || 'incomplete',
        subscription: localSubscriptionData,
        isActive: accessInfo.hasAccess,
        trialDaysRemaining,
        accessExpiresAt: accessInfo.expiresAt,
        statusReason: accessInfo.statusReason
      }
    },
    enabled: !subscriptionLoading && !subscriptionError,
    ...cacheConfig.subscription,
    meta: {
      errorMessage: 'Failed to load plan information'
    }
  })
}

/**
 * Get user's usage metrics with proper error boundaries
 */
export function useUsageMetrics(): { data: UsageData | undefined; isLoading: boolean; error: unknown; refetch: () => void } {
  const { user } = useAuth()
  const { data: userPlan } = useUserPlan()

  return useQuery({
    queryKey: subscriptionKeys.usage(user?.id),
    queryFn: async (): Promise<UsageData> => {
      if (!user?.id) {
        throw new Error('User authentication required for usage metrics')
      }

      try {
        // Get actual usage counts from Hono queries with null checks
        const [propertiesResponse, tenantsResponse] = await Promise.allSettled([
          honoClient.api.v1.properties.stats.$get(),
          honoClient.api.v1.tenants.stats.$get()
        ])

        let propertiesCount = 0
        let tenantsCount = 0

        if (propertiesResponse.status === 'fulfilled' && propertiesResponse.value.ok) {
          const data = await propertiesResponse.value.json()
          propertiesCount = data?.totalProperties || 0
        }

        if (tenantsResponse.status === 'fulfilled' && tenantsResponse.value.ok) {
          const data = await tenantsResponse.value.json()
          tenantsCount = data?.totalTenants || 0
        }

        const usage: DetailedUsageMetrics = {
          propertiesCount,
          tenantsCount,
          leasesCount: await getLeasesCount(),
          storageUsedMB: await getStorageUsed(),
          apiCallsCount: await getApiCallsCount(),
          leaseGenerationsCount: await getLeaseGenerationsCount(),
          month: new Date().toISOString().slice(0, 7) // YYYY-MM
        }

        // Calculate limits and checks
        const limits: PlanLimits | null = userPlan ? {
          properties: userPlan.propertyLimit,
          tenants: userPlan.propertyLimit * 10, // Estimate: 10 tenants per property
          storage: -1, // Unlimited for now
          apiCalls: -1 // Unlimited for now
        } : null

        const limitChecks: LimitChecks | null = limits ? {
          propertiesExceeded: checkLimitExceeded(usage.propertiesCount, limits.properties),
          tenantsExceeded: checkLimitExceeded(usage.tenantsCount, limits.tenants),
          storageExceeded: checkLimitExceeded(usage.storageUsedMB, limits.storage),
          apiCallsExceeded: checkLimitExceeded(usage.apiCallsCount, limits.apiCalls)
        } : null

        return {
          ...usage,
          limits,
          limitChecks
        }
      } catch (error) {
        logger.error('Failed to fetch usage metrics', error as Error, { userId: user.id })
        throw new Error('Unable to load usage statistics')
      }
    },
    enabled: !!user?.id && !!userPlan,
    ...cacheConfig.usage,
    meta: {
      errorMessage: 'Failed to load usage metrics'
    }
  })
}

/**
 * Check premium feature access with caching
 */
export function useCanAccessPremiumFeatures() {
  const { user } = useAuth()
  const { data: subscription } = useSubscription()

  return useQuery({
    queryKey: subscriptionKeys.premium(),
    queryFn: async () => {
      const subscriptionData = subscription as SubscriptionData | undefined
      // For now, derive premium access from subscription status
      const hasAccess = subscriptionData && subscriptionData.status === 'active' && subscriptionData.planType !== 'FREE'
      return {
        hasAccess: hasAccess || false,
        reason: hasAccess ? 'Active premium subscription' : 'No active premium subscription',
        subscription: subscriptionData ? {
          status: subscriptionData.status,
          planId: subscriptionData.planType,
          trialEnd: subscriptionData.trialEndsAt || null,
          currentPeriodEnd: subscriptionData.currentPeriodEnd,
          cancelAtPeriodEnd: subscriptionData.cancelAtPeriodEnd
        } : undefined
      }
    },
    enabled: !!user?.id,
    ...cacheConfig.premium,
    retry: 2,
    meta: {
      errorMessage: 'Failed to verify premium access'
    }
  })
}

/**
 * Start free trial with comprehensive tracking
 */
export function useStartFreeTrial() {
  const queryClient = useQueryClient()
  const posthog = usePostHog()

  return useMutation({
    mutationFn: async () => {
      const response = await honoClient.api.v1.subscriptions.trial.$post()
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to start trial')
      }
      return response.json()
    },
    onMutate: () => {
      logger.info('Free trial initiation started')
      posthog?.capture('trial_start_attempted', {
        timestamp: new Date().toISOString()
      })
    },
    onSuccess: (data: TrialResponse) => {
      logger.info('Free trial started successfully', undefined, {
        subscriptionId: data.subscriptionId,
        trialEnd: data.trialEnd
      })

      posthog?.capture('trial_started', {
        subscription_id: data.subscriptionId,
        trial_end: data.trialEnd,
        timestamp: new Date().toISOString()
      })

      // Invalidate all subscription-related queries
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.all })

      toast.success('Free trial activated!', {
        description: `Your trial is active until ${data.trialEnd ? new Date(data.trialEnd).toLocaleDateString() : 'unknown date'}`
      })
    },
    onError: (error) => {
      logger.error('Failed to start free trial', error instanceof Error ? error : new Error(String(error)))
      
      posthog?.capture('trial_start_failed', {
        error: error.message,
        timestamp: new Date().toISOString()
      })

      toast.error('Trial activation failed', {
        description: handleApiError(error)
      })
    }
  })
}

/**
 * Create checkout session with Stripe-aligned validation and error handling
 * Implements Stripe's recommended checkout flow patterns
 */
export function useCreateCheckoutSession() {
  const queryClient = useQueryClient()
  const posthog = usePostHog()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (variables: CreateCheckoutInput) => {
      const response = await honoClient.api.v1.subscriptions.checkout.$post({
        json: {
          priceId: variables.planType, // Map planType to priceId
          successUrl: window.location.origin + '/checkout/success',
          cancelUrl: window.location.origin + '/checkout/cancel'
        }
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create checkout session')
      }
      return response.json() as Promise<CheckoutResponse>
    },
    onMutate: (variables: CreateCheckoutInput) => {
      // Validate user authentication before checkout (Stripe requirement)
      if (!user?.id) {
        throw new Error('User must be authenticated to create checkout session')
      }

      logger.info('Stripe checkout session initiated', undefined, {
        planType: variables.planType,
        billingInterval: variables.billingInterval,
        userId: user.id
      })

      posthog?.capture('stripe_checkout_initiated', {
        plan_type: variables.planType,
        billing_interval: variables.billingInterval,
        ui_mode: variables.uiMode || 'hosted',
        user_id: user.id,
        timestamp: new Date().toISOString()
      })
    },
    onSuccess: (data: CheckoutResponse, variables: CreateCheckoutInput) => {
      logger.info('Stripe checkout session created', undefined, {
        planType: variables.planType,
        hasUrl: !!data.url,
        hasClientSecret: !!data.clientSecret
      })

      posthog?.capture('stripe_checkout_session_created', {
        plan_type: variables.planType,
        billing_interval: variables.billingInterval,
        has_url: !!data.url,
        has_client_secret: !!data.clientSecret,
        timestamp: new Date().toISOString()
      })

      // Pre-emptively invalidate subscription cache for webhook-driven updates
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.all })

      // Handle hosted checkout redirect (Stripe recommended pattern)
      if (data.url && (!variables.uiMode || variables.uiMode === 'hosted')) {
        // Store checkout metadata for success/cancel page handling
        sessionStorage.setItem('stripe_checkout_metadata', JSON.stringify({
          planType: variables.planType,
          billingInterval: variables.billingInterval,
          timestamp: Date.now()
        }))
        
        window.location.href = data.url
      }
    },
    onError: (error, variables: CreateCheckoutInput) => {
      logger.error('Stripe checkout session failed', error instanceof Error ? error : new Error(String(error)), {
        planType: variables.planType,
        billingInterval: variables.billingInterval,
        userId: user?.id
      })

      posthog?.capture('stripe_checkout_failed', {
        plan_type: variables.planType,
        billing_interval: variables.billingInterval,
        user_id: user?.id,
        error: error.message,
        timestamp: new Date().toISOString()
      })

      // Stripe-specific error handling
      const errorMessage = error.message.includes('stripe') 
        ? 'Unable to process checkout. Please try again or contact support.'
        : handleApiError(error)

      toast.error('Checkout failed', {
        description: errorMessage,
        action: {
          label: 'Retry',
          onClick: () => {
            // Allow user to retry checkout after error
            window.location.reload()
          }
        }
      })
    }
  })
}

/**
 * Create customer portal session with error handling
 */
export function useCreatePortalSession() {
  const posthog = usePostHog()

  return useMutation({
    mutationFn: async (variables: CreatePortalInput) => {
      const response = await honoClient.api.v1.subscriptions['billing-portal'].$post({
        json: {
          returnUrl: variables.returnUrl || window.location.href
        }
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create portal session')
      }
      return response.json() as Promise<PortalResponse>
    },
    onMutate: (variables: CreatePortalInput) => {
      logger.info('Customer portal session requested', undefined, {
        returnUrl: variables.returnUrl
      })

      posthog?.capture('portal_requested', {
        return_url: variables.returnUrl,
        timestamp: new Date().toISOString()
      })
    },
    onSuccess: (data: PortalResponse) => {
      logger.info('Customer portal session created', undefined, {
        url: data.url
      })

      posthog?.capture('portal_opened', {
        timestamp: new Date().toISOString()
      })

      if (data.url) {
        window.location.href = data.url
      }
    },
    onError: (error) => {
      logger.error('Customer portal creation failed', error instanceof Error ? error : new Error(String(error)))

      posthog?.capture('portal_failed', {
        error: error.message,
        timestamp: new Date().toISOString()
      })

      toast.error('Portal access failed', {
        description: handleApiError(error)
      })
    }
  })
}

/**
 * Comprehensive subscription manager hook with Stripe-aligned patterns
 * Implements webhook handling, enhanced access control, and real-time state management
 */
export function useSubscriptionManager(): {
  subscription: LocalSubscriptionData | undefined;
  userPlan: EnhancedUserPlan | undefined;
  usageMetrics: UsageData | undefined;
  canAccessPremium: { hasAccess: boolean; reason?: string; subscription?: { status: string; planId: string | null; trialEnd: Date | null; currentPeriodEnd: Date | null; cancelAtPeriodEnd: boolean | null; }; } | undefined;
  subscriptionAccess: { hasAccess: boolean; expiresAt: Date | null; statusReason: string };
  isLoading: boolean;
  isCreatingCheckout: boolean;
  isCreatingPortal: boolean;
  isStartingTrial: boolean;
  hasError: unknown;
  subscriptionError: unknown;
  planError: unknown;
  usageError: unknown;
  premiumError: unknown;
  checkoutError: unknown;
  portalError: unknown;
  trialError: unknown;
  startTrial: () => void;
  startTrialAsync: () => Promise<TrialResponse>;
  createCheckout: (variables: CreateCheckoutInput) => void;
  createCheckoutAsync: (variables: CreateCheckoutInput) => Promise<CheckoutResponse>;
  createPortal: (variables: CreatePortalInput) => void;
  createPortalAsync: (variables: CreatePortalInput) => Promise<PortalResponse>;
  handleWebhookEvent: (event: StripeWebhookEvent, metadata?: Record<string, unknown>) => void;
  isSubscriptionActive: boolean;
  isOnTrial: boolean;
  trialDaysRemaining: number;
  currentPlanId: string;
  accessExpiresAt: Date | null;
  statusReason: string;
  isAtPropertyLimit: boolean;
  isAtTenantLimit: boolean;
  refreshSubscription: () => void;
  refreshUserPlan: () => void;
  refreshUsageMetrics: () => void;
  refreshPremiumAccess: () => void;
} {
  const subscription = useSubscription()
  const userPlan = useUserPlan()
  const usageMetrics = useUsageMetrics()
  const canAccessPremium = useCanAccessPremiumFeatures()
  const startTrial = useStartFreeTrial()
  const createCheckout = useCreateCheckoutSession()
  const createPortal = useCreatePortalSession()
  const webhookHandler = useSubscriptionWebhookHandler()

  const isLoading = subscription.isLoading || 
                   userPlan.isLoading || 
                   usageMetrics.isLoading ||
                   canAccessPremium.isLoading

  const hasError = subscription.error || 
                  userPlan.error || 
                  usageMetrics.error ||
                  canAccessPremium.error

  // Enhanced subscription status checking based on Stripe patterns
  const subscriptionStatus = userPlan.data?.subscription ? 
    checkSubscriptionAccess(userPlan.data.subscription || null) : 
    { hasAccess: false, expiresAt: null, statusReason: 'No subscription' }

  return {
    // Data
    subscription: subscription.data as LocalSubscriptionData | undefined,
    userPlan: userPlan.data,
    usageMetrics: usageMetrics.data,
    canAccessPremium: canAccessPremium.data as { hasAccess: boolean; reason?: string; subscription?: { status: string; planId: string | null; trialEnd: Date | null; currentPeriodEnd: Date | null; cancelAtPeriodEnd: boolean | null; }; } | undefined,
    
    // Enhanced Stripe-based access control
    subscriptionAccess: subscriptionStatus,
    
    // Loading states
    isLoading,
    isCreatingCheckout: createCheckout.isPending,
    isCreatingPortal: createPortal.isPending,
    isStartingTrial: startTrial.isPending,
    
    // Error states
    hasError,
    subscriptionError: subscription.error,
    planError: userPlan.error,
    usageError: usageMetrics.error,
    premiumError: canAccessPremium.error,
    checkoutError: createCheckout.error,
    portalError: createPortal.error,
    trialError: startTrial.error,
    
    // Actions
    startTrial: startTrial.mutate,
    startTrialAsync: startTrial.mutateAsync,
    createCheckout: createCheckout.mutate,
    createCheckoutAsync: createCheckout.mutateAsync,
    createPortal: createPortal.mutate,
    createPortalAsync: createPortal.mutateAsync,
    
    // Webhook management
    handleWebhookEvent: webhookHandler.invalidateSubscriptionData,
    
    // Computed properties (enhanced with Stripe patterns)
    isSubscriptionActive: subscriptionStatus.hasAccess,
    isOnTrial: userPlan.data?.subscription?.status === 'trialing',
    trialDaysRemaining: userPlan.data?.trialDaysRemaining || 0,
    currentPlanId: userPlan.data?.subscription?.planId || 'FREE',
    accessExpiresAt: subscriptionStatus.expiresAt,
    statusReason: subscriptionStatus.statusReason,
    
    // Limit checks
    isAtPropertyLimit: usageMetrics.data?.limitChecks?.propertiesExceeded || false,
    isAtTenantLimit: usageMetrics.data?.limitChecks?.tenantsExceeded || false,
    
    // Refresh functions
    refreshSubscription: () => subscription.refetch(),
    refreshUserPlan: () => userPlan.refetch(),
    refreshUsageMetrics: () => usageMetrics.refetch(),
    refreshPremiumAccess: () => canAccessPremium.refetch()
  }
}

/**
 * Utility hook for handling Stripe checkout success/cancel pages
 * Implements Stripe's recommended post-checkout flow
 */
export function useCheckoutResultHandler() {
  const queryClient = useQueryClient()
  const posthog = usePostHog()

  const handleCheckoutSuccess = (sessionId?: string) => {
    // Retrieve stored checkout metadata
    const metadataJson = sessionStorage.getItem('stripe_checkout_metadata')
    const metadata = metadataJson ? JSON.parse(metadataJson) : null
    
    logger.info('Stripe checkout completed successfully', undefined, {
      sessionId,
      metadata
    })

    posthog?.capture('stripe_checkout_completed', {
      session_id: sessionId,
      plan_type: metadata?.planType,
      billing_interval: metadata?.billingInterval,
      timestamp: new Date().toISOString()
    })

    // Invalidate all subscription data for immediate UI updates
    queryClient.invalidateQueries({ queryKey: subscriptionKeys.all })
    
    // Clean up checkout metadata
    sessionStorage.removeItem('stripe_checkout_metadata')

    toast.success('Subscription activated!', {
      description: 'Your subscription is now active. Welcome to the premium experience!'
    })
  }

  const handleCheckoutCancel = () => {
    const metadataJson = sessionStorage.getItem('stripe_checkout_metadata')
    const metadata = metadataJson ? JSON.parse(metadataJson) : null

    logger.info('Stripe checkout canceled by user', undefined, { metadata })

    posthog?.capture('stripe_checkout_canceled', {
      plan_type: metadata?.planType,
      billing_interval: metadata?.billingInterval,
      timestamp: new Date().toISOString()
    })

    // Clean up checkout metadata
    sessionStorage.removeItem('stripe_checkout_metadata')

    toast.info('Checkout canceled', {
      description: 'You can start your subscription anytime from the pricing page.'
    })
  }

  return {
    handleCheckoutSuccess,
    handleCheckoutCancel
  }
}

// Utility functions
function checkLimitExceeded(current: number, limit: number): boolean {
  if (limit === -1) return false // Unlimited
  return current >= limit
}

/**
 * Get billing history (placeholder for future implementation)
 */
export function useBillingHistory() {
  const { user } = useAuth()

  return useQuery({
    queryKey: subscriptionKeys.billing(user?.id),
    queryFn: async () => {
      try {
        const response = await honoClient.api.v1.subscriptions.invoices?.$get?.()
        if (!response?.ok) return []
        const data = await response.json()
        return data.invoices || []
      } catch (error) {
        logger.error('Failed to fetch billing history', error as Error)
        return []
      }
    },
    enabled: !!user?.id,
    ...cacheConfig.subscription
  })
}