import { LRUCache } from 'lru-cache'
import type { AuthUser } from '@/lib/supabase'
import { logger } from '@/lib/logger'

interface CachedAuthState {
  user: AuthUser | null
  timestamp: number
  sessionId?: string
}

interface AuthRequest {
  promise: Promise<AuthUser | null>
  timestamp: number
}

/**
 * Auth state cache with LRU eviction
 * Reduces redundant auth checks and improves performance
 */
class AuthCache {
  private static instance: AuthCache
  
  // Cache for auth state
  private cache: LRUCache<string, CachedAuthState>
  
  // Deduplication map for in-flight requests
  private inFlightRequests: Map<string, AuthRequest>
  
  // Cache configuration
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes
  private readonly MAX_CACHE_SIZE = 100
  private readonly DEDUP_WINDOW = 1000 // 1 second
  
  private constructor() {
    this.cache = new LRUCache<string, CachedAuthState>({
      max: this.MAX_CACHE_SIZE,
      ttl: this.CACHE_TTL,
      updateAgeOnGet: true,
      updateAgeOnHas: false,
    })
    
    this.inFlightRequests = new Map()
    
    // Clean up stale in-flight requests periodically
    setInterval(() => this.cleanupInFlightRequests(), 10000)
  }
  
  static getInstance(): AuthCache {
    if (!AuthCache.instance) {
      AuthCache.instance = new AuthCache()
    }
    return AuthCache.instance
  }
  
  /**
   * Get cached auth state or fetch if not cached
   */
  async getAuthState(
    key: string,
    fetcher: () => Promise<AuthUser | null>,
    options?: {
      forceFresh?: boolean
      sessionId?: string
    }
  ): Promise<AuthUser | null> {
    const cacheKey = this.getCacheKey(key)
    
    // Check if we should use cache
    if (!options?.forceFresh) {
      const cached = this.cache.get(cacheKey)
      
      if (cached && this.isValidCache(cached, options?.sessionId)) {
        logger.debug('Auth cache hit', {
          component: 'AuthCache',
          key: cacheKey,
          age: Date.now() - cached.timestamp
        })
        
        return cached.user
      }
    }
    
    // Check for in-flight request (deduplication)
    const inFlight = this.inFlightRequests.get(cacheKey)
    if (inFlight && (Date.now() - inFlight.timestamp) < this.DEDUP_WINDOW) {
      logger.debug('Auth request deduplication', {
        component: 'AuthCache',
        key: cacheKey
      })
      
      return inFlight.promise
    }
    
    // Create new request
    const requestPromise = this.fetchAndCache(cacheKey, fetcher, options?.sessionId)
    
    // Store in-flight request for deduplication
    this.inFlightRequests.set(cacheKey, {
      promise: requestPromise,
      timestamp: Date.now()
    })
    
    return requestPromise
  }
  
  /**
   * Fetch auth state and update cache
   */
  private async fetchAndCache(
    key: string,
    fetcher: () => Promise<AuthUser | null>,
    sessionId?: string
  ): Promise<AuthUser | null> {
    try {
      logger.debug('Auth cache miss - fetching', {
        component: 'AuthCache',
        key
      })
      
      const user = await fetcher()
      
      // Update cache
      this.cache.set(key, {
        user,
        timestamp: Date.now(),
        sessionId
      })
      
      // Remove from in-flight requests
      this.inFlightRequests.delete(key)
      
      return user
    } catch (error) {
      logger.error('Auth fetch error:', error instanceof Error ? error : new Error(String(error)), {
        component: 'AuthCache',
        key
      })
      
      // Remove from in-flight requests
      this.inFlightRequests.delete(key)
      
      // Don't cache errors
      throw error
    }
  }
  
  /**
   * Invalidate cached auth state
   */
  invalidate(key?: string): void {
    if (key) {
      const cacheKey = this.getCacheKey(key)
      this.cache.delete(cacheKey)
      this.inFlightRequests.delete(cacheKey)
      
      logger.debug('Auth cache invalidated', {
        component: 'AuthCache',
        key: cacheKey
      })
    } else {
      // Clear all cache
      this.cache.clear()
      this.inFlightRequests.clear()
      
      logger.debug('Auth cache cleared', {
        component: 'AuthCache'
      })
    }
  }
  
  /**
   * Update cached auth state
   */
  update(key: string, user: AuthUser | null, sessionId?: string): void {
    const cacheKey = this.getCacheKey(key)
    
    this.cache.set(cacheKey, {
      user,
      timestamp: Date.now(),
      sessionId
    })
    
    logger.debug('Auth cache updated', {
      component: 'AuthCache',
      key: cacheKey,
      hasUser: !!user
    })
  }
  
  /**
   * Check if cached entry is still valid
   */
  private isValidCache(cached: CachedAuthState, sessionId?: string): boolean {
    // Check if session ID matches (if provided)
    if (sessionId && cached.sessionId && sessionId !== cached.sessionId) {
      return false
    }
    
    // Cache is valid if within TTL (handled by LRU cache)
    return true
  }
  
  /**
   * Generate cache key
   */
  private getCacheKey(key: string): string {
    // Normalize key to prevent duplicates
    return key.toLowerCase().trim()
  }
  
  /**
   * Clean up stale in-flight requests
   */
  private cleanupInFlightRequests(): void {
    const now = Date.now()
    const staleThreshold = 5000 // 5 seconds
    
    for (const [key, request] of this.inFlightRequests.entries()) {
      if (now - request.timestamp > staleThreshold) {
        this.inFlightRequests.delete(key)
        
        logger.debug('Cleaned up stale in-flight request', {
          component: 'AuthCache',
          key
        })
      }
    }
  }
  
  /**
   * Get cache statistics
   */
  getStats(): {
    cacheSize: number
    inFlightRequests: number
    hitRate: number
  } {
    return {
      cacheSize: this.cache.size,
      inFlightRequests: this.inFlightRequests.size,
      hitRate: this.cache.size > 0 ? 
        (this.cache.size / this.MAX_CACHE_SIZE) * 100 : 0
    }
  }
}

// Export singleton instance
export const authCache = AuthCache.getInstance()