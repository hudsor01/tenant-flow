/**
 * Hook for live pricing data from backend API and shared config
 * Combines static pricing config with dynamic subscription data
 */
import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { logger } from '@/lib/logger'
import { BillingApi } from '@/lib/api/billing'
import { ENHANCED_PRODUCT_TIERS } from '@repo/shared/config/pricing'
import type { PlanType } from '@repo/shared/types/stripe'

export interface StripeProduct {
  id: string
  name: string
  description: string | null
  active: boolean
  metadata: Record<string, unknown>
  created: number
  updated: number
}

export interface StripePrice {
  id: string
  product: string
  currency: string
  unit_amount: number
  recurring: {
    interval: 'month' | 'year'
    interval_count: number
  } | null
  active: boolean
  metadata: Record<string, unknown>
  created: number
}

export interface LivePricingData {
  products: StripeProduct[]
  prices: StripePrice[]
  productPrices: Array<StripeProduct & { prices: StripePrice[] }>
  currentSubscription: {
    id: string | null
    status: string | null
    plan_type: PlanType | null
    current_period_end: string | null
  } | null
}

/**
 * Convert shared pricing config to StripeProduct format
 */
function convertConfigToProducts(): StripeProduct[] {
  return Object.entries(ENHANCED_PRODUCT_TIERS).map(([planType, config]) => ({
    id: `prod_${config.planId}`,
    name: config.name,
    description: config.description,
    active: true,
    metadata: {
      plan_type: planType,
      support: config.support,
      features: config.features
    },
    created: Date.now() / 1000,
    updated: Date.now() / 1000
  }))
}

/**
 * Convert shared pricing config to StripePrice format
 */
function convertConfigToPrices(): StripePrice[] {
  const prices: StripePrice[] = []
  
  Object.entries(ENHANCED_PRODUCT_TIERS).forEach(([planType, config]) => {
    const productId = `prod_${config.planId}`
    
    // Monthly price
    if (config.stripePriceIds.monthly) {
      prices.push({
        id: config.stripePriceIds.monthly,
        product: productId,
        currency: 'usd',
        unit_amount: config.price.monthly * 100, // Convert to cents
        recurring: {
          interval: 'month',
          interval_count: 1
        },
        active: true,
        metadata: {
          plan_type: planType,
          billing_interval: 'monthly'
        },
        created: Date.now() / 1000
      })
    }
    
    // Annual price
    if (config.stripePriceIds.annual) {
      prices.push({
        id: config.stripePriceIds.annual,
        product: productId,
        currency: 'usd',
        unit_amount: config.price.annual * 100, // Convert to cents
        recurring: {
          interval: 'year',
          interval_count: 1
        },
        active: true,
        metadata: {
          plan_type: planType,
          billing_interval: 'annual'
        },
        created: Date.now() / 1000
      })
    }
  })
  
  return prices
}

/**
 * Fetch live pricing data from shared config and backend API
 * This provides access to pricing tiers and current subscription status
 */
export function useLivePricingData(): UseQueryResult<LivePricingData, Error> {
  return useQuery({
    queryKey: ['live-pricing-data'],
    queryFn: async (): Promise<LivePricingData> => {
      try {
        // Convert shared config to pricing data
        const products = convertConfigToProducts()
        const prices = convertConfigToPrices()
        
        // Group prices by product
        const productPrices = products.map(product => ({
          ...product,
          prices: prices.filter(price => price.product === product.id)
        }))

        // Fetch current subscription from backend
        let currentSubscription = null
        try {
          const subscription = await BillingApi.getSubscription()
          currentSubscription = {
            id: subscription.id || null,
            status: subscription.status || null,
            plan_type: subscription.planType || null,
            current_period_end: subscription.currentPeriodEnd ? 
              (typeof subscription.currentPeriodEnd === 'string' ? subscription.currentPeriodEnd : subscription.currentPeriodEnd.toISOString()) 
              : null
          }
        } catch {
          // User might not have a subscription yet, which is fine
          logger.debug('No subscription found (user might be on free trial)', {
            component: 'UseLivePricingDataHook'
          })
        }

        logger.debug('Fetched live pricing data', {
          component: 'UseLivePricingDataHook',
          productsCount: products.length,
          pricesCount: prices.length,
          hasSubscription: !!currentSubscription
        })

        return { products, prices, productPrices, currentSubscription }
      } catch (error) {
        logger.error('Live pricing data fetch failed:', error instanceof Error ? error : new Error(String(error)), {
          component: 'UseLivePricingDataHook'
        })
        throw error
      }
    },
    staleTime: 60 * 1000, // Consider data stale after 1 minute
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}

/**
 * Get prices for a specific product
 */
export function useProductPrices(productId: string): UseQueryResult<StripePrice[], Error> {
  return useQuery({
    queryKey: ['product-prices', productId],
    queryFn: async (): Promise<StripePrice[]> => {
      if (!productId) return []

      try {
        const prices = convertConfigToPrices()
        const productPrices = prices.filter(price => price.product === productId)

        logger.debug('Fetched product prices', {
          component: 'UseProductPricesHook',
          productId,
          pricesCount: productPrices.length
        })

        return productPrices
      } catch (error) {
        logger.error('Product prices fetch failed:', error instanceof Error ? error : new Error(String(error)), {
          component: 'UseProductPricesHook',
          productId
        })
        throw error
      }
    },
    enabled: !!productId,
    staleTime: 60 * 1000,
    retry: 2,
  })
}