/**
 * React hook for dynamic pricing configuration from Stripe API
 * Replaces hardcoded pricing with live Stripe data
 */

import { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { 
  UseDynamicPricingReturn,
  FrontendPricingService
} from '@repo/shared/config/dynamic-pricing'
import { dynamicPlanToPricingConfig, FrontendPricingService as FrontendPricingServiceClass } from '@repo/shared/config/dynamic-pricing'
import type { PricingConfig } from '@repo/shared/config/pricing'

// API client singleton
let pricingService: FrontendPricingService | null = null

function getPricingService(): FrontendPricingService {
  if (!pricingService) {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.tenantflow.app'
    pricingService = new FrontendPricingServiceClass(apiBaseUrl)
  }
  return pricingService!
}

/**
 * Hook to fetch dynamic pricing configuration from Stripe API
 * Provides automatic caching, error handling, and refresh capabilities
 */
export function useDynamicPricing(): UseDynamicPricingReturn {
  const service = getPricingService()

  const { 
    data: config, 
    isLoading: loading, 
    error: queryError,
    refetch 
  } = useQuery({
    queryKey: ['dynamic-pricing'],
    queryFn: () => service.fetchPricingConfig(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  })

  // Convert dynamic plans to legacy PricingConfig format
  const plans: PricingConfig[] = config?.config.map(dynamicPlanToPricingConfig) || []

  const error = queryError ? String(queryError) : null

  const refresh = useCallback(async () => {
    await service.refreshConfig()
    await refetch()
  }, [service, refetch])

  return {
    config: config || null,
    plans,
    loading,
    error,
    refresh
  }
}

/**
 * Hook to get a specific plan by ID from dynamic pricing
 */
export function useDynamicPlan(planId: string) {
  const { config, loading, error } = useDynamicPricing()
  
  const plan = config?.config.find(p => p.id === planId) || null
  const pricingConfig = plan ? dynamicPlanToPricingConfig(plan) : null

  return {
    plan,
    pricingConfig,
    loading,
    error
  }
}

/**
 * Hook to get pricing by Stripe price ID
 */
export function usePriceDetails(priceId: string) {
  const { config, loading, error } = useDynamicPricing()
  
  const plan = config?.config.find(p => 
    p.prices.monthly?.id === priceId || 
    p.prices.annual?.id === priceId
  ) || null

  const priceDetails = plan ? {
    plan,
    isMonthly: plan.prices.monthly?.id === priceId,
    isAnnual: plan.prices.annual?.id === priceId,
    amount: plan.prices.monthly?.id === priceId 
      ? plan.prices.monthly.amount 
      : plan.prices.annual?.amount || 0,
    currency: plan.prices.monthly?.id === priceId 
      ? plan.prices.monthly.currency 
      : plan.prices.annual?.currency || 'usd'
  } : null

  return {
    priceDetails,
    loading,
    error
  }
}

/**
 * Hook for pricing comparison and calculations
 */
export function usePricingCalculations() {
  const { config } = useDynamicPricing()

  const calculateAnnualSavings = useCallback((planId: string): number => {
    const plan = config?.config.find(p => p.id === planId)
    if (!plan?.prices.monthly || !plan?.prices.annual) return 0

    const monthlyTotal = plan.prices.monthly.amount * 12
    const annualAmount = plan.prices.annual.amount
    return Math.round(((monthlyTotal - annualAmount) / monthlyTotal) * 100)
  }, [config])

  const formatPrice = useCallback((amountInCents: number, currency = 'USD'): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amountInCents / 100)
  }, [])

  const getPriceId = useCallback((planId: string, period: 'monthly' | 'annual'): string | null => {
    const plan = config?.config.find(p => p.id === planId)
    return plan?.prices[period]?.id || null
  }, [config])

  return {
    calculateAnnualSavings,
    formatPrice,
    getPriceId,
    isLoaded: !!config
  }
}

/**
 * Legacy compatibility hook - provides same interface as old static pricing
 * Allows gradual migration from static to dynamic pricing
 */
export function useLegacyPricingCompat() {
  const { plans, loading, error } = useDynamicPricing()

  // Convert to legacy PRICING_PLANS format
  const PRICING_PLANS = plans.reduce((acc, plan) => {
    acc[plan.id] = plan
    return acc
  }, {} as Record<string, PricingConfig>)

  return {
    PRICING_PLANS,
    plans,
    loading,
    error,
    // Legacy helper functions
    getPricingPlan: (planId: string) => plans.find(p => p.planId === planId),
    getAllPricingPlans: () => plans
  }
}