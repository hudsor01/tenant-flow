/**
 * Hook for user subscription context and usage data
 * Provides real-time subscription status and usage information via backend API
 */
import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { useAuth } from './use-auth'
import { logger } from '@/lib/logger'
import { BillingApi } from '@/lib/api/billing'
import type { PlanType } from '@repo/shared'

export interface StripeSubscription {
  id: string
  customer: string
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid'
  current_period_start: number
  current_period_end: number
  trial_start: number | null
  trial_end: number | null
  cancel_at: number | null
  canceled_at: number | null
  created: number
  metadata: Record<string, unknown>
}

export interface UsageData {
  properties: number
  units: number
  users: number
  storage: number // in GB
  apiCalls: number
}

export interface UserSubscriptionContext {
  subscription: StripeSubscription | null
  usage: UsageData
  planType: PlanType | null
  isTrialing: boolean
  trialEndsAt: Date | null
  subscriptionEndsAt: Date | null
  hasActiveSubscription: boolean
}

/**
 * Get comprehensive user subscription context
 * Includes current subscription, usage data, and plan information
 */
export function useUserSubscriptionContext(): UseQueryResult<UserSubscriptionContext, Error> {
  const { user, isAuthenticated } = useAuth()

  return useQuery({
    queryKey: ['user-subscription-context', user?.id],
    queryFn: async (): Promise<UserSubscriptionContext> => {
      try {
        // Fetch subscription and usage data from backend API
        const [subscriptionResult, usageResult] = await Promise.allSettled([
          BillingApi.getSubscription().catch(() => null),
          BillingApi.getUsage().catch(() => ({
            properties: 0,
            tenants: 0,
            leases: 0,
            maintenanceRequests: 0,
            limits: {
              properties: 0,
              tenants: 0,
              leases: 0,
              maintenanceRequests: 0
            }
          }))
        ])

        // Handle subscription result (user might not have one)
        const backendSubscription = subscriptionResult.status === 'fulfilled' ? subscriptionResult.value : null
        
        // Convert backend subscription to expected format
        const subscription: StripeSubscription | null = backendSubscription ? {
          id: backendSubscription.id || 'unknown',
          customer: backendSubscription.stripeCustomerId || 'unknown',
          status: (backendSubscription.status as "active" | "trialing" | "past_due" | "canceled" | "unpaid") || 'canceled',
          current_period_start: backendSubscription.currentPeriodStart ? new Date(backendSubscription.currentPeriodStart).getTime() / 1000 : 0,
          current_period_end: backendSubscription.currentPeriodEnd ? new Date(backendSubscription.currentPeriodEnd).getTime() / 1000 : 0,
          trial_start: backendSubscription.trialStart ? new Date(backendSubscription.trialStart).getTime() / 1000 : null,
          trial_end: backendSubscription.trialEnd ? new Date(backendSubscription.trialEnd).getTime() / 1000 : null,
          cancel_at: backendSubscription.canceledAt ? new Date(backendSubscription.canceledAt).getTime() / 1000 : null,
          canceled_at: backendSubscription.canceledAt ? new Date(backendSubscription.canceledAt).getTime() / 1000 : null,
          created: backendSubscription.createdAt ? new Date(backendSubscription.createdAt).getTime() / 1000 : Date.now() / 1000,
          metadata: (backendSubscription as unknown as Record<string, unknown>).metadata as Record<string, unknown> || {}
        } : null

        // Handle usage result with fallback
        const backendUsage = usageResult.status === 'fulfilled' ? usageResult.value : {
          properties: 0,
          tenants: 0,
          leases: 0,
          maintenanceRequests: 0,
          limits: {
            properties: 0,
            tenants: 0,
            leases: 0,
            maintenanceRequests: 0
          }
        }

        // Convert backend usage to expected format
        const usage: UsageData = {
          properties: backendUsage.properties || 0,
          units: backendUsage.tenants || 0, // Map tenants to units
          users: 1, // Default to 1 user (current user)
          storage: 0, // Not tracked yet
          apiCalls: 0 // Not tracked yet
        }

        // Determine plan type from subscription or default to FREETRIAL
        let planType: PlanType = 'FREETRIAL'
        if (backendSubscription?.planType) {
          planType = backendSubscription.planType as PlanType
        }

        // Calculate trial and subscription end dates
        const isTrialing = subscription?.status === 'trialing'
        const trialEndsAt = subscription?.trial_end 
          ? new Date(subscription.trial_end * 1000) 
          : null
        const subscriptionEndsAt = subscription?.current_period_end 
          ? new Date(subscription.current_period_end * 1000) 
          : null

        const hasActiveSubscription = subscription?.status ? 
          ['active', 'trialing'].includes(subscription.status) : false

        logger.debug('User subscription context loaded', {
          component: 'UseUserSubscriptionContextHook',
          userId: user?.id,
          planType,
          isTrialing,
          hasActiveSubscription
        })

        return {
          subscription,
          usage,
          planType,
          isTrialing,
          trialEndsAt,
          subscriptionEndsAt,
          hasActiveSubscription,
        }
      } catch (error) {
        logger.error('Failed to fetch user subscription context:', error instanceof Error ? error : new Error(String(error)), {
          component: 'UseUserSubscriptionContextHook',
          userId: user?.id
        })
        
        // Return fallback context on error
        return {
          subscription: null,
          usage: {
            properties: 0,
            units: 0,
            users: 1,
            storage: 0,
            apiCalls: 0
          },
          planType: 'FREETRIAL',
          isTrialing: false,
          trialEndsAt: null,
          subscriptionEndsAt: null,
          hasActiveSubscription: false,
        }
      }
    },
    enabled: isAuthenticated && !!user,
    staleTime: 30 * 1000, // Consider data stale after 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  })
}

/**
 * Hook to get only usage data (lighter weight)
 */
export function useUsageData(): UseQueryResult<UsageData, Error> {
  const { user, isAuthenticated } = useAuth()

  return useQuery({
    queryKey: ['usage-data', user?.id],
    queryFn: async (): Promise<UsageData> => {
      try {
        const backendUsage = await BillingApi.getUsage()
        
        return {
          properties: backendUsage.properties || 0,
          units: backendUsage.tenants || 0, // Map tenants to units
          users: 1, // Default to 1 user
          storage: 0, // Not tracked yet
          apiCalls: 0 // Not tracked yet
        }
      } catch (error) {
        logger.warn('Failed to fetch usage data, using defaults:', error, {
          component: 'UseUsageDataHook',
          userId: user?.id
        })
        
        // Return default usage on error
        return {
          properties: 0,
          units: 0,
          users: 1,
          storage: 0,
          apiCalls: 0
        }
      }
    },
    enabled: isAuthenticated && !!user,
    staleTime: 60 * 1000, // Consider data stale after 1 minute
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes
    retry: 2,
  })
}