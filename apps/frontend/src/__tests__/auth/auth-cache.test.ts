import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { authCache } from '@/lib/auth/auth-cache'
import type { AuthUser } from '@/lib/supabase'

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }
}))

describe('Auth Cache', () => {
  const mockUser: AuthUser = {
    id: '123',
    email: 'test@example.com',
    name: 'Test User',
    avatar_url: null
  }

  const mockFetcher = vi.fn(() => Promise.resolve(mockUser))

  beforeEach(() => {
    vi.clearAllMocks()
    authCache.invalidate() // Clear cache before each test
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('getAuthState', () => {
    it('should fetch and cache auth state on first call', async () => {
      const result = await authCache.getAuthState('test-key', mockFetcher)

      expect(result).toEqual(mockUser)
      expect(mockFetcher).toHaveBeenCalledTimes(1)
    })

    it('should return cached state on subsequent calls', async () => {
      // First call
      await authCache.getAuthState('test-key', mockFetcher)
      
      // Second call - should use cache
      const result = await authCache.getAuthState('test-key', mockFetcher)

      expect(result).toEqual(mockUser)
      expect(mockFetcher).toHaveBeenCalledTimes(1) // Not called again
    })

    it('should fetch fresh data when forceFresh is true', async () => {
      // First call
      await authCache.getAuthState('test-key', mockFetcher)
      
      // Second call with forceFresh
      const result = await authCache.getAuthState('test-key', mockFetcher, { forceFresh: true })

      expect(result).toEqual(mockUser)
      expect(mockFetcher).toHaveBeenCalledTimes(2)
    })

    it('should expire cache after TTL (5 minutes)', async () => {
      // First call
      await authCache.getAuthState('test-key', mockFetcher)
      
      // Fast forward 5 minutes and 1 second
      vi.advanceTimersByTime(5 * 60 * 1000 + 1000)
      
      // Should fetch again
      await authCache.getAuthState('test-key', mockFetcher)

      expect(mockFetcher).toHaveBeenCalledTimes(2)
    })

    it('should deduplicate concurrent requests', async () => {
      // Make multiple concurrent requests
      const promises = [
        authCache.getAuthState('test-key', mockFetcher),
        authCache.getAuthState('test-key', mockFetcher),
        authCache.getAuthState('test-key', mockFetcher)
      ]

      const results = await Promise.all(promises)

      // All should return the same result
      results.forEach(result => {
        expect(result).toEqual(mockUser)
      })

      // But fetcher should only be called once
      expect(mockFetcher).toHaveBeenCalledTimes(1)
    })

    it('should handle fetcher errors gracefully', async () => {
      const errorFetcher = vi.fn(() => Promise.reject(new Error('Fetch failed')))

      await expect(
        authCache.getAuthState('error-key', errorFetcher)
      ).rejects.toThrow('Fetch failed')

      // Verify error is not cached
      await expect(
        authCache.getAuthState('error-key', errorFetcher)
      ).rejects.toThrow('Fetch failed')

      expect(errorFetcher).toHaveBeenCalledTimes(2) // Called each time
    })
  })

  describe('invalidate', () => {
    it('should invalidate specific cache key', async () => {
      // Cache a value
      await authCache.getAuthState('test-key', mockFetcher)
      
      // Invalidate it
      authCache.invalidate('test-key')
      
      // Next call should fetch again
      await authCache.getAuthState('test-key', mockFetcher)

      expect(mockFetcher).toHaveBeenCalledTimes(2)
    })

    it('should clear all cache when no key provided', async () => {
      const fetcher1 = vi.fn(() => Promise.resolve(mockUser))
      const fetcher2 = vi.fn(() => Promise.resolve(mockUser))

      // Cache multiple keys
      await authCache.getAuthState('key1', fetcher1)
      await authCache.getAuthState('key2', fetcher2)
      
      // Clear all cache
      authCache.invalidate()
      
      // Both should fetch again
      await authCache.getAuthState('key1', fetcher1)
      await authCache.getAuthState('key2', fetcher2)

      expect(fetcher1).toHaveBeenCalledTimes(2)
      expect(fetcher2).toHaveBeenCalledTimes(2)
    })
  })

  describe('update', () => {
    it('should update cached value', async () => {
      const updatedUser: AuthUser = {
        ...mockUser,
        name: 'Updated Name'
      }

      // Cache initial value
      await authCache.getAuthState('test-key', mockFetcher)
      
      // Update cache
      authCache.update('test-key', updatedUser)
      
      // Next call should return updated value without fetching
      const result = await authCache.getAuthState('test-key', mockFetcher)

      expect(result).toEqual(updatedUser)
      expect(mockFetcher).toHaveBeenCalledTimes(1) // Not called again
    })

    it('should update with null to clear user', () => {
      authCache.update('test-key', null)
      
      // Cache stats should reflect the update
      const stats = authCache.getStats()
      expect(stats.cacheSize).toBeGreaterThan(0)
    })
  })

  describe('getStats', () => {
    it('should return cache statistics', async () => {
      // Initially empty
      let stats = authCache.getStats()
      expect(stats.cacheSize).toBe(0)
      expect(stats.inFlightRequests).toBe(0)

      // Cache some values
      await authCache.getAuthState('key1', mockFetcher)
      await authCache.getAuthState('key2', mockFetcher)

      stats = authCache.getStats()
      expect(stats.cacheSize).toBe(2)
      expect(stats.hitRate).toBeGreaterThan(0)
    })
  })

  describe('session validation', () => {
    it('should invalidate cache when session ID changes', async () => {
      const sessionId1 = 'session-1'
      const sessionId2 = 'session-2'

      // Cache with first session
      await authCache.getAuthState('test-key', mockFetcher, { sessionId: sessionId1 })
      
      // Try to get with different session
      await authCache.getAuthState('test-key', mockFetcher, { sessionId: sessionId2 })

      // Should fetch again due to session mismatch
      expect(mockFetcher).toHaveBeenCalledTimes(2)
    })

    it('should use cache when session ID matches', async () => {
      const sessionId = 'session-1'

      // Cache with session
      await authCache.getAuthState('test-key', mockFetcher, { sessionId })
      
      // Get with same session
      await authCache.getAuthState('test-key', mockFetcher, { sessionId })

      // Should use cache
      expect(mockFetcher).toHaveBeenCalledTimes(1)
    })
  })
})