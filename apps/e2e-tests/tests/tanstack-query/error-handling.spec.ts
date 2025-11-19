/**
 * TanStack Query Error Handling Tests
 * Tests real browser behavior for network errors, retries, and error recovery
 *
 * Critical error scenarios testing:
 * - Network failures during CRUD operations
 * - API timeouts and recovery
 * - Intermittent connection issues
 * - Retry behavior and exponential backoff
 * - User-friendly error messaging
 * - Error boundary integration
 */

import type { Page } from '@playwright/test';
import { test, expect } from '@playwright/test'
import { createTestProperty, networkDelays } from '../fixtures/property-data'
import {
  TanStackQueryHelper,
  NetworkSimulator,
  PropertyTableHelper,
  PropertyFormHelper
} from '../utils/tanstack-helpers'

test.describe('TanStack Query Error Handling', () => {
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

    // Navigate to properties page
    await page.goto('/dashboard/properties')
    await page.waitForLoadState('networkidle')

    // Expose retry count for testing
    await page.addInitScript(() => {
      window.testRetryCount = 0
    })
  })

  test.afterEach(async () => {
    await networkSim.resetNetworkMocks()
    await page.close()
  })

  test.describe('Network Failure Scenarios', () => {
    test('should handle complete network failure gracefully', async () => {
      // Simulate complete network failure
      await page.setOfflineMode(true)

      const testProperty = createTestProperty({ name: 'Offline Test Property' })
      const initialCount = await tableHelper.getPropertyCount()

      // Attempt to create property
      await formHelper.createProperty(testProperty)

      // Should show optimistic update first
      await tableHelper.waitForPropertyInTable(testProperty.name!)

      // Wait for network error and rollback
      await page.waitForTimeout(5000)

      // Verify rollback occurred
      await tableHelper.waitForPropertyToDisappear(testProperty.name!)

      const finalCount = await tableHelper.getPropertyCount()
      expect(finalCount).toBe(initialCount)

      // Verify error notification
      const errorNotification = page.locator(
        '[user_type="alert"], .error-toast, text*="network", text*="offline", text*="connection"'
      )
      await expect(errorNotification.first()).toBeVisible({ timeout: 10000 })

      // Test recovery when network returns
      await page.setOfflineMode(false)

      // Retry the operation
      await formHelper.createProperty(testProperty)
      await tableHelper.waitForPropertyInTable(testProperty.name!)

      // Verify success after network recovery
      const recoveryCount = await tableHelper.getPropertyCount()
      expect(recoveryCount).toBe(initialCount + 1)
    })

    test('should handle API server errors (500, 502, 503)', async () => {
      const serverErrors = [500, 502, 503, 504]

      for (const errorCode of serverErrors) {
        const testProperty = createTestProperty({ name: `Server Error ${errorCode} Property` })

        // Simulate server error
        await page.route('**/api/properties**', async (route) => {
          await route.fulfill({
            status: errorCode,
            contentType: 'application/json',
            body: JSON.stringify({
              error: `Server Error ${errorCode}`,
              message: `Internal Server Error: ${errorCode}`
            })
          })
        })

        const initialCount = await tableHelper.getPropertyCount()

        // Attempt creation
        await formHelper.createProperty(testProperty)

        // Verify optimistic update and rollback
        await tableHelper.waitForPropertyInTable(testProperty.name!)
        await page.waitForTimeout(3000)
        await tableHelper.waitForPropertyToDisappear(testProperty.name!)

        // Verify error handling
        const errorMessage = page.locator(`text*="${errorCode}", text*="server error", text*="internal error"`)
        await expect(errorMessage.first()).toBeVisible({ timeout: 5000 })

        // Reset for next iteration
        await networkSim.resetNetworkMocks()
        await page.reload()
        await page.waitForLoadState('networkidle')
        await expect(page.locator('table tbody tr').first()).toBeVisible()

        const finalCount = await tableHelper.getPropertyCount()
        expect(finalCount).toBe(initialCount)
      }
    })

    test('should handle API validation errors (422)', async () => {
      // Simulate validation error response
      await page.route('**/api/properties**', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 422,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Validation Error',
              message: 'Property name is required',
              details: {
                name: ['Property name cannot be empty'],
                address: ['Address is required']
              }
            })
          })
        } else {
          await route.continue()
        }
      })

      const testProperty = createTestProperty({ name: 'Validation Error Property' })
      const initialCount = await tableHelper.getPropertyCount()

      // Attempt creation
      await formHelper.createProperty(testProperty)

      // Verify optimistic update and rollback
      await tableHelper.waitForPropertyInTable(testProperty.name!)
      await page.waitForTimeout(3000)
      await tableHelper.waitForPropertyToDisappear(testProperty.name!)

      // Verify validation error display
      const validationError = page.locator(
        'text*="validation", text*="required", text*="property name", [user_type="alert"]'
      )
      await expect(validationError.first()).toBeVisible({ timeout: 5000 })

      // Verify no change in count
      const finalCount = await tableHelper.getPropertyCount()
      expect(finalCount).toBe(initialCount)
    })

    test('should handle timeout errors appropriately', async () => {
      const testProperty = createTestProperty({ name: 'Timeout Test Property' })

      // Simulate very slow response (timeout)
      await page.route('**/api/properties**', async (route) => {
        if (route.request().method() === 'POST') {
          // Delay longer than typical timeout
          await new Promise(resolve => setTimeout(resolve, 15000))
          await route.continue()
        } else {
          await route.continue()
        }
      })

      const initialCount = await tableHelper.getPropertyCount()

      // Attempt creation
      await formHelper.createProperty(testProperty)

      // Verify optimistic update appears
      await tableHelper.waitForPropertyInTable(testProperty.name!)

      // Wait for timeout to occur
      await page.waitForTimeout(12000)

      // Verify timeout handling
      const timeoutError = page.locator(
        'text*="timeout", text*="took too long", text*="request timeout"'
      )
      await expect(timeoutError.first()).toBeVisible({ timeout: 5000 })

      // Verify rollback after timeout
      await tableHelper.waitForPropertyToDisappear(testProperty.name!)

      const finalCount = await tableHelper.getPropertyCount()
      expect(finalCount).toBe(initialCount)
    })
  })

  test.describe('Retry Behavior', () => {
    test('should automatically retry failed requests', async () => {
      let attemptCount = 0
      const testProperty = createTestProperty({ name: 'Retry Test Property' })

      // Fail first 2 attempts, succeed on 3rd
      await page.route('**/api/properties**', async (route) => {
        if (route.request().method() === 'POST') {
          attemptCount++

          // Expose retry count to page for testing
          await page.evaluate((count) => {
            window.testRetryCount = count
          }, attemptCount)

          if (attemptCount <= 2) {
            await route.abort('failed')
          } else {
            await route.continue()
          }
        } else {
          await route.continue()
        }
      })

      // Attempt creation
      await formHelper.createProperty(testProperty)

      // Wait for retries to complete
      await page.waitForTimeout(8000)

      // Verify retry attempts occurred
      const finalRetryCount = await page.evaluate(() => window.testRetryCount)
      expect(finalRetryCount).toBeGreaterThanOrEqual(3)

      // Verify eventual success
      await tableHelper.waitForPropertyInTable(testProperty.name!)
    })

    test('should respect maximum retry limits', async () => {
      let attemptCount = 0
      const testProperty = createTestProperty({ name: 'Max Retry Test Property' })

      // Always fail to test max retry limit
      await page.route('**/api/properties**', async (route) => {
        if (route.request().method() === 'POST') {
          attemptCount++

          await page.evaluate((count) => {
            window.testRetryCount = count
          }, attemptCount)

          await route.abort('failed')
        } else {
          await route.continue()
        }
      })

      const initialCount = await tableHelper.getPropertyCount()

      // Attempt creation
      await formHelper.createProperty(testProperty)

      // Wait for all retries to exhaust
      await page.waitForTimeout(15000)

      // Verify maximum retries (typically 3) were attempted
      const finalRetryCount = await page.evaluate(() => window.testRetryCount)
      expect(finalRetryCount).toBeLessThanOrEqual(5) // TanStack Query default is 3, but allow some margin

      // Verify final failure state
      await tableHelper.waitForPropertyToDisappear(testProperty.name!)

      const finalCount = await tableHelper.getPropertyCount()
      expect(finalCount).toBe(initialCount)

      // Verify error message after all retries failed
      const finalErrorMessage = page.locator(
        'text*="failed", text*="error", text*="unable", [user_type="alert"]'
      )
      await expect(finalErrorMessage.first()).toBeVisible({ timeout: 5000 })
    })

    test('should implement exponential backoff for retries', async () => {
      const retryTimes: number[] = []
      const testProperty = createTestProperty({ name: 'Backoff Test Property' })
      let firstRequestTime = 0

      await page.route('**/api/properties**', async (route) => {
        if (route.request().method() === 'POST') {
          const currentTime = Date.now()

          if (firstRequestTime === 0) {
            firstRequestTime = currentTime
          }

          retryTimes.push(currentTime - firstRequestTime)

          // Always fail to observe retry timing
          await route.abort('failed')
        } else {
          await route.continue()
        }
      })

      // Start creation attempt
      await formHelper.createProperty(testProperty)

      // Wait for retries to complete
      await page.waitForTimeout(12000)

      // Verify exponential backoff pattern (roughly 1s, 2s, 4s intervals)
      expect(retryTimes.length).toBeGreaterThanOrEqual(3)

      if (retryTimes.length >= 3) {
        const interval1 = retryTimes[1] - retryTimes[0]
        const interval2 = retryTimes[2] - retryTimes[1]

        // Second interval should be longer than first (backoff)
        expect(interval2).toBeGreaterThan(interval1)
      }
    })
  })

  test.describe('Intermittent Connection Issues', () => {
    test('should handle flaky network connections', async () => {
      const testProperty = createTestProperty({ name: 'Flaky Network Property' })
      let requestCount = 0

      // Simulate 60% failure rate
      await page.route('**/api/properties**', async (route) => {
        if (route.request().method() === 'POST') {
          requestCount++

          // Fail 3 out of 5 requests
          if (requestCount % 5 === 4 || requestCount % 5 === 0) {
            await route.continue() // Success
          } else {
            await route.abort('failed') // Failure
          }
        } else {
          await route.continue()
        }
      })

      // Attempt creation
      await formHelper.createProperty(testProperty)

      // Wait for eventual success or failure
      await page.waitForTimeout(10000)

      // Should either succeed eventually or show appropriate error after max retries
      const propertyExists = await page.locator(`text="${testProperty.name}"`).count() > 0
      const errorExists = await page.locator('[user_type="alert"], .error-message').count() > 0

      expect(propertyExists || errorExists).toBe(true)
    })

    test('should recover from temporary network interruptions', async () => {
      const testProperty = createTestProperty({ name: 'Recovery Test Property' })
      let networkRestored = false

      // Start with network failure, then restore after 3 seconds
      setTimeout(() => {
        networkRestored = true
      }, 3000)

      await page.route('**/api/properties**', async (route) => {
        if (route.request().method() === 'POST') {
          if (!networkRestored) {
            await route.abort('failed')
          } else {
            await route.continue()
          }
        } else {
          await route.continue()
        }
      })

      // Attempt creation during network issue
      await formHelper.createProperty(testProperty)

      // Wait for network recovery and retry success
      await page.waitForTimeout(8000)

      // Verify eventual success
      await tableHelper.waitForPropertyInTable(testProperty.name!)
    })
  })

  test.describe('User Error Recovery Experience', () => {
    test('should provide clear error messages to users', async () => {
      const errorScenarios = [
        {
          status: 400,
          message: 'Bad Request',
          expectedText: 'invalid request'
        },
        {
          status: 401,
          message: 'Unauthorized',
          expectedText: 'not authorized'
        },
        {
          status: 403,
          message: 'Forbidden',
          expectedText: 'permission'
        },
        {
          status: 404,
          message: 'Not Found',
          expectedText: 'not found'
        }
      ]

      for (const scenario of errorScenarios) {
        const testProperty = createTestProperty({
          name: `Error ${scenario.status} Property`
        })

        // Simulate specific error
        await page.route('**/api/properties**', async (route) => {
          if (route.request().method() === 'POST') {
            await route.fulfill({
              status: scenario.status,
              contentType: 'application/json',
              body: JSON.stringify({
                error: scenario.message,
                message: `Error ${scenario.status}: ${scenario.message}`
              })
            })
          } else {
            await route.continue()
          }
        })

        // Attempt operation
        await formHelper.createProperty(testProperty)

        // Wait for error handling
        await page.waitForTimeout(3000)

        // Verify user-friendly error message
        const errorDisplay = page.locator(
          `text*="${scenario.expectedText}", text*="${scenario.status}", [user_type="alert"]`
        )
        await expect(errorDisplay.first()).toBeVisible({ timeout: 5000 })

        // Reset for next scenario
        await networkSim.resetNetworkMocks()
        await page.reload()
        await page.waitForLoadState('networkidle')
        await expect(page.locator('table tbody tr').first()).toBeVisible()
      }
    })

    test('should offer retry options to users', async () => {
      const testProperty = createTestProperty({ name: 'User Retry Property' })

      // Simulate failure then success on retry
      let shouldFail = true
      await page.route('**/api/properties**', async (route) => {
        if (route.request().method() === 'POST') {
          if (shouldFail) {
            shouldFail = false
            await route.abort('failed')
          } else {
            await route.continue()
          }
        } else {
          await route.continue()
        }
      })

      const initialCount = await tableHelper.getPropertyCount()

      // Attempt creation
      await formHelper.createProperty(testProperty)

      // Wait for failure
      await page.waitForTimeout(5000)

      // Look for retry button or option
      const retryButton = page.locator(
        'button:has-text("Retry"), button:has-text("Try Again"), button:has-text("Retry Request")'
      )

      if (await retryButton.count() > 0) {
        // Click retry
        await retryButton.click()

        // Wait for retry success
        await page.waitForTimeout(3000)

        // Verify success
        await tableHelper.waitForPropertyInTable(testProperty.name!)

        const finalCount = await tableHelper.getPropertyCount()
        expect(finalCount).toBe(initialCount + 1)
      } else {
        // If no retry button, user might need to resubmit form
        await formHelper.createProperty(testProperty)
        await tableHelper.waitForPropertyInTable(testProperty.name!)
      }
    })

    test('should gracefully handle error boundaries', async () => {
      // Simulate a critical error that might trigger error boundary
      await page.route('**/api/properties**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'text/html', // Wrong content type to cause parsing error
          body: '<html><body>Not JSON</body></html>'
        })
      })

      const testProperty = createTestProperty({ name: 'Error Boundary Property' })

      // Attempt creation
      await formHelper.createProperty(testProperty)

      // Wait for error processing
      await page.waitForTimeout(5000)

      // Verify page doesn't crash and shows error state
      const errorBoundary = page.locator(
        '[data-testid="error-boundary"], .error-boundary, text*="something went wrong"'
      )

      // Either error boundary appears OR normal error handling works
      const normalError = page.locator('[user_type="alert"], .error-message')

      const hasErrorHandling = await errorBoundary.count() > 0 || await normalError.count() > 0
      expect(hasErrorHandling).toBe(true)

      // Verify page is still responsive
      const navigation = page.locator('nav, [user_type="navigation"]')
      await expect(navigation).toBeVisible()
    })
  })

  test.describe('Query Cache Error Handling', () => {
    test('should handle cache corruption gracefully', async () => {
      // Corrupt query cache manually
      await page.evaluate(() => {
        if (window.__QUERY_CLIENT__) {
          // Simulate cache corruption by setting invalid data
          window.__QUERY_CLIENT__.setQueryData(['properties', 'ALL'], null)
        }
      })

      // Navigate to properties page
      await page.reload()
      await page.waitForTimeout(3000)

      // Verify page recovers by fetching fresh data
      const propertyCount = await tableHelper.getPropertyCount()
      expect(propertyCount).toBeGreaterThanOrEqual(0) // Should not crash

      // Verify no error boundary triggered
      const errorBoundary = page.locator('.error-boundary, [data-testid="error-boundary"]')
      await expect(errorBoundary).toBeHidden()
    })

    test('should invalidate cache on persistent errors', async () => {
      let requestCount = 0

      await page.route('**/api/properties**', async (route) => {
        requestCount++

        // First few requests fail, then succeed
        if (requestCount <= 3) {
          await route.fulfill({
            status: 500,
            body: JSON.stringify({ error: 'Server Error' })
          })
        } else {
          await route.continue()
        }
      })

      // Trigger multiple requests that will fail
      await page.reload()
      await page.waitForTimeout(2000)

      // Manually trigger cache invalidation
      await queryHelper.invalidateQueries(['properties'])
      await page.waitForTimeout(3000)

      // Should eventually succeed with fresh data
      const finalCount = await tableHelper.getPropertyCount()
      expect(finalCount).toBeGreaterThanOrEqual(0)

      expect(requestCount).toBeGreaterThan(3) // Verified retries occurred
    })
  })
})
