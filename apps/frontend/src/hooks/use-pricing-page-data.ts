/**
 * Unified pricing page data hook with intelligent caching
 * Consolidates all pricing-related data fetching with multi-layer caching
 */

import { useQuery, UseQueryResult } from '@tanstack/react-query'
import { BillingApi } from '@/lib/api/billing'
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

// Convert shared config to API format
function convertConfigToProducts() {
  return Object.entries(ENHANCED_PRODUCT_TIERS).map(([planType, config]) => ({
    id: `prod_${config.planId}`,
    name: config.name,
    description: config.description,
    active: true,
    metadata: {
      plan_type: planType,
      support: config.support
    }
  }))
}

function convertConfigToPrices() {
  const prices: Array<{
    id: StripePriceId
    product_id: string
    currency: string
    unit_amount: number
    recurring_interval: 'month' | 'year' | null
    active: boolean
  }> = []
  
  Object.entries(ENHANCED_PRODUCT_TIERS).forEach(([, config]) => {
    const productId = `prod_${config.planId}`
    
    // Monthly price
    if (config.stripePriceIds.monthly) {
      prices.push({
        id: config.stripePriceIds.monthly,
        product_id: productId,
        currency: 'usd',
        unit_amount: config.price.monthly * 100,
        recurring_interval: 'month',
        active: true
      })
    }
    
    // Annual price
    if (config.stripePriceIds.annual) {
      prices.push({
        id: config.stripePriceIds.annual,
        product_id: productId,
        currency: 'usd',
        unit_amount: config.price.annual * 100,
        recurring_interval: 'year',
        active: true
      })
    }
  })
  
  return prices
}

// Main unified hook
export function usePricingPageData(): UseQueryResult<PricingPageData, Error> {
  return useQuery({
    queryKey: ['pricing-page-data'],
    queryFn: async (): Promise<PricingPageData> => {
      const startTime = performance.now()
      
      try {
        // Get static pricing data from config
        const products = convertConfigToProducts()
        const prices = convertConfigToPrices()
        
        // Fetch dynamic data from backend API
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
        const subscription = subscriptionResult.status === 'fulfilled' ? subscriptionResult.value : null

        // Handle usage result with fallback
        const usageData = usageResult.status === 'fulfilled' ? usageResult.value : {
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

        // Transform usage data to match our interface
        const usage: UsageMetrics = {
          properties: usageData.properties || 0,
          units: usageData.tenants || 0, // Map tenants to units
          users: 1, // Default to 1 user
          storage: 0, // Not tracked yet
          apiCalls: 0 // Not tracked yet
        }

        // Determine current plan
        const currentPlan = subscription?.planType || null

        // Calculate limits and recommendations
        const limits = currentPlan 
          ? checkPlanLimits(currentPlan, usage)
          : { exceeded: false, limits: [], warningLimits: [] }

        const recommendations = calculateRecommendations(currentPlan, usage, limits)

        const loadTime = performance.now() - startTime

        return {
          products,
          prices,
          subscription: subscription ? {
            id: subscription.id,
            status: subscription.status,
            current_period_end: subscription.currentPeriodEnd ? 
              (typeof subscription.currentPeriodEnd === 'string' ? subscription.currentPeriodEnd : subscription.currentPeriodEnd.toISOString()) 
              : null,
            plan_id: subscription.stripePriceId,
            plan_type: subscription.planType || null
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

// Helper function removed as it was unused

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
      try {
        const subscription = await BillingApi.getSubscription()
        return {
          id: subscription.id,
          status: subscription.status,
          current_period_end: subscription.currentPeriodEnd,
          cancel_at_period_end: subscription.cancelAtPeriodEnd,
          trial_end: subscription.trialEnd,
          metadata: (subscription as unknown as Record<string, unknown>).metadata || {}
        }
      } catch {
        // User might not have a subscription yet
        return null
      }
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