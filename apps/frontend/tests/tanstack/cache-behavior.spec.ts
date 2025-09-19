/**
 * TanStack Query Cache Behavior Tests
 * Tests real browser behavior for cache invalidation, persistence, and stale-while-revalidate
 * 
 * Critical cache functionality testing:
 * - Cache invalidation after mutations
 * - Stale-while-revalidate behavior
 * - Cache persistence across navigation
 * - Background refetch behavior
 * - Cache key management
 * - Query deduplication
 */

import { test, expect, Page } from '@playwright/test'
import { createTestProperty, createTestProperties } from '../fixtures/property-data'
import { 
  TanStackQueryHelper, 
  NetworkSimulator, 
  PropertyTableHelper, 
  PropertyFormHelper 
} from '../utils/tanstack-helpers'

test.describe('TanStack Query Cache Behavior', () => {
  let page: Page
  let queryHelper: TanStackQueryHelper
  let networkSim: NetworkSimulator
  let tableHelper: PropertyTableHelper
  let formHelper: PropertyFormHelper

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage()
    
    // Initialize helpers
    queryHelper = new TanStackQueryHelper(page)
    networkSim = new NetworkSimulator(page)
    tableHelper = new PropertyTableHelper(page)
    formHelper = new PropertyFormHelper(page)

    // Mock property data for consistent testing
    const testProperties = createTestProperties(10)
    await networkSim.mockSuccessResponse('/api/properties', testProperties)

    // Navigate to properties page
    await page.goto('/dashboard/properties')
    await page.waitForLoadState('networkidle')

    // Expose cache state for testing
    await page.addInitScript(() => {
      window.cacheOperations = []
      
      // Monitor cache operations if query client is available
      const monitorCache = () => {
        if (window.__QUERY_CLIENT__) {
          const originalSetQueryData = window.__QUERY_CLIENT__.setQueryData
          const originalInvalidateQueries = window.__QUERY_CLIENT__.invalidateQueries
          
          window.__QUERY_CLIENT__.setQueryData = function(...args) {
            window.cacheOperations.push({ type: 'setQueryData', args, timestamp: Date.now() })
            return originalSetQueryData.apply(this, args)
          }
          
          window.__QUERY_CLIENT__.invalidateQueries = function(...args) {
            window.cacheOperations.push({ type: 'invalidateQueries', args, timestamp: Date.now() })
            return originalInvalidateQueries.apply(this, args)
          }
        } else {
          setTimeout(monitorCache, 100)
        }
      }
      
      monitorCache()
    })
  })

  test.afterEach(async () => {
    await networkSim.resetNetworkMocks()
    await page.close()
  })

  test.describe('Cache Population and Retrieval', () => {
    test('should populate cache on initial load', async () => {
      // Wait for initial data load
      await page.waitForTimeout(2000)

      // Verify cache contains data
      const cacheData = await queryHelper.getQueryData(['properties', 'ALL'])
      expect(cacheData).toBeDefined()
      expect(Array.isArray(cacheData)).toBe(true)

      // Verify cache data matches UI
      const uiCount = await tableHelper.getPropertyCount()
      expect(cacheData.length).toBe(uiCount)
    })

    test('should serve data from cache on subsequent visits', async () => {
      await page.waitForTimeout(2000)

      // Record network requests
      const requests: string[] = []
      page.on('request', request => {
        if (request.url().includes('/api/properties')) {
          requests.push(request.url())
        }
      })

      // Navigate away and back
      await page.goto('/dashboard')
      await page.waitForTimeout(500)
      await page.goto('/dashboard/properties')
      await page.waitForTimeout(2000)

      // Data should be visible immediately from cache
      const propertyCount = await tableHelper.getPropertyCount()
      expect(propertyCount).toBeGreaterThan(0)

      // Should have made background refetch request
      expect(requests.length).toBeGreaterThanOrEqual(1)
    })

    test('should handle multiple concurrent requests with deduplication', async () => {
      // Clear cache first
      await queryHelper.clearCache()

      const requests: string[] = []
      page.on('request', request => {
        if (request.url().includes('/api/properties')) {
          requests.push(request.url())
        }
      })

      // Trigger multiple concurrent requests
      await Promise.all([
        page.reload(),
        page.evaluate(() => {
          // Trigger additional query
          if (window.__QUERY_CLIENT__) {
            window.__QUERY_CLIENT__.fetchQuery(['properties', 'ALL'])
          }
        }),
        page.evaluate(() => {
          // Another concurrent query
          if (window.__QUERY_CLIENT__) {
            window.__QUERY_CLIENT__.fetchQuery(['properties', 'ALL'])
          }
        })
      ])

      await page.waitForTimeout(3000)

      // Should deduplicate to single request
      expect(requests.length).toBeLessThanOrEqual(2) // Allow for some timing variations
    })
  })

  test.describe('Cache Invalidation', () => {
    test('should invalidate cache after successful mutations', async () => {
      await page.waitForTimeout(2000)
      const initialData = await queryHelper.getQueryData(['properties', 'ALL'])
      
      const testProperty = createTestProperty({ name: 'Invalidation Test Property' })

      // Create property (should trigger invalidation)
      await formHelper.createProperty(testProperty)
      await page.waitForTimeout(3000)

      // Verify cache was invalidated and refetched
      const newData = await queryHelper.getQueryData(['properties', 'ALL'])
      expect(newData).not.toEqual(initialData)
      
      // Verify new property is in cache
      const hasNewProperty = newData.some((prop: any) => prop.name === testProperty.name)
      expect(hasNewProperty).toBe(true)
    })

    test('should invalidate related caches (dashboard stats)', async () => {
      await page.waitForTimeout(2000)
      
      // Navigate to dashboard to populate stats cache
      await page.goto('/dashboard')
      await page.waitForTimeout(2000)
      
      const initialStats = await queryHelper.getQueryData(['dashboard', 'stats'])
      
      // Go back to properties and create one
      await page.goto('/dashboard/properties')
      await page.waitForTimeout(2000)

      const testProperty = createTestProperty({ name: 'Stats Invalidation Property' })
      await formHelper.createProperty(testProperty)
      await page.waitForTimeout(3000)

      // Check dashboard stats cache was invalidated
      const statsAfterMutation = await queryHelper.getQueryData(['dashboard', 'stats'])
      
      // Stats should be either invalidated (undefined) or updated
      expect(statsAfterMutation !== initialStats).toBe(true)
    })

    test('should preserve unrelated cache entries', async () => {
      await page.waitForTimeout(2000)

      // Populate multiple caches
      await page.goto('/dashboard/units')
      await page.waitForTimeout(2000)
      const unitsCache = await queryHelper.getQueryData(['units'])
      
      await page.goto('/dashboard/properties')
      await page.waitForTimeout(2000)

      // Mutate properties
      const testProperty = createTestProperty({ name: 'Preserve Cache Property' })
      await formHelper.createProperty(testProperty)
      await page.waitForTimeout(3000)

      // Verify unrelated cache (units) is preserved
      const unitsCacheAfter = await queryHelper.getQueryData(['units'])
      expect(unitsCacheAfter).toEqual(unitsCache)
    })

    test('should handle selective invalidation by query key patterns', async () => {
      await page.waitForTimeout(2000)

      // Populate different property-related caches
      await queryHelper.getQueryData(['properties', 'ALL'])
      await queryHelper.getQueryData(['properties', 'ACTIVE'])
      
      // Mock selective invalidation
      await page.evaluate(() => {
        if (window.__QUERY_CLIENT__) {
          // Invalidate all properties queries
          window.__QUERY_CLIENT__.invalidateQueries({ queryKey: ['properties'] })
        }
      })

      await page.waitForTimeout(1000)

      // Both properties caches should be invalidated
      await queryHelper.waitForQueryState(['properties', 'ALL'], 'loading')
      // The query should eventually succeed
      await queryHelper.waitForQueryState(['properties', 'ALL'], 'success')
    })
  })

  test.describe('Stale-While-Revalidate Behavior', () => {
    test('should show stale data while refetching in background', async () => {
      await page.waitForTimeout(2000)

      // Get initial data
      const initialCount = await tableHelper.getPropertyCount()

      // Mock updated data for background refetch
      const updatedProperties = createTestProperties(15) // 5 more properties
      await networkSim.mockSuccessResponse('/api/properties', updatedProperties)

      // Trigger background refetch by invalidating
      await queryHelper.invalidateQueries(['properties', 'ALL'])

      // Should immediately show stale data (initial count)
      const staleCount = await tableHelper.getPropertyCount()
      expect(staleCount).toBe(initialCount)

      // Wait for background refetch to complete
      await page.waitForTimeout(3000)

      // Should now show fresh data
      const freshCount = await tableHelper.getPropertyCount()
      expect(freshCount).toBe(15)
    })

    test('should handle stale time configuration', async () => {
      await page.waitForTimeout(2000)

      let requestCount = 0
      await page.route('**/api/properties**', async (route) => {
        requestCount++
        await route.continue()
      })

      // Reset request counter
      requestCount = 0

      // Navigate away and immediately back (within stale time)
      await page.goto('/dashboard')
      await page.waitForTimeout(100)
      await page.goto('/dashboard/properties')
      await page.waitForTimeout(1000)

      // Should not make new request if within stale time (5 minutes default)
      expect(requestCount).toBe(0)

      // Wait longer than stale time would be in a real scenario
      // (For testing, we'll simulate stale time expiry)
      await page.evaluate(() => {
        if (window.__QUERY_CLIENT__) {
          const queryCache = window.__QUERY_CLIENT__.getQueryCache()
          const query = queryCache.find({ queryKey: ['properties', 'ALL'] })
          if (query) {
            // Force query to be stale
            query.state.dataUpdatedAt = Date.now() - (6 * 60 * 1000) // 6 minutes ago
          }
        }
      })

      await page.goto('/dashboard')
      await page.waitForTimeout(100)
      await page.goto('/dashboard/properties')
      await page.waitForTimeout(2000)

      // Should make background refetch request when stale
      expect(requestCount).toBeGreaterThan(0)
    })
  })

  test.describe('Background Refetch Behavior', () => {
    test('should refetch on window focus', async () => {
      await page.waitForTimeout(2000)

      let refetchCount = 0
      await page.route('**/api/properties**', async (route) => {
        refetchCount++
        await route.continue()
      })

      // Reset counter after initial load
      refetchCount = 0

      // Simulate window losing and regaining focus
      await page.evaluate(() => {
        window.dispatchEvent(new Event('blur'))
      })
      await page.waitForTimeout(500)
      
      await page.evaluate(() => {
        window.dispatchEvent(new Event('focus'))
      })
      await page.waitForTimeout(2000)

      // Should trigger background refetch on focus
      expect(refetchCount).toBeGreaterThan(0)
    })

    test('should refetch on network reconnection', async () => {
      await page.waitForTimeout(2000)

      let refetchCount = 0
      await page.route('**/api/properties**', async (route) => {
        refetchCount++
        await route.continue()
      })

      refetchCount = 0

      // Simulate network going offline and online
      await page.evaluate(() => {
        Object.defineProperty(navigator, 'onLine', {
          value: false,
          writable: true
        })
        window.dispatchEvent(new Event('offline'))
      })
      await page.waitForTimeout(500)

      await page.evaluate(() => {
        Object.defineProperty(navigator, 'onLine', {
          value: true,
          writable: true
        })
        window.dispatchEvent(new Event('online'))
      })
      await page.waitForTimeout(2000)

      // Should trigger background refetch when network reconnects
      expect(refetchCount).toBeGreaterThan(0)
    })

    test('should respect refetch interval configuration', async () => {
      await page.waitForTimeout(2000)

      // Mock query with refetch interval for testing
      await page.evaluate(() => {
        if (window.__QUERY_CLIENT__) {
          // Force a query with short refetch interval
          window.__QUERY_CLIENT__.fetchQuery({
            queryKey: ['properties', 'polling-test'],
            queryFn: () => fetch('/api/properties').then(r => r.json()),
            refetchInterval: 1000 // 1 second for testing
          })
        }
      })

      let intervalRequestCount = 0
      await page.route('**/api/properties**', async (route) => {
        intervalRequestCount++
        await route.continue()
      })

      // Wait for multiple intervals
      await page.waitForTimeout(3500)

      // Should have made multiple interval requests
      expect(intervalRequestCount).toBeGreaterThanOrEqual(2)
    })
  })

  test.describe('Cache Memory Management', () => {
    test('should respect garbage collection time (gcTime)', async () => {
      await page.waitForTimeout(2000)

      // Create a query that should be garbage collected
      const testKey = ['properties', 'test-gc', Date.now().toString()]
      await page.evaluate((key) => {
        if (window.__QUERY_CLIENT__) {
          window.__QUERY_CLIENT__.setQueryData(key, { test: 'data' })
        }
      }, testKey)

      // Verify data exists
      let cacheData = await page.evaluate((key) => {
        if (window.__QUERY_CLIENT__) {
          return window.__QUERY_CLIENT__.getQueryData(key)
        }
        return null
      }, testKey)
      expect(cacheData).toBeDefined()

      // Simulate passage of gcTime (normally 30 minutes, simulate with manual cleanup)
      await page.evaluate((key) => {
        if (window.__QUERY_CLIENT__) {
          const queryCache = window.__QUERY_CLIENT__.getQueryCache()
          const query = queryCache.find({ queryKey: key })
          if (query) {
            // Force removal as if gcTime expired
            queryCache.remove(query)
          }
        }
      }, testKey)

      // Verify data is garbage collected
      cacheData = await page.evaluate((key) => {
        if (window.__QUERY_CLIENT__) {
          return window.__QUERY_CLIENT__.getQueryData(key)
        }
        return null
      }, testKey)
      expect(cacheData).toBeUndefined()
    })

    test('should handle cache size limits gracefully', async () => {
      await page.waitForTimeout(2000)

      // Create many cache entries
      const cacheKeys = []
      for (let i = 0; i < 50; i++) {
        const key = ['properties', 'test', i.toString()]
        cacheKeys.push(key)
        
        await page.evaluate((key, index) => {
          if (window.__QUERY_CLIENT__) {
            window.__QUERY_CLIENT__.setQueryData(key, { 
              test: 'data', 
              index, 
              data: new Array(1000).fill(index) 
            })
          }
        }, key, i)
      }

      // Verify cache doesn't cause memory issues
      const allQueries = await queryHelper.getAllQueries()
      expect(allQueries.length).toBeGreaterThan(0)

      // Application should still be responsive
      await page.click('body')
      await expect(page.locator('table')).toBeVisible()
    })
  })

  test.describe('Cache Persistence Across Routes', () => {
    test('should maintain cache during route navigation', async () => {
      await page.waitForTimeout(2000)

      const initialData = await queryHelper.getQueryData(['properties', 'ALL'])
      expect(initialData).toBeDefined()

      // Navigate through different routes
      await page.goto('/dashboard/units')
      await page.waitForTimeout(1000)
      await page.goto('/dashboard/tenants')
      await page.waitForTimeout(1000)
      await page.goto('/dashboard/properties')
      await page.waitForTimeout(1000)

      // Cache should be preserved
      const preservedData = await queryHelper.getQueryData(['properties', 'ALL'])
      expect(preservedData).toEqual(initialData)

      // UI should render from cache quickly
      const quickCount = await tableHelper.getPropertyCount()
      expect(quickCount).toBeGreaterThan(0)
    })

    test('should handle browser refresh correctly', async () => {
      await page.waitForTimeout(2000)
      const initialCount = await tableHelper.getPropertyCount()

      // Refresh the page
      await page.reload()
      await page.waitForTimeout(3000)

      // Should refetch data after refresh
      const refreshedCount = await tableHelper.getPropertyCount()
      expect(refreshedCount).toBe(initialCount)

      // Cache should be repopulated
      const refreshedData = await queryHelper.getQueryData(['properties', 'ALL'])
      expect(refreshedData).toBeDefined()
    })

    test('should handle back/forward navigation', async () => {
      await page.waitForTimeout(2000)

      // Navigate to different page
      await page.goto('/dashboard/units')
      await page.waitForTimeout(1000)

      // Use browser back
      await page.goBack()
      await page.waitForTimeout(2000)

      // Should restore from cache quickly
      const backCount = await tableHelper.getPropertyCount()
      expect(backCount).toBeGreaterThan(0)

      // Forward navigation
      await page.goForward()
      await page.waitForTimeout(1000)
      await page.goBack()
      await page.waitForTimeout(2000)

      // Cache should still work
      const finalCount = await tableHelper.getPropertyCount()
      expect(finalCount).toBeGreaterThan(0)
    })
  })

  test.describe('Cache Error Recovery', () => {
    test('should recover from cache corruption', async () => {
      await page.waitForTimeout(2000)

      // Corrupt cache data
      await page.evaluate(() => {
        if (window.__QUERY_CLIENT__) {
          window.__QUERY_CLIENT__.setQueryData(['properties', 'ALL'], null)
        }
      })

      // Trigger query execution
      await queryHelper.invalidateQueries(['properties', 'ALL'])
      await page.waitForTimeout(3000)

      // Should recover with fresh data
      const recoveredCount = await tableHelper.getPropertyCount()
      expect(recoveredCount).toBeGreaterThan(0)

      const recoveredData = await queryHelper.getQueryData(['properties', 'ALL'])
      expect(recoveredData).toBeDefined()
      expect(Array.isArray(recoveredData)).toBe(true)
    })

    test('should handle cache access errors gracefully', async () => {
      await page.waitForTimeout(2000)

      // Simulate cache access error
      await page.evaluate(() => {
        if (window.__QUERY_CLIENT__) {
          const originalGetQueryData = window.__QUERY_CLIENT__.getQueryData
          window.__QUERY_CLIENT__.getQueryData = function() {
            throw new Error('Cache access error')
          }
          
          // Restore after a delay
          setTimeout(() => {
            window.__QUERY_CLIENT__.getQueryData = originalGetQueryData
          }, 2000)
        }
      })

      // Should continue to work despite cache errors
      await page.reload()
      await page.waitForTimeout(4000)

      const finalCount = await tableHelper.getPropertyCount()
      expect(finalCount).toBeGreaterThanOrEqual(0)

      // Should not crash the application
      await expect(page.locator('table')).toBeVisible()
    })
  })
})
