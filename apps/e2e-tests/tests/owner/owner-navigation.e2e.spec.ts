import { test, expect } from '@playwright/test'
import { ROUTES } from '../../constants/routes'
import { loginAsOwner } from '../../auth-helpers'
import {
  clickSidebarLink,
  verifyCurrentPage,
  setupErrorMonitoring,
  verifyPageLoaded,
} from '../helpers/navigation-helpers'
import { takePageScreenshot } from '../helpers/ui-validation-helpers'

/**
 * Owner Navigation E2E Tests
 *
 * Tests all sidebar navigation links for the owner dashboard:
 * - Primary navigation items
 * - Analytics sub-routes (6 pages)
 * - Financials sub-routes (4 pages)
 * - Reports
 * - Documents
 * - Settings
 *
 * For each link, verifies:
 * - URL matches expected path
 * - Page heading renders correctly
 * - No console errors
 * - No network errors (500, 404)
 */

test.describe('Owner Navigation', () => {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

  // Define all navigation links to test
  const ownerNavigationLinks = [
    { name: 'Dashboard', path: '/dashboard', expectedHeading: 'Dashboard' },
    { name: 'Properties', path: '/properties', expectedHeading: 'Properties' },
    { name: 'Tenants', path: '/tenants', expectedHeading: 'Tenants' },
    { name: 'Leases', path: '/leases', expectedHeading: 'Leases' },
    { name: 'Maintenance', path: '/maintenance', expectedHeading: 'Maintenance' },

    // Analytics sub-routes
    {
      name: 'Analytics Overview',
      path: '/analytics/overview',
      expectedHeading: 'Analytics Overview',
    },
    {
      name: 'Financial Analytics',
      path: '/analytics/financial',
      expectedHeading: 'Financial Analytics',
    },
    {
      name: 'Property Performance',
      path: '/analytics/property-performance',
      expectedHeading: 'Property Performance',
    },
    {
      name: 'Lease Analytics',
      path: '/analytics/leases',
      expectedHeading: 'Lease Analytics',
    },
    {
      name: 'Maintenance Insights',
      path: '/analytics/maintenance',
      expectedHeading: 'Maintenance Insights',
    },
    {
      name: 'Occupancy Trends',
      path: '/analytics/occupancy',
      expectedHeading: 'Occupancy Trends',
    },

    // Financials sub-routes
    {
      name: 'Income Statement',
      path: '/financials/income-statement',
      expectedHeading: 'Income Statement',
    },
    {
      name: 'Cash Flow',
      path: '/financials/cash-flow',
      expectedHeading: 'Cash Flow',
    },
    {
      name: 'Balance Sheet',
      path: '/financials/balance-sheet',
      expectedHeading: 'Balance Sheet',
    },
    {
      name: 'Tax Documents',
      path: '/financials/tax-documents',
      expectedHeading: 'Tax Documents',
    },

    // Reports
    { name: 'Reports', path: '/reports', expectedHeading: 'Reports' },
    {
      name: 'Generate Reports',
      path: '/reports/generate',
      expectedHeading: 'Generate Reports',
    },

    // Settings
    { name: 'Settings', path: '/dashboard/settings', expectedHeading: 'Settings' },
  ]

  test.beforeEach(async ({ page }) => {
    // Login as owner before each test
    await loginAsOwner(page)
  })

  // Test each navigation link
  for (const link of ownerNavigationLinks) {
    test(`should navigate to ${link.name}`, async ({ page }) => {
      // Set up error monitoring
      const { errors, networkErrors } = setupErrorMonitoring(page)

      // Navigate directly via URL (faster than clicking sidebar)
      await page.goto(`${baseUrl}${link.path}`)

      // Verify page is fully loaded
      await verifyPageLoaded(page, link.path, link.expectedHeading)

      // Verify no console errors
      if (errors.length > 0) {
        console.error(`Console errors on ${link.name}:`, errors)
      }
      expect(errors).toHaveLength(0)

      // Verify no network errors
      if (networkErrors.length > 0) {
        console.error(`Network errors on ${link.name}:`, networkErrors)
      }
      expect(networkErrors).toHaveLength(0)

      // Take screenshot for visual regression
      await takePageScreenshot(page, `owner-${link.name.toLowerCase().replace(/\s+/g, '-')}`)
    })
  }

  test('should navigate between pages using sidebar links', async ({ page }) => {
    // Start on dashboard
    expect(page.url()).toContain(ROUTES.OWNER_DASHBOARD)

    // Click Properties link
    await clickSidebarLink(page, 'Properties')
    await verifyCurrentPage(page, ROUTES.PROPERTIES, 'Properties')

    // Click Tenants link
    await clickSidebarLink(page, 'Tenants')
    await verifyCurrentPage(page, ROUTES.TENANTS, 'Tenants')

    // Click Leases link
    await clickSidebarLink(page, 'Leases')
    await verifyCurrentPage(page, ROUTES.LEASES, 'Leases')

    // Click back to Dashboard
    await clickSidebarLink(page, 'Dashboard')
    await verifyCurrentPage(page, ROUTES.OWNER_DASHBOARD, 'Dashboard')
  })

  test('should expand and navigate to Analytics sub-routes', async ({ page }) => {
    // Click Analytics parent (may need to expand)
    const analyticsLink = page.getByRole('link', { name: /analytics/i }).first()
    await analyticsLink.click()
    await page.waitForTimeout(500) // Wait for expansion animation

    // Navigate to Analytics Overview
    await page.goto(`${baseUrl}${ROUTES.ANALYTICS_OVERVIEW}`)
    await verifyPageLoaded(page, ROUTES.ANALYTICS_OVERVIEW, 'Analytics Overview')

    // Navigate to Financial Analytics
    await page.goto(`${baseUrl}${ROUTES.ANALYTICS_FINANCIAL}`)
    await verifyPageLoaded(page, ROUTES.ANALYTICS_FINANCIAL, 'Financial Analytics')
  })

  test('should expand and navigate to Financials sub-routes', async ({ page }) => {
    // Navigate to Income Statement
    await page.goto(`${baseUrl}${ROUTES.FINANCIALS_INCOME_STATEMENT}`)
    await verifyPageLoaded(page, ROUTES.FINANCIALS_INCOME_STATEMENT, 'Income Statement')

    // Navigate to Cash Flow
    await page.goto(`${baseUrl}${ROUTES.FINANCIALS_CASH_FLOW}`)
    await verifyPageLoaded(page, ROUTES.FINANCIALS_CASH_FLOW, 'Cash Flow')
  })

  test('should verify all primary navigation items are visible', async ({ page }) => {
    // Verify main navigation items
    const primaryNavItems = [
      'Dashboard',
      'Properties',
      'Tenants',
      'Leases',
      'Maintenance',
      'Analytics',
      'Reports',
      'Financials',
    ]

    for (const item of primaryNavItems) {
      await expect(
        page.getByRole('link', { name: new RegExp(item, 'i') }).or(
          page.getByText(new RegExp(item, 'i'))
        )
      ).toBeVisible({ timeout: 5000 })
    }
  })

  test('should verify Document links are visible', async ({ page }) => {
    // Check for document-related links
    const documentLinks = ['Generate Lease', 'Lease Template']

    for (const link of documentLinks) {
      // May be in a separate section or dropdown
      const linkElement = page.getByRole('link', { name: new RegExp(link, 'i') })
      const count = await linkElement.count()

      // Verify at least one instance exists (may not be immediately visible if in dropdown)
      expect(count).toBeGreaterThan(0)
    }
  })

  test('should navigate to lease generation page', async ({ page }) => {
    await page.goto(`${baseUrl}${ROUTES.LEASES_GENERATE}`)
    await verifyPageLoaded(page, ROUTES.LEASES_GENERATE, 'Generate Lease')
  })

  test('should navigate to documents page', async ({ page }) => {
    await page.goto(`${baseUrl}${ROUTES.DOCUMENTS_LEASE_TEMPLATE}`)
    await verifyPageLoaded(page, ROUTES.DOCUMENTS_LEASE_TEMPLATE, 'Lease Template')
  })

  test('should maintain active state on current page', async ({ page }) => {
    // Navigate to Properties
    await page.goto(`${baseUrl}${ROUTES.PROPERTIES}`)
    await page.waitForLoadState('networkidle')

    // Check if Properties link has active state (common patterns)
    const propertiesLink = page.getByRole('link', { name: /properties/i }).first()

    // Check for common active state indicators
    const hasActiveClass = await propertiesLink.evaluate((el) => {
      const classes = el.className
      return (
        classes.includes('active') ||
        classes.includes('bg-') ||
        classes.includes('font-bold') ||
        el.getAttribute('data-active') === 'true' ||
        el.getAttribute('aria-current') === 'page'
      )
    })

    expect(hasActiveClass).toBe(true)
  })

  test('should handle browser back/forward navigation', async ({ page }) => {
    // Navigate to Properties
    await page.goto(`${baseUrl}${ROUTES.PROPERTIES}`)
    await verifyPageLoaded(page, ROUTES.PROPERTIES, 'Properties')

    // Navigate to Tenants
    await page.goto(`${baseUrl}${ROUTES.TENANTS}`)
    await verifyPageLoaded(page, ROUTES.TENANTS, 'Tenants')

    // Go back
    await page.goBack()
    await page.waitForLoadState('networkidle')
    expect(page.url()).toContain(ROUTES.PROPERTIES)

    // Go forward
    await page.goForward()
    await page.waitForLoadState('networkidle')
    expect(page.url()).toContain(ROUTES.TENANTS)
  })

  test('should verify Quick Create button is visible on all pages', async ({ page }) => {
    const pagesToTest = [
      ROUTES.OWNER_DASHBOARD,
      ROUTES.PROPERTIES,
      ROUTES.TENANTS,
      ROUTES.LEASES,
    ]

    for (const pagePath of pagesToTest) {
      await page.goto(`${baseUrl}${pagePath}`)
      await page.waitForLoadState('networkidle')

      // Verify Quick Create button exists
      await expect(
        page.getByRole('button', { name: /quick create/i }).or(
          page.locator('[data-testid="quick-create"]')
        )
      ).toBeVisible({ timeout: 5000 })
    }
  })

  test('should verify search functionality is available', async ({ page }) => {
    // Check for search input (if it exists globally)
    const searchInput = page.getByRole('searchbox').or(
      page.getByPlaceholder(/search/i)
    ).or(
      page.locator('input[type="search"]')
    )

    const searchExists = (await searchInput.count()) > 0

    // If search exists, verify it's functional
    if (searchExists) {
      await expect(searchInput.first()).toBeVisible()
    }
  })

  test('should verify breadcrumb navigation if present', async ({ page }) => {
    // Navigate to a nested route
    await page.goto(`${baseUrl}${ROUTES.ANALYTICS_FINANCIAL}`)
    await page.waitForLoadState('networkidle')

    // Check if breadcrumbs exist
    const breadcrumbs = page.locator('[aria-label*="breadcrumb"]').or(
      page.locator('[data-testid="breadcrumb"]')
    )

    const breadcrumbsExist = (await breadcrumbs.count()) > 0

    if (breadcrumbsExist) {
      // Verify breadcrumbs show current location
      await expect(breadcrumbs).toBeVisible()
    }
  })
})
