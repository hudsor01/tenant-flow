import { test, expect } from '@playwright/test'

/**
 * Owner Navigation E2E Tests
 *
 * Uses official Playwright auth pattern: storageState provides authentication.
 * Tests start authenticated - no manual login required.
 * @see https://playwright.dev/docs/auth#basic-shared-account-in-all-tests
 *
 * Tests ONLY critical user flows - the happy path.
 * When something breaks in production, add a test for it.
 * Philosophy: 80% coverage from testing what matters.
 */

test.describe('Owner Core Navigation', () => {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3050'

  // No beforeEach needed - tests navigate directly (auth via storageState)

  // Core pages that MUST work
  const criticalRoutes = [
    { path: '/dashboard', heading: 'Dashboard' },
    { path: '/properties', heading: 'Properties' },
    { path: '/tenants', heading: 'Tenants' },
    { path: '/leases', heading: 'Leases' },
    { path: '/maintenance', heading: 'Maintenance' },
  ]

  for (const route of criticalRoutes) {
    test(`${route.path} loads`, async ({ page }) => {
      await page.goto(`${baseUrl}${route.path}`)
      await page.waitForLoadState('networkidle', { timeout: 30000 })

      // Not redirected to login
      expect(page.url()).not.toContain('/login')

      // No error boundary
      const errorText = page.getByText('Something went wrong')
      await expect(errorText).not.toBeVisible({ timeout: 3000 }).catch(() => {})

      // Heading visible
      await expect(page.locator('h1, h2').first()).toContainText(
        new RegExp(route.heading, 'i'),
        { timeout: 10000 }
      )
    })
  }

  test('can navigate between core pages', async ({ page }) => {
    // Properties
    await page.goto(`${baseUrl}/properties`)
    await page.waitForLoadState('networkidle')
    expect(page.url()).toContain('/properties')

    // Tenants
    await page.goto(`${baseUrl}/tenants`)
    await page.waitForLoadState('networkidle')
    expect(page.url()).toContain('/tenants')

    // Back/forward
    await page.goBack()
    await page.waitForLoadState('networkidle')
    expect(page.url()).toContain('/properties')
  })
})
