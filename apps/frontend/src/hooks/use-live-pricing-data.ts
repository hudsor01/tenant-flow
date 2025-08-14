/**
 * Hook for live pricing data from Supabase foreign tables
 * Fetches real-time product and price information from Stripe via foreign data wrapper
 */
import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'

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
}

/**
 * Fetch live pricing data from Supabase foreign tables
 * This provides real-time access to Stripe products and prices
 */
export function useLivePricingData(): UseQueryResult<LivePricingData, Error> {
  return useQuery({
    queryKey: ['live-pricing-data'],
    queryFn: async (): Promise<LivePricingData> => {
      try {
        // Fetch products and prices in parallel from foreign tables
        const [productsResult, pricesResult] = await Promise.all([
          supabase
            .from('stripe_products')
            .select('*')
            .eq('active', true)
            .order('metadata->order', { ascending: true }),
          supabase
            .from('stripe_prices')
            .select('*')
            .eq('active', true)
            .order('created', { ascending: false })
        ])

        if (productsResult.error) {
          logger.error('Failed to fetch stripe products:', productsResult.error, { 
            component: 'UseLivePricingDataHook' 
          })
          throw new Error(`Failed to fetch products: ${productsResult.error.message}`)
        }

        if (pricesResult.error) {
          logger.error('Failed to fetch stripe prices:', pricesResult.error, { 
            component: 'UseLivePricingDataHook' 
          })
          throw new Error(`Failed to fetch prices: ${pricesResult.error.message}`)
        }

        const products = productsResult.data as StripeProduct[]
        const prices = pricesResult.data as StripePrice[]

        // Group prices by product
        const productPrices = products.map(product => ({
          ...product,
          prices: prices.filter(price => price.product === product.id)
        }))

        logger.debug('Fetched live pricing data', {
          component: 'UseLivePricingDataHook',
          productsCount: products.length,
          pricesCount: prices.length
        })

        return { products, prices, productPrices }
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
        const { data, error } = await supabase
          .from('stripe_prices')
          .select('*')
          .eq('product', productId)
          .eq('active', true)
          .order('unit_amount', { ascending: true })

        if (error) {
          logger.error('Failed to fetch product prices:', error, { 
            component: 'UseProductPricesHook',
            productId 
          })
          throw new Error(`Failed to fetch prices for product ${productId}: ${error.message}`)
        }

        return data as StripePrice[]
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