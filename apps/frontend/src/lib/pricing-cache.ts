/**
 * Multi-layer caching system for pricing data
 * Implements edge, browser, and memory caching strategies
 */

import type { PlanType } from '@repo/shared'
import type { UsageMetrics } from '@repo/shared/config/pricing'

// LRU Cache implementation for memory caching
class LRUCache<T> {
  private cache: Map<string, { value: T; timestamp: number }>
  private readonly maxSize: number
  private readonly ttl: number

  constructor(maxSize: number = 100, ttl: number = 60000) {
    this.cache = new Map()
    this.maxSize = maxSize
    this.ttl = ttl
  }

  get(key: string): T | null {
    const item = this.cache.get(key)
    if (!item) return null

    // Check if expired
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key)
      return null
    }

    // Move to end (most recently used)
    this.cache.delete(key)
    this.cache.set(key, item)
    
    return item.value
  }

  set(key: string, value: T): void {
    // Remove oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey !== undefined) {
        this.cache.delete(firstKey)
      }
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now()
    })
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }
}

// Cache configuration
export const CACHE_CONFIG = {
  // Static pricing data (configuration) - never expires
  static: {
    ttl: Infinity,
    key: 'pricing:static'
  },
  
  // User-specific data - short TTL
  user: {
    ttl: 2 * 60 * 1000, // 2 minutes
    key: (userId?: string) => `pricing:user:${userId || 'anonymous'}`
  },
  
  // Computed recommendations - medium TTL
  computed: {
    ttl: 5 * 60 * 1000, // 5 minutes
    key: (planType: string, usageHash: string) => `pricing:computed:${planType}:${usageHash}`
  },
  
  // Stripe data - longer TTL
  stripe: {
    ttl: 15 * 60 * 1000, // 15 minutes
    key: 'pricing:stripe'
  }
} as const

// Multi-layer cache system
export class PricingCache {
  private static instance: PricingCache
  private memoryCache: LRUCache<unknown>
  private browserCache: Map<string, { data: unknown; timestamp: number; ttl: number }>

  private constructor() {
    this.memoryCache = new LRUCache(100, 60000) // 100 items, 1 minute TTL
    this.browserCache = new Map()
    
    // Load from sessionStorage on initialization
    this.loadFromBrowserCache()
  }

  static getInstance(): PricingCache {
    if (!PricingCache.instance) {
      PricingCache.instance = new PricingCache()
    }
    return PricingCache.instance
  }

  // Memory cache operations (fastest)
  getFromMemory<T>(key: string): T | null {
    return this.memoryCache.get(key) as T | null
  }

  setInMemory<T>(key: string, data: T): void {
    this.memoryCache.set(key, data)
  }

  // Browser cache operations (persistent across tabs)
  getFromBrowser<T>(key: string): T | null {
    const item = this.browserCache.get(key)
    if (!item) return null

    // Check if expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.browserCache.delete(key)
      this.saveToBrowserCache()
      return null
    }

    return item.data as T
  }

  setInBrowser<T>(key: string, data: T, ttl: number): void {
    this.browserCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
    this.saveToBrowserCache()
  }

  // Unified get/set with fallthrough
  async get<T>(key: string): Promise<T | null> {
    // 1. Try memory cache first (fastest)
    const memoryResult = this.getFromMemory<T>(key)
    if (memoryResult !== null) {
      return memoryResult
    }

    // 2. Try browser cache
    const browserResult = this.getFromBrowser<T>(key)
    if (browserResult !== null) {
      // Promote to memory cache
      this.setInMemory(key, browserResult)
      return browserResult
    }

    return null
  }

  async set<T>(key: string, data: T, ttl: number = 60000): Promise<void> {
    // Set in both memory and browser cache
    this.setInMemory(key, data)
    this.setInBrowser(key, data, ttl)
  }

  // Clear all caches
  clear(): void {
    this.memoryCache.clear()
    this.browserCache.clear()
    this.saveToBrowserCache()
  }

  // Cache statistics
  getStats() {
    return {
      memorySize: this.memoryCache.size(),
      browserSize: this.browserCache.size,
      memoryHitRate: this.calculateHitRate('memory'),
      browserHitRate: this.calculateHitRate('browser')
    }
  }

  private loadFromBrowserCache(): void {
    try {
      if (typeof window === 'undefined') return
      
      const stored = sessionStorage.getItem('pricing-cache')
      if (stored) {
        const data = JSON.parse(stored)
        this.browserCache = new Map(data)
      }
    } catch (error) {
      console.warn('Failed to load browser cache:', error)
    }
  }

  private saveToBrowserCache(): void {
    try {
      if (typeof window === 'undefined') return
      
      const data = Array.from(this.browserCache.entries())
      sessionStorage.setItem('pricing-cache', JSON.stringify(data))
    } catch (error) {
      console.warn('Failed to save browser cache:', error)
    }
  }

  private calculateHitRate(_type: 'memory' | 'browser'): number {
    // In a real implementation, you'd track hits/misses
    return 0.85 // Placeholder
  }
}

// Convenience functions
export const pricingCache = PricingCache.getInstance()

export async function getCachedPricingData<T>(
  key: string, 
  fetcher: () => Promise<T>,
  ttl: number = CACHE_CONFIG.computed.ttl
): Promise<T> {
  // Try cache first
  const cached = await pricingCache.get<T>(key)
  if (cached !== null) {
    return cached
  }

  // Fetch and cache
  const data = await fetcher()
  await pricingCache.set(key, data, ttl)
  
  return data
}

// Specialized caching functions
export async function getCachedStaticPricing() {
  return getCachedPricingData(
    CACHE_CONFIG.static.key,
    async () => {
      const { ENHANCED_PRODUCT_TIERS } = await import('@repo/shared/config/pricing')
      return ENHANCED_PRODUCT_TIERS
    },
    CACHE_CONFIG.static.ttl
  )
}

export async function getCachedUserPricing(userId?: string) {
  return getCachedPricingData(
    CACHE_CONFIG.user.key(userId),
    async () => {
      // This would fetch user-specific pricing data
      throw new Error('User pricing fetcher not implemented')
    },
    CACHE_CONFIG.user.ttl
  )
}

export async function getCachedRecommendations(planType: string, usage: unknown) {
  const usageHash = hashObject(usage)
  
  return getCachedPricingData(
    CACHE_CONFIG.computed.key(planType, usageHash),
    async () => {
      const { getRecommendedUpgrade, calculateAnnualSavings } = await import('@repo/shared/config/pricing')
      
      return {
        suggested: getRecommendedUpgrade(planType as PlanType, usage as UsageMetrics),
        annualSavings: calculateAnnualSavings(planType as PlanType),
        timestamp: Date.now()
      }
    },
    CACHE_CONFIG.computed.ttl
  )
}

// Cache warming - preload critical data
export async function warmPricingCache(): Promise<void> {
  try {
    // Preload static pricing configuration
    await getCachedStaticPricing()
    
    // Preload common recommendation scenarios
    const commonUsagePatterns = [
      { properties: 1, units: 5, users: 1 },   // Trial user
      { properties: 3, units: 25, users: 2 },  // Starter user
      { properties: 15, units: 150, users: 5 } // Growth user
    ]

    const planTypes = ['FREETRIAL', 'STARTER', 'GROWTH']
    
    for (const planType of planTypes) {
      for (const usage of commonUsagePatterns) {
        await getCachedRecommendations(planType, usage)
      }
    }
  } catch (error) {
    console.warn('Cache warming failed:', error)
  }
}

// Utility functions
function hashObject(obj: unknown): string {
  return btoa(JSON.stringify(obj)).replace(/[+/=]/g, '').substring(0, 16)
}

// Cache invalidation
export function invalidatePricingCache(pattern?: string): void {
  if (pattern) {
    // Invalidate specific patterns
    const _cache = PricingCache.getInstance()
    // Implementation would depend on cache structure
  } else {
    // Invalidate all pricing cache
    pricingCache.clear()
  }
}

// Export for use in components
export default pricingCache