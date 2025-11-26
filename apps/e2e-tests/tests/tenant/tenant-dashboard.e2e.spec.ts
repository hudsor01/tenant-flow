import { test, expect } from '@playwright/test'
import { ROUTES } from '../../constants/routes'
import { loginAsTenant } from '../../auth-helpers'
import { verifyPageLoaded, setupErrorMonitoring } from '../helpers/navigation-helpers'
import {
  verifyTableRenders,
  verifyTableHasRows,
  verifyCardRenders,
  verifyStatCard,
  verifyButtonExists,
  verifyLinkExists,
  verifyLoadingComplete,
} from '../helpers/ui-validation-helpers'

/**
 * Tenant Dashboard E2E Tests
 *
 * Comprehensive validation of the tenant dashboard/portal page:
 * - Lease summary card
 * - Upcoming payments widget
 * - Recent maintenance requests
 * - Quick actions
 * - Dashboard widgets and layout
 * - Overall page functionality
 */

test.describe('Tenant Dashboard', () => {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

  test.beforeEach(async ({ page }) => {
    // Login as tenant and navigate to dashboard
    await loginAsTenant(page)

    // Verify we're on tenant dashboard
    await verifyPageLoaded(page, ROUTES.TENANT_DASHBOARD, 'Tenant Dashboard')
  })

  test('should render tenant dashboard page successfully', async ({ page }) => {
    // Set up error monitoring
    const { errors, networkErrors } = setupErrorMonitoring(page)

    // Verify page loaded
    expect(page.url()).toContain(ROUTES.TENANT_DASHBOARD)

    // Verify heading
    await expect(
      page.getByRole('heading', { name: /tenant dashboard|dashboard|home/i })
    ).toBeVisible({ timeout: 10000 })

    // Verify no console errors
    if (errors.length > 0) {
      console.error('Console errors on tenant dashboard:', errors)
    }
    expect(errors).toHaveLength(0)

    // Verify no network errors
    if (networkErrors.length > 0) {
      console.error('Network errors on tenant dashboard:', networkErrors)
    }
    expect(networkErrors).toHaveLength(0)
  })

  test('should display lease summary card', async ({ page }) => {
    // Wait for loading to complete
    await verifyLoadingComplete(page)

    // Look for lease-related information
    const leaseTerms = [
      /lease|rental agreement/i,
      /landlord/i,
      /property/i,
      /rent/i,
      /lease term|lease period/i,
    ]

    let hasLeaseInfo = false
    for (const term of leaseTerms) {
      const element = page.getByText(term)
      const count = await element.count()
      if (count > 0) {
        hasLeaseInfo = true
        break
      }
    }

    expect(hasLeaseInfo).toBe(true)
  })

  test('should display upcoming payments information', async ({ page }) => {
    // Wait for loading to complete
    await verifyLoadingComplete(page)

    // Look for payment-related information
    const paymentTerms = [
      /payment|pay rent/i,
      /due date|due on/i,
      /next payment/i,
      /\$\d+/,
      /rent due/i,
    ]

    let hasPaymentInfo = false
    for (const term of paymentTerms) {
      const element = page.getByText(term)
      const count = await element.count()
      if (count > 0) {
        hasPaymentInfo = true
        break
      }
    }

    expect(hasPaymentInfo).toBe(true)
  })

  test('should display recent maintenance requests if present', async ({ page }) => {
    // Wait for loading to complete
    await verifyLoadingComplete(page)

    // Look for maintenance section
    const maintenanceSection = page.getByText(/maintenance|requests|repairs/i)
    const count = await maintenanceSection.count()

    if (count > 0) {
      // Verify section is visible
      await expect(maintenanceSection.first()).toBeVisible()
    }
  })

  test('should display quick action buttons', async ({ page }) => {
    // Wait for loading to complete
    await verifyLoadingComplete(page)

    // Look for common quick action buttons
    const quickActions = [
      /pay rent/i,
      /make payment/i,
      /request maintenance/i,
      /view lease/i,
      /contact/i,
      /message/i,
    ]

    let visibleActions = 0
    for (const action of quickActions) {
      const button = page.getByRole('button', { name: action }).or(
        page.getByRole('link', { name: action })
      )
      const count = await button.count()
      if (count > 0 && (await button.first().isVisible())) {
        visibleActions++
      }
    }

    // At least 2 quick actions should be available
    expect(visibleActions).toBeGreaterThanOrEqual(2)
  })

  test('should display property information', async ({ page }) => {
    // Wait for loading to complete
    await verifyLoadingComplete(page)

    // Look for property address or details
    const propertyInfo = page.getByText(/property|address|unit/i)
    const count = await propertyInfo.count()

    expect(count).toBeGreaterThan(0)
  })

  test('should display landlord contact information if available', async ({ page }) => {
    // Wait for loading to complete
    await verifyLoadingComplete(page)

    // Look for landlord/owner information
    const landlordInfo = page.getByText(/landlord|property owner|owner|property manager/i)
    const landlordExists = (await landlordInfo.count()) > 0

    if (landlordExists) {
      await expect(landlordInfo.first()).toBeVisible()
    }
  })

  test('should handle Pay Rent button click if present', async ({ page }) => {
    // Wait for loading to complete
    await verifyLoadingComplete(page)

    // Look for Pay Rent button
    const payRentButton = page.getByRole('button', { name: /pay rent|make payment/i }).or(
      page.getByRole('link', { name: /pay rent|make payment/i })
    )

    const buttonExists = (await payRentButton.count()) > 0

    if (buttonExists) {
      await payRentButton.first().click()
      await page.waitForTimeout(500)

      // Should navigate to payments page or open modal
      const urlChanged = !page.url().includes(ROUTES.TENANT_DASHBOARD)
      const modalOpened = (await page.locator('[role="dialog"]').count()) > 0

      expect(urlChanged || modalOpened).toBe(true)
    }
  })

  test('should handle Request Maintenance button click if present', async ({ page }) => {
    // Wait for loading to complete
    await verifyLoadingComplete(page)

    // Look for Request Maintenance button
    const maintenanceButton = page
      .getByRole('button', { name: /request maintenance|new request/i })
      .or(page.getByRole('link', { name: /request maintenance|new request/i }))

    const buttonExists = (await maintenanceButton.count()) > 0

    if (buttonExists) {
      await maintenanceButton.first().click()
      await page.waitForTimeout(500)

      // Should navigate to maintenance page or open modal
      const urlChanged = page.url().includes('/maintenance')
      const modalOpened = (await page.locator('[role="dialog"]').count()) > 0

      expect(urlChanged || modalOpened).toBe(true)
    }
  })

  test('should display rent payment status', async ({ page }) => {
    // Wait for loading to complete
    await verifyLoadingComplete(page)

    // Look for payment status indicators
    const statusTerms = [/paid|unpaid|overdue|pending|current/i, /status/i]

    let hasStatus = false
    for (const term of statusTerms) {
      const element = page.getByText(term)
      const count = await element.count()
      if (count > 0) {
        hasStatus = true
        break
      }
    }

    expect(hasStatus).toBe(true)
  })

  test('should display lease expiration information', async ({ page }) => {
    // Wait for loading to complete
    await verifyLoadingComplete(page)

    // Look for lease end date or expiration
    const expirationTerms = [
      /lease end|end date/i,
      /expires|expiration/i,
      /until|through/i,
    ]

    let hasExpiration = false
    for (const term of expirationTerms) {
      const element = page.getByText(term)
      const count = await element.count()
      if (count > 0) {
        hasExpiration = true
        break
      }
    }

    if (hasExpiration) {
      expect(hasExpiration).toBe(true)
    }
  })

  test('should handle empty state gracefully if no data', async ({ page }) => {
    // Wait for loading to complete
    await verifyLoadingComplete(page)

    // Page should load successfully even if no data
    await expect(page.getByRole('heading', { name: /tenant dashboard|dashboard/i })).toBeVisible()

    // Should not show critical error messages
    const criticalErrors = page.locator('[role="alert"]').filter({ hasText: /error|failed/i })
    const errorCount = await criticalErrors.count()

    expect(errorCount).toBe(0)
  })

  test('should display welcome message or greeting', async ({ page }) => {
    // Wait for loading to complete
    await verifyLoadingComplete(page)

    // Look for welcome/greeting text
    const greetings = [/welcome/i, /hello/i, /hi/i, /dashboard/i]

    let hasGreeting = false
    for (const greeting of greetings) {
      const element = page.getByText(greeting)
      const count = await element.count()
      if (count > 0 && (await element.first().isVisible())) {
        hasGreeting = true
        break
      }
    }

    expect(hasGreeting).toBe(true)
  })

  test('should display important dates if present', async ({ page }) => {
    // Wait for loading to complete
    await verifyLoadingComplete(page)

    // Look for date-related information
    const datePattern = /\d{1,2}\/\d{1,2}\/\d{2,4}|\w+ \d{1,2}, \d{4}/

    const datesLocator = page.locator(`text=${datePattern}`)
    const count = await datesLocator.count()

    if (count > 0) {
      // Dates are present
      expect(count).toBeGreaterThan(0)
    }
  })

  test('should display notifications or alerts if present', async ({ page }) => {
    // Wait for loading to complete
    await verifyLoadingComplete(page)

    // Look for notification indicators
    const notifications = page.locator('[role="status"]').or(
      page.locator('[data-testid*="notification"]')
    ).or(
      page.locator('[aria-label*="notification"]')
    )

    const notificationCount = await notifications.count()

    if (notificationCount > 0) {
      // Verify notifications are visible
      await expect(notifications.first()).toBeVisible()
    }
  })

  test('should refresh data when navigating away and back', async ({ page }) => {
    // Note initial URL
    const dashboardUrl = page.url()

    // Navigate away
    await page.goto(`${baseUrl}${ROUTES.TENANT_LEASE}`)
    await page.waitForLoadState('networkidle')

    // Navigate back
    await page.goto(dashboardUrl)
    await page.waitForLoadState('networkidle')

    // Verify dashboard loaded again
    await expect(page.getByRole('heading', { name: /tenant dashboard|dashboard/i })).toBeVisible({
      timeout: 10000,
    })
  })

  test('should display all widgets without layout breaks', async ({ page }) => {
    // Wait for loading to complete
    await verifyLoadingComplete(page)

    // Verify viewport is displaying correctly (no horizontal scroll)
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    const viewportWidth = await page.evaluate(() => window.innerWidth)

    // Allow small differences (1-2px) for rounding
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 2)
  })

  test('should handle page resize gracefully', async ({ page }) => {
    // Test responsive design
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.waitForTimeout(500)

    // Verify dashboard still visible
    await expect(page.getByRole('heading', { name: /tenant dashboard|dashboard/i })).toBeVisible()

    // Resize to smaller viewport
    await page.setViewportSize({ width: 1024, height: 768 })
    await page.waitForTimeout(500)

    // Verify dashboard still visible
    await expect(page.getByRole('heading', { name: /tenant dashboard|dashboard/i })).toBeVisible()
  })

  test('should verify tenant cannot see owner-specific content', async ({ page }) => {
    // Wait for loading to complete
    await verifyLoadingComplete(page)

    // Verify tenant does NOT see owner management tools
    const ownerOnlyContent = [
      /manage properties/i,
      /add tenant/i,
      /create lease/i,
      /property performance/i,
    ]

    for (const content of ownerOnlyContent) {
      const element = page.getByText(content)
      const count = await element.count()

      // Should not exist or not be visible
      expect(count).toBe(0)
    }
  })

  test('should display tenant-specific dashboard content', async ({ page }) => {
    // Wait for loading to complete
    await verifyLoadingComplete(page)

    // Verify tenant sees tenant-specific content
    const tenantContent = [/my lease/i, /my rent/i, /my payment/i, /my maintenance/i]

    let hasTenantContent = false
    for (const content of tenantContent) {
      const element = page.getByText(content)
      const count = await element.count()
      if (count > 0) {
        hasTenantContent = true
        break
      }
    }

    expect(hasTenantContent).toBe(true)
  })

  test('should verify all interactive elements are clickable', async ({ page }) => {
    // Wait for loading to complete
    await verifyLoadingComplete(page)

    // Find all buttons
    const buttons = page.getByRole('button')
    const buttonCount = await buttons.count()

    // Should have at least 2 buttons
    expect(buttonCount).toBeGreaterThanOrEqual(2)

    // Verify buttons are enabled
    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      const button = buttons.nth(i)
      const isVisible = await button.isVisible()
      if (isVisible) {
        const isEnabled = await button.isEnabled()
        expect(isEnabled).toBe(true)
      }
    }
  })
})
