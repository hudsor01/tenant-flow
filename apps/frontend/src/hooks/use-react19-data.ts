/**
 * React 19 use() Hook Implementation
 * Native data fetching with Suspense integration
 */

import { use } from 'react'
import { logger } from '@/lib/logger/logger'

/**
 * React 19 use() hook wrapper for promises
 * Enables Suspense-based data fetching without external libraries
 */
export function usePromise<T>(promise: Promise<T>): T {
  return use(promise)
}

/**
 * Create a cached data fetcher using React 19 patterns
 * Automatically handles loading states with Suspense
 */
export function createDataFetcher<T>(
  fetchFn: () => Promise<T>,
  cacheKey?: string
) {
  const cache = new Map<string, Promise<T>>()
  const key = cacheKey || fetchFn.toString()
  
  return function useData(): T {
    // Get or create cached promise
    if (!cache.has(key)) {
      const promise = fetchFn().catch(error => {
        // Remove failed promise from cache
        cache.delete(key)
        logger.error('Data fetch failed', { error, cacheKey: key })
        throw error
      })
      cache.set(key, promise)
    }
    
    // Use React 19's use() hook
    return use(cache.get(key)!)
  }
}

/**
 * React 19 Suspense-ready dashboard data fetcher
 * Replaces useQuery for simple data fetching scenarios
 */
export const useDashboardData = createDataFetcher(async () => {
  const response = await fetch('/api/dashboard/overview')
  if (!response.ok) {
    throw new Error('Failed to fetch dashboard data')
  }
  return response.json()
}, 'dashboard-overview')

/**
 * Properties data fetcher with React 19 patterns
 */
export const usePropertiesData = createDataFetcher(async () => {
  const response = await fetch('/api/properties')
  if (!response.ok) {
    throw new Error('Failed to fetch properties')
  }
  return response.json()
}, 'properties-list')

/**
 * User profile data with automatic cache invalidation
 */
export const useUserProfile = createDataFetcher(async () => {
  const response = await fetch('/api/auth/profile')
  if (!response.ok) {
    throw new Error('Failed to fetch user profile')
  }
  return response.json()
}, 'user-profile')