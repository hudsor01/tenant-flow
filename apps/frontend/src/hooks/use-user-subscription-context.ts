/**
 * Hook for user subscription context and usage data
 * Provides real-time subscription status and usage information
 */
import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from './use-auth'
import { logger } from '@/lib/logger'
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
      if (!user?.stripeCustomerId) {
        // Return default context for users without Stripe customer
        const usage = await fetchUsageData(user?.organizationId)
        return {
          subscription: null,
          usage,
          planType: 'FREETRIAL',
          isTrialing: false,
          trialEndsAt: null,
          subscriptionEndsAt: null,
          hasActiveSubscription: false,
        }
      }

      try {
        // Fetch subscription and usage data in parallel
        const [subscriptionResult, usage] = await Promise.all([
          fetchActiveSubscription(user.stripeCustomerId),
          fetchUsageData(user.organizationId)
        ])

        const subscription = subscriptionResult

        // Determine plan type from subscription metadata or default to FREETRIAL
        let planType: PlanType = 'FREETRIAL'
        if (subscription?.metadata?.planType) {
          planType = subscription.metadata.planType as PlanType
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
          userId: user.id,
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
        throw error
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
 * Fetch active subscription for a Stripe customer
 */
async function fetchActiveSubscription(customerId: string): Promise<StripeSubscription | null> {
  const { data, error } = await supabase
    .from('stripe_subscriptions')
    .select('*')
    .eq('customer', customerId)
    .in('status', ['active', 'trialing', 'past_due'])
    .order('created', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // No subscription found
      logger.debug('No active subscription found for customer', {
        component: 'FetchActiveSubscription',
        customerId
      })
      return null
    }
    logger.error('Failed to fetch active subscription:', error, {
      component: 'FetchActiveSubscription',
      customerId
    })
    throw new Error(`Failed to fetch subscription: ${error.message}`)
  }

  return data as StripeSubscription
}

/**
 * Fetch usage data for the organization
 */
async function fetchUsageData(organizationId?: string | null): Promise<UsageData> {
  if (!organizationId) {
    return {
      properties: 0,
      units: 0,
      users: 0,
      storage: 0,
      apiCalls: 0
    }
  }

  try {
    // Fetch properties count
    const { count: propertiesCount, error: propertiesError } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)

    if (propertiesError) {
      logger.warn('Failed to fetch properties count:', propertiesError, {
        component: 'FetchUsageData'
      })
    }

    // Fetch units count
    const { count: unitsCount, error: unitsError } = await supabase
      .from('units')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)

    if (unitsError) {
      logger.warn('Failed to fetch units count:', unitsError, {
        component: 'FetchUsageData'
      })
    }

    // Fetch users count
    const { count: usersCount, error: usersError } = await supabase
      .from('organization_users')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)

    if (usersError) {
      logger.warn('Failed to fetch users count:', usersError, {
        component: 'FetchUsageData'
      })
    }

    // For now, set storage and API calls to default values
    // These could be fetched from analytics or usage tracking tables
    const usage: UsageData = {
      properties: propertiesCount || 0,
      units: unitsCount || 0,
      users: usersCount || 0,
      storage: 0, // TODO: Calculate from document storage
      apiCalls: 0 // TODO: Fetch from API usage tracking
    }

    logger.debug('Usage data fetched', {
      component: 'FetchUsageData',
      organizationId,
      usage
    })

    return usage
  } catch (error) {
    logger.error('Failed to fetch usage data:', error instanceof Error ? error : new Error(String(error)), {
      component: 'FetchUsageData',
      organizationId
    })
    
    // Return default usage on error
    return {
      properties: 0,
      units: 0,
      users: 0,
      storage: 0,
      apiCalls: 0
    }
  }
}

/**
 * Hook to get only usage data (lighter weight)
 */
export function useUsageData(): UseQueryResult<UsageData, Error> {
  const { user, isAuthenticated } = useAuth()

  return useQuery({
    queryKey: ['usage-data', user?.organizationId],
    queryFn: () => fetchUsageData(user?.organizationId),
    enabled: isAuthenticated && !!user?.organizationId,
    staleTime: 60 * 1000, // Consider data stale after 1 minute
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes
    retry: 2,
  })
}