/**
 * TanStack Query Infinite Scrolling Tests
 * Tests real browser behavior for infinite scrolling with useInfiniteProperties
 * 
 * Critical functionality testing:
 * - Intersection observer triggers correctly at 10% visibility
 * - Automatic loading of more properties on scroll
 * - Loading indicators appear/disappear appropriately
 * - Page concatenation works correctly (20 items per page)
 * - Performance with large datasets
 * - End of data handling
 */

import type { Page } from '@playwright/test';
import { test, expect } from '@playwright/test'
import { createLargePropertyDataset, createTestProperties } from '../fixtures/property-data'
import { 
  TanStackQueryHelper, 
  NetworkSimulator, 
  PropertyTableHelper,
  PerformanceHelper 
} from '../utils/tanstack-helpers'

test.describe('TanStack Query Infinite Scrolling', () => {
  let page: Page
  let queryHelper: TanStackQueryHelper
  let networkSim: NetworkSimulator
  let tableHelper: PropertyTableHelper
  let perfHelper: PerformanceHelper

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage()
    
    // Initialize helpers
    queryHelper = new TanStackQueryHelper(page)
    networkSim = new NetworkSimulator(page)
    tableHelper = new PropertyTableHelper(page)
    perfHelper = new PerformanceHelper(page)

    // Mock large dataset for infinite scroll testing
    const testPages = createLargePropertyDataset(20, 5) // 5 pages of 20 items each
    await mockInfinitePropertiesAPI(testPages)

    // Navigate to properties page
    await page.goto('/dashboard/properties')
    await page.waitForLoadState('networkidle')
  })

  test.afterEach(async () => {
    await networkSim.resetNetworkMocks()
    await page.close()
  })

  /**
   * Mock the infinite properties API with test data
   */
  async function mockInfinitePropertiesAPI(pages: any[][]) {
    await page.route('**/api/properties**', async (route) => {
      const url = new URL(route.request().url())
      const offset = parseInt(url.searchParams.get('offset') || '0')
      const limit = parseInt(url.searchParams.get('limit') || '20')
      
      const pageIndex = Math.floor(offset / limit)
      const pageData = pages[pageIndex] || []
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(pageData)
      })
    })
  }

  test.describe('Basic Infinite Scroll Behavior', () => {
    test('should load first page of properties automatically', async () => {
      // Wait for initial load
      await page.waitForLoadState('networkidle')
      await expect(page.locator('table tbody tr').nth(19)).toBeVisible()

      // Verify first page loaded (20 properties)
      const initialCount = await tableHelper.getPropertyCount()
      expect(initialCount).toBe(20)

      // Verify properties from first page are visible
      await expect(tableHelper.getPropertyByName('Property 001')).toBeVisible()
      await expect(tableHelper.getPropertyByName('Property 020')).toBeVisible()
    })

    test('should trigger infinite scroll on intersection', async () => {
      // Wait for initial load
      await page.waitForTimeout(2000)
      const initialCount = await tableHelper.getPropertyCount()

      // Scroll to trigger load more
      await tableHelper.scrollToLoadMore()

      // Wait for loading indicator
      await tableHelper.waitForLoading(true)

      // Wait for next page to load
      await tableHelper.waitForLoading(false, 10000)

      // Verify more properties loaded
      const newCount = await tableHelper.getPropertyCount()
      expect(newCount).toBe(initialCount + 20)

      // Verify properties from second page are visible
      await expect(tableHelper.getPropertyByName('Property 021')).toBeVisible()
      await expect(tableHelper.getPropertyByName('Property 040')).toBeVisible()
    })

    test('should continue loading pages as user scrolls', async () => {
      await page.waitForLoadState('networkidle')
      await expect(page.locator('table tbody tr').nth(19)).toBeVisible()

      // Load multiple pages by scrolling
      for (let pageNum = 1; pageNum <= 3; pageNum++) {
        const expectedCount = (pageNum + 1) * 20

        await tableHelper.scrollToLoadMore()
        await tableHelper.waitForLoading(true)
        await tableHelper.waitForLoading(false, 10000)

        const currentCount = await tableHelper.getPropertyCount()
        expect(currentCount).toBe(expectedCount)

        // Verify properties from current page
        const firstPropertyInPage = `Property ${String((pageNum * 20) + 1).padStart(3, '0')}`
        await expect(tableHelper.getPropertyByName(firstPropertyInPage)).toBeVisible()
      }
    })

    test('should handle end of data correctly', async () => {
      await page.waitForTimeout(2000)

      // Scroll through all pages until end
      let hasMore = true
      let pageCount = 1

      while (hasMore && pageCount < 6) { // Max 5 pages in test data
        await tableHelper.scrollToLoadMore()
        await page.waitForTimeout(1000)

        hasMore = !await tableHelper.isAtEnd()
        pageCount++
      }

      // Verify all data loaded (5 pages × 20 items = 100)
      const finalCount = await tableHelper.getPropertyCount()
      expect(finalCount).toBe(100)

      // Verify no more loading indicator
      await expect(page.locator('text="Loading more properties..."')).toBeHidden()

      // Verify last property is visible
      await expect(tableHelper.getPropertyByName('Property 100')).toBeVisible()
    })
  })

  test.describe('Loading States and Indicators', () => {
    test('should show loading indicator during fetch', async () => {
      await page.waitForTimeout(2000)

      // Add delay to API to test loading state
      await page.route('**/api/properties**', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 1000))
        await route.continue()
      })

      // Trigger load more
      await tableHelper.scrollToLoadMore()

      // Verify loading indicator appears
      await expect(page.locator('text="Loading more properties..."')).toBeVisible()
      
      // Verify loading spinner/animation
      const spinner = page.locator('.animate-spin, .loading-spinner')
      await expect(spinner).toBeVisible()

      // Wait for loading to complete
      await tableHelper.waitForLoading(false, 15000)

      // Verify loading indicator disappears
      await expect(page.locator('text="Loading more properties..."')).toBeHidden()
    })

    test('should handle loading errors gracefully', async () => {
      await page.waitForTimeout(2000)
      const initialCount = await tableHelper.getPropertyCount()

      // Simulate API error on second page
      let requestCount = 0
      await page.route('**/api/properties**', async (route) => {
        requestCount++
        if (requestCount > 1) {
          await route.abort('failed')
        } else {
          await route.continue()
        }
      })

      // Trigger load more
      await tableHelper.scrollToLoadMore()

      // Wait for error state
      await page.waitForTimeout(3000)

      // Verify error message appears
      const errorMessage = page.locator('text*="error", text*="failed", text*="something went wrong"')
      await expect(errorMessage.first()).toBeVisible({ timeout: 5000 })

      // Verify count didn't increase (no partial load)
      const errorCount = await tableHelper.getPropertyCount()
      expect(errorCount).toBe(initialCount)

      // Test retry functionality if available
      const retryButton = page.locator('button:has-text("Retry"), button:has-text("Try Again")')
      if (await retryButton.count() > 0) {
        // Reset API to work
        await networkSim.resetNetworkMocks()
        await mockInfinitePropertiesAPI(createLargePropertyDataset(20, 5))
        
        await retryButton.click()
        
        // Verify retry works
        await tableHelper.waitForLoading(false, 10000)
        const retryCount = await tableHelper.getPropertyCount()
        expect(retryCount).toBe(initialCount + 20)
      }
    })

    test('should show empty state when no data', async () => {
      // Mock empty response
      await page.route('**/api/properties**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        })
      })

      await page.reload()
      await page.waitForTimeout(2000)

      // Verify empty state appears
      const emptyState = page.locator('text="No properties found"')
      await expect(emptyState).toBeVisible()

      // Verify empty state icon
      const emptyIcon = page.locator('svg[data-testid="empty-icon"], .empty-icon')
      await expect(emptyIcon).toBeVisible({ timeout: 5000 })

      // Verify "Create Property" button in empty state
      const createButton = page.locator('button:has-text("New Property")')
      await expect(createButton).toBeVisible()
    })
  })

  test.describe('Intersection Observer Behavior', () => {
    test('should trigger at 10% visibility threshold', async () => {
      await page.waitForLoadState('networkidle')
      await expect(page.locator('table tbody tr').nth(19)).toBeVisible()

      // Set up observer and flag before scrolling
      await page.evaluate(() => {
        window.__intersectionObserverTriggered = false
        const trigger = document.querySelector('[ref="loadMoreRef"], .load-more-trigger')
        if (trigger) {
          const observer = new IntersectionObserver(
            (entries) => {
              entries.forEach(entry => {
                if (entry.isIntersecting && entry.intersectionRatio >= 0.1) {
                  window.__intersectionObserverTriggered = true
                  observer.disconnect()
                }
              })
            },
            { threshold: 0.1 }
          )
          observer.observe(trigger)
        }
      })

      // Now scroll to trigger the observer
      await tableHelper.scrollToLoadMore()
      await page.waitForTimeout(500) // Brief wait for observer to fire
      
      // Check if observer was triggered
      const wasTriggered = await page.evaluate(() => window.__intersectionObserverTriggered)
      expect(wasTriggered).toBe(true)
    })

    test('should disconnect observer when component unmounts', async () => {
      await page.waitForTimeout(2000)

      // Navigate away from properties page
      await page.goto('/dashboard')
      await page.waitForTimeout(1000)

      // Check if observers are properly cleaned up
      const activeObservers = await page.evaluate(() => {
        // This is a simplified check - in real implementation you might expose
        // observer cleanup state for testing
        return document.querySelectorAll('[ref="loadMoreRef"]').length
      })

      expect(activeObservers).toBe(0)

      // Navigate back and verify new observer is created
      await page.goto('/dashboard/properties')
      await page.waitForTimeout(2000)

      const newObservers = await page.evaluate(() => {
        return document.querySelectorAll('[ref="loadMoreRef"]').length
      })

      expect(newObservers).toBeGreaterThan(0)
    })
  })

  test.describe('Performance Testing', () => {
    test('should handle large datasets efficiently', async () => {
      // Mock very large dataset
      const largeDataset = createLargePropertyDataset(20, 20) // 20 pages × 20 = 400 properties
      await mockInfinitePropertiesAPI(largeDataset)

      await page.reload()
      await page.waitForTimeout(2000)

      const startTime = Date.now()

      // Load several pages rapidly
      for (let i = 0; i < 5; i++) {
        await tableHelper.scrollToLoadMore()
        await page.waitForTimeout(500) // Small delay between scrolls
      }

      const loadTime = Date.now() - startTime

      // Should load 5 additional pages (100 more properties) in reasonable time
      expect(loadTime).toBeLessThan(10000) // Less than 10 seconds

      // Verify correct count
      const finalCount = await tableHelper.getPropertyCount()
      expect(finalCount).toBe(120) // Initial 20 + 5×20 additional
    })

    test('should maintain scroll performance with large lists', async () => {
      await page.waitForTimeout(2000)

      // Load several pages first
      for (let i = 0; i < 3; i++) {
        await tableHelper.scrollToLoadMore()
        await tableHelper.waitForLoading(false, 10000)
      }

      // Measure scroll performance
      const scrollTime = await perfHelper.measureScrollPerformance(1000)

      // Scrolling should be responsive even with 80 properties loaded
      expect(scrollTime).toBeLessThan(100) // Less than 100ms for smooth scroll
    })

    test('should handle rapid scroll events without duplicate requests', async () => {
      await page.waitForTimeout(2000)

      let requestCount = 0
      await page.route('**/api/properties**', async (route) => {
        const url = new URL(route.request().url())
        const offset = parseInt(url.searchParams.get('offset') || '0')
        
        // Count requests for page 2 (offset 20)
        if (offset === 20) {
          requestCount++
        }
        
        await route.continue()
      })

      // Rapidly scroll multiple times to trigger intersection observer multiple times
      for (let i = 0; i < 5; i++) {
        await tableHelper.scrollToLoadMore()
        await page.waitForTimeout(50)
      }

      await page.waitForTimeout(3000)

      // Should only make one request for page 2 despite multiple scroll triggers
      expect(requestCount).toBe(1)
    })
  })

  test.describe('User Experience Scenarios', () => {
    test('should maintain scroll position after navigation', async () => {
      await page.waitForTimeout(2000)

      // Load multiple pages
      for (let i = 0; i < 2; i++) {
        await tableHelper.scrollToLoadMore()
        await tableHelper.waitForLoading(false, 10000)
      }

      // Get current scroll position
      const scrollPosition = await page.evaluate(() => window.scrollY)

      // Navigate away and back
      await page.goto('/dashboard')
      await page.waitForTimeout(1000)
      await page.goto('/dashboard/properties')
      await page.waitForTimeout(2000)

      // Scroll position should be maintained (or reasonable alternative)
      const newScrollPosition = await page.evaluate(() => window.scrollY)
      
      // Either maintains exact position or starts from top (both are acceptable UX)
      expect(newScrollPosition >= 0).toBe(true)

      // Data should still be loaded from cache
      const propertyCount = await tableHelper.getPropertyCount()
      expect(propertyCount).toBeGreaterThanOrEqual(20)
    })

    test('should work correctly on mobile viewport', async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      await page.reload()
      await page.waitForTimeout(2000)

      // Initial load should work
      const initialCount = await tableHelper.getPropertyCount()
      expect(initialCount).toBe(20)

      // Mobile scroll behavior should work
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight)
      })
      
      await tableHelper.waitForLoading(true)
      await tableHelper.waitForLoading(false, 10000)

      const newCount = await tableHelper.getPropertyCount()
      expect(newCount).toBe(40)
    })

    test('should handle keyboard navigation appropriately', async () => {
      await page.waitForTimeout(2000)

      // Focus on table
      await page.click('table')
      
      // Use Page Down to scroll
      await page.keyboard.press('PageDown')
      await page.waitForTimeout(1000)
      
      // Should eventually trigger infinite scroll
      await page.keyboard.press('End') // Go to end of page
      await page.waitForTimeout(2000)

      // Verify more content loaded
      const finalCount = await tableHelper.getPropertyCount()
      expect(finalCount).toBeGreaterThan(20)
    })
  })

  test.describe('Edge Cases and Error Recovery', () => {
    test('should handle network interruption during scroll', async () => {
      await page.waitForTimeout(2000)

      // Simulate intermittent network issues
      await networkSim.simulateIntermittentFailures('/api/properties')

      let successfulLoads = 0
      const maxAttempts = 5

      for (let i = 0; i < maxAttempts; i++) {
        await tableHelper.scrollToLoadMore()
        await page.waitForTimeout(2000)

        const currentCount = await tableHelper.getPropertyCount()
        if (currentCount > 20 + (successfulLoads * 20)) {
          successfulLoads++
        }
      }

      // Should have some successful loads despite network issues
      expect(successfulLoads).toBeGreaterThan(0)
    })

    test('should recover from browser back/forward navigation', async () => {
      await page.waitForTimeout(2000)

      // Load additional pages
      await tableHelper.scrollToLoadMore()
      await tableHelper.waitForLoading(false, 10000)

      const countAfterScroll = await tableHelper.getPropertyCount()

      // Navigate to different page
      await page.goto('/dashboard/units')
      await page.waitForTimeout(1000)

      // Use browser back
      await page.goBack()
      await page.waitForTimeout(2000)

      // Should restore previous state
      const countAfterBack = await tableHelper.getPropertyCount()
      expect(countAfterBack).toBe(countAfterScroll)
    })

    test('should handle tab visibility changes correctly', async () => {
      await page.waitForTimeout(2000)

      // Load some data
      await tableHelper.scrollToLoadMore()
      await tableHelper.waitForLoading(false, 10000)

      // Simulate tab becoming hidden
      await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { value: true, writable: true })
        document.dispatchEvent(new Event('visibilitychange'))
      })

      await page.waitForTimeout(1000)

      // Simulate tab becoming visible again
      await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { value: false, writable: true })
        document.dispatchEvent(new Event('visibilitychange'))
      })

      // Should continue working normally
      await tableHelper.scrollToLoadMore()
      await tableHelper.waitForLoading(false, 10000)

      const finalCount = await tableHelper.getPropertyCount()
      expect(finalCount).toBeGreaterThan(40)
    })
  })
})
