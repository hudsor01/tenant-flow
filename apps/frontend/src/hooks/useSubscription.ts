/**
 * Consolidated Subscription Hook - Data Fetching
 * 
 * Combines subscription data, usage metrics, and derived state into one hook.
 * Replaces: use-user-subscription-context.ts, old useSubscription.ts, 
 * and data fetching parts of use-billing.ts
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { useAuth } from './use-auth'
import { logger } from '@/lib/logger'
import type { 
  Subscription,
  PlanType,
  BillingUsageMetrics as UsageMetrics,
  Invoice,
  PaymentMethod,
  Plan
} from '@repo/shared'

// Unified interface for subscription context
export interface SubscriptionData {
  subscription: Subscription | null
  usage: UsageMetrics | null
  planType: PlanType | null
  
  // Derived state
  isTrialing: boolean
  hasActiveSubscription: boolean
  canAccessPremiumFeatures: boolean
  trialEndsAt: Date | null
  subscriptionEndsAt: Date | null
  
  // Status flags
  isActive: boolean
  isCanceled: boolean
  isPastDue: boolean
  needsPaymentMethod: boolean
}

interface SubscriptionHookResult {
  // Query result properties
  data: SubscriptionData | undefined
  isLoading: boolean
  error: Error | null
  refetch: () => void
  
  // Re-export key derived states for convenience
  hasActiveSubscription: boolean
  canAccessPremiumFeatures: boolean
  isTrialing: boolean
}

const QUERY_KEYS = {
  subscription: (userId: string) => ['subscription', userId] as const,
  usage: (userId: string) => ['subscription-usage', userId] as const
} as const

/**
 * Main subscription data hook
 * 
 * Features:
 * - Fetches subscription + usage data
 * - Provides derived state (active, trial, etc.)
 * - Automatic refetching with smart intervals
 * - Error handling with fallbacks
 * - Type-safe throughout
 */
export function useSubscription(): SubscriptionHookResult {
  const { user, isAuthenticated } = useAuth()

  const result = useQuery({
    queryKey: QUERY_KEYS.subscription(user?.id || ''),
    queryFn: async (): Promise<SubscriptionData> => {
      try {
        const { apiClient } = await import('@/lib/api-client')

        // Fetch both subscription and usage data in parallel
        const [subscriptionResult, usageResult] = await Promise.allSettled([
          apiClient.get<Subscription>('/api/v1/subscriptions/current'),
          apiClient.get<UsageMetrics>('/api/v1/subscriptions/usage')
        ])

        // Handle subscription result
        const subscription = subscriptionResult.status === 'fulfilled' 
          ? subscriptionResult.value 
          : null

        // Handle usage result with fallback
        const usage = usageResult.status === 'fulfilled'
          ? usageResult.value
          : {
              properties: 0,
              tenants: 0, 
              leases: 0,
              maintenanceRequests: 0,
              storage: 0,
              apiCalls: 0,
              limits: {
                properties: 0,
                tenants: 0,
                leases: 0,
                maintenanceRequests: 0
              }
            } as UsageMetrics

        // Determine plan type
        const planType: PlanType = subscription?.planType || 'FREETRIAL'

        // Calculate derived state
        const status = subscription?.status?.toUpperCase() || 'UNKNOWN'
        const isActive = ['ACTIVE', 'TRIALING'].includes(status)
        const isTrialing = status === 'TRIALING'
        const isCanceled = ['CANCELED', 'CANCELLED'].includes(status)
        const isPastDue = status === 'PAST_DUE'
        const needsPaymentMethod = ['INCOMPLETE', 'INCOMPLETE_EXPIRED'].includes(status)
        
        const hasActiveSubscription = isActive
        const canAccessPremiumFeatures = hasActiveSubscription

        // Calculate dates
        const trialEndsAt = subscription?.trialEnd 
          ? new Date(subscription.trialEnd)
          : null
        const subscriptionEndsAt = subscription?.currentPeriodEnd
          ? new Date(subscription.currentPeriodEnd)
          : null

        logger.debug('Subscription data loaded', {
          component: 'useSubscription',
          userId: user?.id,
          planType,
          isTrialing,
          hasActiveSubscription,
          status
        })

        return {
          subscription,
          usage,
          planType,
          isTrialing,
          hasActiveSubscription,
          canAccessPremiumFeatures,
          trialEndsAt,
          subscriptionEndsAt,
          isActive,
          isCanceled,
          isPastDue,
          needsPaymentMethod
        }

      } catch (error) {
        logger.error('Failed to fetch subscription data:', error as Error, {
          component: 'useSubscription',
          userId: user?.id
        })

        // Return safe fallback
        return {
          subscription: null,
          usage: null,
          planType: 'FREETRIAL',
          isTrialing: false,
          hasActiveSubscription: false,
          canAccessPremiumFeatures: false,
          trialEndsAt: null,
          subscriptionEndsAt: null,
          isActive: false,
          isCanceled: false,
          isPastDue: false,
          needsPaymentMethod: false
        }
      }
    },
    enabled: isAuthenticated && !!user,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // 1 minute
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 10000)
  })

  // Extract derived state for convenience
  const hasActiveSubscription = result.data?.hasActiveSubscription || false
  const canAccessPremiumFeatures = result.data?.canAccessPremiumFeatures || false
  const isTrialing = result.data?.isTrialing || false

  return {
    data: result.data,
    isLoading: result.isLoading,
    error: result.error,
    refetch: result.refetch,
    hasActiveSubscription,
    canAccessPremiumFeatures,
    isTrialing
  }
}

/**
 * Hook for usage data only (lighter weight)
 */
export function useUsageData(): UseQueryResult<UsageMetrics, Error> {
  const { user, isAuthenticated } = useAuth()

  return useQuery({
    queryKey: QUERY_KEYS.usage(user?.id || ''),
    queryFn: async (): Promise<UsageMetrics> => {
      try {
        const { apiClient } = await import('@/lib/api-client')
        return await apiClient.get<UsageMetrics>('/api/v1/subscriptions/usage')
      } catch (error) {
        logger.warn('Failed to fetch usage data, using defaults:', error, {
          component: 'useUsageData',
          userId: user?.id
        })

        // Return default usage on error
        return {
          properties: 0,
          tenants: 0,
          leases: 0,
          maintenanceRequests: 0,
          storage: 0,
          apiCalls: 0,
          limits: {
            properties: 0,
            tenants: 0,
            leases: 0,
            maintenanceRequests: 0
          }
        }
      }
    },
    enabled: isAuthenticated && !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // 5 minutes
    retry: 2
  })
}

/**
 * Legacy compatibility - matches old useCanAccessPremiumFeatures
 */
export function useCanAccessPremiumFeatures(): boolean {
  const { canAccessPremiumFeatures } = useSubscription()
  return canAccessPremiumFeatures
}

// Enhanced usage metrics type combining backend response structure (from use-billing.ts)
export interface EnhancedUsageMetrics {
  properties: number
  tenants: number
  leases: number
  maintenanceRequests: number
  limits: {
    properties: number
    tenants: number
    leases: number
    maintenanceRequests: number
  }
  utilization: {
    properties: number // Percentage
    tenants: number
    leases: number
    maintenanceRequests: number
  }
  isNearLimit: boolean
  hasExceededLimit: boolean
}

/**
 * Additional data fetching hooks consolidated from use-billing.ts
 */

/**
 * Fetch current user subscription (billing-specific, alternative to main useSubscription)
 */
export function useBillingSubscription(options?: {
  enabled?: boolean
  refetchInterval?: number
}): UseQueryResult<Subscription, Error> {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: QUERY_KEYS.subscription(user?.id || ''),
    queryFn: async () => {
      const { apiClient } = await import('@/lib/api-client')
      return await apiClient.getSubscription()
    },
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchInterval,
    staleTime: 5 * 60 * 1000 // Consider fresh for 5 minutes
  })
}

/**
 * Fetch user invoices
 */
export function useInvoices(options?: {
  enabled?: boolean
  limit?: number
  refetchInterval?: number
}): UseQueryResult<Invoice[], Error> {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: ['invoices', user?.id, options?.limit],
    queryFn: async () => {
      const { apiClient } = await import('@/lib/api-client')
      return await apiClient.getInvoices()
    },
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchInterval,
    staleTime: 10 * 60 * 1000 // Consider fresh for 10 minutes
  })
}

/**
 * Fetch payment methods
 */
export function usePaymentMethods(options?: {
  enabled?: boolean
}): UseQueryResult<PaymentMethod[], Error> {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: ['payment-methods', user?.id],
    queryFn: async () => {
      const { apiClient } = await import('@/lib/api-client')
      return await apiClient.getPaymentMethods()
    },
    enabled: options?.enabled ?? true,
    staleTime: 10 * 60 * 1000 // Consider fresh for 10 minutes
  })
}

/**
 * Fetch available pricing plans
 */
export function usePricingPlans(options?: {
  enabled?: boolean
  includeArchived?: boolean
}): UseQueryResult<Plan[], Error> {
  return useQuery({
    queryKey: ['pricing-plans', options?.includeArchived],
    queryFn: async (): Promise<Plan[]> => {
      const { apiClient } = await import('@/lib/api-client')
      return await apiClient.getPricingPlans()
    },
    enabled: options?.enabled ?? true,
    staleTime: 30 * 60 * 1000 // Consider fresh for 30 minutes
  })
}

/**
 * Fetch usage metrics with enhanced calculations (from use-billing.ts)
 */
export function useUsageMetrics(options?: {
  enabled?: boolean
  refetchInterval?: number
}): UseQueryResult<EnhancedUsageMetrics, Error> {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: ['usage-metrics', user?.id],
    queryFn: async () => {
      const { apiClient } = await import('@/lib/api-client')
      const rawUsage = await apiClient.getUsage()
      
      // Calculate enhanced metrics
      const utilization = {
        properties: rawUsage.limits.properties > 0 
          ? Math.round((rawUsage.properties / rawUsage.limits.properties) * 100)
          : 0,
        tenants: rawUsage.limits.tenants > 0
          ? Math.round((rawUsage.tenants / rawUsage.limits.tenants) * 100) 
          : 0,
        leases: rawUsage.limits.leases > 0
          ? Math.round((rawUsage.leases / rawUsage.limits.leases) * 100)
          : 0,
        maintenanceRequests: rawUsage.limits.maintenanceRequests > 0
          ? Math.round((rawUsage.maintenanceRequests / rawUsage.limits.maintenanceRequests) * 100)
          : 0
      }
      
      // Check limits
      const isNearLimit = Object.values(utilization).some(util => util >= 80)
      const hasExceededLimit = Object.values(utilization).some(util => util >= 100)
      
      return {
        ...rawUsage,
        utilization,
        isNearLimit,
        hasExceededLimit
      } as EnhancedUsageMetrics
    },
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchInterval || 5 * 60 * 1000, // Refetch every 5 minutes
    staleTime: 2 * 60 * 1000 // Consider fresh for 2 minutes
  })
}