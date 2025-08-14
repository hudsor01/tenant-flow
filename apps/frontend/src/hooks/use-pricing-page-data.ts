/**
 * Unified pricing page data hook with intelligent caching
 * Consolidates all pricing-related data fetching with multi-layer caching
 */

import { useQuery, UseQueryResult } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { 
  ENHANCED_PRODUCT_TIERS, 
  checkPlanLimits, 
  getRecommendedUpgrade,
  calculateAnnualSavings,
  type UsageMetrics,
  type StripePriceId
} from '@repo/shared/config/pricing'
import type { PlanType } from '@repo/shared/types/stripe'

// Unified pricing data interface
export interface PricingPageData {
  readonly products: ReadonlyArray<{
    readonly id: string
    readonly name: string
    readonly description: string | null
    readonly active: boolean
    readonly metadata: Record<string, string>
  }>
  readonly prices: ReadonlyArray<{
    readonly id: StripePriceId
    readonly product_id: string
    readonly currency: string
    readonly unit_amount: number
    readonly recurring_interval: 'month' | 'year' | null
    readonly active: boolean
  }>
  readonly subscription: {
    readonly id: string | null
    readonly status: string | null
    readonly current_period_end: string | null
    readonly plan_id: string | null
    readonly plan_type: PlanType | null
  } | null
  readonly usage: UsageMetrics
  readonly limits: ReturnType<typeof checkPlanLimits>
  readonly recommendations: {
    readonly suggested: PlanType | null
    readonly shouldUpgrade: boolean
    readonly annualSavings: Record<PlanType, number>
    readonly urgentUpgrade: boolean
  }
  readonly meta: {
    readonly loadTime: number
    readonly cacheHit: boolean
    readonly lastUpdated: string
  }
}

// Cache configuration
const CACHE_CONFIG = {
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 30 * 60 * 1000, // 30 minutes
  refetchOnWindowFocus: false,
  refetchOnMount: false,
  retry: 3,
  retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000)
} as const

// Memory cache for computed values
const computedCache = new Map<string, { data: unknown; timestamp: number; ttl: number }>()

function getFromComputedCache<T>(key: string): T | null {
  const cached = computedCache.get(key)
  if (!cached) return null
  
  if (Date.now() - cached.timestamp > cached.ttl) {
    computedCache.delete(key)
    return null
  }
  
  return cached.data as T
}

function setComputedCache<T>(key: string, data: T, ttl: number = 60000): void {
  computedCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl
  })
}

// Recommendation calculation with caching
function calculateRecommendations(
  currentPlan: PlanType | null,
  usage: UsageMetrics,
  limits: ReturnType<typeof checkPlanLimits>
) {
  if (!currentPlan) {
    return {
      suggested: 'STARTER' as PlanType,
      shouldUpgrade: true,
      annualSavings: {} as Record<PlanType, number>,
      urgentUpgrade: false
    }
  }

  const cacheKey = `recommendations:${currentPlan}:${JSON.stringify(usage)}`
  const cached = getFromComputedCache<typeof result>(cacheKey)
  if (cached) return cached

  const suggested = getRecommendedUpgrade(currentPlan, usage)
  const shouldUpgrade = limits.exceeded || limits.warningLimits.length > 0
  const urgentUpgrade = limits.exceeded
  
  const annualSavings = Object.keys(ENHANCED_PRODUCT_TIERS).reduce((acc, planType) => {
    acc[planType as PlanType] = calculateAnnualSavings(planType as PlanType)
    return acc
  }, {} as Record<PlanType, number>)

  const result = {
    suggested,
    shouldUpgrade,
    annualSavings,
    urgentUpgrade
  }

  setComputedCache(cacheKey, result, 5 * 60 * 1000) // 5 min cache
  return result
}

// Main unified hook
export function usePricingPageData(): UseQueryResult<PricingPageData, Error> {
  return useQuery({
    queryKey: ['pricing-page-data'],
    queryFn: async (): Promise<PricingPageData> => {
      const startTime = performance.now()
      
      try {
        // Batch all Supabase queries for optimal performance
        const [
          productsResult,
          pricesResult,
          subscriptionResult,
          usageResult
        ] = await Promise.all([
          supabase
            .from('stripe_products')
            .select('id, name, description, active, metadata')
            .eq('active', true)
            .order('metadata->priority'),
          
          supabase
            .from('stripe_prices')
            .select('id, product_id, currency, unit_amount, recurring_interval, active')
            .eq('active', true)
            .order('unit_amount'),
          
          supabase
            .from('stripe_subscriptions')
            .select(`
              id,
              status,
              current_period_end,
              plan_id:stripe_prices!inner(product_id),
              metadata
            `)
            .eq('status', 'active')
            .limit(1)
            .single(),
          
          supabase.rpc('get_usage_metrics')
        ])

        // Handle errors gracefully
        if (productsResult.error) throw new Error(`Products fetch failed: ${productsResult.error.message}`)
        if (pricesResult.error) throw new Error(`Prices fetch failed: ${pricesResult.error.message}`)
        
        // Subscription error is not critical (user might not have one)
        const subscription = subscriptionResult.error ? null : subscriptionResult.data

        // Usage error defaults to zero usage
        const rawUsage: Record<string, number> = usageResult.error ? {
          properties: 0,
          units: 0,
          users: 1,
          storage: 0,
          api_calls: 0
        } : usageResult.data

        // Transform usage data to match our interface
        const usage: UsageMetrics = {
          properties: rawUsage.properties || 0,
          units: rawUsage.units || 0,
          users: rawUsage.users || 1,
          storage: rawUsage.storage || 0,
          apiCalls: rawUsage.api_calls || 0
        }

        // Determine current plan
        const currentPlan = subscription?.plan_id 
          ? mapProductIdToPlanType(subscription.plan_id) 
          : null

        // Calculate limits and recommendations
        const limits = currentPlan 
          ? checkPlanLimits(currentPlan, usage)
          : { exceeded: false, limits: [], warningLimits: [] }

        const recommendations = calculateRecommendations(currentPlan, usage, limits)

        const loadTime = performance.now() - startTime

        return {
          products: productsResult.data || [],
          prices: pricesResult.data || [],
          subscription: subscription ? {
            id: subscription.id,
            status: subscription.status,
            current_period_end: subscription.current_period_end,
            plan_id: subscription.plan_id,
            plan_type: currentPlan
          } : null,
          usage,
          limits,
          recommendations,
          meta: {
            loadTime,
            cacheHit: false, // TODO: Implement cache hit detection
            lastUpdated: new Date().toISOString()
          }
        }
      } catch (error) {
        console.error('Pricing page data fetch failed:', error)
        throw error
      }
    },
    ...CACHE_CONFIG,
    select: (data) => {
      // Additional computed properties
      return {
        ...data,
        meta: {
          ...data.meta,
          performanceGrade: data.meta.loadTime < 500 ? 'A' : data.meta.loadTime < 1000 ? 'B' : 'C'
        }
      }
    }
  })
}

// Helper function to map product IDs to plan types
function mapProductIdToPlanType(productId: string): PlanType | null {
  // This should map Stripe product IDs to our plan types
  // In practice, this would be stored in metadata or a lookup table
  const productMapping: Record<string, PlanType> = {
    'prod_trial': 'FREETRIAL',
    'prod_starter': 'STARTER', 
    'prod_growth': 'GROWTH',
    'prod_max': 'TENANTFLOW_MAX'
  }
  
  return productMapping[productId] || null
}

// Separate hook for static pricing data (can be cached longer)
export function useStaticPricingData() {
  return useQuery({
    queryKey: ['static-pricing-data'],
    queryFn: () => Promise.resolve(ENHANCED_PRODUCT_TIERS),
    staleTime: Infinity, // Static data never goes stale
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  })
}

// Hook for user-specific context only
export function useUserSubscriptionContext() {
  return useQuery({
    queryKey: ['user-subscription-context'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stripe_subscriptions')
        .select(`
          id,
          status,
          current_period_end,
          cancel_at_period_end,
          trial_end,
          metadata
        `)
        .eq('status', 'active')
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw new Error(`Subscription context fetch failed: ${error.message}`)
      }

      return data
    },
    staleTime: 2 * 60 * 1000, // 2 minutes for user-specific data
    retry: 2
  })
}

// Prefetch function for route-level optimization
export async function prefetchPricingPageData(): Promise<void> {
  // This can be called on route navigation to warm the cache
  // Note: This is not a React component, so we use direct cache warming
  try {
    const { warmPricingCache } = await import('@/lib/pricing-cache')
    await warmPricingCache()
  } catch (error) {
    console.warn('Failed to prefetch pricing data:', error)
  }
}