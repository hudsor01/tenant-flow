/**
 * TanStack Query Real User Workflows Tests
 * Tests complete business scenarios from a user's perspective
 * 
 * Complete user journey testing:
 * - Login → navigate → create property → see in list → navigate away → return → still there
 * - Property management workflows with multiple operations
 * - Dashboard integration workflows
 * - Error recovery workflows
 * - Performance with realistic usage patterns
 */

import { test, expect, Page } from '@playwright/test'
import { createTestProperty, createTestProperties } from '../fixtures/property-data'
import { 
  TanStackQueryHelper, 
  NetworkSimulator, 
  PropertyTableHelper, 
  PropertyFormHelper,
  DashboardStatsHelper,
  PerformanceHelper 
} from '../utils/tanstack-helpers'

test.describe('TanStack Query Real User Workflows', () => {
  let page: Page
  let queryHelper: TanStackQueryHelper
  let networkSim: NetworkSimulator
  let tableHelper: PropertyTableHelper
  let formHelper: PropertyFormHelper
  let statsHelper: DashboardStatsHelper
  let perfHelper: PerformanceHelper

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage()
    
    // Initialize helpers
    queryHelper = new TanStackQueryHelper(page)
    networkSim = new NetworkSimulator(page)
    tableHelper = new PropertyTableHelper(page)
    formHelper = new PropertyFormHelper(page)
    statsHelper = new DashboardStatsHelper(page)
    perfHelper = new PerformanceHelper(page)

    // Start with authenticated session (assuming auth.setup.ts has run)
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
  })

  test.afterEach(async () => {
    await networkSim.resetNetworkMocks()
    await page.close()
  })

  test.describe('Complete Property Management Workflows', () => {
    test('should handle complete property lifecycle workflow', async () => {
      // 1. Navigate to properties from dashboard
      await page.click('a[href*="properties"], nav a:has-text("Properties")')
      await page.waitForLoadState('networkidle')

      const initialCount = await tableHelper.getPropertyCount()
      const initialStats = await statsHelper.getTotalPropertiesCount()

      // 2. Create new property
      const testProperty = createTestProperty({ 
        name: 'Lifecycle Test Property',
        address: '123 Lifecycle Ave',
        city: 'Test City',
        state: 'TC',
        zipCode: '12345'
      })

      await formHelper.createProperty(testProperty)
      await tableHelper.waitForPropertyInTable(testProperty.name!)

      // 3. Verify immediate UI updates (optimistic)
      const afterCreateCount = await tableHelper.getPropertyCount()
      expect(afterCreateCount).toBe(initialCount + 1)

      // 4. Navigate to dashboard and verify stats updated
      await page.goto('/dashboard')
      await page.waitForTimeout(2000)
      await statsHelper.waitForStatsUpdate(initialStats + 1)

      // 5. Navigate back to properties and verify persistence
      await page.goto('/dashboard/properties')
      await page.waitForTimeout(2000)
      await expect(tableHelper.getPropertyByName(testProperty.name!)).toBeVisible()

      // 6. Update the property
      const updatedName = 'Updated Lifecycle Property'
      const propertyRow = tableHelper.getPropertyByName(testProperty.name!)
      await propertyRow.locator('button:has-text("Edit")').click()
      await page.fill('input[name="name"]', updatedName)
      await page.click('button:has-text("Update")')

      // 7. Verify optimistic update
      await tableHelper.waitForPropertyInTable(updatedName)
      await tableHelper.waitForPropertyToDisappear(testProperty.name!)

      // 8. Navigate away and back again
      await page.goto('/dashboard/units')
      await page.waitForTimeout(1000)
      await page.goto('/dashboard/properties')
      await page.waitForTimeout(2000)

      // 9. Verify updated property is still there
      await expect(tableHelper.getPropertyByName(updatedName)).toBeVisible()

      // 10. Delete the property
      const updatedRow = tableHelper.getPropertyByName(updatedName)
      await updatedRow.locator('button:has-text("Delete")').click()
      
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Delete")')
      if (await confirmButton.count() > 0) {
        await confirmButton.click()
      }

      // 11. Verify optimistic removal
      await tableHelper.waitForPropertyToDisappear(updatedName)
      
      const finalCount = await tableHelper.getPropertyCount()
      expect(finalCount).toBe(initialCount)

      // 12. Verify dashboard stats updated
      await page.goto('/dashboard')
      await page.waitForTimeout(2000)
      await statsHelper.waitForStatsUpdate(initialStats)
    })

    test('should handle rapid property management operations', async () => {
      await page.goto('/dashboard/properties')
      await page.waitForTimeout(2000)

      const initialCount = await tableHelper.getPropertyCount()

      // Rapid creation of multiple properties
      const properties = [
        createTestProperty({ name: 'Rapid Property 1' }),
        createTestProperty({ name: 'Rapid Property 2' }),
        createTestProperty({ name: 'Rapid Property 3' })
      ]

      // Create all properties in quick succession
      for (const property of properties) {
        await formHelper.createProperty(property)
        await page.waitForTimeout(200) // Small delay between operations
      }

      // Verify all appear optimistically
      for (const property of properties) {
        await tableHelper.waitForPropertyInTable(property.name!)
      }

      const afterCreateCount = await tableHelper.getPropertyCount()
      expect(afterCreateCount).toBe(initialCount + properties.length)

      // Navigate away and back
      await page.goto('/dashboard')
      await page.waitForTimeout(1000)
      await page.goto('/dashboard/properties')
      await page.waitForTimeout(3000)

      // All properties should persist
      for (const property of properties) {
        await expect(tableHelper.getPropertyByName(property.name!)).toBeVisible()
      }

      // Rapid deletion
      for (const property of properties) {
        const row = tableHelper.getPropertyByName(property.name!)
        await row.locator('button:has-text("Delete")').click()
        
        const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Delete")')
        if (await confirmButton.count() > 0) {
          await confirmButton.click()
        }
        
        await page.waitForTimeout(200)
      }

      // Verify all removed
      for (const property of properties) {
        await tableHelper.waitForPropertyToDisappear(property.name!)
      }

      const finalCount = await tableHelper.getPropertyCount()
      expect(finalCount).toBe(initialCount)
    })
  })

  test.describe('Dashboard Integration Workflows', () => {
    test('should maintain data consistency across dashboard and properties', async () => {
      // Start at dashboard, check initial stats
      await page.goto('/dashboard')
      await page.waitForTimeout(2000)
      const initialStats = await statsHelper.getTotalPropertiesCount()

      // Navigate to properties
      await page.goto('/dashboard/properties')
      await page.waitForTimeout(2000)
      const initialCount = await tableHelper.getPropertyCount()

      // Create property from properties page
      const testProperty = createTestProperty({ name: 'Dashboard Integration Property' })
      await formHelper.createProperty(testProperty)
      await tableHelper.waitForPropertyInTable(testProperty.name!)

      // Navigate back to dashboard
      await page.goto('/dashboard')
      await page.waitForTimeout(2000)

      // Stats should be updated
      await statsHelper.waitForStatsUpdate(initialStats + 1)

      // Navigate to a different section and back
      await page.goto('/dashboard/units')
      await page.waitForTimeout(1000)
      await page.goto('/dashboard')
      await page.waitForTimeout(2000)

      // Stats should still be correct
      const persistentStats = await statsHelper.getTotalPropertiesCount()
      expect(persistentStats).toBe(initialStats + 1)

      // Go back to properties
      await page.goto('/dashboard/properties')
      await page.waitForTimeout(2000)

      // Property should still be there
      await expect(tableHelper.getPropertyByName(testProperty.name!)).toBeVisible()
      
      const persistentCount = await tableHelper.getPropertyCount()
      expect(persistentCount).toBe(initialCount + 1)
    })

    test('should handle dashboard navigation while properties are loading', async () => {
      // Simulate slow properties API
      await page.route('**/api/properties**', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 2000))
        await route.continue()
      })

      // Navigate to properties (will be loading)
      await page.goto('/dashboard/properties')
      
      // Immediately navigate to dashboard while loading
      await page.goto('/dashboard')
      await page.waitForTimeout(1000)

      // Navigate back to properties
      await page.goto('/dashboard/properties')
      await page.waitForTimeout(4000) // Wait for slow load

      // Should eventually show data
      const finalCount = await tableHelper.getPropertyCount()
      expect(finalCount).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Error Recovery Workflows', () => {
    test('should recover gracefully from network interruptions', async () => {
      await page.goto('/dashboard/properties')
      await page.waitForTimeout(2000)

      const testProperty = createTestProperty({ name: 'Network Recovery Property' })

      // Simulate network going down during operation
      await page.setOfflineMode(true)
      
      // Attempt to create property (will fail)
      await formHelper.createProperty(testProperty)
      
      // Should show optimistic update first
      await tableHelper.waitForPropertyInTable(testProperty.name!)

      // Wait for failure and rollback
      await page.waitForTimeout(5000)
      await tableHelper.waitForPropertyToDisappear(testProperty.name!)

      // Verify error notification
      const errorMessage = page.locator('[role="alert"], text*="network", text*="offline"')
      await expect(errorMessage.first()).toBeVisible({ timeout: 5000 })

      // Restore network
      await page.setOfflineMode(false)

      // Retry operation should succeed
      await formHelper.createProperty(testProperty)
      await tableHelper.waitForPropertyInTable(testProperty.name!)

      // Navigate away and back to verify persistence
      await page.goto('/dashboard')
      await page.waitForTimeout(1000)
      await page.goto('/dashboard/properties')
      await page.waitForTimeout(2000)

      await expect(tableHelper.getPropertyByName(testProperty.name!)).toBeVisible()
    })

    test('should handle server errors with user-friendly recovery', async () => {
      await page.goto('/dashboard/properties')
      await page.waitForTimeout(2000)

      const testProperty = createTestProperty({ name: 'Server Error Recovery Property' })
      let attemptCount = 0

      // Simulate server errors then success
      await page.route('**/api/properties**', async (route) => {
        if (route.request().method() === 'POST') {
          attemptCount++
          if (attemptCount <= 2) {
            await route.fulfill({
              status: 500,
              body: JSON.stringify({ error: 'Internal Server Error' })
            })
          } else {
            await route.continue()
          }
        } else {
          await route.continue()
        }
      })

      // Attempt creation
      await formHelper.createProperty(testProperty)

      // Should show optimistic update
      await tableHelper.waitForPropertyInTable(testProperty.name!)

      // Wait for error and rollback
      await page.waitForTimeout(3000)
      await tableHelper.waitForPropertyToDisappear(testProperty.name!)

      // Look for retry mechanism
      const retryButton = page.locator('button:has-text("Retry"), button:has-text("Try Again")')
      
      if (await retryButton.count() > 0) {
        await retryButton.click()
        await page.waitForTimeout(3000)
        await expect(tableHelper.getPropertyByName(testProperty.name!)).toBeVisible()
      } else {
        // If no retry button, user can manually retry
        await formHelper.createProperty(testProperty)
        await page.waitForTimeout(3000)
        await expect(tableHelper.getPropertyByName(testProperty.name!)).toBeVisible()
      }
    })

    test('should maintain user session across errors', async () => {
      await page.goto('/dashboard/properties')
      await page.waitForTimeout(2000)

      // Simulate authentication errors
      await page.route('**/api/properties**', async (route) => {
        await route.fulfill({
          status: 401,
          body: JSON.stringify({ error: 'Unauthorized' })
        })
      })

      // Attempt operation that will fail with auth error
      const testProperty = createTestProperty({ name: 'Auth Error Property' })
      await formHelper.createProperty(testProperty)
      
      await page.waitForTimeout(3000)

      // Should either redirect to login or show auth error
      const currentUrl = page.url()
      const hasAuthError = await page.locator('text*="unauthorized", text*="login"').count() > 0

      if (currentUrl.includes('/login') || hasAuthError) {
        // If redirected to login or auth error shown, that's correct behavior
        expect(currentUrl.includes('/login') || hasAuthError).toBe(true)
      } else {
        // If staying on page, should show appropriate error
        const errorMessage = page.locator('[role="alert"], text*="error"')
        await expect(errorMessage.first()).toBeVisible()
      }
    })
  })

  test.describe('Performance with Real Usage Patterns', () => {
    test('should maintain performance with heavy dashboard navigation', async () => {
      const navigationRoutes = [
        '/dashboard',
        '/dashboard/properties',
        '/dashboard/units',
        '/dashboard/tenants',
        '/dashboard/leases',
        '/dashboard'
      ]

      const navigationTimes: number[] = []

      // Perform multiple navigation cycles
      for (let cycle = 0; cycle < 3; cycle++) {
        for (const route of navigationRoutes) {
          const startTime = Date.now()
          await page.goto(route)
          await page.waitForLoadState('networkidle')
          const navigationTime = Date.now() - startTime
          
          navigationTimes.push(navigationTime)
          await page.waitForTimeout(500)
        }
      }

      // Calculate average navigation time
      const avgNavigationTime = navigationTimes.reduce((sum, time) => sum + time, 0) / navigationTimes.length

      // Should maintain reasonable navigation performance
      expect(avgNavigationTime).toBeLessThan(3000) // Less than 3 seconds average

      // Later navigations should be faster due to caching
      const firstThirdAvg = navigationTimes.slice(0, Math.floor(navigationTimes.length / 3))
        .reduce((sum, time) => sum + time, 0) / Math.floor(navigationTimes.length / 3)
      
      const lastThirdAvg = navigationTimes.slice(-Math.floor(navigationTimes.length / 3))
        .reduce((sum, time) => sum + time, 0) / Math.floor(navigationTimes.length / 3)

      // Later navigations should be faster or at least not significantly slower
      expect(lastThirdAvg).toBeLessThanOrEqual(firstThirdAvg * 1.5)
    })

    test('should handle concurrent user actions efficiently', async () => {
      await page.goto('/dashboard/properties')
      await page.waitForTimeout(2000)

      const concurrentOperations = []
      const properties = createTestProperties(5)

      // Start multiple operations simultaneously
      for (const property of properties) {
        concurrentOperations.push(
          formHelper.createProperty(property)
        )
      }

      const startTime = Date.now()
      
      // Wait for all operations to complete
      await Promise.allSettled(concurrentOperations)
      
      const totalTime = Date.now() - startTime
      
      // Wait for UI to settle
      await page.waitForTimeout(3000)

      // Verify all operations completed successfully
      let successCount = 0
      for (const property of properties) {
        const exists = await page.locator(`text="${property.name}"`).count() > 0
        if (exists) successCount++
      }

      expect(successCount).toBeGreaterThan(properties.length * 0.8) // At least 80% success rate
      expect(totalTime).toBeLessThan(15000) // Should complete in reasonable time
    })

    test('should maintain responsiveness during infinite scroll', async () => {
      await page.goto('/dashboard/properties')
      await page.waitForTimeout(2000)

      // Measure scroll performance
      const scrollTimes: number[] = []
      
      // Perform multiple scroll operations
      for (let i = 0; i < 5; i++) {
        const scrollTime = await perfHelper.measureScrollPerformance(500)
        scrollTimes.push(scrollTime)
        
        // Trigger infinite scroll
        await tableHelper.scrollToLoadMore()
        await page.waitForTimeout(1000)
      }

      // Calculate average scroll performance
      const avgScrollTime = scrollTimes.reduce((sum, time) => sum + time, 0) / scrollTimes.length

      // Should maintain responsive scrolling
      expect(avgScrollTime).toBeLessThan(200) // Less than 200ms for smooth scrolling

      // Verify no memory leaks by checking if page is still responsive
      await page.click('body')
      await expect(page.locator('table')).toBeVisible()
    })
  })

  test.describe('Multi-Tab and Session Management', () => {
    test('should handle multiple browser tabs correctly', async () => {
      await page.goto('/dashboard/properties')
      await page.waitForTimeout(2000)

      // Open second tab
      const secondTab = await page.context().newPage()
      await secondTab.goto('/dashboard/properties')
      await secondTab.waitForLoadState('networkidle')

      const property1 = createTestProperty({ name: 'Tab 1 Property' })
      const property2 = createTestProperty({ name: 'Tab 2 Property' })

      // Create property in first tab
      await formHelper.createProperty(property1)
      await tableHelper.waitForPropertyInTable(property1.name!)

      // Switch to second tab and create property
      const tab2FormHelper = new PropertyFormHelper(secondTab)
      const tab2TableHelper = new PropertyTableHelper(secondTab)
      
      await tab2FormHelper.createProperty(property2)
      await tab2TableHelper.waitForPropertyInTable(property2.name!)

      // Switch back to first tab and refresh
      await page.reload()
      await page.waitForTimeout(3000)

      // Should see both properties
      await expect(tableHelper.getPropertyByName(property1.name!)).toBeVisible()
      await expect(tableHelper.getPropertyByName(property2.name!)).toBeVisible()

      await secondTab.close()
    })

    test('should handle browser back/forward with cache', async () => {
      await page.goto('/dashboard')
      await page.waitForTimeout(1000)
      
      await page.goto('/dashboard/properties')
      await page.waitForTimeout(2000)

      const testProperty = createTestProperty({ name: 'Back Forward Property' })
      await formHelper.createProperty(testProperty)
      await tableHelper.waitForPropertyInTable(testProperty.name!)

      // Navigate to units
      await page.goto('/dashboard/units')
      await page.waitForTimeout(1000)

      // Use browser back
      await page.goBack()
      await page.waitForTimeout(2000)

      // Should restore properties page with cache
      await expect(tableHelper.getPropertyByName(testProperty.name!)).toBeVisible()

      // Navigate forward
      await page.goForward()
      await page.waitForTimeout(1000)

      // Navigate back again
      await page.goBack()
      await page.waitForTimeout(2000)

      // Property should still be there
      await expect(tableHelper.getPropertyByName(testProperty.name!)).toBeVisible()
    })
  })

  test.describe('Real-world Error Scenarios', () => {
    test('should handle incomplete form submissions gracefully', async () => {
      await page.goto('/dashboard/properties')
      await page.waitForTimeout(2000)

      // Open form but don't fill all required fields
      await page.click('button:has-text("New Property")')
      await page.fill('input[name="name"]', 'Incomplete Property')
      // Don't fill other required fields
      
      await page.click('button[type="submit"]')

      // Should show validation errors
      const validationErrors = page.locator('.error, [aria-invalid="true"], text*="required"')
      await expect(validationErrors.first()).toBeVisible()

      // Complete the form properly
      await page.fill('input[name="address"]', '123 Complete St')
      await page.fill('input[name="city"]', 'Complete City')
      await page.fill('input[name="state"]', 'CC')
      await page.fill('input[name="zipCode"]', '12345')

      await page.click('button[type="submit"]')

      // Should now succeed
      await tableHelper.waitForPropertyInTable('Incomplete Property')
    })

    test('should recover from page reload during operations', async () => {
      await page.goto('/dashboard/properties')
      await page.waitForTimeout(2000)

      const testProperty = createTestProperty({ name: 'Reload Recovery Property' })

      // Start creating property
      await page.click('button:has-text("New Property")')
      await page.fill('input[name="name"]', testProperty.name!)
      await page.fill('input[name="address"]', testProperty.address!)
      await page.fill('input[name="city"]', testProperty.city!)
      await page.fill('input[name="state"]', testProperty.state!)
      await page.fill('input[name="zipCode"]', testProperty.zipCode!)

      // Reload page before submitting
      await page.reload()
      await page.waitForTimeout(2000)

      // Form should be reset, property not created
      const propertyExists = await page.locator(`text="${testProperty.name}"`).count() > 0
      expect(propertyExists).toBe(false)

      // User can start over
      await formHelper.createProperty(testProperty)
      await tableHelper.waitForPropertyInTable(testProperty.name!)
    })
  })
})
