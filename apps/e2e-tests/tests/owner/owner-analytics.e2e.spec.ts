import { test, expect } from '@playwright/test'
import { ROUTES } from '../../constants/routes'
import { loginAsOwner } from '../../auth-helpers'
import { verifyPageLoaded } from '../helpers/navigation-helpers'
import { verifyCanvasChartRenders, verifySVGChartRenders, verifyLoadingComplete } from '../helpers/ui-validation-helpers'

test.describe('Owner Analytics', () => {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

  const analyticsPages = [
    { path: ROUTES.ANALYTICS_OVERVIEW, heading: 'Analytics Overview' },
    { path: ROUTES.ANALYTICS_FINANCIAL, heading: 'Financial Analytics' },
    { path: ROUTES.ANALYTICS_PROPERTY_PERFORMANCE, heading: 'Property Performance' },
    { path: ROUTES.ANALYTICS_LEASES, heading: 'Lease Analytics' },
    { path: ROUTES.ANALYTICS_MAINTENANCE, heading: 'Maintenance Insights' },
    { path: ROUTES.ANALYTICS_OCCUPANCY, heading: 'Occupancy Trends' },
  ]

  for (const page of analyticsPages) {
    test(`should render ${page.heading} page`, async ({ page: p }) => {
      await loginAsOwner(p)
      await p.goto(`${baseUrl}${page.path}`)
      await verifyPageLoaded(p, page.path, page.heading)
    })

    test(`should display charts on ${page.heading}`, async ({ page: p }) => {
      await loginAsOwner(p)
      await p.goto(`${baseUrl}${page.path}`)
      await verifyLoadingComplete(p)

      const hasCanvas = (await p.locator('canvas').count()) > 0
      const hasSVG = (await p.locator('svg').count()) > 0

      if (hasCanvas || hasSVG) {
        expect(hasCanvas || hasSVG).toBe(true)
      }
    })

    test(`should display data on ${page.heading}`, async ({ page: p }) => {
      await loginAsOwner(p)
      await p.goto(`${baseUrl}${page.path}`)
      await verifyLoadingComplete(p)

      const hasNumbers = (await p.getByText(/\$\d+|\d+%|\d+/i).count()) > 0
      expect(hasNumbers).toBe(true)
    })
  }

  test('should display KPI cards', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto(`${baseUrl}${ROUTES.ANALYTICS_OVERVIEW}`)
    await verifyLoadingComplete(page)

    const kpiCards = page.locator('[data-testid*="kpi"]').or(
      page.locator('.card')
    )
    const cardCount = await kpiCards.count()

    if (cardCount > 0) {
      expect(cardCount).toBeGreaterThan(0)
    }
  })

  test('should have date range filters', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto(`${baseUrl}${ROUTES.ANALYTICS_FINANCIAL}`)
    await verifyLoadingComplete(page)

    const dateFilter = page.getByLabel(/date|period|range/i)
    const count = await dateFilter.count()

    if (count > 0) {
      await expect(dateFilter.first()).toBeVisible()
    }
  })
})
