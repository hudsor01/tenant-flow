/**
 * Simple pricing hook using fixed pricing configuration
 * Replaces over-engineered dynamic pricing system
 */

import
  {
    PRICING_PLANS,
    getAllPricingPlans,
    getPricingPlan,
    getStripePriceId,
    type PlanId
  } from '@repo/shared/config/pricing'
import type { UsePricingReturn } from '@repo/shared/types/frontend'
import { useMemo } from 'react'

// UsePricingReturn type imported from @repo/shared

/**
 * Hook to get fixed pricing configuration
 * Simple replacement for over-engineered dynamic pricing
 */
export function usePricing(): UsePricingReturn {
  const plans = useMemo(() => getAllPricingPlans(), [])

  const getPlan = useMemo(() => (planId: PlanId) => getPricingPlan(planId), [])

  const getPrice = useMemo(() => (planId: PlanId, period: 'monthly' | 'annual') => {
    const plan = getPricingPlan(planId)
    if (!plan) return '$0'

    const amount = period === 'monthly' ? plan.price.monthly : plan.price.annual
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }, [])

  const getStripeId = useMemo(() => (planId: PlanId, period: 'monthly' | 'annual') => {
    return getStripePriceId(planId, period)
  }, [])

  return {
    plans,
    getPlan,
    getPrice,
    getStripeId,
    isLoading: false,
    error: null
  }
}

/**
 * Get specific plan details
 */
export function usePlan(planId: PlanId) {
  const plan = useMemo(() => getPricingPlan(planId), [planId])

  return {
    plan: plan || null,
    isLoading: false,
    error: null
  }
}

/**
 * Legacy compatibility - maintains same interface as old dynamic pricing
 */
export function useLegacyPricingCompat() {
  const plans = getAllPricingPlans()

  return {
    PRICING_PLANS,
    plans,
    loading: false,
    error: null,
    getPricingPlan,
    getAllPricingPlans
  }
}
