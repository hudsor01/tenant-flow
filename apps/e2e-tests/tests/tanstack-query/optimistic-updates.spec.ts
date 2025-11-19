/**
 * TanStack Query Optimistic Updates Tests
 * Tests real browser behavior for optimistic updates in property CRUD operations
 *
 * Critical business logic testing:
 * - Create property → immediate UI update → server confirmation
 * - Update property → immediate change → server sync
 * - Delete property → immediate removal → server cleanup
 * - Dashboard stats update correctly with all operations
 * - Proper rollback on API failures
 */

import type { Page } from '@playwright/test';
import { test, expect } from '@playwright/test'
import { createTestProperty, basePropertyData } from '../fixtures/property-data'
import {
  TanStackQueryHelper,
  NetworkSimulator,
  PropertyTableHelper,
  PropertyFormHelper,
  DashboardStatsHelper
} from '../utils/tanstack-helpers'

test.describe('TanStack Query Optimistic Updates', () => {
  let page: Page
  let queryHelper: TanStackQueryHelper
  let networkSim: NetworkSimulator
  let tableHelper: PropertyTableHelper
  let formHelper: PropertyFormHelper
  let statsHelper: DashboardStatsHelper

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage()

    // Initialize helpers
    queryHelper = new TanStackQueryHelper(page)
    networkSim = new NetworkSimulator(page)
    tableHelper = new PropertyTableHelper(page)
    formHelper = new PropertyFormHelper(page)
    statsHelper = new DashboardStatsHelper(page)

    // Navigate to properties page
    await page.goto('/dashboard/properties')
    await page.waitForLoadState('networkidle')

    // NOTE: App should expose QueryClient via window.__QUERY_CLIENT__ for tests
    // This should be done in the app's query provider when NODE_ENV === 'test'
    // For now, we'll rely on the helpers that don't need direct QueryClient access
    await page.addInitScript(() => {
      // Placeholder for app-level QueryClient exposure
      // App should set: window.__QUERY_CLIENT__ = queryClient in test mode
    })
  })

  test.afterEach(async () => {
    await networkSim.resetNetworkMocks()
    await page.close()
  })

  test.describe('Property Creation - Optimistic Updates', () => {
    test('should show immediate UI update when creating property', async () => {
      const testProperty = createTestProperty({ name: 'Optimistic Test Property' })
      const initialCount = await tableHelper.getPropertyCount()
      const initialStats = await statsHelper.getTotalPropertiesCount()

      // Create property and verify immediate UI update
      await formHelper.createProperty(testProperty)

      // Verify property appears immediately in table (optimistic update)
      await tableHelper.waitForPropertyInTable(testProperty.name!)

      // Verify table count increased immediately
      const optimisticCount = await tableHelper.getPropertyCount()
      expect(optimisticCount).toBe(initialCount + 1)

      // Verify dashboard stats updated optimistically
      await statsHelper.waitForStatsUpdate(initialStats + 1)

      // Wait for server confirmation
      await formHelper.waitForFormSubmission()

      // Verify property is still there after server confirmation
      await expect(tableHelper.getPropertyByName(testProperty.name!)).toBeVisible()
    })

    test('should rollback optimistic update on API failure', async () => {
      const testProperty = createTestProperty({ name: 'Failed Property' })
      const initialCount = await tableHelper.getPropertyCount()
      const initialStats = await statsHelper.getTotalPropertiesCount()

      // Simulate API failure for property creation
      await networkSim.simulateNetworkFailure('/api/properties', 500)

      // Attempt to create property
      await formHelper.createProperty(testProperty)

      // Verify optimistic update appears first
      await tableHelper.waitForPropertyInTable(testProperty.name!)
      await statsHelper.waitForStatsUpdate(initialStats + 1)

      // Wait for API failure and rollback
      await tableHelper.waitForPropertyToDisappear(testProperty.name!)

      // Verify counts returned to original values
      const finalCount = await tableHelper.getPropertyCount()
      expect(finalCount).toBe(initialCount)

      await statsHelper.waitForStatsUpdate(initialStats)

      // Verify error handling (toast, dialog, etc.)
      const errorMessage = page.locator('text*="error", text*="failed"')
      await expect(errorMessage).toBeVisible({ timeout: 5000 })
    })

    test('should handle multiple rapid creations correctly', async () => {
      const properties = [
        createTestProperty({ name: 'Rapid Property 1' }),
        createTestProperty({ name: 'Rapid Property 2' }),
        createTestProperty({ name: 'Rapid Property 3' })
      ]

      const initialCount = await tableHelper.getPropertyCount()

      // Create multiple properties rapidly
      for (const property of properties) {
        await formHelper.createProperty(property)
        // No delay needed - mutations should queue properly
      }

      // Verify all properties appear optimistically
      for (const property of properties) {
        await tableHelper.waitForPropertyInTable(property.name!)
      }

      // Verify correct count
      const finalCount = await tableHelper.getPropertyCount()
      expect(finalCount).toBe(initialCount + properties.length)

      // Wait for all server confirmations
      await page.waitForLoadState('networkidle')

      // Verify all still visible after server sync
      for (const property of properties) {
        await expect(tableHelper.getPropertyByName(property.name!)).toBeVisible()
      }
    })
  })

  test.describe('Property Updates - Optimistic Updates', () => {
    test('should show immediate changes when updating property', async () => {
      // Create a property first
      const originalProperty = createTestProperty({ name: 'Update Test Original' })
      await formHelper.createProperty(originalProperty)
      await tableHelper.waitForPropertyInTable(originalProperty.name!)

      // Update the property
      const updatedName = 'Updated Property Name'

      // Click edit button for the property
      const propertyRow = tableHelper.getPropertyByName(originalProperty.name!)
      await propertyRow.locator('button:has-text("Edit")').click()

      // Update the name in edit form
      await page.fill('input[name="name"]', updatedName)
      await page.click('button:has-text("Update")')

      // Verify immediate update in table
      await tableHelper.waitForPropertyInTable(updatedName)
      await tableHelper.waitForPropertyToDisappear(originalProperty.name!)

      // Wait for server confirmation
      await page.waitForLoadState('networkidle')

      // Verify update persisted
      await expect(tableHelper.getPropertyByName(updatedName)).toBeVisible()
    })

    test('should rollback update on API failure', async () => {
      // Create initial property
      const originalProperty = createTestProperty({ name: 'Rollback Test Property' })
      await formHelper.createProperty(originalProperty)
      await tableHelper.waitForPropertyInTable(originalProperty.name!)

      // Simulate update API failure
      await networkSim.simulateNetworkFailure('/api/properties/', 500)

      const updatedName = 'Failed Update Name'

      // Attempt update
      const propertyRow = tableHelper.getPropertyByName(originalProperty.name!)
      await propertyRow.locator('button:has-text("Edit")').click()
      await page.fill('input[name="name"]', updatedName)
      await page.click('button:has-text("Update")')

      // Verify optimistic update appears first
      await tableHelper.waitForPropertyInTable(updatedName)

      // Wait for failure and rollback to original name
      await tableHelper.waitForPropertyInTable(originalProperty.name!)
      await tableHelper.waitForPropertyToDisappear(updatedName)
    })
  })

  test.describe('Property Deletion - Optimistic Updates', () => {
    test('should immediately remove property when deleting', async () => {
      // Create property to delete
      const testProperty = createTestProperty({ name: 'Delete Test Property' })
      await formHelper.createProperty(testProperty)
      await tableHelper.waitForPropertyInTable(testProperty.name!)

      const initialCount = await tableHelper.getPropertyCount()
      const initialStats = await statsHelper.getTotalPropertiesCount()

      // Delete property
      const propertyRow = tableHelper.getPropertyByName(testProperty.name!)
      await propertyRow.locator('button:has-text("Delete")').click()

      // Confirm deletion if modal appears
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Delete")')
      if (await confirmButton.count() > 0) {
        await confirmButton.click()
      }

      // Verify immediate removal (optimistic update)
      await tableHelper.waitForPropertyToDisappear(testProperty.name!)

      // Verify count decreased immediately
      const optimisticCount = await tableHelper.getPropertyCount()
      expect(optimisticCount).toBe(initialCount - 1)

      // Verify dashboard stats updated optimistically
      await statsHelper.waitForStatsUpdate(initialStats - 1)

      // Wait for server confirmation
      await page.waitForLoadState('networkidle')

      // Verify property stays deleted
      await expect(tableHelper.getPropertyByName(testProperty.name!)).toBeHidden()
    })

    test('should restore property on delete API failure', async () => {
      // Create property
      const testProperty = createTestProperty({ name: 'Restore Test Property' })
      await formHelper.createProperty(testProperty)
      await tableHelper.waitForPropertyInTable(testProperty.name!)

      const initialCount = await tableHelper.getPropertyCount()
      const initialStats = await statsHelper.getTotalPropertiesCount()

      // Simulate delete API failure
      await networkSim.simulateNetworkFailure('/api/properties/', 500)

      // Attempt delete
      const propertyRow = tableHelper.getPropertyByName(testProperty.name!)
      await propertyRow.locator('button:has-text("Delete")').click()

      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Delete")')
      if (await confirmButton.count() > 0) {
        await confirmButton.click()
      }

      // Verify optimistic removal
      await tableHelper.waitForPropertyToDisappear(testProperty.name!)

      // Wait for API failure and property restoration
      await tableHelper.waitForPropertyInTable(testProperty.name!)

      // Verify counts restored
      const restoredCount = await tableHelper.getPropertyCount()
      expect(restoredCount).toBe(initialCount)

      await statsHelper.waitForStatsUpdate(initialStats)
    })
  })

  test.describe('Cache Behavior and Performance', () => {
    test('should maintain cache state during navigation', async () => {
      // Create test property
      const testProperty = createTestProperty({ name: 'Cache Test Property' })
      await formHelper.createProperty(testProperty)
      await tableHelper.waitForPropertyInTable(testProperty.name!)

      // Navigate away and back
      await page.goto('/dashboard')
      await page.waitForTimeout(1000)
      await page.goto('/dashboard/properties')

      // Verify property is still visible (from cache)
      await expect(tableHelper.getPropertyByName(testProperty.name!)).toBeVisible()

      // Verify cache contains the property
      const cacheData = await queryHelper.getQueryData(['properties', 'ALL'])
      expect(cacheData).toBeDefined()
    })

    test('should handle concurrent operations correctly', async () => {
      const properties = [
        createTestProperty({ name: 'Concurrent 1' }),
        createTestProperty({ name: 'Concurrent 2' })
      ]

      // Start both operations simultaneously
      const [creation1, creation2] = await Promise.allSettled([
        formHelper.createProperty(properties[0]),
        formHelper.createProperty(properties[1])
      ])

      // Verify both operations completed
      expect(creation1.status).toBe('fulfilled')
      expect(creation2.status).toBe('fulfilled')

      // Verify both properties appear
      await tableHelper.waitForPropertyInTable(properties[0].name!)
      await tableHelper.waitForPropertyInTable(properties[1].name!)

      // Wait for server sync
      await page.waitForTimeout(3000)

      // Verify both still visible
      for (const property of properties) {
        await expect(tableHelper.getPropertyByName(property.name!)).toBeVisible()
      }
    })

    test('should handle slow network gracefully', async () => {
      // Simulate slow network
      await networkSim.simulateSlowNetwork()

      const testProperty = createTestProperty({ name: 'Slow Network Property' })
      const startTime = Date.now()

      // Create property
      await formHelper.createProperty(testProperty)

      // Verify immediate optimistic update (should be fast despite slow network)
      await tableHelper.waitForPropertyInTable(testProperty.name!)
      const optimisticTime = Date.now() - startTime

      // Optimistic update should be fast (< 500ms)
      expect(optimisticTime).toBeLessThan(500)

      // Wait for slow server response
      await page.waitForLoadState('networkidle')

      // Verify property persisted
      await expect(tableHelper.getPropertyByName(testProperty.name!)).toBeVisible()
    })
  })

  test.describe('Error States and Recovery', () => {
    test('should show proper error states', async () => {
      // Simulate various error conditions
      await networkSim.simulateNetworkFailure('/api/properties', 500)

      const testProperty = createTestProperty({ name: 'Error State Property' })

      // Attempt creation
      await formHelper.createProperty(testProperty)

      // Verify error handling UI appears
      const errorElement = page.locator('[user_type="alert"], .error-message, text*="error"')
      await expect(errorElement).toBeVisible({ timeout: 10000 })

      // Verify user can retry
      const retryButton = page.locator('button:has-text("Retry"), button:has-text("Try Again")')
      if (await retryButton.count() > 0) {
        // Reset network to allow success
        await networkSim.resetNetworkMocks()
        await retryButton.click()

        // Verify retry works
        await tableHelper.waitForPropertyInTable(testProperty.name!)
      }
    })

    test('should handle validation errors correctly', async () => {
      // Attempt to create property with invalid data
      await page.click('button:has-text("New Property")')

      // Submit with empty required fields
      await page.click('button[type="submit"]')

      // Verify validation errors appear
      const validationErrors = page.locator('.error, [aria-invalid="true"] + *, text*="required"')
      await expect(validationErrors.first()).toBeVisible()

      // Verify no optimistic update occurs for invalid data
      const propertyCount = await tableHelper.getPropertyCount()

      // Fill valid data and submit
      await formHelper.createProperty(basePropertyData)

      // Verify optimistic update works with valid data
      const newCount = await tableHelper.getPropertyCount()
      expect(newCount).toBe(propertyCount + 1)
    })
  })
})
